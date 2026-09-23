import { FastifyInstance } from "fastify";
import { AdminController } from "../controllers/admin.controller.js";

export async function adminRoutes(fastify: FastifyInstance) {
  const controller = new AdminController();

  // Catálogo y Productos
  fastify.get("/api/admin/products", controller.getProducts.bind(controller));
  fastify.post("/api/admin/products", controller.createProduct.bind(controller));

  // Categorías
  fastify.get("/api/admin/categories", controller.getCategories.bind(controller));
  fastify.post("/api/admin/categories", controller.createCategory.bind(controller));

  // Atributos y Valores (Tallas / Colores)
  fastify.get("/api/admin/attributes", controller.getAttributes.bind(controller));
  fastify.post("/api/admin/attributes/values", controller.createAttributeValue.bind(controller));

  // Proveedores
  fastify.get("/api/admin/suppliers", controller.getSuppliers.bind(controller));
  fastify.post("/api/admin/suppliers", controller.createSupplier.bind(controller));

  // Ubicaciones / Almacenes
  fastify.get("/api/admin/locations", controller.getLocations.bind(controller));

  // Ingreso de Mercadería y Stock a Variantes existentes
  fastify.post("/api/admin/inventory/entry", controller.addStockEntry.bind(controller));

  // Órdenes y Validación de Pagos (Yape / BCP)
  fastify.get("/api/admin/orders", controller.getOrders.bind(controller));
  fastify.patch("/api/admin/orders/:id/status", controller.updateOrderStatus.bind(controller));

  // Clientes / Usuarios
  fastify.get("/api/admin/users", controller.getUsers.bind(controller));
}
