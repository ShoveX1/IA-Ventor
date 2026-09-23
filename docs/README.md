# 📚 Documentación de APIs y Conexión de Servicios (IA Ventor)

Bienvenido a la documentación técnica modular del backend de **IA Ventor**. Este índice está organizado en módulos independientes para que puedas consultar exactamente la sección que necesitas para conectar tu Frontend (Next.js/React), aplicaciones móviles, WhatsApp o herramientas de IA externas.

---

## 🗂️ Módulos de Documentación

| Módulo | Descripción | Enlace Directo |
| :--- | :--- | :--- |
| **01. Inventario y Catálogo** | Creación de productos con variantes (tallas/colores), control de lotes FIFO, stock en almacenes, categorías y proveedores. | [Ir a Módulo de Inventario](./01-inventario/README.md) |
| **02. Protocolo MCP (Model Context Protocol)** | Conexión para Agentes de IA externos (Claude Desktop, Antigravity) vía SSE y endpoint Playground REST para pruebas. | [Ir a Módulo MCP](./02-mcp/README.md) |
| **03. Chat IA, WhatsApp y Pruebas Privadas** | Flujo de la vendedora virtual (María), Webhook de Meta, simulador de chat en línea privado y gestión de sesiones. | [Ir a Módulo Chat & WhatsApp](./03-chat-ia-whatsapp/README.md) |
| **04. Órdenes, Pagos y Yape** | Consulta de órdenes, métricas de venta, validación manual de capturas de pago Yape/BCP y cambio de estados. | [Ir a Módulo Órdenes y Pagos](./04-ordenes-pagos/README.md) |

---

## 🌐 Configuración Base para Clientes (Frontends / Postman)

- **URL Base Local:** `http://localhost:3000`
- **Túnel ngrok (Webhook WhatsApp):** `https://tu-subdominio.ngrok-free.app`
- **Headers Estándar:**
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **CORS:** Habilitado para todos los orígenes (`*`) por defecto en `.env`.

---

## 🚨 Reglas Críticas del Backend

1. **Dinero y Precios:** 
   - En la base de datos **todos los montos se guardan en centavos enteros (`Int`)** (ej. S/. 49.90 = `4990`).
   - Los endpoints de respuesta devuelven precios convertidos a Soles en decimales (`49.90`) para facilitarle la vida a tu frontend.
   - En los endpoints de creación (`POST`) puedes enviar `49.90` (Soles) o `4990` (centavos); el backend lo detecta y normaliza automáticamente.
2. **IDs:** Todas las claves primarias son números enteros autoincrementales (`Int` / `SERIAL`), nunca UUIDs.
3. **Lotes y FIFO:** Cada venta descuenta unidades del lote más antiguo que tenga stock físico disponible.
