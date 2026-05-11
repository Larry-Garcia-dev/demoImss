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
            description: "Genera una orden de entrega, descontando la cantidad solicitada del inventario de un medicamento específico usando su ID.",
            parameters: {
                type: "object",
                properties: {
                    productId: {
                        type: "integer",
                        description: "El ID numérico del medicamento en la base de datos."
                    },
                    quantity: {
                        type: "integer",
                        description: "La cantidad de unidades a descontar del inventario."
                    }
                },
                required: ["productId", "quantity"]
            }
        }
    }
];