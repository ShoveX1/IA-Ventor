import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { config } from "../config/config.js";
import { deepseekTools, executeTool } from "../tools/tools.js";
import { prisma } from "./db.service.js";

export class DeepSeekService {
  private client: OpenAI;

  constructor() {
    // Inicializar el cliente compatible de DeepSeek
    this.client = new OpenAI({
      apiKey: config.DEEPSEEK_API_KEY,
      baseURL: config.DEEPSEEK_BASE_URL,
    });
  }

  /**
   * Envía un mensaje al modelo DeepSeek (deepseek-chat), procesa Function/Tool Calling de forma iterativa,
   * actualiza el historial en la base de datos y retorna la respuesta final en texto.
   */
  async sendMessage(userId: number, userMessage: string): Promise<string> {
    // 1. Obtener o crear la sesión de chat del usuario en la base de datos
    let chatSession = await prisma.chatSession.findUnique({
      where: { userId },
    });

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId,
          history: [] as any,
        },
      });
    }

    const systemInstruction = `
Eres María, una vendedora virtual de ropa y accesorios premium del Perú para la tienda Ia Ventor. Tu tono es amigable, servicial, carismático y con toques sutiles de la calidez peruana (puedes usar palabras cordiales como "casero", "chévere", "apóyame con esto", etc., pero siempre con educación y profesionalismo).

Reglas críticas de comportamiento:
1. **Consulta Obligatoria**: Antes de dar información sobre precios, modelos, tallas o stock de productos, debes llamar obligatoriamente a la herramienta 'search_catalog'. NUNCA inventes productos, existencias ni precios.
2. **Validación de Variantes**: No intentes agregar productos al carrito con 'add_to_cart' sin antes preguntarle y confirmar con el cliente la Talla y el Color que desea. Si te piden un producto sin especificar talla/color, pregunta primero qué variante prefiere de las disponibles que arrojó 'search_catalog'.
3. **Flujo de Checkout y Pago**: Cuando el cliente decida finalizar su compra (indique que desea cerrar la orden, hacer el pedido o checkout), ejecuta la herramienta 'checkout'. Luego de obtener el total de la orden, dale las instrucciones de pago exactas:
   - Yapear al número: ${config.PAYMENT_YAPE_NUMBER}
   - O transferir a las cuentas BCP asociadas.
   - Pídele que envíe una foto o captura de pantalla de su comprobante por este mismo chat de WhatsApp.
   - Explícale amablemente que una vez envíe la captura, un asesor validará el pago manualmente para preparar el envío de su pedido.
4. **Handoff**: Si el usuario te pide hablar con un agente humano, muestra molestia reiterada o solicita soporte personalizado, llama a la herramienta 'handoff_to_human' de inmediato y despídete amablemente indicando que un asesor tomará el caso.
5. **Moneda**: Todos los precios que muestres deben estar expresados en Soles peruanos (S/.).
    `.trim();

    // Cargar historial de chat persistido (verificando formato compatible con OpenAI)
    let rawHistory = (chatSession.history as any as ChatCompletionMessageParam[]) || [];
    
    // Filtrar mensajes que no sigan el formato de roles de OpenAI
    const validRoles = new Set(["system", "user", "assistant", "tool"]);
    let messages: ChatCompletionMessageParam[] = Array.isArray(rawHistory)
      ? rawHistory.filter((m) => m && typeof m === "object" && validRoles.has((m as any).role))
      : [];

    // Asegurar que el mensaje de sistema esté siempre al inicio
    if (messages.length === 0 || messages[0].role !== "system") {
      messages = [{ role: "system", content: systemInstruction }, ...messages.filter((m) => m.role !== "system")];
    } else {
      messages[0] = { role: "system", content: systemInstruction };
    }

    // Agregar el mensaje actual del usuario
    messages.push({ role: "user", content: userMessage });

    console.log(`🤖 Enviando mensaje a DeepSeek (${config.DEEPSEEK_MODEL}) para el usuario ID ${userId}...`);

    let response = await this.client.chat.completions.create({
      model: config.DEEPSEEK_MODEL,
      messages,
      tools: deepseekTools,
      tool_choice: "auto",
    });

    let assistantMessage = response.choices[0]?.message;
    if (!assistantMessage) {
      return "Disculpa, no pude procesar tu mensaje en este momento. Por favor, intenta de nuevo.";
    }

    messages.push(assistantMessage);

    // Bucle para procesar llamadas a herramientas (Tool Calling)
    let loopCount = 0;
    const maxLoops = 6;

    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && loopCount < maxLoops) {
      loopCount++;
      console.log(`🤖 DeepSeek solicitó ejecutar ${assistantMessage.tool_calls.length} herramienta(s) (Iteración ${loopCount}).`);

      for (const call of assistantMessage.tool_calls) {
        if (!("function" in call)) continue;
        const toolName = call.function.name;
        let toolArgs: any = {};
        try {
          toolArgs = JSON.parse(call.function.arguments || "{}");
        } catch (e) {
          console.error(`❌ Error parseando argumentos de ${toolName}:`, call.function.arguments);
        }

        try {
          const toolResult = await executeTool(toolName, toolArgs, userId);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(toolResult),
          });
        } catch (error: any) {
          console.error(`❌ Error ejecutando herramienta ${toolName}:`, error);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: error.message || "Error interno al ejecutar la herramienta." }),
          });
        }
      }

      console.log("🤖 Enviando respuestas de herramientas de vuelta a DeepSeek...");
      response = await this.client.chat.completions.create({
        model: config.DEEPSEEK_MODEL,
        messages,
        tools: deepseekTools,
        tool_choice: "auto",
      });

      assistantMessage = response.choices[0]?.message;
      if (!assistantMessage) break;
      messages.push(assistantMessage);
    }

    // Mantener un historial manejable (últimos 30 mensajes para controlar tokens)
    const historyToSave = messages.slice(-30);

    await prisma.chatSession.update({
      where: { userId },
      data: {
        history: JSON.parse(JSON.stringify(historyToSave)),
      },
    });

    const finalResponseText = assistantMessage?.content || "Disculpa, no pude procesar tu mensaje. ¿Podrías repetirlo?";
    return finalResponseText;
  }
}

export const deepSeekService = new DeepSeekService();
export const aiService = deepSeekService;
