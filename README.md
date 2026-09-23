# 🤖 Sistema Vendedor IA Multimodal (Perú Edition)

Este proyecto consiste en un backend transaccional y sistema de ventas automatizado para **WhatsApp** impulsado por la API de **Google Gemini** con arquitectura **Backend-First (Headless)**. El sistema actúa como una vendedora virtual llamada **"María"**, capaz de consultar inventario real, gestionar carritos de compras y procesar pedidos con pagos vía **Yape/BCP**.

> [!IMPORTANT]
> **Entorno de Desarrollo:** Google Project IDE.
> **Regla Crítica de IDs:** Queda prohibido el uso de UUIDs. Todas las llaves primarias deben ser números enteros autoincrementales (`Int` / `SERIAL`).
> **Regla Crítica de Dinero:** Queda prohibido el uso de `Decimal` o `Float` para dinero en la DB. Todos los precios, costos y montos se almacenan como enteros (`Int`) representando centavos (ej: S/. 49.90 = `4990` centavos).
> **Estrategia de Costeo e Inventario:** Control estricto por Lotes (`Batch`) con deducción de stock bajo estrategia **FIFO** y auditoría inmutable en Libro Mayor (`MovementHistory`).

---

## 📚 Documentación Modular de Endpoints (`docs/`)

Para conectar tu frontend (Next.js, React, Mobile), Postman o herramientas de IA sin tener que buscar en el código, consulta la documentación independiente por carpetas:

| Módulo | Descripción | Acceso |
| :--- | :--- | :--- |
| **00. Índice General** | Menú interactivo y reglas globales de conexión | [📄 docs/README.md](./docs/README.md) |
| **01. Inventario y Catálogo** | Creación de productos (`POST`), consulta de catálogo (`GET`), variantes (talla/color), lotes y stock | [📦 docs/01-inventario/](./docs/01-inventario/README.md) |
| **02. Protocolo MCP** | Conexión para agentes LLM vía SSE y endpoint Playground (`POST /api/mcp/chat`) | [🤖 docs/02-mcp/](./docs/02-mcp/README.md) |
| **03. Chat IA & WhatsApp** | Flujo de María, Webhook de Meta, simulador en privado y memoria `ChatSession` (JSONB) | [💬 docs/03-chat-ia-whatsapp/](./docs/03-chat-ia-whatsapp/README.md) |
| **04. Órdenes y Pagos** | Gestión de órdenes, métricas de venta y aprobación de pagos Yape/BCP (`PATCH`) | [💸 docs/04-ordenes-pagos/](./docs/04-ordenes-pagos/README.md) |

---

## 🛠️ Stack Tecnológico

- **Backend:** Node.js con **Fastify** (TypeScript) en arquitectura REST pura.
- **Base de Datos:** **PostgreSQL** (alojado localmente en la máquina del desarrollador).
- **ORM:** **Prisma** (Fuente de verdad del esquema con soporte para Lotes, EAV y Ledger).
- **IA:** **Google Generative AI** (Modelo `gemini-3.5-flash` / `gemini-3.6-flash` con Function Calling).
- **Protocolo de IA (MCP):** **Model Context Protocol SDK** (`@modelcontextprotocol/sdk`) con transporte SSE.
- **Canal:** WhatsApp Cloud API (Meta).
- **Túnel de Pruebas:** ngrok para exponer el puerto local `3000`.

---

## 📁 Estructura del Proyecto

```text
/
├── docs/                      # 📚 DOCUMENTACIÓN MODULAR POR SECCIONES
│   ├── README.md              # Índice general de APIs y contratos JSON
│   ├── 01-inventario/         # Endpoints de creación de productos, lotes y catálogo
│   ├── 02-mcp/                # Servidor MCP, herramientas expuestas y Playground
│   ├── 03-chat-ia-whatsapp/   # Webhook Meta, simulador de chat y sesiones
│   └── 04-ordenes-pagos/      # Consulta de órdenes y validación de Yape
├── prisma/
│   ├── schema.prisma          # Esquema de DB (IDs enteros, Lotes, EAV, Centavos, Ledger)
│   └── seed.ts                # Semilla de productos, lotes e inventario inicial
├── src/
│   ├── config/                # Validación de ENVs con Zod
│   ├── controllers/           # Controladores REST: Admin, Webhook y MCP Playground
│   ├── mcp/                   # Servidor y Cliente MCP para LLMs
│   │   ├── client.ts          # Cliente de prueba que conecta Gemini a MCP vía SSE
│   │   └── mcp.server.ts      # Servidor MCP (get_catalog_products, get_users_report, get_orders_metrics)
│   ├── routes/                # Rutas Fastify (Webhook, Admin, MCP SSE y Playground)
│   ├── services/              # Lógica de negocio: AdminService, GeminiService, CartService, WhatsAppService
│   ├── tools/                 # Herramientas de Function Calling para Gemini (search_catalog, checkout, etc.)
│   └── app.ts                 # Punto de entrada del servidor
├── .env                       # Variables críticas (Token, API Keys, Yape)
└── README.md                  # Este documento
```

---

## 🌐 Catálogo Rápido de APIs REST Disponibles

