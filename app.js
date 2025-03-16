const axios = require('axios');
require('dotenv').config();
const { CARDAPIO } = require('./cardapio'); // Importa os 10.000 itens gerados

const GEMINI_API_KEY = "AIzaSyDI8I3ZeLJwrGt_F5P61BrR6oMtBvjewco";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Função para obter resposta do Gemini
async function getGeminiResponse(prompt) {
    // Exibir apenas uma amostra do cardápio
    const menuSample = CARDAPIO.slice(0, 10).map(item => 
        `${item.categoria} - ${item.item} - R$ ${item.preco.toFixed(2)} - ${item.calorias} kcal`
    ).join('\n');

    const additionalInfo = `
        Nome da Lanchonete: Lanchonete Sabor do Dia.
        Horários: 10h - 22h.
        Localização: Avenida Paulista, 1578, Bela Vista, São Paulo, SP.
        Prato mais vendido: Hambúrguer Especial.
        Dono: João da Silva.
        Cardápio (amostra):
        ${menuSample}
    `;

    const fullPrompt = `${additionalInfo}\n\nUsuário: ${prompt}`;

    const data = {
        contents: [{
            parts: [{ text: fullPrompt }]
        }]
    };

    try {
        const response = await axios.post(GEMINI_URL, data, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data.candidates) {
            return response.data.candidates[0].content.parts[0].text;
        } else {
            return 'Erro ao processar resposta do Gemini.';
        }
    } catch (error) {
        return `Erro na requisição: ${error.message}`;
    }
}

// Loop para interação no terminal
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("\nPergunte algo sobre a lanchonete ou digite 'sair' para encerrar.");

function perguntar() {
    rl.question("\nDigite sua pergunta: ", async (userInput) => {
        if (userInput.toLowerCase() === 'sair') {
            console.log("Encerrando o programa.");
            rl.close();
            return;
        }
        
        const response = await getGeminiResponse(userInput);
        console.log(`Resposta: ${response}`);
        perguntar();
    });
}

perguntar();
