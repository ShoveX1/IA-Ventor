import { FastifyInstance } from "fastify";
import { WebhookController } from "../controllers/webhook.controller.js";

export async function webhookRoutes(fastify: FastifyInstance) {
  const controller = new WebhookController();

  // Verificación del Webhook por Meta
  fastify.get("/webhook", controller.verify.bind(controller));

  // Recepción de notificaciones y mensajes
  fastify.post("/webhook", controller.receive.bind(controller));
}
