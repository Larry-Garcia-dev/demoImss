import pool from '../../infrastructure/database/connection.js';

// Debug logger
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const icons = {
        info: '📘',
        success: '✅',
        error: '❌',
        warn: '⚠️',
        inventory: '📦'
    };
    console.log(`${icons[level] || '📝'} [${timestamp}] [INVENTORY] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
}

// 1. Consultar inventario por nombre o principio activo
export async function checkStock(searchTerm) {
    log('inventory', `Consultando inventario con término: "${searchTerm}"`);
    
    try {
        const query = `
            SELECT id, name, active_principle, stock, price, alert_threshold
            FROM products 
            WHERE name LIKE ? OR active_principle LIKE ?
            ORDER BY name ASC
        `;
        
        const [rows] = await pool.query(query, [`%${searchTerm}%`, `%${searchTerm}%`]);
        
        log('success', `Consulta completada: ${rows.length} productos encontrados`);
        
        // Add stock status to each product
        const results = rows.map(product => ({
            ...product,
            stockStatus: product.stock <= 0 ? 'AGOTADO' :
                         product.stock <= product.alert_threshold / 2 ? 'CRITICO' :
                         product.stock <= product.alert_threshold ? 'BAJO' : 'NORMAL'
        }));
        
        return results;
        
    } catch (error) {
        log('error', 'Error consultando inventario', {
            searchTerm,
            error: error.message,
            code: error.code
        });
        throw new Error(`Error al consultar inventario: ${error.message}`);
    }
}

// 2. Obtener todos los productos (para panel de inventario)
export async function getAllProducts() {
    log('inventory', 'Obteniendo todos los productos');
    
    try {
        const [rows] = await pool.query(`
            SELECT id, name, active_principle, stock, price, alert_threshold
            FROM products 
            ORDER BY name ASC
        `);
        
        log('success', `${rows.length} productos obtenidos`);
        return rows;
        
    } catch (error) {
        log('error', 'Error obteniendo productos', { error: error.message });
        throw new Error(`Error al obtener productos: ${error.message}`);
    }
}

// Alias for getFullInventory (used by inventory routes)
export async function getFullInventory() {
    return getAllProducts();
}

// 3. Obtener productos con stock bajo
export async function getLowStockProducts() {
    log('inventory', 'Consultando productos con stock bajo');
    
    try {
        const [rows] = await pool.query(`
            SELECT id, name, active_principle, stock, price, alert_threshold
            FROM products 
            WHERE stock <= alert_threshold
            ORDER BY stock ASC
        `);
        
        log('warn', `${rows.length} productos con stock bajo detectados`);
        return rows;
        
    } catch (error) {
        log('error', 'Error consultando stock bajo', { error: error.message });
        throw new Error(`Error al consultar stock bajo: ${error.message}`);
    }
}

// 4. Descontar inventario y generar alerta si es necesario
// Now accepts either productId OR productName for flexibility
export async function processDeliveryOrder(productIdOrName, quantityToDeduct, productName = null) {
    log('inventory', `Procesando orden - Producto: ${productName || productIdOrName}, Cantidad: ${quantityToDeduct}`);
    
    try {
        // Validar cantidad
        if (!quantityToDeduct || quantityToDeduct <= 0) {
            throw new Error('Cantidad a descontar debe ser mayor a 0');
        }

        let productRows;
        
        // If productName is provided, search by name first
        if (productName) {
            log('info', `Buscando producto por nombre: ${productName}`);
            [productRows] = await pool.query(
                'SELECT * FROM products WHERE name LIKE ? LIMIT 1', 
                [`%${productName}%`]
            );
        } 
        // If productIdOrName is a number, search by ID
        else if (typeof productIdOrName === 'number' || !isNaN(parseInt(productIdOrName))) {
            const id = parseInt(productIdOrName);
            log('info', `Buscando producto por ID: ${id}`);
            [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
        }
        // Otherwise, treat it as a name
        else {
            log('info', `Buscando producto por nombre: ${productIdOrName}`);
            [productRows] = await pool.query(
                'SELECT * FROM products WHERE name LIKE ? LIMIT 1', 
                [`%${productIdOrName}%`]
            );
        }
        
        if (productRows.length === 0) {
            log('error', `Producto no encontrado: ${productName || productIdOrName}`);
            return { 
                success: false, 
                message: 'Producto no encontrado en la base de datos.',
                errorCode: 'PRODUCT_NOT_FOUND'
            };
        }

        const product = productRows[0];
        log('info', `Producto encontrado: ${product.name}`, {
            currentStock: product.stock,
            requestedQuantity: quantityToDeduct
        });

        if (product.stock < quantityToDeduct) {
            log('warn', `Stock insuficiente para ${product.name}`, {
                currentStock: product.stock,
                requested: quantityToDeduct
            });
            return { 
                success: false, 
                message: `Stock insuficiente. Solo hay ${product.stock} unidades disponibles de ${product.name}.`, 
                currentStock: product.stock,
                productName: product.name,
                errorCode: 'INSUFFICIENT_STOCK'
            };
        }

        // Descontar la cantidad
        const newStock = product.stock - quantityToDeduct;
        await pool.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, product.id]);
        
        log('success', `Stock actualizado: ${product.name}`, {
            previousStock: product.stock,
            newStock: newStock
        });

        // Verificar si cruzó el umbral de alerta
        let alertTriggered = false;
        let alertLevel = null;
        
        if (newStock <= product.alert_threshold) {
            alertTriggered = true;
            alertLevel = newStock <= product.alert_threshold / 2 ? 'CRITICO' : 'BAJO';
            simulateSupplierEmail(product.name, newStock, alertLevel);
        }

        return { 
            success: true, 
            message: `Orden generada exitosamente. Se descontaron ${quantityToDeduct} unidades de ${product.name}.`, 
            productName: product.name,
            previousStock: product.stock,
            newStock, 
            alertTriggered,
            alertLevel,
            price: product.price,
            totalAmount: product.price * quantityToDeduct
        };
        
    } catch (error) {
        log('error', 'Error procesando orden', {
            productIdentifier: productName || productIdOrName,
            quantityToDeduct,
            error: error.message,
            stack: error.stack
        });
        
        return {
            success: false,
            message: `Error al procesar la orden: ${error.message}`,
            errorCode: 'ORDER_PROCESSING_ERROR'
        };
    }
}

// 5. Actualizar inventario (agregar stock)
export async function updateInventoryStock(productName, quantityToAdd) {
    log('inventory', `Actualizando inventario - Producto: ${productName}, Cantidad a agregar: ${quantityToAdd}`);
    
    try {
        // Validar cantidad
        if (!quantityToAdd || quantityToAdd <= 0) {
            return {
                success: false,
                message: 'La cantidad a agregar debe ser mayor a 0.',
                errorCode: 'INVALID_QUANTITY'
            };
        }

        // Buscar producto por nombre
        const [productRows] = await pool.query(
            'SELECT * FROM products WHERE name LIKE ? LIMIT 1', 
            [`%${productName}%`]
        );
        
        if (productRows.length === 0) {
            log('error', `Producto no encontrado: ${productName}`);
            return { 
                success: false, 
                message: `Producto "${productName}" no encontrado en la base de datos.`,
                errorCode: 'PRODUCT_NOT_FOUND'
            };
        }

        const product = productRows[0];
        const previousStock = product.stock;
        const newStock = previousStock + quantityToAdd;
        
        // Actualizar el stock
        await pool.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, product.id]);
        
        log('success', `Inventario actualizado: ${product.name}`, {
            previousStock,
            added: quantityToAdd,
            newStock
        });

        return { 
            success: true, 
            message: `Inventario actualizado exitosamente. Se agregaron ${quantityToAdd} unidades a ${product.name}.`,
            productName: product.name,
            previousStock,
            addedQuantity: quantityToAdd,
            newStock,
            price: product.price
        };
        
    } catch (error) {
        log('error', 'Error actualizando inventario', {
            productName,
            quantityToAdd,
            error: error.message
        });
        
        return {
            success: false,
            message: `Error al actualizar inventario: ${error.message}`,
            errorCode: 'UPDATE_ERROR'
        };
    }
}

// 6. Simular el envío de correo al proveedor
function simulateSupplierEmail(productName, currentStock, alertLevel) {
    const urgency = alertLevel === 'CRITICO' ? 'MUY URGENTE' : 'URGENTE';
    
    log('warn', `ALERTA DE STOCK ${alertLevel} - ${productName}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('📧 [SIMULACIÓN DE CORREO - PEDIDO AUTOMÁTICO AL PROVEEDOR]');
    console.log('='.repeat(60));
    console.log(`📬 Para: proveedor@distribuidorafarmaceutica.com`);
    console.log(`📋 Asunto: ${urgency} - Pedido de reposición de ${productName}`);
    console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
    console.log('-'.repeat(60));
    console.log('Mensaje:');
    console.log(`  Estimado proveedor,`);
    console.log(`  `);
    console.log(`  El inventario de "${productName}" ha alcanzado nivel ${alertLevel}.`);
    console.log(`  Stock actual: ${currentStock} unidades.`);
    console.log(`  `);
    console.log(`  Por favor, despachar un nuevo lote a la brevedad posible.`);
    console.log(`  `);
    console.log(`  Atentamente,`);
    console.log(`  Sistema de Gestión de Farmacia AI`);
    console.log('='.repeat(60) + '\n');
}
