# ⚡ Conexión SSE y Endpoint Playground MCP

Tienes dos maneras de utilizar y probar el Servidor MCP de tu backend:
1. **Conexión Directa MCP SSE:** Para herramientas de IA compatibles como Claude Desktop, Cursor o Antigravity.
2. **Endpoint REST Playground (`POST /api/mcp/chat`):** Para hacer consultas directas desde Postman, cURL o tu Frontend sin lidiar con el protocolo SSE.

---

## 1. Conexión de Clientes Externos vía SSE (Claude Desktop / Antigravity)

- **URL del Endpoint SSE:** `http://localhost:3000/mcp/sse`
- **URL para Enviar Mensajes JSON-RPC:** `http://localhost:3000/mcp/messages?sessionId={sessionId}`

### 📄 Configuración de ejemplo para `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "ia-ventor": {
      "url": "http://localhost:3000/mcp/sse"
    }
  }
}
```

---

## 2. Endpoint Playground REST (`POST /api/mcp/chat`)

Este endpoint recibe una pregunta de tu parte en lenguaje natural, inicializa una sesión MCP + Gemini, ejecuta las herramientas necesarias en el servidor MCP y te devuelve la respuesta estructurada.

- **Método:** `POST`
- **URL:** `http://localhost:3000/api/mcp/chat`
- **Headers:**
  ```http
  Content-Type: application/json
  ```

### 📩 Request Body:
```json
{
  "messageUser": "¿Cuántos productos tenemos en stock y cuáles son sus precios?"
}
```

### 📤 Respuesta Exitosa (200 OK):
```json
{
  "success": true,
  "messageUser": "¿Cuántos productos tenemos en stock y cuáles son sus precios?",
  "response": "¡Hola! Actualmente contamos con los siguientes productos en inventario:\n1. Polo Oversize Perú (S/. 49.90 / S/. 54.90) con 53 unidades en total.\n2. Casaca Cortaviento Andina (S/. 119.90) con 28 unidades.\n3. Gorra Urbana Chala (S/. 35.00) con 40 unidades.",
  "toolsUsed": [
    "get_catalog_products"
  ]
}
```

### 💬 Otras preguntas que puedes hacerle al Playground:
- `"¿Cuántas órdenes pendientes de pago tenemos y cuánto suman en Soles?"` -> *(Ejecuta `get_orders_metrics` con `status: 'PENDING'`)*.
- `"¿Cuántos clientes se han registrado este mes?"` -> *(Ejecuta `get_users_report`)*.

---

## 3. Script de Prueba en Consola (`npm run mcp:client`)

El backend incluye un cliente de prueba automático que conecta Gemini a tu servidor MCP por HTTP SSE:

```bash
npm run mcp:client
```

---

[⬅️ Volver al Módulo MCP](./README.md)
