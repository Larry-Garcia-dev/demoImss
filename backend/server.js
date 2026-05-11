import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './infrastructure/database/initDB.js';
import chatRoutes from './presentation/routes/chatRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Logging helper
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const icons = {
        info: '📘',
        success: '✅',
        error: '❌',
        warn: '⚠️',
        startup: '🚀'
    };
    console.log(`${icons[level] || '📝'} [${timestamp}] ${message}`);
    if (data) console.log(data);
}

// Middlewares básicos
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusIcon = res.statusCode < 400 ? '✅' : '❌';
        log('info', `${statusIcon} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    log('error', 'Error no manejado', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        errorCode: 'UNHANDLED_ERROR',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Inicialización asíncrona
async function startServer() {
    log('startup', 'Iniciando servidor Farmacia AI...');
    
    // Check environment variables
    const requiredEnvVars = ['DASHSCOPE_API_KEY'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
        log('warn', `Variables de entorno faltantes: ${missingVars.join(', ')}`);
        log('warn', 'El servicio de IA puede no funcionar correctamente');
    } else {
        log('success', 'Todas las variables de entorno requeridas están configuradas');
    }

    // 1. Asegurar que la BD está lista antes de levantar el servidor
    try {
        await initializeDatabase();
        log('success', 'Base de datos inicializada correctamente');
    } catch (dbError) {
        log('error', 'Error inicializando base de datos', { error: dbError.message });
        log('warn', 'Continuando sin base de datos - algunas funciones pueden no estar disponibles');
    }

    // 2. Montar rutas de chat
    app.use('/api/chat', chatRoutes);
    log('info', 'Rutas de chat montadas en /api/chat');

    // 3. Ruta de salud con información detallada
    app.get('/api/health', (req, res) => {
        const healthInfo = {
            status: 'OK',
            message: 'Servidor Farmacia AI funcionando',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            endpoints: {
                chat: '/api/chat',
                health: '/api/health'
            },
            config: {
                hasAIKey: !!process.env.DASHSCOPE_API_KEY,
                hasDBConfig: !!(process.env.DB_HOST && process.env.DB_USER)
            }
        };
        res.json(healthInfo);
    });

    // 4. Ruta de debug (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
        app.get('/api/debug', (req, res) => {
            res.json({
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime(),
                envVars: {
                    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY ? '***configurado***' : 'NO CONFIGURADO',
                    DB_HOST: process.env.DB_HOST || 'NO CONFIGURADO',
                    DB_USER: process.env.DB_USER || 'NO CONFIGURADO',
                    DB_NAME: process.env.DB_NAME || 'NO CONFIGURADO',
                    PORT: process.env.PORT || '3000 (default)'
                }
            });
        });
        log('info', 'Endpoint de debug habilitado en /api/debug');
    }

    // 5. Manejo de rutas no encontradas
    app.use('*', (req, res) => {
        res.status(404).json({
            success: false,
            error: 'Ruta no encontrada',
            path: req.originalUrl,
            availableEndpoints: ['/api/chat', '/api/health']
        });
    });

    // 6. Iniciar servidor
    app.listen(PORT, () => {
        console.log('\n' + '='.repeat(50));
        log('startup', `Servidor ejecutándose en http://localhost:${PORT}`);
        console.log('='.repeat(50));
        console.log('\n📌 Endpoints disponibles:');
        console.log(`   POST http://localhost:${PORT}/api/chat`);
        console.log(`   GET  http://localhost:${PORT}/api/health`);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`   GET  http://localhost:${PORT}/api/debug`);
        }
        console.log('\n👀 Modo Watch activado. Esperando cambios...\n');
    });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log('error', 'Excepción no capturada', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log('error', 'Promesa rechazada no manejada', {
        reason: reason?.message || reason,
        stack: reason?.stack
    });
});

startServer();
