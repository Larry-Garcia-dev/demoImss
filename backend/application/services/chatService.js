import { callQwen, logDebug } from '../../infrastructure/ai/qwenClient.js';
import { farmaciaTools } from './aiToolsSchema.js';
import { checkStock, processDeliveryOrder } from '../use-cases/inventoryUseCases.js';

export async function processUserMessage(userText, messageHistory = [], fileBase64URI = null) {
    const sessionId = `session_${Date.now().toString(36)}`;
    
    logDebug('info', `[${sessionId}] Procesando mensaje de usuario`);
    
    try {
        // 1. Preparamos el contenido del usuario
        let userContent = userText || "Analiza el archivo adjunto.";

        // Si hay un archivo, usamos el formato de array para "Vision" o Multimodal
        if (fileBase64URI) {
            logDebug('debug', `[${sessionId}] Archivo adjunto detectado`);
            userContent = [
                { type: "text", text: userText || "Por favor, extrae la información de esta receta o historia clínica." },
                { type: "image_url", image_url: { url: fileBase64URI } }
            ];
        }

        const messages = [
            { 
                role: 'system', 
                content: `Eres un asistente experto de farmacia con acceso directo a la base de datos del inventario.

REGLAS IMPORTANTES:
1. SIEMPRE que el usuario pregunte por disponibilidad, stock, precio o información de medicamentos, DEBES usar la herramienta "consultar_inventario" para obtener datos reales de la base de datos.
2. NUNCA inventes información sobre medicamentos. Solo proporciona datos obtenidos de las herramientas.
3. Para generar órdenes de entrega, usa "generar_orden_entrega" con el ID del producto y la cantidad.
4. Si el usuario menciona un medicamento, busca primero en el inventario antes de responder.

Tienes acceso a estas herramientas:
- consultar_inventario: Busca medicamentos en la base de datos por nombre o principio activo
- generar_orden_entrega: Procesa una orden descontando del inventario

Responde siempre en español y de forma profesional.` 
            },
            ...messageHistory,
            { role: 'user', content: userContent }
        ];

        logDebug('debug', `[${sessionId}] Historial de mensajes: ${messages.length} mensajes`);

        // 2. Primera llamada a Qwen (le pasamos el mensaje y las herramientas disponibles)
        let aiResponse;
        try {
            aiResponse = await callQwen(messages, farmaciaTools);
        } catch (error) {
            logDebug('error', `[${sessionId}] Error en primera llamada a Qwen`, { error: error.message });
            return {
                reply: `Lo siento, hubo un problema al procesar tu mensaje: ${error.message}`,
                updatedHistory: messageHistory,
                error: {
                    type: 'AI_ERROR',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            };
        }

        // 3. Verificamos si Qwen decidió llamar a una función (Tool Calling)
        if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
            logDebug('info', `[${sessionId}] AI solicitó ${aiResponse.tool_calls.length} herramienta(s)`);
            
            messages.push(aiResponse); // Guardamos la petición de Qwen en el historial

            for (const toolCall of aiResponse.tool_calls) {
                const functionName = toolCall.function.name;
                let args;
                
                try {
                    args = JSON.parse(toolCall.function.arguments);
                } catch (parseError) {
                    logDebug('error', `[${sessionId}] Error parseando argumentos de herramienta`, {
                        functionName,
                        rawArgs: toolCall.function.arguments,
                        error: parseError.message
                    });
                    args = {};
                }

                let functionResult = {};

                logDebug('info', `[${sessionId}] Ejecutando herramienta: ${functionName}`, args);

                // 4. Ejecutamos nuestra lógica de negocio local (MySQL)
                try {
                    if (functionName === 'consultar_inventario') {
                        functionResult = await checkStock(args.searchTerm);
                        logDebug('success', `[${sessionId}] Consulta de inventario completada`, {
                            searchTerm: args.searchTerm,
                            resultsCount: Array.isArray(functionResult) ? functionResult.length : 1
                        });
                    } else if (functionName === 'generar_orden_entrega') {
                        functionResult = await processDeliveryOrder(args.productId, args.quantity);
                        logDebug('success', `[${sessionId}] Orden procesada`, {
                            productId: args.productId,
                            quantity: args.quantity,
                            success: functionResult.success
                        });
                    } else {
                        logDebug('warn', `[${sessionId}] Herramienta desconocida solicitada: ${functionName}`);
                        functionResult = { error: `Herramienta '${functionName}' no implementada` };
                    }
                } catch (error) {
                    logDebug('error', `[${sessionId}] Error ejecutando herramienta ${functionName}`, {
                        error: error.message,
                        stack: error.stack
                    });
                    functionResult = { 
                        error: error.message,
                        errorType: 'TOOL_EXECUTION_ERROR'
                    };
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
            try {
                aiResponse = await callQwen(messages);
            } catch (error) {
                logDebug('error', `[${sessionId}] Error en segunda llamada a Qwen`, { error: error.message });
                return {
                    reply: `Obtuve los datos pero hubo un problema al generar la respuesta: ${error.message}`,
                    updatedHistory: messages.filter(m => m.role !== 'system'),
                    error: {
                        type: 'AI_RESPONSE_ERROR',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    }
                };
            }
        }

        // Retornamos la respuesta en texto de la IA y el historial actualizado
        messages.push(aiResponse);
        
        logDebug('success', `[${sessionId}] Mensaje procesado exitosamente`);
        
        return {
            reply: aiResponse.content,
            updatedHistory: messages.filter(m => m.role !== 'system') // Ocultamos el system prompt al frontend
        };
        
    } catch (error) {
        logDebug('error', `[${sessionId}] Error general en processUserMessage`, {
            error: error.message,
            stack: error.stack
        });
        
        return {
            reply: 'Lo siento, ocurrió un error inesperado. Por favor intenta de nuevo.',
            updatedHistory: messageHistory,
            error: {
                type: 'GENERAL_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
}
