import { Content, GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/config.js";
import { geminiDeclarations, executeTool } from "../tools/tools.js";
import { prisma } from "./db.service.js";

export class GeminiService {
  private ai: GoogleGenerativeAI;

  constructor() {
    // Inicializar el SDK de Gemini
    this.ai = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }

  /**
   * Envía un mensaje al modelo de Gemini, procesa Function Calling de forma iterativa,
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

    // Cargar historial de chat persistido
    const history = (chatSession.history as any as Content[]) || [];

    // 2. Instanciar el modelo con System Instructions y herramientas
    const systemInstruction = `
Eres María, una vendedora virtual de ropa y accesorios premium del Perú. Tu tono es amigable, servicial, carismático y con toques sutiles de la calidez peruana (puedes usar palabras cordiales como "casero", "chévere", "apóyame con esto", etc., pero siempre con educación y profesionalismo).

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

    const model = this.ai.getGenerativeModel({
      model: "gemini-3.5-flash",
      systemInstruction,
    });

    // 3. Iniciar el chat con el historial persistido y las declaraciones de herramientas
    const chat = model.startChat({
      history,
      tools: [
        {
          functionDeclarations: geminiDeclarations,
        },
      ],
    });

    // 4. Enviar el mensaje inicial del usuario
    console.log(`🤖 Enviando mensaje de usuario a Gemini para el usuario ID ${userId}...`);
    let result = await chat.sendMessage(userMessage);
    let response = result.response;

    // 5. Bucle de procesamiento de Function Calling (Llamadas a herramientas)
    let functionCalls = response.functionCalls();

    while (functionCalls && functionCalls.length > 0) {
      console.log(`🤖 Gemini solicitó ejecutar ${functionCalls.length} función(es).`);
      
      const toolResponses = [];

      for (const call of functionCalls) {
        const { name, args } = call;
        
        try {
          // Ejecutar la lógica de la herramienta en el backend
          const toolResult = await executeTool(name, args, userId);
          
          toolResponses.push({
            functionResponse: {
              name,
              response: toolResult,
            },
          });
        } catch (error: any) {
          console.error(`❌ Error ejecutando herramienta ${name}:`, error);
          toolResponses.push({
            functionResponse: {
              name,
              response: { error: error.message || "Error interno al ejecutar la herramienta." },
            },
          });
        }
      }

      // Enviar las respuestas de las herramientas de vuelta a Gemini para continuar el razonamiento
      console.log("🤖 Enviando respuestas de herramientas de vuelta a Gemini...");
      result = await chat.sendMessage(toolResponses);
      response = result.response;
      functionCalls = response.functionCalls();
    }

    // 6. Obtener el historial final de la sesión y guardarlo en la Base de Datos
    const updatedHistory = await chat.getHistory();
    
    // Serializar el historial a formato JSON seguro para PostgreSQL
    await prisma.chatSession.update({
      where: { userId },
      data: {
        history: JSON.parse(JSON.stringify(updatedHistory)),
      },
    });

    // Retornar la respuesta final en texto plano
    const finalResponseText = response.text() || "Disculpa, no pude procesar tu mensaje. ¿Podrías repetirlo?";
    return finalResponseText;
  }
}

export const geminiService = new GeminiService();
