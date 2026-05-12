import { processUserMessage } from '../../application/services/chatService.js';
import { bufferToBase64URI } from '../../infrastructure/utils/fileConverter.js';

// Debug logger
function logRequest(req, message, data = null) {
    const timestamp = new Date().toISOString();
    const requestId = req.requestId || 'unknown';
    console.log(`📨 [${timestamp}] [${requestId}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

export const chatController = {
    async handleChat(req, res) {
        // Generate request ID for tracking
        req.requestId = `chat_${Date.now().toString(36)}`;
        const startTime = Date.now();
        
        logRequest(req, 'Nueva solicitud de chat recibida', {
            hasMessage: !!req.body?.message,
            hasFile: !!req.file,
            historyLength: req.body?.history?.length || 0
        });

        try {
            const { message, history } = req.body;
            const file = req.file;

            // Validamos que al menos haya un mensaje de texto o un archivo
            if (!message && !file) {
                logRequest(req, 'Error: Solicitud sin mensaje ni archivo');
                return res.status(400).json({ 
                    success: false,
                    error: 'Debes enviar un mensaje o un archivo.',
                    errorCode: 'MISSING_INPUT',
                    requestId: req.requestId
                });
            }

            // Log file details if present
            if (file) {
                logRequest(req, 'Archivo adjunto detectado', {
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    size: `${(file.size / 1024).toFixed(2)} KB`
                });
            }

            // Convertimos el archivo a Base64 si existe
            let fileBase64URI = null;
            try {
                fileBase64URI = bufferToBase64URI(file);
            } catch (conversionError) {
                logRequest(req, 'Error convirtiendo archivo a Base64', {
                    error: conversionError.message
                });
                return res.status(400).json({
                    success: false,
                    error: 'Error procesando el archivo adjunto. Verifica que sea una imagen o PDF válido.',
                    errorCode: 'FILE_CONVERSION_ERROR',
                    requestId: req.requestId
                });
            }

            // Parse history if it's a string (from FormData)
            let parsedHistory = history || [];
            if (typeof history === 'string') {
                try {
                    parsedHistory = JSON.parse(history);
                } catch (parseError) {
                    logRequest(req, 'Error parseando historial', { 
                        error: parseError.message,
                        rawHistory: history?.substring(0, 100) 
                    });
                    parsedHistory = [];
                }
            }

            // Procesamos la petición
            logRequest(req, 'Procesando mensaje con servicio de chat...');
            const result = await processUserMessage(message, parsedHistory, fileBase64URI);

            const responseTime = Date.now() - startTime;
            
            // Check if there was an error in processing
            if (result.error) {
                logRequest(req, 'Respuesta con error del servicio', {
                    errorType: result.error.type,
                    responseTime: `${responseTime}ms`
                });
                
                return res.status(200).json({
                    success: true, // Still return 200 as the request was processed
                    reply: result.reply,
                    history: result.updatedHistory,
                    warning: result.error,
                    requestId: req.requestId,
                    responseTime
                });
            }

            logRequest(req, 'Solicitud procesada exitosamente', {
                responseTime: `${responseTime}ms`,
                replyLength: result.reply?.length || 0,
                hasOrderReceipt: !!result.orderReceipt
            });

            res.json({
                success: true,
                reply: result.reply,
                history: result.updatedHistory,
                orderReceipt: result.orderReceipt || null,
                requestId: req.requestId,
                responseTime
            });

        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            logRequest(req, 'Error crítico en controlador de chat', {
                errorName: error.name,
                errorMessage: error.message,
                stack: error.stack,
                responseTime: `${responseTime}ms`
            });

            // Determine appropriate status code and message
            let statusCode = 500;
            let errorMessage = 'Ocurrió un error procesando tu solicitud.';
            let errorCode = 'INTERNAL_ERROR';

            if (error.message.includes('API key')) {
                statusCode = 503;
                errorMessage = 'El servicio de IA no está configurado correctamente.';
                errorCode = 'AI_CONFIG_ERROR';
            } else if (error.message.includes('conexión') || error.message.includes('network')) {
                statusCode = 503;
                errorMessage = 'Error de conexión con el servicio de IA.';
                errorCode = 'NETWORK_ERROR';
            } else if (error.message.includes('timeout')) {
                statusCode = 504;
                errorMessage = 'El servicio de IA tardó demasiado en responder.';
                errorCode = 'TIMEOUT_ERROR';
            }

            res.status(statusCode).json({ 
                success: false,
                error: errorMessage,
                errorCode,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                requestId: req.requestId,
                responseTime
            });
        }
    }
};
