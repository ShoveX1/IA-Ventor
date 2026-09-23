# 🧪 Simulador de Chat Privado y Pruebas en Línea

Si deseas probar a la IA María o integrar un widget de chat en tu propia página web (sin pasar por Meta ni WhatsApp), puedes hacerlo de las siguientes maneras:

---

## Opción 1: Endpoint de Chat MCP (`POST /api/mcp/chat`)

Permite realizar cualquier consulta sobre el catálogo, clientes u órdenes en lenguaje natural.

- **URL:** `POST http://localhost:3000/api/mcp/chat`
- **Body JSON:**
  ```json
  {
    "messageUser": "¿Qué polos tienes en color negro y cuánto cuestan?"
  }
  ```
- **Respuesta JSON:**
  ```json
  {
    "success": true,
    "response": "¡Hola! En color negro tenemos el Polo Oversize Perú a S/. 49.90 en tallas S, M y L...",
    "toolsUsed": ["get_catalog_products"]
  }
  ```

---

## Opción 2: Simulación de Flujo de Compra por Código (Node.js / TS)

Puedes simular el ciclo de compra completo (búsqueda -> añadir al carrito -> checkout) invocando directamente el servicio:

```typescript
import { geminiService } from "./src/services/gemini.service.js";
import { prisma } from "./src/services/db.service.js";

// 1. Obtener o crear un usuario de prueba
let user = await prisma.user.upsert({
  where: { phone: "51999999999" },
  update: {},
  create: { phone: "51999999999", activeBot: true },
});

// 2. Enviar mensaje del cliente
const respuesta1 = await geminiService.sendMessage(user.id, "Hola, quiero ver qué casacas tienes");
console.log("María:", respuesta1);

// 3. Responder con selección de talla/color
const respuesta2 = await geminiService.sendMessage(user.id, "Quiero la casaca cortaviento azul en talla L");
console.log("María:", respuesta2);

// 4. Cerrar compra
const respuesta3 = await geminiService.sendMessage(user.id, "Listo, quiero hacer el pedido por Yape");
console.log("María (Total y Datos Yape):", respuesta3);
```

---

[⬅️ Volver al Módulo de Chat](./README.md)
