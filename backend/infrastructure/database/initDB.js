import pool from './connection.js';
import { productsSeed } from './seedData.js';

export async function initializeDatabase() {
    try {
        // 1. Crear la tabla de productos si no existe
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                active_principle VARCHAR(100) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                price DECIMAL(10, 2) NOT NULL,
                alert_threshold INT NOT NULL DEFAULT 10,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await pool.query(createTableQuery);
        console.log('✅ Tabla "products" verificada/creada.');

        // 2. Verificar si ya hay datos para no duplicar
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM products');
        
        if (rows[0].count === 0) {
            console.log('⏳ Poblando la base de datos con medicamentos de prueba...');
            
            const insertQuery = `
                INSERT INTO products (name, active_principle, stock, price, alert_threshold)
                VALUES ?
            `;
            
            // Convertir el array de objetos a un array de arrays para la inserción masiva
            const values = productsSeed.map(p => [
                p.name, p.active_principle, p.stock, p.price, p.alert_threshold
            ]);
            
            await pool.query(insertQuery, [values]);
            console.log('✅ 30 medicamentos insertados correctamente.');
        } else {
            console.log(`✅ La base de datos ya contiene ${rows[0].count} medicamentos.`);
        }
    } catch (error) {
        console.error('❌ Error inicializando la base de datos:', error);
        process.exit(1); // Detener la app si la BD falla
    }
}