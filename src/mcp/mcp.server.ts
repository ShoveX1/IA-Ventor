import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { adminService } from "../services/admin.service.js";

/**
 * Crea e inicializa el servidor MCP con herramientas de consulta para LLMs
 */
export function createMcpServer() {
  const server = new McpServer({
    name: "ia-ventor-mcp-server",
    version: "1.0.0",
  });

  // Herramienta 1: Catálogo de productos completo
  server.tool(
    "get_catalog_products",
    "Obtiene la lista completa de productos del catálogo de la tienda, incluyendo sus variantes (tallas, colores, precios y stock).",
    {},
    async () => {
      const products = await adminService.getAllProducts();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(products, null, 2),
          },
        ],
      };
    }
  );

  // Herramienta 2: Reporte de usuarios registrados por fecha
  server.tool(
    "get_users_report",
    "Consulta la lista de clientes registrados en el sistema, permitiendo filtrar por un rango de fechas de creación (formato ISO, ej: 2026-01-01).",
    {
      startDate: z.string().optional().describe("Fecha de inicio en formato ISO (ej. 2026-01-01)"),
      endDate: z.string().optional().describe("Fecha de fin en formato ISO (ej. 2026-12-31)"),
    },
    async ({ startDate, endDate }) => {
      const users = await adminService.getUsersByDateRange(startDate, endDate);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(users, null, 2),
          },
        ],
      };
    }
  );

  // Herramienta 3: Métricas de órdenes de compra y ventas
  server.tool(
    "get_orders_metrics",
    "Consulta el resumen de ventas y órdenes de compra en el sistema, filtrando opcionalmente por estado (PENDING, PAID, CANCELLED).",
    {
      status: z.string().optional().describe("Estado de la orden: PENDING, PAID o CANCELLED"),
    },
    async ({ status }) => {
      const summary = await adminService.getOrdersSummary(status);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    }
  );

  return server;
}
