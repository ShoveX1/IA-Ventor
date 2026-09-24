import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/config.js";
import { adminService } from "../services/admin.service.js";

// Declaraciones de herramientas MCP para DeepSeek (Formato OpenAI Tool Calling)
const mcpTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_catalog_products",
      description: "Obtiene la lista completa de productos del catálogo de la tienda, incluyendo sus variantes (tallas, colores, precios y stock).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_users_report",
      description: "Consulta la lista de clientes registrados en el sistema, permitiendo filtrar por un rango de fechas de creación (formato ISO, ej: 2026-01-01).",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Fecha de inicio en formato ISO (ej. 2026-01-01)" },
          endDate: { type: "string", description: "Fecha de fin en formato ISO (ej. 2026-12-31)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_orders_metrics",
      description: "Consulta el resumen de ventas y órdenes de compra en el sistema, filtrando opcionalmente por estado (PENDING, PAID, CANCELLED).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Estado de la orden: PENDING, PAID o CANCELLED" },
        },
      },
    },
  },
];

export class McpPlaygroundController {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.DEEPSEEK_API_KEY,
      baseURL: config.DEEPSEEK_BASE_URL,
    });
  }

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

      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "Eres un asistente administrativo inteligente para la tienda Ia Ventor. Tu objetivo es responder las dudas sobre inventario, clientes y ventas usando tus herramientas de base de datos.",
        },
        {
          role: "user",
          content: messageUser,
        },
      ];

      const toolsUsed: string[] = [];

      let response = await this.client.chat.completions.create({
        model: config.DEEPSEEK_MODEL,
        messages,
        tools: mcpTools,
        tool_choice: "auto",
      });

      let assistantMessage = response.choices[0]?.message;
      if (assistantMessage) {
        messages.push(assistantMessage);
      }

      let loopCount = 0;
      const maxLoops = 5;

      while (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0 && loopCount < maxLoops) {
        loopCount++;

        for (const call of assistantMessage.tool_calls) {
          if (!("function" in call)) continue;
          toolsUsed.push(call.function.name);
          let toolData: any = null;
          let args: any = {};
          try {
            args = JSON.parse(call.function.arguments || "{}");
          } catch (e) {
            console.error("Error parseando argumentos:", call.function.arguments);
          }

          if (call.function.name === "get_catalog_products") {
            toolData = await adminService.getAllProducts();
          } else if (call.function.name === "get_users_report") {
            toolData = await adminService.getUsersByDateRange(args.startDate, args.endDate);
          } else if (call.function.name === "get_orders_metrics") {
            toolData = await adminService.getOrdersSummary(args.status);
          }

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(toolData),
          });
        }

        response = await this.client.chat.completions.create({
          model: config.DEEPSEEK_MODEL,
          messages,
          tools: mcpTools,
          tool_choice: "auto",
        });

        assistantMessage = response.choices[0]?.message;
        if (!assistantMessage) break;
        messages.push(assistantMessage);
      }

      return reply.status(200).send({
        success: true,
        messageUser,
        response: assistantMessage?.content || "No se pudo generar respuesta.",
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
