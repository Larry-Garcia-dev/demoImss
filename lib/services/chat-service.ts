import { callQwen } from "./qwen-client";
import { farmaciaTools } from "./ai-tools-schema";
import { checkStock, processDeliveryOrder } from "./inventory-service";

interface Message {
  role: string;
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
  tool_calls?: ToolCall[];
  name?: string;
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface OrderReceipt {
  orderId: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  status: "confirmed" | "pending" | "delivered";
}

export async function processUserMessage(
  userText: string,
  messageHistory: Message[] = [],
  fileBase64URI: string | null = null
) {
  // 1. Preparamos el contenido del usuario
  let userContent: string | { type: string; text?: string; image_url?: { url: string } }[] =
    userText || "Analiza el archivo adjunto.";

  // Si hay un archivo, usamos el formato de array para "Vision" o Multimodal
  if (fileBase64URI) {
    userContent = [
      {
        type: "text",
        text: userText || "Por favor, extrae la información de esta receta o historia clínica.",
      },
      { type: "image_url", image_url: { url: fileBase64URI } },
    ];
  }

  const messages: Message[] = [
    {
      role: "system",
      content:
        "Eres un asistente experto de farmacia. Tu tarea es ayudar a consultar inventarios y generar órdenes de medicamentos. Puedes leer recetas médicas en imágenes o PDFs. Siempre verifica el stock antes de confirmar una orden.",
    },
    ...messageHistory,
    { role: "user", content: userContent },
  ];

  // 2. Primera llamada a Qwen (le pasamos el mensaje y las herramientas disponibles)
  let aiResponse = await callQwen(messages, farmaciaTools);
  let orderReceipt: OrderReceipt | undefined = undefined;

  // 3. Verificamos si Qwen decidió llamar a una función (Tool Calling)
  if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
    messages.push(aiResponse); // Guardamos la petición de Qwen en el historial

    for (const toolCall of aiResponse.tool_calls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      let functionResult: Record<string, unknown> = {};

      console.log(`AI decidió ejecutar la herramienta: ${functionName} con args:`, args);

      // 4. Ejecutamos nuestra lógica de negocio local
      try {
        if (functionName === "consultar_inventario") {
          const stockResult = await checkStock(args.searchTerm);
          functionResult = stockResult as unknown as Record<string, unknown>;
        } else if (functionName === "generar_orden_entrega") {
          const orderResult = await processDeliveryOrder(args.productId, args.quantity);
          functionResult = orderResult as unknown as Record<string, unknown>;
          
          // Generate order receipt if successful
          if (orderResult.success) {
            const products = await checkStock("");
            const product = products.find((p) => p.id === args.productId);
            if (product) {
              const itemTotal = product.price * args.quantity;
              orderReceipt = {
                orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
                items: [
                  {
                    name: product.name,
                    quantity: args.quantity,
                    price: itemTotal,
                  },
                ],
                total: itemTotal,
                status: "confirmed",
              };
            }
          }
        }
      } catch (error) {
        functionResult = { error: error instanceof Error ? error.message : "Error desconocido" };
      }

      // 5. Devolvemos el resultado de la base de datos a Qwen
      messages.push({
        role: "tool",
        name: functionName,
        content: JSON.stringify(functionResult),
        tool_call_id: toolCall.id,
      });
    }

    // 6. Segunda llamada a Qwen (ahora con los datos reales) para que responda al usuario
    aiResponse = await callQwen(messages);
  }

  // Retornamos la respuesta en texto de la IA y el historial actualizado
  messages.push(aiResponse);
  return {
    reply: aiResponse.content,
    updatedHistory: messages.filter((m) => m.role !== "system"), // Ocultamos el system prompt al frontend
    orderReceipt,
  };
}
