import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { config } from "../config/config.js";

/**
 * Script Cliente MCP de ejemplo que conecta DeepSeek (deepseek-chat)
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

  // 3. Convertir las herramientas MCP en formato de OpenAI/DeepSeek Tools
  const openAiTools: ChatCompletionTool[] = mcpTools.tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: (tool.inputSchema as any) || { type: "object", properties: {} },
    },
  }));

  // 4. Inicializar cliente DeepSeek
  const deepseek = new OpenAI({
    apiKey: config.DEEPSEEK_API_KEY,
    baseURL: config.DEEPSEEK_BASE_URL,
  });

  const prompt = "Hola, ¿qué productos hay en el catálogo y cuáles son sus precios?";
  console.log(`\n💬 Pregunta al LLM: "${prompt}"`);

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "Eres un asistente administrativo inteligente para la tienda Ia Ventor. Tu objetivo es responder las dudas sobre inventario, clientes y ventas usando tus herramientas de base de datos.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  let response = await deepseek.chat.completions.create({
    model: config.DEEPSEEK_MODEL,
    messages,
    tools: openAiTools,
    tool_choice: "auto",
  });

  let assistantMessage = response.choices[0]?.message;
  if (assistantMessage) {
    messages.push(assistantMessage);
  }

  // 5. Bucle para procesar llamadas a herramientas vía el protocolo MCP
  let loopCount = 0;
  const maxLoops = 5;

  while (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0 && loopCount < maxLoops) {
    loopCount++;

    for (const call of assistantMessage.tool_calls) {
      if (!("function" in call)) continue;
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch (e) {
        console.error("Error parseando argumentos:", call.function.arguments);
      }

      console.log(`⚙️ DeepSeek decidió invocar la herramienta MCP: [${call.function.name}] con argumentos:`, args);

      // Invocar la herramienta en el servidor a través del cliente MCP
      const mcpResult = await client.callTool({
        name: call.function.name,
        arguments: args as any,
      });

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(mcpResult),
      });
    }

    // Enviar el resultado de la herramienta de vuelta a DeepSeek para continuar la respuesta
    console.log("🤖 Devolviendo resultado de la herramienta MCP a DeepSeek...");
    response = await deepseek.chat.completions.create({
      model: config.DEEPSEEK_MODEL,
      messages,
      tools: openAiTools,
      tool_choice: "auto",
    });

    assistantMessage = response.choices[0]?.message;
    if (!assistantMessage) break;
    messages.push(assistantMessage);
  }

  console.log(`\n🤖 Respuesta Final de DeepSeek:\n----------------------------------------\n${assistantMessage?.content}\n----------------------------------------`);

  // Cerrar la conexión limpia con el servidor MCP
  await client.close();
}

main().catch((err) => {
  console.error("❌ Error en la ejecución del Cliente MCP:", err);
  process.exit(1);
});
