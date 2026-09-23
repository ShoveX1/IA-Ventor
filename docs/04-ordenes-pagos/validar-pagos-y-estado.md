# ✅ Validar Pagos y Actualizar Estado de Orden

Una vez que el administrador verifica visualmente que el abono de Yape o BCP ingresó a la cuenta bancaria, se llama a este endpoint para cambiar el estado de la orden a `PAID` (o actualizar el estado de envío).

---

## 📡 Información del Endpoint

- **Método:** `PATCH`
- **URL:** `http://localhost:3000/api/admin/orders/:id/status`
- **Parámetro de Ruta:** `:id` (ID entero de la orden, ej: `1`).
- **Headers:** `Content-Type: application/json`

---

## 📝 Estructura del Payload JSON (Request Body)

Puedes enviar `paymentStatus`, `logisticStatus` o ambos:

```json
{
  "paymentStatus": "PAID",
  "logisticStatus": "SHIPPED"
}
```

### 📋 Valores Válidos:
- **`paymentStatus`:** `"PENDING"`, `"PAID"`, `"CANCELLED"`
- **`logisticStatus`:** `"PENDING"`, `"SHIPPED"`, `"DELIVERED"`

---

## 📤 Respuesta Exitosa (200 OK)

```json
{
  "success": true,
  "message": "Estado de orden actualizado exitosamente.",
  "data": {
    "id": 1,
    "userId": 1,
    "total": 4990,
    "paymentStatus": "PAID",
    "logisticStatus": "SHIPPED",
    "paymentMethod": "YAPE",
    "updatedAt": "2026-08-23T22:30:00.000Z"
  }
}
```

---

## 💻 Ejemplo de Botón "Aprobar Pago" en Frontend (React / TypeScript)

```typescript
async function aprobarPago(orderId: number) {
  const res = await fetch(`http://localhost:3000/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentStatus: "PAID"
    })
  });

  const json = await res.json();
  if (json.success) {
    alert("¡Pago aprobado con éxito!");
  }
}
```

---

[⬅️ Volver al Módulo de Órdenes](./README.md)
