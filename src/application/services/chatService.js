import { callQwen } from '../../infrastructure/ai/qwenClient.js';
import { farmaciaTools } from './aiToolsSchema.js';
import { checkStock, processDeliveryOrder } from '../use-cases/inventoryUseCases.js';

export async function processUserMessage(userText, messageHistory = [], fileBase64URI = null) {

    // 1. Preparamos el contenido del usuario
    let userContent = userText || "Analiza el archivo adjunto.";

    // Si hay un archivo, usamos el formato de array para "Vision" o Multimodal
    if (fileBase64URI) {
        userContent = [
            { type: "text", text: userText || "Por favor, extrae la información de esta receta o historia clínica." },
            { type: "image_url", image_url: { url: fileBase64URI } }
            // Nota: La API compatible con OpenAI usa "image_url" incluso para documentos Base64
        ];
    }

    const messages = [
        { role: 'system', content: 'Eres un asistente experto de farmacia. Tu tarea es ayudar a consultar inventarios y generar órdenes de medicamentos. Puedes leer recetas médicas en imágenes o PDFs. Siempre verifica el stock antes de confirmar una orden.' },
        ...messageHistory,
        { role: 'user', content: userContent }
    ];

    // 2. Primera llamada a Qwen (le pasamos el mensaje y las herramientas disponibles)
    let aiResponse = await callQwen(messages, farmaciaTools);

    // 3. Verificamos si Qwen decidió llamar a una función (Tool Calling)
    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        messages.push(aiResponse); // Guardamos la petición de Qwen en el historial

        for (const toolCall of aiResponse.tool_calls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            let functionResult = {};

            console.log(`🤖 Qwen decidió ejecutar la herramienta: ${functionName} con args:`, args);

            // 4. Ejecutamos nuestra lógica de negocio local (MySQL)
            try {
                if (functionName === 'consultar_inventario') {
                    functionResult = await checkStock(args.searchTerm);
                } else if (functionName === 'generar_orden_entrega') {
                    functionResult = await processDeliveryOrder(args.productId, args.quantity);
                }
            } catch (error) {
                functionResult = { error: error.message };
            }

            // 5. Devolvemos el resultado de la base de datos a Qwen
            messages.push({
                role: 'tool',
                name: functionName,
                content: JSON.stringify(functionResult),
                tool_call_id: toolCall.id
            });
        }

        // 6. Segunda llamada a Qwen (ahora con los datos reales de MySQL) para que responda al usuario
        aiResponse = await callQwen(messages);
    }

    // Retornamos la respuesta en texto de la IA y el historial actualizado
    messages.push(aiResponse);
    return {
        reply: aiResponse.content,
        updatedHistory: messages.filter(m => m.role !== 'system') // Ocultamos el system prompt al frontend
    };
}