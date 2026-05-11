import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Log database configuration (without sensitive data)
function logDbConfig() {
    const timestamp = new Date().toISOString();
    console.log(`🗄️ [${timestamp}] [DB] Configuración de base de datos:`);
    console.log(`   - Host: ${process.env.DB_HOST || 'NO CONFIGURADO'}`);
    console.log(`   - Usuario: ${process.env.DB_USER || 'NO CONFIGURADO'}`);
    console.log(`   - Base de datos: ${process.env.DB_NAME || 'NO CONFIGURADO'}`);
    console.log(`   - Password: ${process.env.DB_PASSWORD ? '***configurado***' : 'NO CONFIGURADO'}`);
}

// Check if required environment variables are set
function validateDbConfig() {
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingVars = requiredVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
        console.warn(`⚠️ Variables de BD faltantes: ${missingVars.join(', ')}`);
        console.warn('   Crea un archivo .env con las siguientes variables:');
        console.warn('   DB_HOST=localhost');
        console.warn('   DB_USER=tu_usuario');
        console.warn('   DB_PASSWORD=tu_password');
        console.warn('   DB_NAME=farmacia_ai');
        return false;
    }
    return true;
}

logDbConfig();

// Create pool with error handling
let pool;

if (validateDbConfig()) {
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        // Timeout settings
        connectTimeout: 10000, // 10 seconds
        acquireTimeout: 10000,
    });

    // Handle pool errors
    pool.on('error', (err) => {
        console.error(`❌ [DB Pool Error] ${err.code}: ${err.message}`);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.warn('⚠️ Conexión a la base de datos perdida. Intentando reconectar...');
        }
    });
} else {
    // Create a mock pool that throws helpful errors
    pool = {
        query: async () => {
            throw new Error('Base de datos no configurada. Por favor configura las variables de entorno DB_HOST, DB_USER, DB_PASSWORD, y DB_NAME');
        },
        getConnection: async () => {
            throw new Error('Base de datos no configurada');
        },
        on: () => {} // No-op for event handlers
    };
}

export default pool;

// Export a health check function
export async function checkConnection() {
    try {
        const start = Date.now();
        await pool.query('SELECT 1 as health');
        const latency = Date.now() - start;
        return { connected: true, latency };
    } catch (error) {
        return { connected: false, error: error.message, code: error.code };
    }
}
