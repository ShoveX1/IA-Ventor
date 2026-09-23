import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Limpiando la base de datos completa...");
  await prisma.movementHistory.deleteMany({});
  await prisma.movementType.deleteMany({});
  await prisma.return.deleteMany({});
  await prisma.orderDetail.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.currentInventory.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.stockEntry.deleteMany({});
  await prisma.variantDetail.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.attributeValue.deleteMany({});
  await prisma.attribute.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.chatSession.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.processedWebhook.deleteMany({});

  console.log("🌱 Sembrando maestros e infraestructura logísticos...");

  // 1. Categorías
  const catRopa = await prisma.category.create({
    data: { name: "Ropa Urbana", status: true },
  });
  const catTops = await prisma.category.create({
    data: { name: "Tops (Polos y Casacas)", parentId: catRopa.id, status: true },
  });
  const catAccesorios = await prisma.category.create({
    data: { name: "Accesorios", status: true },
  });

  // 2. Ubicaciones (Default ID 1: Almacén Central)
  const locAlmacen = await prisma.location.create({
    data: { name: "Almacén Central", type: "ALMACEN" },
  });
  const locTienda = await prisma.location.create({
    data: { name: "Tienda Miraflores", type: "TIENDA" },
  });

  // 3. Proveedores
  const supplierGamarra = await prisma.supplier.create({
    data: { companyName: "Confecciones Gamarra S.A.C.", status: true },
  });

  // 4. Atributos y Valores (Talla y Color)
  const attrTalla = await prisma.attribute.create({ data: { name: "Talla" } });
  const attrColor = await prisma.attribute.create({ data: { name: "Color" } });

  const valS = await prisma.attributeValue.create({ data: { attributeId: attrTalla.id, value: "S" } });
  const valM = await prisma.attributeValue.create({ data: { attributeId: attrTalla.id, value: "M" } });
  const valL = await prisma.attributeValue.create({ data: { attributeId: attrTalla.id, value: "L" } });
  const valXL = await prisma.attributeValue.create({ data: { attributeId: attrTalla.id, value: "XL" } });
  const valEstandar = await prisma.attributeValue.create({ data: { attributeId: attrTalla.id, value: "Estándar" } });

  const valNegro = await prisma.attributeValue.create({ data: { attributeId: attrColor.id, value: "Negro" } });
  const valBlanco = await prisma.attributeValue.create({ data: { attributeId: attrColor.id, value: "Blanco" } });
  const valRojo = await prisma.attributeValue.create({ data: { attributeId: attrColor.id, value: "Rojo" } });
  const valAzul = await prisma.attributeValue.create({ data: { attributeId: attrColor.id, value: "Azul Marino" } });
  const valVerde = await prisma.attributeValue.create({ data: { attributeId: attrColor.id, value: "Verde Militar" } });

  // 5. Tipos de Movimiento (Ledger)
  const movIngreso = await prisma.movementType.create({ data: { code: "INGRESO", multiplier: 1 } });
  const movVenta = await prisma.movementType.create({ data: { code: "VENTA", multiplier: -1 } });
  const movDevolucion = await prisma.movementType.create({ data: { code: "DEVOLUCION", multiplier: 1 } });
  const movAjuste = await prisma.movementType.create({ data: { code: "AJUSTE", multiplier: 0 } });

  console.log("👕 Sembrando productos, variantes y lotes de inventario...");

  // Stock Entry inicial
  const stockEntry = await prisma.stockEntry.create({
    data: {
      supplierId: supplierGamarra.id,
      status: "RECIBIDO",
    },
  });

  // Helper para crear variante con Lote e Inventario inicial
  async function createVariantWithBatch(
    productId: number,
    sku: string,
    priceInCents: number, // Int centavos
    unitCostInCents: number, // Int centavos
    initialStock: number,
    attributeValueIds: number[]
  ) {
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku,
        price: priceInCents,
        variantDetails: {
          create: attributeValueIds.map((valId) => ({
            attributeValueId: valId,
          })),
        },
      },
    });

    const batch = await prisma.batch.create({
      data: {
        variantId: variant.id,
        stockEntryId: stockEntry.id,
        unitCost: unitCostInCents,
      },
    });

    await prisma.currentInventory.create({
      data: {
        batchId: batch.id,
        locationId: locAlmacen.id,
        physicalQuantity: initialStock,
        reservedQuantity: 0,
      },
    });

    await prisma.movementHistory.create({
      data: {
        variantId: variant.id,
        batchId: batch.id,
        movementTypeId: movIngreso.id,
        destinationLocationId: locAlmacen.id,
        movedQuantity: initialStock,
        historicalPrice: unitCostInCents,
        stockEntryId: stockEntry.id,
      },
    });

    return variant;
  }

  // Producto 1: Polo Oversize Perú
  const polo = await prisma.product.create({
    data: {
      name: "Polo Oversize Perú",
      description: "Polo oversize de algodón reactivo 100% peruano (20/1). No encoge, no destiñe. Estilo urbano minimalista.",
      categoryId: catTops.id,
    },
  });

  await createVariantWithBatch(polo.id, "POL-OVR-NEG-S", 4990, 2200, 15, [valS.id, valNegro.id]);
  await createVariantWithBatch(polo.id, "POL-OVR-NEG-M", 4990, 2200, 20, [valM.id, valNegro.id]);
  await createVariantWithBatch(polo.id, "POL-OVR-NEG-L", 4990, 2200, 8, [valL.id, valNegro.id]);
  await createVariantWithBatch(polo.id, "POL-OVR-BLA-M", 4990, 2200, 12, [valM.id, valBlanco.id]);
  await createVariantWithBatch(polo.id, "POL-OVR-BLA-L", 4990, 2200, 5, [valL.id, valBlanco.id]);
  await createVariantWithBatch(polo.id, "POL-OVR-ROJ-M", 5490, 2500, 10, [valM.id, valRojo.id]);

  // Producto 2: Casaca Cortaviento
  const casaca = await prisma.product.create({
    data: {
      name: "Casaca Cortaviento Andina",
      description: "Casaca cortaviento impermeable con forro de malla interno. Capucha ajustable y bolsillos con cierre. Ideal para el clima de Lima.",
      categoryId: catTops.id,
    },
  });

  await createVariantWithBatch(casaca.id, "CAS-COR-AZU-M", 11990, 5500, 7, [valM.id, valAzul.id]);
  await createVariantWithBatch(casaca.id, "CAS-COR-AZU-L", 11990, 5500, 10, [valL.id, valAzul.id]);
  await createVariantWithBatch(casaca.id, "CAS-COR-AZU-XL", 11990, 5500, 3, [valXL.id, valAzul.id]);
  await createVariantWithBatch(casaca.id, "CAS-COR-VER-M", 11990, 5500, 8, [valM.id, valVerde.id]);

  // Producto 3: Gorra Urbana
  const gorra = await prisma.product.create({
    data: {
      name: "Gorra Urbana Chala",
      description: "Gorra de gabardina premium con regulador de hebilla metálica. Bordado frontal minimalista de alta definición.",
      categoryId: catAccesorios.id,
    },
  });

  await createVariantWithBatch(gorra.id, "GOR-URB-NEG-E", 3500, 1500, 25, [valEstandar.id, valNegro.id]);
  await createVariantWithBatch(gorra.id, "GOR-URB-BLA-E", 3500, 1500, 15, [valEstandar.id, valBlanco.id]);

  console.log("✅ ¡Siembra de datos finalizada con éxito con la nueva arquitectura por Lotes y centavos!");
}

main()
  .catch((e) => {
    console.error("❌ Error al sembrar la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
