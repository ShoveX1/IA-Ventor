import { prisma } from "./db.service.js";

export interface CreateProductVariantInput {
  sku: string;
  price: number; // Precio en Soles (ej: 49.90) o en centavos
  size: string;  // Talla (ej: "S", "M", "L", "Estándar")
  color: string; // Color (ej: "Negro", "Blanco", "Rojo")
  unitCost: number; // Costo unitario en Soles (ej: 22.00)
  initialStock: number; // Cantidad física inicial
}

export interface CreateProductInput {
  name: string;
  description: string;
  categoryId: number;
  supplierId?: number;
  locationId?: number;
  variants: CreateProductVariantInput[];
}

export interface AddStockEntryInput {
  supplierId: number;
  locationId?: number;
  items: {
    variantId: number;
    unitCost: number; // En Soles o centavos
    quantity: number;
  }[];
}

export class AdminService {
  private extractAttributes(variantDetails: any[]) {
    let size = "Única";
    let color = "Estándar";

    if (variantDetails && Array.isArray(variantDetails)) {
      for (const detail of variantDetails) {
        const attrName = detail.attributeValue?.attribute?.name?.toLowerCase();
        const attrVal = detail.attributeValue?.value;

        if (attrName === "talla") {
          size = attrVal;
        } else if (attrName === "color") {
          color = attrVal;
        }
      }
    }

    return { size, color };
  }

  private calculateStock(batches: any[]): number {
    if (!batches || !Array.isArray(batches)) return 0;

    let available = 0;
    for (const batch of batches) {
      if (batch.inventoryItems && Array.isArray(batch.inventoryItems)) {
        for (const item of batch.inventoryItems) {
          available += Math.max(0, item.physicalQuantity - item.reservedQuantity);
        }
      }
    }
    return available;
  }

  /**
   * Helper para convertir montos a centavos enteros (Int) de forma segura
   */
  private toCents(amount: number): number {
    // Si el número ya parece estar en centavos (> 1000 y sin decimales habituales), o si es flotante con soles
    // Por estándar: si amount tiene decimales o es menor a 500, asumimos Soles y convertimos a centavos
    // Ej: 49.90 -> 4990. Si ya envían 4990 -> 4990.
    if (Number.isInteger(amount) && amount >= 500) {
      return amount;
    }
    return Math.round(amount * 100);
  }

  /**
   * Obtiene todos los productos del catálogo incluyendo variantes, categorías y stock
   */
  async getAllProducts() {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          include: {
            variantDetails: {
              include: {
                attributeValue: {
                  include: {
                    attribute: true,
                  },
                },
              },
            },
            batches: {
              include: {
                inventoryItems: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return products.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      category: p.category ? p.category.name : "Sin Categoría",
      createdAt: p.createdAt,
      variants: p.variants.map((v: any) => {
        const { size, color } = this.extractAttributes(v.variantDetails);
        const stock = this.calculateStock(v.batches);
        const priceSoles = parseFloat((v.price / 100).toFixed(2));

        return {
          variant_id: v.id,
          sku: v.sku,
          size,
          color,
          price: priceSoles,
          priceCents: v.price,
          stock,
        };
      }),
    }));
  }

