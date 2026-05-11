import pool from '../../infrastructure/database/connection.js';

// 1. Consultar inventario por nombre o principio activo
export async function checkStock(searchTerm) {
    const query = `
        SELECT id, name, active_principle, stock, price 
        FROM products 
        WHERE name LIKE ? OR active_principle LIKE ?
    `;
    const [rows] = await pool.query(query, [`%${searchTerm}%`, `%${searchTerm}%`]);
    return rows;
}

// 2. Descontar inventario y generar alerta si es necesario
export async function processDeliveryOrder(productId, quantityToDeduct) {
    // Buscar el producto actual
    const [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (productRows.length === 0) throw new Error('Producto no encontrado en la base de datos.');

    const product = productRows[0];
    if (product.stock < quantityToDeduct) {
        return { success: false, message: 'Stock insuficiente para esta orden.', currentStock: product.stock };
    }

    // Descontar la cantidad
    const newStock = product.stock - quantityToDeduct;
    await pool.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, productId]);

    // Verificar si cruzó el umbral de alerta
    let alertTriggered = false;
    if (newStock <= product.alert_threshold) {
        simulateSupplierEmail(product.name, newStock);
        alertTriggered = true;
    }

    return { 
        success: true, 
        message: 'Orden generada y stock descontado exitosamente.', 
        newStock, 
        alertTriggered 
    };
}

// 3. Simular el envío de correo al proveedor
function simulateSupplierEmail(productName, currentStock) {
    console.log('\n==================================================');
    console.log('📧 [SIMULACIÓN DE CORREO - PEDIDO AUTOMÁTICO]');
    console.log(`A: proveedor@distribuidorafarmaceutica.com`);
    console.log(`Asunto: URGENTE - Pedido de reposición de ${productName}`);
    console.log(`Cuerpo: El inventario de "${productName}" ha caído al nivel de alerta crítica (${currentStock} unidades restantes). Por favor, despachar un nuevo lote lo antes posible para la farmacia.`);
    console.log('==================================================\n');
}