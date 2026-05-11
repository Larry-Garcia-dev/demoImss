const QWEN_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

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

interface Tool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface QwenResponse {
  role: string;
  content: string;
  tool_calls?: ToolCall[];
}

export async function callQwen(messages: Message[], tools: Tool[] = []): Promise<QwenResponse> {
  const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

  if (!DASHSCOPE_API_KEY) {
    console.warn("DASHSCOPE_API_KEY no está configurada. Usando respuesta simulada.");
    return generateSimulatedResponse(messages);
  }

  const payload: Record<string, unknown> = {
    model: "qwen-max",
    messages: messages,
  };

  // Si le pasamos herramientas (funciones), las añadimos al payload
  if (tools.length > 0) {
    payload.tools = tools;
  }

  try {
    const response = await fetch(QWEN_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error de DashScope:", errorData);
      throw new Error(`Error en la API de Qwen: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message;
  } catch (error) {
    console.error("Error comunicándose con Qwen:", error);
    // Fallback to simulated response
    return generateSimulatedResponse(messages);
  }
}

function generateSimulatedResponse(messages: Message[]): QwenResponse {
  const lastMessage = messages[messages.length - 1];
  const userContent =
    typeof lastMessage.content === "string"
      ? lastMessage.content.toLowerCase()
      : (lastMessage.content[0] as { text?: string })?.text?.toLowerCase() || "";

  // Check for tool results in messages
  const hasToolResult = messages.some((m) => m.role === "tool");

  if (hasToolResult) {
    // Find the tool result
    const toolMessage = messages.find((m) => m.role === "tool");
    if (toolMessage) {
      try {
        const result = JSON.parse(toolMessage.content as string);
        if (Array.isArray(result) && result.length > 0) {
          return {
            role: "assistant",
            content: `He encontrado los siguientes medicamentos en el inventario:\n\n${result
              .map(
                (item: { name: string; stock: number; price: number }) =>
                  `- **${item.name}**: ${item.stock} unidades disponibles (Precio: $${item.price})`
              )
              .join("\n")}\n\n¿Deseas que procese una orden de alguno de estos medicamentos?`,
          };
        } else if (result.success !== undefined) {
          return {
            role: "assistant",
            content: result.success
              ? `Orden procesada exitosamente. ${result.message} Stock actual: ${result.newStock} unidades.${result.alertTriggered ? "\n\n⚠️ Se ha generado una alerta automática al proveedor debido al bajo stock." : ""}`
              : `No se pudo procesar la orden: ${result.message}`,
          };
        }
      } catch {
        // Continue with default response
      }
    }
  }

  // Check if user is asking about inventory
  if (
    userContent.includes("stock") ||
    userContent.includes("disponible") ||
    userContent.includes("inventario") ||
    userContent.includes("medicamento") ||
    userContent.includes("paracetamol") ||
    userContent.includes("ibuprofeno")
  ) {
    // Return a tool call to check inventory
    const searchTerm =
      userContent.includes("paracetamol")
        ? "paracetamol"
        : userContent.includes("ibuprofeno")
          ? "ibuprofeno"
          : "paracetamol";

    return {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: `call_${Date.now()}`,
          function: {
            name: "consultar_inventario",
            arguments: JSON.stringify({ searchTerm }),
          },
        },
      ],
    };
  }

  // Check if user wants to place an order
  if (
    userContent.includes("orden") ||
    userContent.includes("pedir") ||
    userContent.includes("comprar") ||
    userContent.includes("ordenar")
  ) {
    return {
      role: "assistant",
      content:
        "Entendido. Para procesar tu orden, necesito que me indiques:\n\n1. ¿Qué medicamento deseas ordenar?\n2. ¿Cuántas unidades necesitas?\n\nTambién puedes adjuntar una receta médica si la tienes.",
    };
  }

  // Default response
  return {
    role: "assistant",
    content:
      "Estoy aquí para ayudarte con consultas de inventario de farmacia. Puedo:\n\n• Verificar la disponibilidad de medicamentos\n• Procesar órdenes de entrega\n• Analizar recetas médicas (adjunta una imagen)\n\n¿En qué puedo asistirte?",
  };
}
