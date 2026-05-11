import dotenv from 'dotenv';
dotenv.config();

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
// Usamos el endpoint compatible para facilitar el "Tool Calling"
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'; 

export async function callQwen(messages, tools = []) {
    const payload = {
        model: 'qwen-max', // Modelo Qwen 3.0 Max
        messages: messages,
    };

    // Si le pasamos herramientas (funciones), las añadimos al payload
    if (tools.length > 0) {
        payload.tools = tools;
    }

    try {
        const response = await fetch(QWEN_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error de DashScope:', errorData);
            throw new Error(`Error en la API de Qwen: ${response.status}`);
        }

        const data = await response.json();
        // Retornamos el mensaje completo de la IA (incluyendo si pide llamar una función)
        return data.choices[0].message; 
    } catch (error) {
        console.error('❌ Error comunicándose con Qwen:', error);
        throw error;
    }
}