import express from 'express';
import dotenv from 'dotenv';
import { initializeDatabase } from './infrastructure/database/initDB.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(express.json());

// Inicialización asíncrona
async function startServer() {
    // 1. Asegurar que la BD está lista antes de levantar el servidor
    await initializeDatabase();

    // 2. Rutas de prueba (Las moveremos luego)
    app.get('/api/health', (req, res) => {
        res.json({ status: 'OK', message: 'Servidor Farmacia AI funcionando' });
    });

    // 3. Iniciar servidor
    app.listen(PORT, () => {
        console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
        console.log('👀 Modo Watch activado. Esperando cambios...');
    });
}

startServer();