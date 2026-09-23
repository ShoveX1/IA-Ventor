# ➕ Crear Producto con Variantes, Lote e Inventario Inicial

Este endpoint te permite dar de alta un producto completo en la base de datos de manera **100% transaccional** desde tu formulario o Frontend. Crea automáticamente el producto, las variantes de talla/color, el ingreso de mercadería (`StockEntry`), el lote (`Batch`), el stock físico inicial (`CurrentInventory`) y la entrada contable en el Libro Mayor (`MovementHistory`).

---

## 📡 Información del Endpoint

- **Método:** `POST`
- **URL:** `http://localhost:3000/api/admin/products`
- **Headers:**
  ```http
  Content-Type: application/json
  ```

---

## 📝 Estructura del Payload JSON (Request Body)

```json
{
  "name": "Polo Oversize Perú",
  "description": "Polo de algodón reactivo 100% peruano (20/1). No encoge ni destiñe. Corte urbano.",
  "categoryId": 2,
  "supplierId": 1,
  "locationId": 1,
  "variants": [
    {
      "sku": "POL-OVR-NEG-S",
      "size": "S",
      "color": "Negro",
      "price": 49.90,
      "unitCost": 22.00,
      "initialStock": 15
    },
    {
      "sku": "POL-OVR-NEG-M",
      "size": "M",
      "color": "Negro",
      "price": 49.90,
      "unitCost": 22.00,
      "initialStock": 20
    },
    {
      "sku": "POL-OVR-NEG-L",
      "size": "L",
      "color": "Negro",
      "price": 49.90,
      "unitCost": 22.00,
      "initialStock": 10
    },
    {
      "sku": "POL-OVR-ROJ-M",
      "size": "M",
      "color": "Rojo",
      "price": 54.90,
      "unitCost": 25.00,
      "initialStock": 8
    }
  ]
}
```

### 📋 Descripción de Campos:

| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :---: | :--- |
| `name` | String | Sí | Nombre comercial del producto. |
| `description` | String | Sí | Descripción técnica/comercial. La IA María la usará para convencer al cliente. |
| `categoryId` | Int | Sí | ID de la categoría (obtenida de `GET /api/admin/categories`). |
| `supplierId` | Int | No | ID del proveedor (default: primer proveedor registrado). |
| `locationId` | Int | No | ID del almacén donde se guarda el stock (default: Almacén Central ID 1). |
| `variants` | Array | Sí | Lista de variantes (mínimo 1). |
| `variants[].sku` | String | Sí | Código único de SKU para esa combinación. |
| `variants[].size` | String | Sí | Talla (`S`, `M`, `L`, `XL`, `Estándar`, etc.). Si no existe, se crea automáticamente. |
| `variants[].color` | String | Sí | Color (`Negro`, `Blanco`, `Rojo`, etc.). Si no existe, se crea automáticamente. |
| `variants[].price` | Number | Sí | Precio de venta en Soles (ej: `49.90`) o en centavos (`4990`). |
| `variants[].unitCost` | Number | Sí | Costo de compra unitario en Soles (ej: `22.00`) para costeo por lote FIFO. |
| `variants[].initialStock` | Int | Sí | Cantidad física de unidades que ingresan al almacén. |

---

## 📤 Respuesta Exitosa (201 Created)

```json
{
  "success": true,
  "message": "Producto y variantes creados exitosamente en el inventario con lote inicial.",
  "data": {
    "productId": 4,
    "name": "Polo Oversize Perú",
    "description": "Polo de algodón reactivo 100% peruano (20/1). No encoge ni destiñe. Corte urbano.",
    "categoryId": 2,
    "stockEntryId": 2,
    "variants": [
      {
        "variantId": 13,
        "sku": "POL-OVR-NEG-S",
        "size": "S",
        "color": "Negro",
        "priceSoles": 49.90,
        "unitCostSoles": 22.00,
        "stock": 15,
        "batchId": 13
      },
      {
        "variantId": 14,
        "sku": "POL-OVR-NEG-M",
        "size": "M",
        "color": "Negro",
        "priceSoles": 49.90,
        "unitCostSoles": 22.00,
        "stock": 20,
        "batchId": 14
      }
    ]
  }
}
```

---

## 💻 Ejemplo de Consumo en Frontend (JavaScript / TypeScript / Fetch)

```typescript
async function crearProducto(productoData) {
  const response = await fetch("http://localhost:3000/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productoData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Error al crear producto");
  }
  return data;
}
```

---

[⬅️ Volver al Módulo de Inventario](./README.md)