  /**
   * Creación transaccional de un nuevo Producto con Variantes, Lotes (Batch), Inventario y Ledger
   */
  async createProductWithVariants(input: CreateProductInput) {
    const { name, description, categoryId, supplierId, locationId, variants } = input;

    return await prisma.$transaction(async (tx) => {
      // 1. Validar o resolver Location (Default: primer almacén o ID 1)
      let targetLocationId = locationId;
      if (!targetLocationId) {
        const defaultLoc = await tx.location.findFirst();
        if (!defaultLoc) {
          const createdLoc = await tx.location.create({
            data: { name: "Almacén Central", type: "ALMACEN" },
          });
          targetLocationId = createdLoc.id;
        } else {
          targetLocationId = defaultLoc.id;
        }
      }

      // 2. Validar o resolver Supplier (Default: primer proveedor o ID 1)
      let targetSupplierId = supplierId;
      if (!targetSupplierId) {
        const defaultSupplier = await tx.supplier.findFirst();
        if (!defaultSupplier) {
          const createdSup = await tx.supplier.create({
            data: { companyName: "Proveedor General", status: true },
          });
          targetSupplierId = createdSup.id;
        } else {
          targetSupplierId = defaultSupplier.id;
        }
      }

      // 3. Obtener o crear atributos maestros (Talla y Color)
      let attrTalla = await tx.attribute.findFirst({ where: { name: { equals: "Talla", mode: "insensitive" } } });
      if (!attrTalla) {
        attrTalla = await tx.attribute.create({ data: { name: "Talla" } });
      }

      let attrColor = await tx.attribute.findFirst({ where: { name: { equals: "Color", mode: "insensitive" } } });
      if (!attrColor) {
        attrColor = await tx.attribute.create({ data: { name: "Color" } });
      }

      // 4. Tipo de movimiento INGRESO
      let movIngreso = await tx.movementType.findUnique({ where: { code: "INGRESO" } });
      if (!movIngreso) {
        movIngreso = await tx.movementType.create({ data: { code: "INGRESO", multiplier: 1 } });
      }

      // 5. Crear el Producto
      const product = await tx.product.create({
        data: {
          name,
          description,
          categoryId,
        },
      });

      // 6. Crear un StockEntry para el ingreso de mercadería inicial
      const stockEntry = await tx.stockEntry.create({
        data: {
          supplierId: targetSupplierId,
          status: "RECIBIDO",
        },
      });

      const createdVariants = [];

      // 7. Procesar cada variante
      for (const v of variants) {
        const priceCents = this.toCents(v.price);
        const unitCostCents = this.toCents(v.unitCost);

        // Resolver AttributeValue para Talla
        let valTalla = await tx.attributeValue.findFirst({
          where: {
            attributeId: attrTalla.id,
            value: { equals: v.size.trim(), mode: "insensitive" },
          },
        });
        if (!valTalla) {
          valTalla = await tx.attributeValue.create({
            data: {
              attributeId: attrTalla.id,
              value: v.size.trim(),
            },
          });
        }

        // Resolver AttributeValue para Color
        let valColor = await tx.attributeValue.findFirst({
          where: {
            attributeId: attrColor.id,
            value: { equals: v.color.trim(), mode: "insensitive" },
          },
        });
        if (!valColor) {
          valColor = await tx.attributeValue.create({
            data: {
              attributeId: attrColor.id,
              value: v.color.trim(),
            },
          });
        }

        // Crear ProductVariant
        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku.trim(),
            price: priceCents,
            variantDetails: {
              create: [
                { attributeValueId: valTalla.id },
                { attributeValueId: valColor.id },
              ],
            },
          },
        });

        // Crear Batch (Lote)
        const batch = await tx.batch.create({
          data: {
            variantId: variant.id,
            stockEntryId: stockEntry.id,
            unitCost: unitCostCents,
          },
        });

        // Crear CurrentInventory
        const initialQty = Math.max(0, v.initialStock || 0);
        await tx.currentInventory.create({
          data: {
            batchId: batch.id,
            locationId: targetLocationId,
            physicalQuantity: initialQty,
            reservedQuantity: 0,
          },
        });

        // Registrar en MovementHistory (Ledger inmutable)
        if (initialQty > 0) {
          await tx.movementHistory.create({
            data: {
              variantId: variant.id,
              batchId: batch.id,
              movementTypeId: movIngreso.id,
              destinationLocationId: targetLocationId,
              movedQuantity: initialQty,
              historicalPrice: unitCostCents,
              stockEntryId: stockEntry.id,
            },
          });
        }

        createdVariants.push({
          variantId: variant.id,
          sku: variant.sku,
          size: v.size,
          color: v.color,
          priceSoles: parseFloat((priceCents / 100).toFixed(2)),
          unitCostSoles: parseFloat((unitCostCents / 100).toFixed(2)),
          stock: initialQty,
          batchId: batch.id,
        });
      }

