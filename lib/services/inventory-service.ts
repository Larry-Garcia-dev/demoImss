import { getPool } from "./db";

interface Product {
  id: number;
  name: string;
  active_principle: string;
  stock: number;
  price: number;
  alert_threshold: number;
}

// In-memory inventory for demo when DB is not connected
const DEMO_INVENTORY: Product[] = [
  { id: 1, name: "Paracetamol 500mg", active_principle: "Paracetamol", stock: 150, price: 5.99, alert_threshold: 20 },
  { id: 2, name: "Ibuprofeno 400mg", active_principle: "Ibuprofeno", stock: 85, price: 8.5, alert_threshold: 15 },
  { id: 3, name: "Amoxicilina 500mg", active_principle: "Amoxicilina", stock: 45, price: 12.99, alert_threshold: 10 },
  { id: 4, name: "Omeprazol 20mg", active_principle: "Omeprazol", stock: 120, price: 15.5, alert_threshold: 25 },
  { id: 5, name: "Loratadina 10mg", active_principle: "Loratadina", stock: 75, price: 7.25, alert_threshold: 20 },
  { id: 6, name: "Metformina 850mg", active_principle: "Metformina", stock: 200, price: 9.99, alert_threshold: 30 },
  { id: 7, name: "Atorvastatina 20mg", active_principle: "Atorvastatina", stock: 90, price: 18.75, alert_threshold: 20 },
  { id: 8, name: "Diclofenaco Gel 1%", active_principle: "Diclofenaco", stock: 60, price: 11.5, alert_threshold: 15 },
  { id: 9, name: "Vitamina C 1000mg", active_principle: "Ácido Ascórbico", stock: 180, price: 6.99, alert_threshold: 20 },
  { id: 10, name: "Aspirina 100mg", active_principle: "Ácido Acetilsalicílico", stock: 220, price: 4.5, alert_threshold: 30 },
];

// 1. Consultar inventario por nombre o principio activo
export async function checkStock(searchTerm: string): Promise<Product[]> {
  const pool = getPool();
  
  if (!pool) {
    // Use demo inventory
    if (!searchTerm || searchTerm.trim() === "") {
      return [...DEMO_INVENTORY];
    }
    const searchLower = searchTerm.toLowerCase();
    return DEMO_INVENTORY.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.active_principle.toLowerCase().includes(searchLower)
    );
  }

  // If no search term, return all products
  if (!searchTerm || searchTerm.trim() === "") {
    const [rows] = await pool.query("SELECT id, name, active_principle, stock, price, alert_threshold FROM products");
    return rows as Product[];
  }

  const query = `
    SELECT id, name, active_principle, stock, price, alert_threshold 
    FROM products 
    WHERE name LIKE ? OR active_principle LIKE ?
  `;
  const [rows] = await pool.query(query, [`%${searchTerm}%`, `%${searchTerm}%`]);
  return rows as Product[];
}

// 2. Descontar inventario y generar alerta si es necesario
export async function processDeliveryOrder(
  productId: number,
  quantityToDeduct: number
): Promise<{
  success: boolean;
  message: string;
  currentStock?: number;
  newStock?: number;
  alertTriggered?: boolean;
}> {
  const pool = getPool();
  
  if (!pool) {
    // Use demo inventory
    const product = DEMO_INVENTORY.find((p) => p.id === productId);
    if (!product) {
      throw new Error("Producto no encontrado en la base de datos.");
    }

    if (product.stock < quantityToDeduct) {
      return {
        success: false,
        message: "Stock insuficiente para esta orden.",
        currentStock: product.stock,
      };
    }

    const newStock = product.stock - quantityToDeduct;
    product.stock = newStock; // Update demo inventory

    let alertTriggered = false;
    if (newStock <= product.alert_threshold) {
      simulateSupplierEmail(product.name, newStock);
      alertTriggered = true;
    }

    return {
      success: true,
      message: "Orden generada y stock descontado exitosamente.",
      newStock,
      alertTriggered,
    };
  }

  // Use real database
  const [productRows] = await pool.query("SELECT * FROM products WHERE id = ?", [productId]);
  const products = productRows as Product[];
  
  if (products.length === 0) {
    throw new Error("Producto no encontrado en la base de datos.");
  }

  const product = products[0];
  if (product.stock < quantityToDeduct) {
    return {
      success: false,
      message: "Stock insuficiente para esta orden.",
      currentStock: product.stock,
    };
  }

  // Descontar la cantidad
  const newStock = product.stock - quantityToDeduct;
  await pool.query("UPDATE products SET stock = ? WHERE id = ?", [newStock, productId]);

  // Verificar si cruzó el umbral de alerta
  let alertTriggered = false;
  if (newStock <= product.alert_threshold) {
    simulateSupplierEmail(product.name, newStock);
    alertTriggered = true;
  }

  return {
    success: true,
    message: "Orden generada y stock descontado exitosamente.",
    newStock,
    alertTriggered,
  };
}

// 3. Simular el envío de correo al proveedor
function simulateSupplierEmail(productName: string, currentStock: number) {
  console.log("\n==================================================");
  console.log("📧 [SIMULACIÓN DE CORREO - PEDIDO AUTOMÁTICO]");
  console.log(`A: proveedor@distribuidorafarmaceutica.com`);
  console.log(`Asunto: URGENTE - Pedido de reposición de ${productName}`);
  console.log(
    `Cuerpo: El inventario de "${productName}" ha caído al nivel de alerta crítica (${currentStock} unidades restantes). Por favor, despachar un nuevo lote lo antes posible para la farmacia.`
  );
  console.log("==================================================\n");
}
