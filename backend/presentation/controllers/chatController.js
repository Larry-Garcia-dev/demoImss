import { processUserMessage } from '../../application/services/chatService.js';
import { bufferToBase64URI } from '../../infrastructure/utils/fileConverter.js';

export const chatController = {
    async handleChat(req, res) {
        try {
            const { message, history } = req.body;
            const file = req.file; // Archivo capturado por Multer

            // Validamos que al menos haya un mensaje de texto o un archivo
            if (!message && !file) {
                return res.status(400).json({ error: 'Debes enviar un mensaje o un archivo.' });
            }

            // Convertimos el archivo a Base64 si existe
            const fileBase64URI = bufferToBase64URI(file);

            // Procesamos la petición
            const result = await processUserMessage(message, history || [], fileBase64URI);

            res.json({
                success: true,
                reply: result.reply,
                history: result.updatedHistory
            });
        } catch (error) {
            console.error('❌ Error en el controlador de chat:', error);
            res.status(500).json({ error: error.message || 'Ocurrió un error procesando tu solicitud.' });
        }
    }
};