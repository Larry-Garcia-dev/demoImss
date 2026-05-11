import { Router } from 'express';
import { chatController } from '../controllers/chatController.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = Router();

// Usamos upload.single('file') para indicar que recibiremos un archivo bajo el campo "file"
router.post('/', upload.single('file'), chatController.handleChat);

router.get('/test', (req, res) => {
    res.json({ message: 'Ruta de chat funcionando correctamente' });
});

export default router;