import { FastifyInstance } from "fastify";
import { McpPlaygroundController } from "../controllers/mcp-playground.controller.js";

export async function mcpPlaygroundRoutes(fastify: FastifyInstance) {
  const controller = new McpPlaygroundController();

  fastify.post("/api/mcp/chat", controller.chat.bind(controller));
}
