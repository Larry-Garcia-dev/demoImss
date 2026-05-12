import pdf from 'pdf-parse/lib/pdf-parse.js';

/**
 * Extracts text content from a PDF buffer
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {Promise<{success: boolean, text: string, pages: number, error?: string}>}
 */
export async function extractTextFromPDF(buffer) {
    try {
        if (!buffer || buffer.length === 0) {
            return {
                success: false,
                text: '',
                pages: 0,
                error: 'Buffer vacío o inválido'
            };
        }

        const data = await pdf(buffer);
        
        return {
            success: true,
            text: data.text.trim(),
            pages: data.numpages,
            info: data.info
        };
    } catch (error) {
        console.error('Error extrayendo texto del PDF:', error.message);
        return {
            success: false,
            text: '',
            pages: 0,
            error: error.message
        };
    }
}

/**
 * Checks if a file is a PDF based on mimetype
 * @param {string} mimetype 
 * @returns {boolean}
 */
export function isPDF(mimetype) {
    return mimetype === 'application/pdf';
}

/**
 * Checks if a file is an image based on mimetype
 * @param {string} mimetype 
 * @returns {boolean}
 */
export function isImage(mimetype) {
    return mimetype && mimetype.startsWith('image/');
}
