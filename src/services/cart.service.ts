import { prisma } from "./db.service.js";

export class CartService {
  /**
   * Helper para extraer Talla y Color dinámicamente de los detalles de una variante EAV (AttributeValue)
   */
  private extractVariantAttributes(variantDetails: any[]) {
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

  /**
   * Helper para calcular el stock disponible real (físico - reservado) sumando todos los lotes
   */
  private calculateAvailableStock(batches: any[]): number {
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
   * Busca productos en el catálogo de la base de datos
   */
  async searchCatalog(query: string) {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
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
    });

    return {
      products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        variants: p.variants.map((v: any) => {
          const { size, color } = this.extractVariantAttributes(v.variantDetails);
          const stock = this.calculateAvailableStock(v.batches);
          // Convertir centavos (Int) a Soles (float) para exhibición
          const priceInSoles = parseFloat((v.price / 100).toFixed(2));

          return {
            variant_id: v.id,
            sku: v.sku,
            size,
            color,
            price: priceInSoles,
            stock,
          };
        }),
      })),
    };
  }

  /**
   * Agrega una variante de producto al carrito del usuario
   */
  async addToCart(userId: number, variantId: number, quantity: number) {
    if (quantity <= 0) {
      return { success: false, message: "La cantidad debe ser mayor a 0." };
    }

    // 1. Verificar si la variante existe y calcular stock disponible total
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
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
        batches: {
          include: {
            inventoryItems: true,
          },
        },
      },
    });

    if (!variant) {
      return { success: false, message: "El producto o variante seleccionado no existe." };
    }

    const { size, color } = this.extractVariantAttributes(variant.variantDetails);
    const availableStock = this.calculateAvailableStock(variant.batches);

    if (availableStock < quantity) {
      return {
        success: false,
        message: `Stock insuficiente. Solo quedan ${availableStock} unidades de ${variant.product.name} (Talla: ${size}, Color: ${color}).`,
      };
    }

    // 2. Obtener o crear el carrito del usuario
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    // 3. Crear o actualizar el item en el carrito
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    const targetQuantity = (existingItem?.quantity || 0) + quantity;

    if (availableStock < targetQuantity) {
      return {
        success: false,
        message: `No puedes agregar más. Ya tienes ${existingItem?.quantity || 0} en el carrito y el stock total disponible es de ${availableStock} unidades.`,
      };
    }

    await prisma.cartItem.upsert({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
      update: {
        quantity: targetQuantity,
      },
      create: {
        cartId: cart.id,
        variantId,
        quantity,
      },
    });

    // 4. Retornar resumen simplificado del carrito
    const updatedCart = await this.viewCart(userId);

    return {
      success: true,
      message: `¡Se agregaron ${quantity} unidades de "${variant.product.name}" (${size}/${color}) al carrito!`,
      cart: updatedCart,
    };
  }

  /**
   * Muestra el carrito actual del usuario
   */
  async viewCart(userId: number) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
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
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return { items: [], total: 0 };
    }

    let totalCents = 0;
    const items = cart.items.map((item: any) => {
      const priceCents = item.variant.price;
      const itemSubtotalCents = priceCents * item.quantity;
      totalCents += itemSubtotalCents;

      const { size, color } = this.extractVariantAttributes(item.variant.variantDetails);
      const subtotalSoles = parseFloat((itemSubtotalCents / 100).toFixed(2));

      return {
        name: item.variant.product.name,
        variant_id: item.variantId,
        size,
        color,
        quantity: item.quantity,
        subtotal: subtotalSoles,
      };
    });

    return {
      items,
      total: parseFloat((totalCents / 100).toFixed(2)),
    };
  }

  /**
   * Finaliza la compra del carrito creando una orden PENDING y aplicando FIFO por Lotes
   */
  async checkout(userId: number) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
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
                batches: {
                  include: {
                    inventoryItems: true,
                  },
                  orderBy: {
                    createdAt: "asc", // FIFO: Prioridad a los lotes más antiguos
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        order_id: null,
        total: 0,
        message: "Tu carrito de compras está vacío.",
      };
    }

    // 1. Validar stock disponible global de cada ítem antes de ejecutar la transacción
    for (const item of cart.items) {
      const availableStock = this.calculateAvailableStock(item.variant.batches);
      const { size, color } = this.extractVariantAttributes(item.variant.variantDetails);

      if (availableStock < item.quantity) {
        return {
          success: false,
          order_id: null,
          total: 0,
          message: `Lo siento, el stock de "${item.variant.product.name}" (${size}/${color}) cambió y ya no hay suficientes unidades (Disponibles: ${availableStock}). Por favor ajusta tu carrito.`,
        };
      }
    }

    // Buscar tipo de movimiento VENTA
    const vMType = await prisma.movementType.findUnique({
      where: { code: "VENTA" },
    });
    const movementTypeId = vMType ? vMType.id : 2;

    // Buscar ubicación por defecto (Almacén Central ID 1)
    const defaultLocation = await prisma.location.findFirst({
      where: { type: "ALMACEN" },
    });
    const locationId = defaultLocation ? defaultLocation.id : 1;

    let orderId: number | null = null;
    let finalTotalCents = 0;

    // 2. Transacción de compra para descontar stock por lotes (FIFO) y registrar en el Ledger
    await prisma.$transaction(async (tx: any) => {
      const orderDetailsToCreate: any[] = [];
      const movementsToCreate: any[] = [];

      for (const item of cart.items) {
        let remainingToFulfill = item.quantity;
        const unitPriceCents = item.variant.price;

        // Recorrer lotes en orden FIFO
        for (const batch of item.variant.batches) {
          if (remainingToFulfill <= 0) break;

          // Buscar el registro de inventario de este lote en la ubicación por defecto
          const inv = batch.inventoryItems.find((i: any) => i.locationId === locationId);
          if (!inv) continue;

          const batchAvailable = Math.max(0, inv.physicalQuantity - inv.reservedQuantity);
          if (batchAvailable <= 0) continue;

          const qtyFromBatch = Math.min(remainingToFulfill, batchAvailable);

          // Descontar del inventario físico del lote
          await tx.currentInventory.update({
            where: {
              batchId_locationId: {
                batchId: batch.id,
                locationId,
              },
            },
            data: {
              physicalQuantity: {
                decrement: qtyFromBatch,
              },
            },
          });

          // Preparar ítem de la orden especificando el Lote de origen
          orderDetailsToCreate.push({
            variantId: item.variantId,
            batchId: batch.id,
            quantityOrdered: qtyFromBatch,
            finalSalePrice: unitPriceCents,
          });

          // Preparar movimiento del libro mayor (Ledger)
          movementsToCreate.push({
            variantId: item.variantId,
            batchId: batch.id,
            movementTypeId,
            sourceLocationId: locationId,
            movedQuantity: qtyFromBatch,
            historicalPrice: unitPriceCents,
          });

          finalTotalCents += unitPriceCents * qtyFromBatch;
          remainingToFulfill -= qtyFromBatch;
        }
      }

      // Crear la Orden
      const order = await tx.order.create({
        data: {
          userId,
          total: finalTotalCents,
          logisticStatus: "PENDING",
          paymentMethod: "YAPE",
          paymentStatus: "PENDING",
          details: {
            create: orderDetailsToCreate,
          },
        },
      });

      orderId = order.id;

      // Vincular orderId a los registros de movimiento e insertarlos
      for (const mov of movementsToCreate) {
        await tx.movementHistory.create({
          data: {
            ...mov,
            orderId: order.id,
          },
        });
      }

      // Limpiar (vaciar) el carrito
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    });

    const totalSoles = parseFloat((finalTotalCents / 100).toFixed(2));

    return {
      success: true,
      order_id: orderId,
      total: totalSoles,
      message: "¡Pedido generado exitosamente! La orden está en estado pendiente de pago.",
    };
  }

  /**
   * Cambia el estado del bot a inactivo para atención humana (Handoff)
   */
  async handoffToHuman(userId: number, reason: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeBot: false },
    });

    console.log(`🔕 Handoff activado para el usuario ID ${userId}. Razón: ${reason}`);

    return {
      success: true,
      message: "Handoff activado. El chatbot se ha pausado y un asesor humano tomará la conversación.",
    };
  }
}

export const cartService = new CartService();
