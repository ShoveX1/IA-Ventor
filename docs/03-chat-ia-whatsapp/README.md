# 💬 Módulo 03: Chat IA (María), WhatsApp y Pruebas en Privado

Este módulo describe cómo funciona el motor de inteligencia artificial para la vendedora virtual **María**, la recepción de mensajes vía **WhatsApp Cloud API (Meta)**, la gestión del carrito por WhatsApp y cómo simular/probar el chat en privado sin depender de WhatsApp.

---

## 🤖 La Vendedora Virtual: María

- **Personalidad:** Cordial, amigable, carismática, vendedora de moda peruana ("casero", "buenazo", "chévere").
- **Modelo:** DeepSeek API (`deepseek-chat` / DeepSeek-V3 con Tool Calling estándar OpenAI).
- **Capacidades de Function Calling:**
  1. `search_catalog(query)`: Consulta productos y variantes en tiempo real.
  2. `add_to_cart(variant_id, quantity)`: Añade prendas al carrito temporal.
  3. `view_cart()`: Muestra el resumen de lo que el cliente tiene en el carrito.
  4. `checkout()`: Cierra la venta, reserva stock FIFO en los lotes y genera la orden en estado `PENDING`.
  5. `handoff_to_human(reason)`: Desactiva el bot si el cliente pide un asesor humano.

---

## 📑 Documentos de esta Sección

- 📲 **[Configuración del Webhook de WhatsApp Meta](./webhook-meta.md)**: Verificación del token (`GET /webhook`) y procesamiento de mensajes entrantes (`POST /webhook`).
- 🧪 **[Simulador de Chat Privado y Pruebas](./chat-privado-y-pruebas.md)**: Cómo probar el chat de María directamente desde código, Postman o tu frontend sin enviar mensajes reales de WhatsApp.
- 👥 **[Control de Sesiones, Historial JSONB y Handoff](./control-sesiones-y-handoff.md)**: Cómo se guarda la memoria del chat en PostgreSQL y cómo reactivar el bot cuando un asesor termina la atención manual.

---

[⬅️ Volver al Índice Principal de Documentación](../README.md)
