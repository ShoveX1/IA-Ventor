import { FastifyReply, FastifyRequest } from "fastify";
import { adminService, CreateProductInput, AddStockEntryInput } from "../services/admin.service.js";

export class AdminController {
  /**
   * GET /api/admin/products
   * Obtiene la lista completa de productos y variantes
   */
  async getProducts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const products = await adminService.getAllProducts();
      return reply.status(200).send({
        success: true,
        count: products.length,
        data: products,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al consultar los productos.",
      });
    }
  }

  /**
   * POST /api/admin/products
   * Crea un producto completo con variantes, lotes (Batch) e inventario inicial
   */
  async createProduct(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as CreateProductInput;

      if (!body.name || !body.description || !body.categoryId || !Array.isArray(body.variants) || body.variants.length === 0) {
        return reply.status(400).send({
          success: false,
          message: "Datos incompletos: 'name', 'description', 'categoryId' y una lista de 'variants' son obligatorios.",
        });
      }

      for (const v of body.variants) {
        if (!v.sku || v.price === undefined || !v.size || !v.color) {
          return reply.status(400).send({
            success: false,
            message: "Cada variante debe incluir 'sku', 'price', 'size', 'color', 'unitCost' e 'initialStock'.",
          });
        }
      }

      const result = await adminService.createProductWithVariants(body);

      return reply.status(201).send({
        success: true,
        message: "Producto y variantes creados exitosamente en el inventario con lote inicial.",
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al registrar el producto.",
      });
    }
  }

  /**
   * GET /api/admin/categories
   */
  async getCategories(request: FastifyRequest, reply: FastifyReply) {
    try {
      const categories = await adminService.getCategories();
      return reply.status(200).send({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al consultar las categorías.",
      });
    }
  }

  /**
   * POST /api/admin/categories
   */
  async createCategory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { name, parentId } = request.body as { name: string; parentId?: number };
      if (!name) {
        return reply.status(400).send({
          success: false,
          message: "El campo 'name' es requerido.",
        });
      }

      const category = await adminService.createCategory(name, parentId);
      return reply.status(201).send({
        success: true,
        data: category,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al crear la categoría.",
      });
    }
  }

  /**
   * GET /api/admin/attributes
   */
  async getAttributes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const attributes = await adminService.getAttributes();
      return reply.status(200).send({
        success: true,
        data: attributes,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al consultar atributos.",
      });
    }
  }

  /**
   * POST /api/admin/attributes/values
   */
  async createAttributeValue(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { attributeId, value } = request.body as { attributeId: number; value: string };
      if (!attributeId || !value) {
        return reply.status(400).send({
          success: false,
          message: "Los campos 'attributeId' y 'value' son requeridos.",
        });
      }

      const attrVal = await adminService.createAttributeValue(attributeId, value);
      return reply.status(201).send({
        success: true,
        data: attrVal,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al crear el valor del atributo.",
      });
    }
  }

  /**
   * GET /api/admin/suppliers
   */
  async getSuppliers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const suppliers = await adminService.getSuppliers();
      return reply.status(200).send({
        success: true,
        data: suppliers,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al consultar proveedores.",
      });
    }
  }

  /**
   * POST /api/admin/suppliers
   */
  async createSupplier(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { companyName } = request.body as { companyName: string };
      if (!companyName) {
        return reply.status(400).send({
          success: false,
          message: "El campo 'companyName' es requerido.",
        });
      }

      const supplier = await adminService.createSupplier(companyName);
      return reply.status(201).send({
        success: true,
        data: supplier,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al crear proveedor.",
      });
    }
  }

  /**
   * GET /api/admin/locations
   */
  async getLocations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const locations = await adminService.getLocations();
      return reply.status(200).send({
        success: true,
        data: locations,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al consultar ubicaciones.",
      });
    }
  }

  /**
   * POST /api/admin/inventory/entry
   * Añadir un nuevo lote/stock a variantes existentes
   */
  async addStockEntry(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as AddStockEntryInput;
      if (!body.supplierId || !Array.isArray(body.items) || body.items.length === 0) {
        return reply.status(400).send({
          success: false,
          message: "Se requiere 'supplierId' y una lista de 'items' (con variantId, unitCost, quantity).",
        });
      }

      const result = await adminService.addStockEntry(body);
      return reply.status(201).send({
        success: true,
        message: "Ingreso de mercadería registrado exitosamente.",
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al registrar ingreso de mercadería.",
      });
    }
  }

  /**
   * PATCH /api/admin/orders/:id/status
   * Actualizar estado de pago (PAID, CANCELLED) o logístico (SHIPPED, DELIVERED)
   */
  async updateOrderStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { paymentStatus, logisticStatus } = request.body as {
        paymentStatus?: string;
        logisticStatus?: string;
      };

      const orderId = parseInt(id, 10);
      if (isNaN(orderId)) {
        return reply.status(400).send({
          success: false,
          message: "ID de orden inválido.",
        });
      }

      const updated = await adminService.updateOrderStatus(orderId, paymentStatus, logisticStatus);
      return reply.status(200).send({
        success: true,
        message: "Estado de orden actualizado exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al actualizar la orden.",
      });
    }
  }

  /**
   * GET /api/admin/users?startDate=2026-01-01&endDate=2026-12-31
   */
  async getUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { startDate, endDate } = request.query as {
        startDate?: string;
        endDate?: string;
      };

      const users = await adminService.getUsersByDateRange(startDate, endDate);

      return reply.status(200).send({
        success: true,
        count: users.length,
        filter: { startDate, endDate },
        data: users,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al consultar los usuarios.",
      });
    }
  }

  /**
   * GET /api/admin/orders?status=PENDING
   */
  async getOrders(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { status } = request.query as { status?: string };
      const summary = await adminService.getOrdersSummary(status);

      return reply.status(200).send({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || "Error al consultar las órdenes.",
      });
    }
  }
}
