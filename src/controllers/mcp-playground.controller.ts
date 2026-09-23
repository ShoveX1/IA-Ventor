import { GoogleGenerativeAI } from "@google/generative-ai";
import { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/config.js";
import { adminService } from "../services/admin.service.js";

/**
 * Limpia el JSON Schema de MCP removiendo metadatos ($schema, additionalProperties) 
 * no soportados por la API de Google Gemini Function Calling.
 */
function sanitizeSchemaForGemini(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  const { $schema, additionalProperties, ...cleanSchema } = schema;

  if (cleanSchema.properties) {
    cleanSchema.properties = { ...cleanSchema.properties };
    for (const key of Object.keys(cleanSchema.properties)) {
      cleanSchema.properties[key] = sanitizeSchemaForGemini(cleanSchema.properties[key]);
    }
  }
  return cleanSchema;
}

// Declaraciones de herramientas MCP para Gemini
const mcpDeclarations = [
  {
    name: "get_catalog_products",
    description: "Obtiene la lista completa de productos del catálogo de la tienda, incluyendo sus variantes (tallas, colores, precios y stock).",
    parameters: sanitizeSchemaForGemini({
      type: "object",
      properties: {},
    }),
  },
  {
    name: "get_users_report",
    description: "Consulta la lista de clientes registrados en el sistema, permitiendo filtrar por un rango de fechas de creación (formato ISO, ej: 2026-01-01).",
    parameters: sanitizeSchemaForGemini({
      type: "object",
      properties: {
        startDate: { type: "string", description: "Fecha de inicio en formato ISO (ej. 2026-01-01)" },
        endDate: { type: "string", description: "Fecha de fin en formato ISO (ej. 2026-12-31)" },
      },
    }),
  },
  {
    name: "get_orders_metrics",
    description: "Consulta el resumen de ventas y órdenes de compra en el sistema, filtrando opcionalmente por estado (PENDING, PAID, CANCELLED).",
    parameters: sanitizeSchemaForGemini({
      type: "object",
      properties: {
        status: { type: "string", description: "Estado de la orden: PENDING, PAID o CANCELLED" },
      },
    }),
  },
];

export class McpPlaygroundController {
  /**
   * POST /api/mcp/chat
   * Recibe { "messageUser": "pregunta..." } y devuelve la respuesta del LLM con las herramientas MCP invocadas
   */
  async chat(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = (request.body as { messageUser?: string }) || {};
      const messageUser = body.messageUser;

      if (!messageUser || messageUser.trim() === "") {
        return reply.status(400).send({
          success: false,
          error: "El parámetro 'messageUser' es requerido en el cuerpo de la petición.",
        });
      }

      // 1. Inicializar Gemini 3.5 Flash
      const ai = new GoogleGenerativeAI(config.GEMINI_API_KEY);
      const model = ai.getGenerativeModel({
        model: "gemini-3.5-flash",
        systemInstruction: "Eres un asistente administrativo inteligente para la tienda Ia Ventor. Tu objetivo es responder las dudas sobre inventario, clientes y ventas usando tus herramientas de base de datos.",
      });

      const chat = model.startChat({
        tools: [{ functionDeclarations: mcpDeclarations }],
      });

      // 2. Enviar la consulta inicial
      let result = await chat.sendMessage(messageUser);
      let response = result.response;
      let functionCalls = response.functionCalls();
      const toolsUsed: string[] = [];

      // 3. Ejecutar las herramientas invocas por el LLM
      while (functionCalls && functionCalls.length > 0) {
        const toolResponses = [];

        for (const call of functionCalls) {
          toolsUsed.push(call.name);
          let toolData: any = null;

          if (call.name === "get_catalog_products") {
            toolData = await adminService.getAllProducts();
          } else if (call.name === "get_users_report") {
            const args = call.args as { startDate?: string; endDate?: string };
            toolData = await adminService.getUsersByDateRange(args.startDate, args.endDate);
          } else if (call.name === "get_orders_metrics") {
            const args = call.args as { status?: string };
            toolData = await adminService.getOrdersSummary(args.status);
          }

          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: { content: [{ type: "text", text: JSON.stringify(toolData, null, 2) }] },
            },
          });
        }

        result = await chat.sendMessage(toolResponses);
        response = result.response;
        functionCalls = response.functionCalls();
      }

      return reply.status(200).send({
        success: true,
        messageUser,
        response: response.text(),
        toolsUsed: Array.from(new Set(toolsUsed)),
      });
    } catch (error: any) {
      console.error("❌ Error en el endpoint MCP Playground:", error);
      return reply.status(500).send({
        success: false,
        error: error.message || "Error al procesar la consulta con el servidor MCP.",
      });
    }
  }
}
