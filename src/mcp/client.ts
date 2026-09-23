import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/config.js";

/**
 * Script Cliente MCP de ejemplo que conecta Google Gemini 3.5 Flash 
 * directamente a tu Servidor MCP sobre transporte SSE (HTTP).
 */
async function main() {
  console.log("🔌 Conectando Cliente MCP a http://localhost:3000/mcp/sse...");

  // 1. Crear el transporte SSE hacia tu servidor Fastify
  const transport = new SSEClientTransport(new URL("http://localhost:3000/mcp/sse"));
  const client = new Client(
    { name: "ia-ventor-cli-client", version: "1.0.0" },
    { capabilities: {} }
  );

  // Conectar con el servidor MCP
  await client.connect(transport);
  console.log("✅ Conexión establecida con éxito con el Servidor MCP.");

  // 2. Descubrir las herramientas (Tools) expuestas por el servidor MCP
  const mcpTools = await client.listTools();
  console.log(`🧰 Herramientas MCP descubiertas (${mcpTools.tools.length}):`);
  mcpTools.tools.forEach((t) => console.log(`   - [${t.name}]: ${t.description}`));

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

  // 3. Convertir las herramientas MCP en declaraciones de funciones para Gemini
  const geminiDeclarations = mcpTools.tools.map((tool) => ({
    name: tool.name,
    description: tool.description || "",
    parameters: sanitizeSchemaForGemini(tool.inputSchema),
  }));

  // 4. Inicializar Gemini y realizar una consulta de administración
  const ai = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  const model = ai.getGenerativeModel({
    model: "gemini-3.5-flash",
    systemInstruction: "Eres un asistente administrativo inteligente para la tienda Ia Ventor. Tu objetivo es responder las dudas sobre inventario, clientes y ventas usando tus herramientas de base de datos.",
  });

  const prompt = "Hola, que tienda es esta?";
  console.log(`\n💬 Pregunta al LLM: "${prompt}"`);

  const chat = model.startChat({
    tools: [{ functionDeclarations: geminiDeclarations }],
  });

  let result = await chat.sendMessage(prompt);
  let response = result.response;
  let functionCalls = response.functionCalls();

  // 5. Bucle para procesar llamadas a herramientas vía el protocolo MCP
  while (functionCalls && functionCalls.length > 0) {
    const toolResponses = [];

    for (const call of functionCalls) {
      console.log(`⚙️ El LLM decidió invocar la herramienta MCP: [${call.name}] con argumentos:`, call.args);

      // Invocar la herramienta en el servidor a través del cliente MCP
      const mcpResult = await client.callTool({
        name: call.name,
        arguments: call.args as any,
      });

      toolResponses.push({
        functionResponse: {
          name: call.name,
          response: mcpResult,
        },
      });
    }

    // Enviar el resultado de la herramienta de vuelta a Gemini para continuar la respuesta
    console.log("🤖 Devolviendo resultado de la herramienta MCP a Gemini...");
    result = await chat.sendMessage(toolResponses);
    response = result.response;
    functionCalls = response.functionCalls();
  }

  console.log(`\n🤖 Respuesta Final del LLM:\n----------------------------------------\n${response.text()}\n----------------------------------------`);

  // Cerrar la conexión limpia con el servidor MCP
  await client.close();
}

main().catch((err) => {
  console.error("❌ Error en la ejecución del Cliente MCP:", err);
  process.exit(1);
});
