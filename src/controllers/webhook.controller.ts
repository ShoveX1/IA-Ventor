import { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/config.js";
import { prisma } from "../services/db.service.js";
import { geminiService } from "../services/gemini.service.js";
import { whatsAppService } from "../services/whatsapp.service.js";

// Estructuras de tipos básicas para el Webhook de WhatsApp Cloud API
interface WhatsAppWebhookBody {
  object?: string;
  entry?: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          // Aquí pueden venir estructuras para imágenes, interacciones, etc.
        }>;
      };
      field: string;
    }>;
  }>;
}

export class WebhookController {
  /**
   * Verificación del Webhook por parte de Meta (GET)
   */
  async verify(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as {
      "hub.mode"?: string;
      "hub.verify_token"?: string;
      "hub.challenge"?: string;
    };

    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === config.WHATSAPP_VERIFY_TOKEN) {
        console.log("✅ Webhook verificado correctamente con Meta.");
        return reply.status(200).send(challenge);
      } else {
        console.warn("❌ Intento de verificación fallido: Token incorrecto.");
        return reply.status(403).send("Forbidden");
      }
    }

    return reply.status(400).send("Bad Request");
  }

  /**
   * Recepción de Mensajes del Webhook (POST)
   */
  async receive(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as WhatsAppWebhookBody;

    // Verificar si es un evento válido de la API de WhatsApp
    if (body.object !== "whatsapp_business_account") {
      return reply.status(404).send();
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    // Si no hay mensajes (ej. es un evento de estado como 'delivered' o 'read'), ignoramos.
    if (!message) {
      return reply.status(200).send("EVENT_RECEIVED");
    }

    const messageId = message.id;
    const clientPhone = message.from;
    const messageText = message.text?.body || "";
    const clientName = value?.contacts?.[0]?.profile?.name || "Cliente";

    try {
      // 1. Deduplicación del Webhook
      const existing = await prisma.processedWebhook.findUnique({
        where: { messageId },
      });

      if (existing) {
        console.log(`ℹ️ Mensaje duplicado omitido: ${messageId}`);
        return reply.status(200).send("EVENT_RECEIVED");
      }

      // Guardar ID del mensaje procesado
      await prisma.processedWebhook.create({
        data: { messageId },
      });

      // 2. Responder 200 OK inmediatamente a Meta (en < 1s) para evitar reintentos concurrentes
      reply.status(200).send("EVENT_RECEIVED");

      // 3. Procesar asíncronamente en background
      setImmediate(async () => {
        try {
          await this.processIncomingMessage(clientPhone, clientName, messageText);
        } catch (error) {
          console.error(`❌ Error procesando mensaje de ${clientPhone} en background:`, error);
        }
      });

    } catch (error) {
      console.error("❌ Error en el manejador del Webhook:", error);
      // Siempre retornamos 200 a Meta incluso si hay un error local, para no entrar en loops de reintentos
      if (!reply.sent) {
        reply.status(200).send("EVENT_RECEIVED");
      }
    }
  }

  /**
   * Lógica asíncrona de procesamiento del chat e IA
   */
  private async processIncomingMessage(phone: string, name: string, text: string) {
    console.log(`✉️ Procesando mensaje de [${name}] (${phone}): "${text}"`);

    // Buscar o registrar al usuario en la DB
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { phone },
      });
      console.log(`👤 Nuevo cliente registrado: ${phone}`);
    }

    // Verificar Handoff Humano
    if (!user.activeBot) {
      console.log(`🔕 Chatbot inactivo para ${phone} (Handoff activo). Mensaje ignorado por la IA.`);
      return;
    }

    // Procesar con Gemini Service (Function Calling se maneja internamente de manera iterativa)
    const aiResponse = await geminiService.sendMessage(user.id, text);
    
    // Si el número de origen es el simulador ficticio de Meta (16315551181),
    // redirigimos la respuesta de salida a tu número verificado para que la recibas en tu celular.
    let targetPhone = phone;
    if (phone === "16315551181") {
      targetPhone = "51928352054"; 
      console.log(`🔀 [MODO DESARROLLO] Redirigiendo respuesta del simulador a tu celular: ${targetPhone}`);
    }

    // Enviar respuesta al cliente vía WhatsApp Service
    await whatsAppService.sendTextMessage(targetPhone, aiResponse);
  }
}
