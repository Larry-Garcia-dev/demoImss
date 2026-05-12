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
            description: "Genera una orden de entrega con prescripcion medica. Incluye indicaciones de dosificacion para el paciente.",
            parameters: {
                type: "object",
                properties: {
                    productName: {
                        type: "string",
                        description: "El nombre del medicamento (ej. Ibuprofeno 400mg, Paracetamol 500mg)."
                    },
                    productId: {
                        type: "integer",
                        description: "El ID numerico del medicamento. Solo usa si conoces el ID exacto."
                    },
                    quantity: {
                        type: "integer",
                        description: "La cantidad de unidades/tabletas/capsulas a dispensar."
                    },
                    dosage: {
                        type: "string",
                        description: "La dosis recomendada (ej. '500mg', '1 tableta', '10ml')."
                    },
                    frequency: {
                        type: "string",
                        description: "Frecuencia de toma (ej. 'cada 8 horas', 'cada 12 horas', '3 veces al dia')."
                    },
                    duration: {
                        type: "string",
                        description: "Duracion del tratamiento (ej. 'por 5 dias', 'por 7 dias', 'por 2 semanas')."
                    },
                    instructions: {
                        type: "string",
                        description: "Indicaciones especiales (ej. 'tomar con alimentos', 'antes de dormir', 'no mezclar con alcohol')."
                    }
                },
                required: ["productName", "quantity"]
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
