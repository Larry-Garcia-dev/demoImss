import express from 'express';
import { checkStock, getFullInventory } from '../../application/use-cases/inventoryUseCases.js';

const router = express.Router();

/**
 * GET /api/inventory
 * Returns the full inventory list
 */
router.get('/', async (req, res) => {
    const requestId = `inv_${Date.now().toString(36)}`;
    console.log(`📦 [${requestId}] GET /api/inventory - Solicitando inventario completo`);
    
    try {
        const inventory = await getFullInventory();
        
        console.log(`✅ [${requestId}] Inventario obtenido: ${inventory.length} productos`);
        
        res.json({
            success: true,
            inventory,
            count: inventory.length,
            requestId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`❌ [${requestId}] Error obteniendo inventario:`, error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error al obtener el inventario',
            details: error.message,
            requestId
        });
    }
});

/**
 * GET /api/inventory/search?term=xxx
 * Search for products by name or active principle
 */
router.get('/search', async (req, res) => {
    const requestId = `search_${Date.now().toString(36)}`;
    const { term } = req.query;
    
    console.log(`🔍 [${requestId}] GET /api/inventory/search - Buscando: "${term}"`);
    
    if (!term) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere el parámetro "term" para buscar',
            requestId
        });
    }
    
    try {
        const results = await checkStock(term);
        
        console.log(`✅ [${requestId}] Búsqueda completada: ${results.length} resultados`);
        
        res.json({
            success: true,
            results,
            count: results.length,
            searchTerm: term,
            requestId
        });
    } catch (error) {
        console.error(`❌ [${requestId}] Error en búsqueda:`, error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error al buscar en el inventario',
            details: error.message,
            requestId
        });
    }
});

export default router;
