# ⚙️ Endpoints Auxiliares: Categorías, Atributos, Proveedores y Reabastecimiento

Estos endpoints sirven para alimentar los desplegables (`<select>`), filtros y formularios de tu panel de administración, así como para ingresar nuevos lotes de mercadería a productos ya existentes.

---

## 1. Categorías

### 🔹 Listar Categorías
- **URL:** `GET http://localhost:3000/api/admin/categories`
- **Respuesta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Ropa Urbana",
      "parentId": null,
      "status": true,
      "subCategories": [
        { "id": 2, "name": "Tops (Polos y Casacas)", "parentId": 1, "status": true }
      ],
      "_count": { "products": 0 }
    },
    {
      "id": 2,
      "name": "Tops (Polos y Casacas)",
      "parentId": 1,
      "status": true,
      "subCategories": [],
      "_count": { "products": 2 }
    }
  ]
}
```

### 🔹 Crear Nueva Categoría o Subcategoría
- **URL:** `POST http://localhost:3000/api/admin/categories`
- **Body JSON:**
```json
{
  "name": "Pantalones y Joggers",
  "parentId": 1
}
```
*(Si es categoría principal, omite `parentId` o envíalo como `null`).*

---

## 2. Atributos Maestros (Tallas / Colores)

### 🔹 Consultar Atributos y sus Valores Disponibles
- **URL:** `GET http://localhost:3000/api/admin/attributes`
- **Respuesta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Talla",
      "values": [
        { "id": 1, "attributeId": 1, "value": "S" },
        { "id": 2, "attributeId": 1, "value": "M" },
        { "id": 3, "attributeId": 1, "value": "L" },
        { "id": 4, "attributeId": 1, "value": "XL" }
      ]
    },
    {
      "id": 2,
      "name": "Color",
      "values": [
        { "id": 6, "attributeId": 2, "value": "Negro" },
        { "id": 7, "attributeId": 2, "value": "Blanco" },
        { "id": 8, "attributeId": 2, "value": "Rojo" }
      ]
    }
  ]
}
```

### 🔹 Crear Nuevo Valor de Atributo (ej. Talla XXL o Color Beige)
- **URL:** `POST http://localhost:3000/api/admin/attributes/values`
- **Body JSON:**
```json
{
  "attributeId": 1,
  "value": "XXL"
}
```

---

## 3. Proveedores y Almacenes

### 🔹 Listar Proveedores
- **URL:** `GET http://localhost:3000/api/admin/suppliers`

### 🔹 Registrar Nuevo Proveedor
- **URL:** `POST http://localhost:3000/api/admin/suppliers`
- **Body JSON:**
```json
{
  "companyName": "Textiles del Sur S.A.C."
}
```

### 🔹 Listar Ubicaciones / Almacenes
- **URL:** `GET http://localhost:3000/api/admin/locations`
- **Respuesta (200 OK):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Almacén Central", "type": "ALMACEN" },
    { "id": 2, "name": "Tienda Miraflores", "type": "TIENDA" }
  ]
}
```

---

## 4. Reabastecimiento de Inventario (Nuevo Lote a Variante Existente)

Cuando te llega un nuevo cargamento de mercadería de un producto que ya creaste antes, debes registrar un nuevo `Batch` con su costo unitario correspondiente:

- **URL:** `POST http://localhost:3000/api/admin/inventory/entry`
- **Body JSON:**
```json
{
  "supplierId": 1,
  "locationId": 1,
  "items": [
    {
      "variantId": 1,
      "unitCost": 23.50,
      "quantity": 30
    },
    {
      "variantId": 2,
      "unitCost": 23.50,
      "quantity": 50
    }
  ]
}
```

---

[⬅️ Volver al Módulo de Inventario](./README.md)
