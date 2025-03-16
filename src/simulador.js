const readline = require("readline");
const stringSimilarity = require("string-similarity");
const axios = require('axios');
require('dotenv').config();

// Configurações do simulador
const CONFIG = {
    SIMILARITY_THRESHOLD: 0.7,
    MAX_SUGGESTIONS: 3,
    RESTAURANTE_ENDERECO: "Praça da Sé, 250 - São Paulo - SP",
};

// Simulação do banco de dados do cardápio
const cardapio = [
    { nome: "hamburguer", preco: 15.00, synonyms: "lanche, burger" },
    { nome: "batata frita", preco: 10.00, synonyms: "batata, fritas" },
    { nome: "refrigerante", preco: 5.00, synonyms: "coca, guaraná, suco" },
    { nome: "pizza", preco: 30.00, synonyms: "mussarela, calabresa, frango" },
    { nome: "sanduíche", preco: 12.00, synonyms: "pão, misto quente" }
];

// Histórico de pedidos
const historicoPedidos = [];

// Função para normalizar texto (remover acentos e caracteres especiais)
function normalizarTexto(texto) {
    return texto
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Função para encontrar itens no cardápio com similaridade
function encontrarItem(texto) {
    let melhorMatch = { score: 0, item: null };
    for (const item of cardapio) {
        const termos = [item.nome, ...(item.synonyms ? item.synonyms.split(",") : [])];

        for (const termo of termos) {
            const termoNormalizado = normalizarTexto(termo);
            const score = stringSimilarity.compareTwoStrings(normalizarTexto(texto), termoNormalizado);

            if (score > melhorMatch.score && score >= CONFIG.SIMILARITY_THRESHOLD) {
                melhorMatch = { score, item };
            }
        }
    }
    return melhorMatch.item;
}

// Função para processar perguntas e gerar respostas
async function processarPergunta(pergunta) {
    pergunta = normalizarTexto(pergunta);

    // Comandos específicos
    if (pergunta.includes("cardapio") || pergunta.includes("menu")) {
        return `📜 Nosso cardápio:\n` + cardapio.map(i => `- ${i.nome} - R$${i.preco.toFixed(2)}`).join("\n");
    }
    if (pergunta.includes("horario") || pergunta.includes("funciona")) {
        return "⏰ Nosso horário de funcionamento é das 10h às 22h.";
    }
    if (pergunta.includes("localizacao") || pergunta.includes("endereco")) {
        return `📍 Estamos localizados em: ${CONFIG.RESTAURANTE_ENDERECO}`;
    }
    if (pergunta.includes("ajuda")) {
        return "🆘 Comandos disponíveis:\n- Digite 'cardápio' para ver as opções\n- Pergunte sobre localização ou horário\n- Faça pedidos digitando '2 hamburguer, 1 coca' etc.";
    }
    if (pergunta.includes("confirmar")) {
        return "✅ Pedido confirmado! Estamos preparando seu lanche.";
    }
    if (pergunta.includes("cancelar")) {
        return "❌ Pedido cancelado. Se precisar, estou à disposição!";
    }
    if (pergunta.includes("entrega")) {
        return "🚚 Por favor, envie seu endereço completo para calcular a distância e o tempo estimado de entrega.";
    }

    // Processar pedidos
    const itens = processarPedido(pergunta);
    if (itens.length > 0) {
        const total = itens.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        historicoPedidos.push(itens);

        return `🛒 Seu pedido:\n` +
            itens.map(i => `- ${i.quantidade}x ${i.nome} - R$${(i.preco * i.quantidade).toFixed(2)}`).join("\n") +
            `\n💰 Total: R$${total.toFixed(2)}`;
    }

    // Se não encontrar no chat tradicional, usar a API Gemini
    return await getGeminiResponse(pergunta);
}

// Função para obter resposta do Gemini
async function getGeminiResponse(prompt) {
    // Exibir apenas uma amostra do cardápio
    const menuSample = cardapio.slice(0, 10).map(item => 
        `${item.nome} - R$ ${item.preco.toFixed(2)}`
    ).join('\n');

    const additionalInfo = `Cardápio (amostra):\n${menuSample}`;

    const fullPrompt = `${additionalInfo}\nUsuário: ${prompt}`;

    const data = {
        contents: [{
            parts: [{ text: fullPrompt }]
        }]
    };

    const GEMINI_API_KEY = "AIzaSyDI8I3ZeLJwrGt_F5P61BrR6oMtBvjewco";
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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

// Função para processar pedidos
function processarPedido(pergunta) {
    const regexQuantidade = /(\d+)\s*(?:unidade|unidades|x)?\s*([a-z\s]+)/gi;
    const itens = [];
    let match;

    while ((match = regexQuantidade.exec(pergunta)) !== null) {
        const quantidade = parseInt(match[1]);
        const termoItem = match[2].trim();
        const item = encontrarItem(termoItem);

        if (item) {
            itens.push({ ...item, quantidade });
        }
    }

    return itens;
}

// Configuração do terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Iniciar chat no terminal
function iniciarChat() {
    rl.question("Você: ", async (pergunta) => {
        const resposta = await processarPergunta(pergunta);
        console.log("Bot:", resposta);
        iniciarChat();
    });
}

console.log("🤖 Simulador de Chat iniciado! Digite sua pergunta:");
iniciarChat();
