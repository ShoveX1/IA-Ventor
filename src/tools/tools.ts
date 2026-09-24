import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { cartService } from "../services/cart.service.js";

// 1. Declaración de las herramientas para DeepSeek API (Formato estándar OpenAI Tool Calling)
export const deepseekTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_catalog",
      description: "Busca productos en el catálogo de la tienda por nombre o descripción. Devuelve los productos disponibles y sus variantes (ID de variante, color, talla, precio y stock).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Término de búsqueda (ej. 'polo', 'casaca', 'rojo', 'oversize').",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Agrega una cantidad específica de un producto (variante) al carrito del usuario utilizando su variant_id.",
      parameters: {
        type: "object",
        properties: {
          variant_id: {
            type: "integer",
            description: "El ID único de la variante del producto (obtenido al buscar en el catálogo).",
          },
          quantity: {
            type: "integer",
            description: "La cantidad de unidades a agregar (debe ser mayor a 0).",
          },
        },
        required: ["variant_id", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "view_cart",
      description: "Muestra el estado actual del carrito de compras del usuario, incluyendo los items, tallas, colores, cantidades, subtotales y el total acumulado.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "checkout",
      description: "Cierra el carrito de compras del usuario actual y crea una orden de compra pendiente de pago (PENDING). Devuelve el total final y el ID de la orden.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "handoff_to_human",
      description: "Pausa el chatbot para que un agente humano tome el control de la conversación. Debe llamarse cuando el cliente pida hablar con un asesor/humano o cuando la IA no pueda resolver sus dudas.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "La razón por la cual se transfiere la conversación a un humano.",
          },
        },
        required: ["reason"],
      },
    },
  },
];

// 2. Ejecutor y despachador de herramientas en el backend
export async function executeTool(name: string, args: any, userId: number): Promise<any> {
  console.log(`🔌 Ejecutando herramienta [${name}] para el usuario ID ${userId} con argumentos:`, args);

  switch (name) {
    case "search_catalog":
      return await cartService.searchCatalog(args.query || "");

    case "add_to_cart":
      return await cartService.addToCart(userId, Number(args.variant_id), Number(args.quantity));

    case "view_cart":
      return await cartService.viewCart(userId);

    case "checkout":
      return await cartService.checkout(userId);

    case "handoff_to_human":
      return await cartService.handoffToHuman(userId, args.reason || "Solicitado por el usuario");

    default:
      throw new Error(`Herramienta no implementada: ${name}`);
  }
}
