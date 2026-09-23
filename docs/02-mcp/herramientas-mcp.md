# 🛠️ Herramientas MCP Expuestas por el Backend

El servidor MCP (`src/mcp/mcp.server.ts`) expone 3 herramientas fundamentales para que cualquier modelo de IA pueda responder preguntas de negocio en lenguaje natural:

---

## 1. `get_catalog_products`

Permite al LLM consultar el inventario, productos, variantes, tallas, colores, precios y stock físico disponible.

- **Nombre de la Herramienta:** `get_catalog_products`
- **Descripción para el LLM:** *"Consulta las existencias, variantes, precios y stock del catálogo de la tienda."*
- **Parámetros:** Ninguno (obtiene el estado completo).
- **Información que entrega al LLM:**
  - Nombre del producto y descripción.
  - Categoría.
  - Lista de variantes con SKU, Talla, Color, Precio (en Soles) y Stock total disponible.

---

## 2. `get_users_report`

Permite al LLM obtener un reporte de clientes registrados en el sistema, filtrando opcionalmente por rango de fechas y con el conteo de pedidos que ha realizado cada uno.

- **Nombre de la Herramienta:** `get_users_report`
- **Descripción para el LLM:** *"Obtiene el reporte de clientes registrados filtrando por rango de fechas (startDate, endDate en formato ISO)."*
- **Parámetros del Schema:**
  ```json
  {
    "startDate": { "type": "string", "description": "Fecha inicial ISO opcional (ej: 2026-01-01)" },
    "endDate": { "type": "string", "description": "Fecha final ISO opcional (ej: 2026-12-31)" }
  }
  ```
- **Información que entrega al LLM:**
  - Número de teléfono del cliente (`phone`).
  - Estado del bot (`activeBot`).
  - Fecha de registro (`createdAt`).
  - Total de órdenes realizadas (`totalOrders`).

---

## 3. `get_orders_metrics`

Permite al LLM analizar las ventas totales, ticket promedio y estado de las órdenes.

- **Nombre de la Herramienta:** `get_orders_metrics`
- **Descripción para el LLM:** *"Consulta métricas de ventas y órdenes registradas filtradas opcionalmente por estado (PENDING, PAID, CANCELLED)."*
- **Parámetros del Schema:**
  ```json
  {
    "status": {
      "type": "string",
      "enum": ["PENDING", "PAID", "CANCELLED"],
      "description": "Estado de la orden"
    }
  }
  ```
- **Información que entrega al LLM:**
  - Total recaudado en Soles (`totalAmount`).
  - Cantidad de pedidos (`count`).
  - Desglose de cada orden: teléfono del cliente, fecha, método de pago, estado logístico, cantidad de prendas y detalle de ítems comprados.

---

[⬅️ Volver al Módulo MCP](./README.md)
