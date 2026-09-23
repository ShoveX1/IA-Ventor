# 🔍 Consultar Catálogo Completo y Stock Disponible

Este endpoint retorna todos los productos del catálogo con sus respectivas variantes, tallas, colores, precios en Soles y stock operativo disponible calculado en tiempo real (restando reservas de carritos activos).

---

## 📡 Información del Endpoint

- **Método:** `GET`
- **URL:** `http://localhost:3000/api/admin/products`
- **Headers:**
  ```http
  Accept: application/json
  ```

---

## 📤 Respuesta Exitosa (200 OK)

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "name": "Polo Oversize Perú",
      "description": "Polo oversize de algodón reactivo 100% peruano (20/1). No encoge, no destiñe. Estilo urbano minimalista.",
      "categoryId": 2,
      "category": "Tops (Polos y Casacas)",
      "createdAt": "2026-08-23T20:00:00.000Z",
      "variants": [
        {
          "variant_id": 1,
          "sku": "POL-OVR-NEG-S",
          "size": "S",
          "color": "Negro",
          "price": 49.90,
          "priceCents": 4990,
          "stock": 15
        },
        {
          "variant_id": 2,
          "sku": "POL-OVR-NEG-M",
          "size": "M",
          "color": "Negro",
          "price": 49.90,
          "priceCents": 4990,
          "stock": 20
        },
        {
          "variant_id": 6,
          "sku": "POL-OVR-ROJ-M",
          "size": "M",
          "color": "Rojo",
          "price": 54.90,
          "priceCents": 5490,
          "stock": 10
        }
      ]
    }
  ]
}
```

### 📋 Campos Retornados:

- `price`: Precio listo para mostrar al usuario en Soles peruanos (`49.90`).
- `priceCents`: Precio en centavos tal como se almacena en la base de datos (`4990`).
- `stock`: Stock neto disponible (`physicalQuantity - reservedQuantity` a través de todos los lotes del producto).

---

## 💻 Ejemplo de Consumo en Frontend (React / Next.js Hook)

```typescript
import { useState, useEffect } from "react";

export function useCatalogo() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3000/api/admin/products")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setProductos(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return { productos, loading };
}
```

---

[⬅️ Volver al Módulo de Inventario](./README.md)
