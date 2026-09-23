import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { FastifyInstance } from "fastify";
import { createMcpServer } from "../mcp/mcp.server.js";

export async function mcpRoutes(fastify: FastifyInstance) {
  const mcpServer = createMcpServer();
  // Mapa activo de transportes SSE por ID de sesión
  const transports = new Map<string, SSEServerTransport>();

  // GET /mcp/sse - Endpoint de apertura del canal de eventos (SSE)
  fastify.get("/mcp/sse", async (request, reply) => {
    console.log("🔌 Nueva conexión MCP cliente recibida por SSE.");

    // Configurar encabezados CORS explícitos para respuestas SSE en bruto
    const originHeader = request.headers.origin;
    if (originHeader) {
      reply.raw.setHeader("Access-Control-Allow-Origin", originHeader);
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      reply.raw.setHeader("Access-Control-Allow-Origin", "*");
    }
    reply.raw.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
    reply.raw.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    const transport = new SSEServerTransport("/mcp/messages", reply.raw);
    transports.set(transport.sessionId, transport);

    reply.raw.on("close", () => {
      console.log(`🔌 Conexión MCP cliente cerrada (Session: ${transport.sessionId}).`);
      transports.delete(transport.sessionId);
    });

    await mcpServer.connect(transport);
  });

  // POST /mcp/messages - Endpoint de recepción de mensajes JSON-RPC del protocolo MCP
  fastify.post("/mcp/messages", async (request, reply) => {
    const sessionId = request.query as { sessionId?: string };
    const transport = sessionId.sessionId ? transports.get(sessionId.sessionId) : null;

    if (!transport) {
      return reply.status(400).send({
        error: "Sesión MCP no encontrada o transporte SSE no inicializado.",
      });
    }

    await transport.handlePostMessage(request.raw, reply.raw, request.body);
  });
}
