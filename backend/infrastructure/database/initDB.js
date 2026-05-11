import pool from './connection.js';
import { productsSeed } from './seedData.js';

// Debug logger
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const icons = {
        info: '📘',
        success: '✅',
        error: '❌',
        warn: '⚠️',
        db: '🗄️'
    };
    console.log(`${icons[level] || '📝'} [${timestamp}] [DB] ${message}`);
    if (data) console.log(data);
}

export async function initializeDatabase() {
    log('db', 'Iniciando conexión con la base de datos...');
    
    try {
        // Test connection first
        try {
            await pool.query('SELECT 1');
            log('success', 'Conexión a MySQL establecida correctamente');
        } catch (connError) {
            log('error', 'No se pudo conectar a MySQL', {
                error: connError.message,
                code: connError.code,
                errno: connError.errno
            });
            
            if (connError.code === 'ECONNREFUSED') {
                log('warn', 'Verifica que MySQL esté ejecutándose y que las credenciales sean correctas');
            } else if (connError.code === 'ER_ACCESS_DENIED_ERROR') {
                log('warn', 'Credenciales de MySQL inválidas. Verifica DB_USER y DB_PASSWORD');
            } else if (connError.code === 'ER_BAD_DB_ERROR') {
                log('warn', 'La base de datos especificada no existe. Verifica DB_NAME');
            }
            
            throw connError;
        }

        // 1. Crear la tabla de productos si no existe
        log('db', 'Verificando/creando tabla "products"...');
        
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                active_principle VARCHAR(100) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                price DECIMAL(10, 2) NOT NULL,
                alert_threshold INT NOT NULL DEFAULT 10,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_name (name),
                INDEX idx_stock (stock)
            )
        `;
        await pool.query(createTableQuery);
        log('success', 'Tabla "products" verificada/creada');

        // 2. Verificar si ya hay datos para no duplicar
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM products');
        const productCount = rows[0].count;
        
        if (productCount === 0) {
            log('db', 'Base de datos vacía. Insertando datos de prueba...');
            
            const insertQuery = `
                INSERT INTO products (name, active_principle, stock, price, alert_threshold)
                VALUES ?
            `;
            
            // Convertir el array de objetos a un array de arrays para la inserción masiva
            const values = productsSeed.map(p => [
                p.name, p.active_principle, p.stock, p.price, p.alert_threshold
            ]);
            
            const [insertResult] = await pool.query(insertQuery, [values]);
            log('success', `${insertResult.affectedRows} medicamentos insertados correctamente`);
        } else {
            log('info', `Base de datos contiene ${productCount} medicamentos`);
        }

        // 3. Log table structure for debugging
        const [tableInfo] = await pool.query('DESCRIBE products');
        log('db', 'Estructura de tabla products:', tableInfo.map(col => `${col.Field} (${col.Type})`));

        return true;
        
    } catch (error) {
        log('error', 'Error inicializando la base de datos', {
            name: error.name,
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        
        // Don't exit, let the caller handle it
        throw error;
    }
}

// Export a function to check database health
export async function checkDatabaseHealth() {
    try {
        const start = Date.now();
        await pool.query('SELECT 1');
        const latency = Date.now() - start;
        
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM products');
        
        return {
            status: 'healthy',
            latency: `${latency}ms`,
            productCount: rows[0].count
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            code: error.code
        };
    }
}
