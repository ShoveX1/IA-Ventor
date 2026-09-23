# 📲 Configuración del Webhook de WhatsApp (Meta Cloud API)

El backend expone dos métodos en la ruta `/webhook` para la integración oficial con WhatsApp Cloud API de Meta Developers.

---

## 1. Verificación del Webhook (`GET /webhook`)

Meta llama a este endpoint al momento de configurar la URL del Webhook en su portal de desarrolladores.

- **Método:** `GET`
- **URL:** `http://localhost:3000/webhook` (o tu URL de ngrok: `https://xxxx.ngrok-free.app/webhook`)
- **Query Params que envía Meta:**
  - `hub.mode`: `"subscribe"`
  - `hub.verify_token`: Debe coincidir con `WHATSAPP_VERIFY_TOKEN` definido en tu `.env` (ej: `ventor_secreto_123`).
  - `hub.challenge`: Número de desafío que el servidor devuelve como texto plano.

---

## 2. Recepción de Mensajes del Cliente (`POST /webhook`)

Meta envía una notificación JSON cada vez que un cliente escribe al número de WhatsApp de tu negocio.

- **Método:** `POST`
- **URL:** `http://localhost:3000/webhook`
- **Headers:** `Content-Type: application/json`

### 🔄 Flujo Interno al Recibir un Mensaje:
1. **Deduplicación:** Verifica `ProcessedWebhook` para no responder dos veces el mismo mensaje si Meta reintenta la petición.
2. **Usuario:** Busca el `User` por su número de teléfono. Si no existe, lo crea automáticamente.
3. **Verificación de `activeBot`:**
   - Si `activeBot === false` (el usuario está en atención humana manual), el bot ignora el mensaje para no interrumpir al asesor.
4. **Mensaje de Texto:** Pasa el texto a `geminiService.sendMessage(user.id, text)`, el cual procesa las herramientas (`search_catalog`, `add_to_cart`, `checkout`), guarda el historial en PostgreSQL y envía la respuesta al cliente mediante la API de WhatsApp de Meta.
5. **Mensaje de Imagen (Comprobante de Pago Yape):** Si el cliente envía una foto, el backend reconoce la captura, le confirma al cliente que se recibió el comprobante y que un asesor validará el pago.

---

## 💻 Configuración en Meta Developers

1. Inicia ngrok para exponer el puerto 3000:
   ```bash
   ngrok http 3000
   ```
2. En el panel de Meta Developers -> WhatsApp -> Configuration:
   - **Callback URL:** `https://tu-url.ngrok-free.app/webhook`
   - **Verify Token:** `ventor_secreto_123` (el valor de tu `.env`).
3. Suscríbete al evento **`messages`**.

---

[⬅️ Volver al Módulo de Chat](./README.md)
