export const farmaciaTools = [
    {
        type: "function",
        function: {
            name: "consultar_inventario",
            description: "Consulta la base de datos de la farmacia para buscar medicamentos y sus existencias actuales usando un nombre o principio activo.",
            parameters: {
                type: "object",
                properties: {
                    searchTerm: {
                        type: "string",
                        description: "El nombre del medicamento o principio activo a buscar (ej. Paracetamol, Amoxicilina)."
                    }
                },
                required: ["searchTerm"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generar_orden_entrega",
            description: "Genera una orden de entrega, descontando la cantidad solicitada del inventario. Puedes usar el nombre del producto o su ID. IMPORTANTE: Si no conoces el ID, usa el nombre del medicamento.",
            parameters: {
                type: "object",
                properties: {
                    productName: {
                        type: "string",
                        description: "El nombre del medicamento (ej. Ibuprofeno, Paracetamol). Usa este campo si no conoces el ID."
                    },
                    productId: {
                        type: "integer",
                        description: "El ID numérico del medicamento. Solo usa si conoces el ID exacto de una consulta previa."
                    },
                    quantity: {
                        type: "integer",
                        description: "La cantidad de unidades a descontar del inventario."
                    }
                },
                required: ["quantity"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "actualizar_inventario",
            description: "Actualiza el inventario de un medicamento sumando nuevas unidades al stock existente. Usa esta funcion cuando lleguen nuevas unidades de un producto.",
            parameters: {
                type: "object",
                properties: {
                    productName: {
                        type: "string",
                        description: "El nombre del medicamento a actualizar (ej. Ibuprofeno, Paracetamol)."
                    },
                    quantity: {
                        type: "integer",
                        description: "La cantidad de unidades NUEVAS a agregar al stock actual."
                    }
                },
                required: ["productName", "quantity"]
            }
        }
    }
];