### 1. Inventario y Catálogo (Admin REST)
- `GET /api/admin/products`: Lista el catálogo completo con tallas, colores, precios en Soles y stock operativo.
- `POST /api/admin/products`: **Creación transaccional** de producto + variantes (tallas/colores) + lote inicial (`Batch`) + stock físico en almacén + asiento en Libro Mayor (`MovementHistory`).
- `GET /api/admin/categories` & `POST /api/admin/categories`: Listar y crear categorías.
- `GET /api/admin/attributes` & `POST /api/admin/attributes/values`: Gestión de atributos maestros (Talla, Color).
- `GET /api/admin/suppliers` & `POST /api/admin/suppliers`: Gestión de proveedores.
- `GET /api/admin/locations`: Almacenes y puntos de venta.
- `POST /api/admin/inventory/entry`: Reabastecimiento de nuevos lotes a variantes existentes.

### 2. Órdenes, Clientes y Validación de Pagos
- `GET /api/admin/orders?status=PENDING`: Consulta órdenes y total acumulado (filtrando por `PENDING`, `PAID`, `CANCELLED`).
- `PATCH /api/admin/orders/:id/status`: Valida pagos de Yape/BCP actualizando a `PAID` o actualiza estado logístico a `SHIPPED`.
- `GET /api/admin/users?startDate=...&endDate=...`: Clientes registrados y recuento de órdenes.

### 3. Protocolo MCP y Playground
- `GET /mcp/sse`: Canal de eventos Server-Sent Events para clientes MCP (Claude Desktop, Antigravity).
- `POST /mcp/messages`: Mensajes JSON-RPC para ejecutar herramientas MCP.
- `POST /api/mcp/chat`: Endpoint Playground para hacer consultas en lenguaje natural a la IA sin tocar WhatsApp.

### 4. WhatsApp Cloud API (Meta)
- `GET /webhook`: Verificación del webhook de Meta.
- `POST /webhook`: Recepción de mensajes de texto y fotos de comprobantes de pago.

---

## 🤖 Lógica de la IA (María)

La vendedora tiene una personalidad amigable y peruana. Su flujo de trabajo es el siguiente:

### Reglas de Comportamiento:
- **Consulta Obligatoria**: Antes de dar precios o stock, la IA debe llamar a la herramienta `search_catalog`. NUNCA inventa existencias ni precios.
- **Validación de Variantes**: No agrega productos al carrito sin antes confirmar Talla y Color disponibles.
- **Flujo de Pago**: Al hacer `checkout`, la IA entrega el número de **Yape** / datos de **BCP** definidos en el `.env`, solicita al usuario enviar la captura de pantalla por el chat, e indica que un asesor validará el pago para procesar el envío.
- **Handoff Manual**: Si el usuario solicita explícitamente hablar con una persona, o si la IA detecta frustración/dudas que no puede resolver, llama a `handoff_to_human`, desactivando el bot (`activeBot: false`) para permitir atención manual.

### Herramientas (Function Calling):
- `search_catalog(query)`: Busca productos en el catálogo con variantes, colores, tallas y stock acumulado.
- `add_to_cart(variant_id, quantity)`: Lógica transaccional de carrito.
- `view_cart()`: Resumen de compra actual.
- `checkout()`: Cierra el carrito, descuenta stock de Lotes vía FIFO, crea el registro en el Libro Mayor (`MovementHistory`) y genera la orden en la DB con estado `PENDING`.
- `handoff_to_human(reason)`: Desactiva el bot para el usuario actual.

---

## 💸 Flujo de Pagos (Contexto Perú)

1. El sistema genera un `total` al llamar a `checkout()`.
2. La IA presenta las instrucciones de pago: **Número de Yape** y **Cuentas BCP**.
3. La IA le pide al usuario que envíe la captura de pantalla del pago.
4. **Validación de Captura**: El backend registra la recepción de la imagen en el chat de WhatsApp y notifica que un asesor validará la transferencia.
5. La orden se crea con estado `PENDING`.
6. El administrador humano valida visualmente que el abono se haya recibido en su cuenta de Yape/BCP y ejecuta `PATCH /api/admin/orders/:id/status` con `paymentStatus: "PAID"`, finalizando la transacción.

---

## 🚀 Configuración Inicial y Ejecución

1. **Variables de Entorno**:
   Crea o edita el archivo `.env` en la raíz con la siguiente estructura:
   ```env
   DATABASE_URL="postgresql://postgres:contraseña@localhost:5432/ia_ventor_test?schema=public"
   WHATSAPP_TOKEN="tu_token_de_meta_developers"
   PHONE_NUMBER_ID="1255667080958332"
   WHATSAPP_VERIFY_TOKEN="ventor_secreto_123"
   GEMINI_API_KEY="tu_gemini_api_key"
   PAYMENT_YAPE_NUMBER="928352054"
   PORT=3000
   CORS_ORIGIN="*"
   ```
2. **Inicialización de la Base de Datos**:
   ```bash
   npm install
   npx prisma db push
   npm run prisma:seed
   ```
3. **Servidor en Desarrollo**:
   ```bash
   npm run dev
   ```
4. **Túnel ngrok para Webhook**:
   ```bash
   ngrok http 3000
   ```