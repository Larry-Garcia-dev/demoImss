import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './infrastructure/database/initDB.js';
import chatRoutes from './presentation/routes/chatRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicialización asíncrona
async function startServer() {
    // 1. Asegurar que la BD está lista antes de levantar el servidor
    await initializeDatabase();

    // 2. Montar rutas de chat
    app.use('/api/chat', chatRoutes);

    // 3. Ruta de salud
    app.get('/api/health', (req, res) => {
        res.json({ status: 'OK', message: 'Servidor Farmacia AI funcionando' });
    });

    // 4. Iniciar servidor
    app.listen(PORT, () => {
        console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
        console.log('👀 Modo Watch activado. Esperando cambios...');
    });
}

startServer();
