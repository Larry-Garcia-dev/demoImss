import multer from 'multer';

// Usamos almacenamiento en memoria para procesar el archivo directamente a Base64
const storage = multer.memoryStorage();

// Filtro para aceptar solo imágenes y PDFs
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de archivo no soportado. Sube una imagen (JPG, PNG, WEBP) o un PDF.'), false);
    }
};

export const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5 MB
});