# 📊 Consultar Órdenes y Métricas de Ventas

Permite a tu panel de administración o dashboard listar todas las compras realizadas en la tienda, con filtros por estado de pago y cálculo automático del total recaudado en Soles.

---

## 📡 Información del Endpoint

- **Método:** `GET`
- **URL:** `http://localhost:3000/api/admin/orders`
- **Query Params Opcionales:**
  - `status`: Filtro por estado de pago (`PENDING`, `PAID`, `CANCELLED`).
  - Ejemplo: `http://localhost:3000/api/admin/orders?status=PENDING`

---

## 📤 Respuesta Exitosa (200 OK)

```json
{
  "success": true,
  "data": {
    "count": 2,
    "totalAmount": 169.80,
    "orders": [
      {
        "id": 1,
        "userPhone": "51999999999",
        "total": 49.90,
        "totalCents": 4990,
        "paymentStatus": "PENDING",
        "logisticStatus": "PENDING",
        "paymentMethod": "YAPE",
        "createdAt": "2026-08-23T21:30:00.000Z",
        "itemsCount": 1,
        "items": [
          {
            "name": "Polo Oversize Perú",
            "sku": "POL-OVR-NEG-M",
            "batchId": 2,
            "size": "M",
            "color": "Negro",
            "price": 49.90,
            "quantity": 1
          }
        ]
      },
      {
        "id": 2,
        "userPhone": "51988888888",
        "total": 119.90,
        "totalCents": 11990,
        "paymentStatus": "PAID",
        "logisticStatus": "SHIPPED",
        "paymentMethod": "BCP_TRANSFER",
        "createdAt": "2026-08-23T21:45:00.000Z",
        "itemsCount": 1,
        "items": [
          {
            "name": "Casaca Cortaviento Andina",
            "sku": "CAS-COR-AZU-L",
            "batchId": 7,
            "size": "L",
            "color": "Azul Marino",
            "price": 119.90,
            "quantity": 1
          }
        ]
      }
    ]
  }
}
```

---

[⬅️ Volver al Módulo de Órdenes](./README.md)
