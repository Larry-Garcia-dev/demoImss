import dotenv from 'dotenv';
dotenv.config();

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
// Use the INTERNATIONAL endpoint with OpenAI-compatible format for better tool support
const QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

// Debug logger helper
function logDebug(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: '📘 [INFO]',
        warn: '⚠️ [WARN]',
        error: '❌ [ERROR]',
        success: '✅ [SUCCESS]',
        debug: '🔍 [DEBUG]'
    }[level] || '📝 [LOG]';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// Validate API key on startup
function validateApiKey() {
    if (!DASHSCOPE_API_KEY) {
        logDebug('error', 'DASHSCOPE_API_KEY no está configurada en las variables de entorno');
        return false;
    }
    if (DASHSCOPE_API_KEY.length < 10) {
        logDebug('error', 'DASHSCOPE_API_KEY parece inválida (muy corta)');
        return false;
    }
    logDebug('info', 'DASHSCOPE_API_KEY configurada correctamente');
    return true;
}

export async function callQwen(messages, tools = []) {
    const requestId = `req_${Date.now().toString(36)}`;
    
    logDebug('info', `[${requestId}] Iniciando llamada a Qwen API (International)`);
    logDebug('debug', `[${requestId}] Mensajes:`, { 
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.role 
    });
    
    // Validate API key
    if (!validateApiKey()) {
        const error = new Error('API key no configurada. Por favor configura DASHSCOPE_API_KEY en tu archivo .env');
        logDebug('error', `[${requestId}] ${error.message}`);
        throw error;
    }

    // Build payload using OpenAI-compatible format for better tool calling support
    const payload = {
        model: 'qwen-max',
        messages: messages
    };

    // Add tools if provided (for function calling)
    if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
        logDebug('debug', `[${requestId}] Herramientas configuradas:`, tools.map(t => t.function?.name));
    }

    try {
        // Log the full payload for debugging
        logDebug('debug', `[${requestId}] Payload completo:`, {
            model: payload.model,
            messagesCount: payload.messages.length,
            hasTools: !!payload.tools,
            toolsCount: payload.tools?.length || 0,
            toolNames: payload.tools?.map(t => t.function?.name) || [],
            toolChoice: payload.tool_choice
        });
        
        logDebug('info', `[${requestId}] Enviando request a ${QWEN_API_URL}`);
        const startTime = Date.now();
        
        const response = await fetch(QWEN_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseTime = Date.now() - startTime;
        logDebug('info', `[${requestId}] Respuesta recibida en ${responseTime}ms - Status: ${response.status}`);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: 'No se pudo parsear la respuesta de error' };
            }
            
            logDebug('error', `[${requestId}] Error de DashScope API`, {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });

            // Provide specific error messages based on status code
            let errorMessage;
            switch (response.status) {
                case 401:
                    errorMessage = 'API key inválida o expirada. Verifica tu DASHSCOPE_API_KEY';
                    break;
                case 429:
                    errorMessage = 'Límite de rate excedido. Espera un momento antes de reintentar';
                    break;
                case 500:
                    errorMessage = 'Error interno del servidor de Qwen. Intenta de nuevo más tarde';
                    break;
                case 503:
                    errorMessage = 'Servicio de Qwen no disponible temporalmente';
                    break;
                default:
                    errorMessage = `Error en la API de Qwen: ${response.status} - ${errorData?.error?.message || errorData?.message || response.statusText}`;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        logDebug('debug', `[${requestId}] Respuesta raw de DashScope:`, {
            hasChoices: !!data.choices,
            choicesLength: data.choices?.length || 0,
            id: data.id
        });

        // OpenAI-compatible format: response is in data.choices[0].message
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            logDebug('error', `[${requestId}] Respuesta inesperada de Qwen`, data);
            throw new Error('Formato de respuesta inesperado de Qwen API');
        }

        const aiMessage = data.choices[0].message;
        
        // Log full response for debugging tool calls
        logDebug('debug', `[${requestId}] Mensaje AI completo:`, {
            role: aiMessage.role,
            content: aiMessage.content,
            tool_calls: aiMessage.tool_calls || 'ninguno'
        });
        
        logDebug('success', `[${requestId}] Respuesta procesada correctamente`, {
            hasContent: !!aiMessage.content,
            contentPreview: aiMessage.content?.substring(0, 100) + (aiMessage.content?.length > 100 ? '...' : ''),
            hasToolCalls: !!(aiMessage.tool_calls && aiMessage.tool_calls.length > 0),
            toolCallsCount: aiMessage.tool_calls?.length || 0,
            toolCalls: aiMessage.tool_calls?.map(tc => ({
                id: tc.id,
                name: tc.function?.name,
                args: tc.function?.arguments
            })) || [],
            usage: data.usage
        });

        return aiMessage;
        
    } catch (error) {
        // Network or fetch errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            logDebug('error', `[${requestId}] Error de red`, { 
                message: error.message,
                cause: 'Posible problema de conectividad o URL inválida'
            });
            throw new Error('Error de conexión con Qwen API. Verifica tu conexión a internet');
        }
        
        // Re-throw known errors
        if (error.message.includes('API') || error.message.includes('Qwen')) {
            throw error;
        }
        
        // Unknown errors
        logDebug('error', `[${requestId}] Error inesperado`, {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        throw new Error(`Error inesperado al comunicarse con Qwen: ${error.message}`);
    }
}

// Export debug logger for use in other modules
export { logDebug };
