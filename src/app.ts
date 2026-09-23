import cors from "@fastify/cors";
import Fastify from "fastify";
import { config } from "./config/config.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { mcpPlaygroundRoutes } from "./routes/mcp-playground.routes.js";
import { mcpRoutes } from "./routes/mcp.routes.js";
import { webhookRoutes } from "./routes/webhook.routes.js";
import { prisma } from "./services/db.service.js";

const fastify = Fastify({
  logger: true,
});

// Registrar CORS con soporte completo para la nube y orígenes cruzados
const allowedOrigins =
  config.CORS_ORIGIN === "*"
    ? true
    : config.CORS_ORIGIN.includes(",")
      ? config.CORS_ORIGIN.split(",").map((o) => o.trim())
      : config.CORS_ORIGIN;

await fastify.register(cors, {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Access-Control-Allow-Origin"],
  credentials: true,
});

// Registrar rutas
await fastify.register(webhookRoutes);
await fastify.register(adminRoutes);
await fastify.register(mcpRoutes);
await fastify.register(mcpPlaygroundRoutes);

// Health check para el servidor
fastify.get("/health", async () => {
  return { status: "OK", database: "CONNECTED" };
});

const start = async () => {
  try {
    // Probar conexión a la Base de Datos antes de iniciar
    await prisma.$connect();
    fastify.log.info("🔌 Conexión con PostgreSQL establecida exitosamente.");

    await fastify.listen({ port: config.PORT, host: "0.0.0.0" });
    console.log(`🚀 Servidor vendedor IA corriendo en: http://localhost:${config.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
