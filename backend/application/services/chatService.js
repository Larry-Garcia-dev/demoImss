import { callQwen, logDebug } from '../../infrastructure/ai/qwenClient.js';
import { farmaciaTools } from './aiToolsSchema.js';
import { checkStock, processDeliveryOrder, updateInventoryStock } from '../use-cases/inventoryUseCases.js';

export async function processUserMessage(userText, messageHistory = [], fileBase64URI = null) {
    const sessionId = `session_${Date.now().toString(36)}`;
    let orderReceipt = null; // Store order receipt if generated
    
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
                content: `Eres un asistente farmaceutico experto con acceso a la base de datos del inventario de la farmacia.

FUNCIONES PRINCIPALES:
1. CONSULTA DE SINTOMAS: Cuando un paciente describa sus sintomas, debes:
   - Analizar los sintomas descritos
   - Recomendar 2-4 medicamentos apropiados del inventario
   - Para CADA medicamento recomendado, incluir la FORMULA COMPLETA:
     * Nombre del medicamento
     * Dosis recomendada (ej: 500mg, 200mg)
     * Frecuencia (ej: cada 8 horas, cada 12 horas)
     * Duracion del tratamiento (ej: por 5 dias, por 7 dias)
     * Indicaciones especiales (con alimentos, antes de dormir, etc.)
   - Usar "consultar_inventario" para verificar disponibilidad antes de recomendar
   - Generar ordenes para los medicamentos recomendados

2. CONSULTA DE INVENTARIO: Usa "consultar_inventario" para buscar medicamentos por nombre o principio activo.

3. GENERACION DE ORDENES: Usa "generar_orden_entrega" con productName y quantity para procesar ventas.

4. ACTUALIZACION DE STOCK: Usa "actualizar_inventario" para agregar nuevas unidades.

FORMATO DE RECETA/RECOMENDACION:
Cuando recomiendes medicamentos por sintomas, usa este formato:

RECETA MEDICA:
1. [Nombre del medicamento]
   - Dosis: [cantidad]
   - Tomar: [frecuencia]
   - Duracion: [tiempo]
   - Indicaciones: [notas especiales]

2. [Siguiente medicamento...]

IMPORTANTE:
- SIEMPRE verifica disponibilidad en inventario antes de recomendar
- NUNCA inventes medicamentos que no esten en la base de datos
- Incluye advertencias si el paciente debe consultar un medico
- Al generar la orden, incluye todos los medicamentos recomendados

Responde siempre en espanol y de forma profesional y empatica.` 
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
                        // Support both productId and productName
                        const productIdentifier = args.productId || args.productName;
                        functionResult = await processDeliveryOrder(productIdentifier, args.quantity, args.productName);
                        logDebug('success', `[${sessionId}] Orden procesada`, {
                            productIdentifier,
                            productName: args.productName,
                            quantity: args.quantity,
                            success: functionResult.success
                        });
                        
                        // If order was successful, create receipt for frontend
                        if (functionResult.success) {
                            orderReceipt = {
                                orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
                                items: [{
                                    name: functionResult.productName,
                                    quantity: args.quantity,
                                    price: functionResult.totalAmount,
                                    unitPrice: functionResult.price,
                                    dosage: args.dosage || null,
                                    frequency: args.frequency || null,
                                    duration: args.duration || null,
                                    instructions: args.instructions || null
                                }],
                                total: functionResult.totalAmount,
                                status: 'confirmed',
                                date: new Date().toLocaleString('es-MX')
                            };
                        }
                    } else if (functionName === 'actualizar_inventario') {
                        functionResult = await updateInventoryStock(args.productName, args.quantity);
                        logDebug('success', `[${sessionId}] Inventario actualizado`, {
                            productName: args.productName,
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
            updatedHistory: messages.filter(m => m.role !== 'system'), // Ocultamos el system prompt al frontend
            orderReceipt // Include order receipt if one was generated
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
