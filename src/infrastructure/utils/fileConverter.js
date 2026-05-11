/**
 * Convierte un archivo de multer (buffer) a un Data URI en formato Base64.
 * Formato resultante: "data:image/png;base64,iVBORw0KGgo..."
 */
export function bufferToBase64URI(file) {
    if (!file || !file.buffer || !file.mimetype) {
        return null;
    }
    const base64String = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64String}`;
}