      return {
        productId: product.id,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        stockEntryId: stockEntry.id,
        variants: createdVariants,
      };
    });
  }

  /**
   * Ingreso de nuevo lote y stock para variantes ya existentes
   */
  async addStockEntry(input: AddStockEntryInput) {
    const { supplierId, locationId, items } = input;

    return await prisma.$transaction(async (tx) => {
      let targetLocationId = locationId;
      if (!targetLocationId) {
        const defaultLoc = await tx.location.findFirst();
        targetLocationId = defaultLoc ? defaultLoc.id : 1;
      }

      let movIngreso = await tx.movementType.findUnique({ where: { code: "INGRESO" } });
      if (!movIngreso) {
        movIngreso = await tx.movementType.create({ data: { code: "INGRESO", multiplier: 1 } });
      }

      const stockEntry = await tx.stockEntry.create({
        data: {
          supplierId,
          status: "RECIBIDO",
        },
      });

      const processedItems = [];

      for (const item of items) {
        const unitCostCents = this.toCents(item.unitCost);

        const batch = await tx.batch.create({
          data: {
            variantId: item.variantId,
            stockEntryId: stockEntry.id,
            unitCost: unitCostCents,
          },
        });

        await tx.currentInventory.create({
          data: {
            batchId: batch.id,
            locationId: targetLocationId,
            physicalQuantity: item.quantity,
            reservedQuantity: 0,
          },
        });

        await tx.movementHistory.create({
          data: {
            variantId: item.variantId,
            batchId: batch.id,
            movementTypeId: movIngreso.id,
            destinationLocationId: targetLocationId,
            movedQuantity: item.quantity,
            historicalPrice: unitCostCents,
            stockEntryId: stockEntry.id,
          },
        });

        processedItems.push({
          variantId: item.variantId,
          batchId: batch.id,
          addedQuantity: item.quantity,
          unitCostSoles: parseFloat((unitCostCents / 100).toFixed(2)),
        });
      }

      return {
        stockEntryId: stockEntry.id,
        supplierId,
        items: processedItems,
      };
    });
  }

  /**
   * Gestión de Categorías
   */
  async getCategories() {
    return await prisma.category.findMany({
      include: {
        subCategories: true,
        _count: { select: { products: true } },
      },
      orderBy: { id: "asc" },
    });
  }

  async createCategory(name: string, parentId?: number) {
    return await prisma.category.create({
      data: {
        name,
        parentId: parentId || null,
        status: true,
      },
    });
  }

  /**
   * Gestión de Atributos y Valores (Talla, Color)
   */
  async getAttributes() {
    return await prisma.attribute.findMany({
      include: {
        values: true,
      },
      orderBy: { id: "asc" },
    });
  }

  async createAttributeValue(attributeId: number, value: string) {
    return await prisma.attributeValue.create({
      data: {
        attributeId,
        value,
      },
    });
  }

  /**
   * Gestión de Proveedores
   */
  async getSuppliers() {
    return await prisma.supplier.findMany({
      orderBy: { id: "asc" },
    });
  }

  async createSupplier(companyName: string) {
    return await prisma.supplier.create({
      data: {
        companyName,
        status: true,
      },
    });
  }

  /**
   * Gestión de Ubicaciones / Almacenes
   */
  async getLocations() {
    return await prisma.location.findMany({
      orderBy: { id: "asc" },
    });
  }

  /**
   * Actualización del estado de una Orden (PAID, CANCELLED, SHIPPED, etc.)
   */
  async updateOrderStatus(orderId: number, paymentStatus?: string, logisticStatus?: string) {
    const data: any = {};
    if (paymentStatus) data.paymentStatus = paymentStatus.toUpperCase();
    if (logisticStatus) data.logisticStatus = logisticStatus.toUpperCase();

    return await prisma.order.update({
      where: { id: orderId },
      data,
    });
  }

  /**
   * Obtiene clientes registrados filtrando opcionalmente por rango de fechas (ISO string)
   */
  async getUsersByDateRange(startDate?: string, endDate?: string) {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users.map((u: any) => ({
      id: u.id,
      phone: u.phone,
      activeBot: u.activeBot,
      createdAt: u.createdAt,
      totalOrders: u._count.orders,
    }));
  }

  /**
   * Obtiene el resumen de ventas y las órdenes registradas (filtrando por estado PENDING, PAID, CANCELLED)
   */
  async getOrdersSummary(status?: string) {
    const whereClause: any = {};
    if (status) {
      whereClause.paymentStatus = status.toUpperCase();
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: { phone: true },
        },
        details: {
          include: {
            variant: {
              include: {
                product: true,
                variantDetails: {
                  include: {
                    attributeValue: {
                      include: {
                        attribute: true,
                      },
                    },
                  },
                },
              },
            },
            batch: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let totalAmountCents = 0;
    const formattedOrders = orders.map((o: any) => {
      const orderTotalCents = o.total;
      totalAmountCents += orderTotalCents;

      return {
        id: o.id,
        userPhone: o.user.phone,
        total: parseFloat((orderTotalCents / 100).toFixed(2)),
        totalCents: orderTotalCents,
        paymentStatus: o.paymentStatus,
        logisticStatus: o.logisticStatus,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
        itemsCount: o.details.reduce((acc: number, item: any) => acc + item.quantityOrdered, 0),
        items: o.details.map((i: any) => {
          const { size, color } = this.extractAttributes(i.variant.variantDetails);
          return {
            name: i.variant.product.name,
            sku: i.variant.sku,
            batchId: i.batchId,
            size,
            color,
            price: parseFloat((i.finalSalePrice / 100).toFixed(2)),
            quantity: i.quantityOrdered,
          };
        }),
      };
    });

    return {
      count: formattedOrders.length,
      totalAmount: parseFloat((totalAmountCents / 100).toFixed(2)),
      orders: formattedOrders,
    };
  }
}

export const adminService = new AdminService();
