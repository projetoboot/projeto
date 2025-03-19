const readline = require("readline");
const stringSimilarity = require("string-similarity");
const axios = require('axios');
const db = require('./db'); // Importa a conexão com o banco de dados
require('dotenv').config();

// Configurações do simulador
const CONFIG = {
    SIMILARITY_THRESHOLD: 0.7,
    MAX_SUGGESTIONS: 3,
    RESTAURANTE_ENDERECO: "Praça da Sé, 250 - São Paulo - SP",
};

// Chave da API Gemini armazenada no .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
async function encontrarItem(texto) {
    const result = await db.pool.query('SELECT * FROM cardapio');
    const cardapio = result.rows;

    let melhorMatch = { score: 0, item: null };
    for (const item of cardapio) {
        const termos = [item.nome];
        if (item.synonyms && typeof item.synonyms === "string") {
            termos.push(...item.synonyms.split(","));
        }

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

// Função para processar pedidos
async function processarPedido(pergunta) {
    const regexQuantidade = /(\d+)\s*(?:x|unidade|unidades|)\s*([a-záéíóúãõ\s]+)/gi;
    const itens = [];
    let match;

    while ((match = regexQuantidade.exec(pergunta)) !== null) {
        const quantidade = parseInt(match[1]);
        const termoItem = match[2].trim();
        const item = await encontrarItem(termoItem);

        if (item) {
            itens.push({ ...item, quantidade });
        }
    }

    return itens;
}

// Função para obter resposta do Gemini
async function getGeminiResponse(prompt) {
    try {
        const menuSample = await db.pool.query('SELECT * FROM cardapio LIMIT 10');
        const menuFormatted = menuSample.rows.map(item =>
            `${item.nome} - R$ ${(typeof item.preco === 'number' ? item.preco.toFixed(2) : '0.00')}`
        ).join('\n');

        const additionalInfo = `
            Nome da Lanchonete: Lanchonete Sabor do Dia.
            Horários: 10h - 22h.
            Localização: Avenida Paulista, 1578, Bela Vista, São Paulo, SP.Y
            Cardápio (amostra):
            ${menuFormatted}

            - Responda de forma curta e objetiva (máximo de 2 frases).
            - Seja educado e direto ao ponto.
            - Se for um pedido, confirme os itens e o valor total rapidamente.
        `;

        const fullPrompt = `${additionalInfo}\n\nUsuário: ${prompt}`;

        const data = {
            contents: [{
                parts: [{ text: fullPrompt }]
            }]
        };

        const response = await axios.post(GEMINI_URL, data, {
            headers: { 'Content-Type': 'application/json' }
        });

        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao processar resposta.";
    } catch (error) {
        return `Erro na requisição: ${error.message}`;
    }
}

// Função principal para processar perguntas
let primeiraInteracao = true; // Variável global

async function processarPergunta(pergunta) {
    pergunta = normalizarTexto(pergunta);

    // Verifica se é a primeira interação
    if (primeiraInteracao) {
        primeiraInteracao = false;
        return "📲 Você pode acessar nosso cardápio virtual aqui: [Clique para ver](https://seu-site.com/cardapio)";
    }

    if (pergunta.includes("cardapio") || pergunta.includes("menu")) {
        return "📲 Você pode acessar nosso cardápio virtual aqui: [Clique para ver](https://seu-site.com/cardapio)";
    }

    const itens = await processarPedido(pergunta);
    if (itens.length > 0) {
        const total = itens.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        return `🛒 Seu pedido:\n` +
            itens.map(i => `- ${i.quantidade}x ${i.nome} - R$${(i.preco * i.quantidade).toFixed(2)}`).join("\n") +
            `\n💰 Total: R$${total.toFixed(2)}`;
    }

    return await getGeminiResponse(pergunta);
}
// Função para obter o ícone baseado no nome do item
///const stringSimilarity = require("string-similarity"); // Importa a biblioteca

// Função para normalizar texto (remover acentos e caracteres especiais)
function normalizarTexto(texto) {
    return texto
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Função para obter o ícone baseado no nome do item
function obterIcone(nome) {
    const mapDeIcones = {
        "hamburguer": "🍔",
        "pizza": "🍕",
        "salada": "🥗",
        "sorvete": "🍦",
        "refrigerante": "🥤",
        "batata": "🍟",
        "sanduíche": "🥪",
        "sopa": "🍲",
        "fruta": "🍎",
        "bolo": "🍰",
        "café": "☕",
        "pão": "🍞",
        "queijo": "🧀",
        "carne": "🍖",
        "frango": "🍗",
        "açaí": "🥣", // Ícone atualizado para açaí (apenas a tigela)
        "cachorro quente": "🌭", // Ícone para cachorro quente
        "hot dog": "🌭", // Ícone para hot dog
        "hotdog": "🌭", // Ícone para hotdog
    };

    const nomeNormalizado = normalizarTexto(nome); // Normaliza o nome do item
    let melhorMatch = { score: 0, icone: "🍽️" }; // Inicializa com o ícone genérico

    for (let key in mapDeIcones) {
        const termoNormalizado = normalizarTexto(key);
        const score = stringSimilarity.compareTwoStrings(nomeNormalizado, termoNormalizado);

        if (score > melhorMatch.score && score >= 0.5) { // Limiar de similaridade
            melhorMatch = { score, icone: mapDeIcones[key] };
        }
    }

    return melhorMatch.icone; // Retorna o ícone mais parecido
}
async function obterCardapio() {
    try {
        const result = await db.pool.query('SELECT nome, preco FROM cardapio');
        const cardapio = result.rows;

        console.log("Itens do cardápio:", cardapio.map(i => i.nome)); // Debugging

        if (!cardapio || cardapio.length === 0) {
            return "🍽️ *O cardápio está vazio no momento.*";
        }

        const formattedCardapio = cardapio
            .map(i => {
                const preco = parseFloat(i.preco);
                const icone = obterIcone(i.nome); // Obtém o ícone baseado no nome do item

                if (isNaN(preco)) {
                    return `${icone} *${i.nome}* - Preço inválido`;
                }
                return `${icone} *${i.nome}* - *R$ ${preco.toFixed(2)}**`;
            })
            .join("\n\n"); // Adiciona uma quebra de linha entre os itens

        return "🍽️ **Nosso cardápio**:\n\n" + formattedCardapio;
    } catch (error) {
        console.error("Erro ao buscar o cardápio:", error);
        return "⚠️ **Erro ao carregar o cardápio. Tente novamente mais tarde.**";
    }
}


// Configuração do terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Iniciar chat no terminal
const LINK_CARDAPIO = "https://seusite.com/cardapio"; // Substitua pelo link real

// Função para iniciar o chat
function iniciarChat() {
    console.log("🤖 Simulador de Chat iniciado! Digite sua pergunta ou 'sair' para encerrar:");

    rl.question("Você: ", async (pergunta) => {
        // Se o usuário digitar 'sair', o chat será encerrado
        if (pergunta.toLowerCase() === 'sair') {
            console.log("Encerrando o programa.");
            rl.close();
            return;
        }

        // Se for a primeira interação, envia a mensagem de boas-vindas com o link do cardápio
        if (pergunta.trim() === '') {
            const mensagemInicial = `🍽️ Olá! Para fazer seu pedido, acesse nosso cardápio virtual:\n🔗 ${LINK_CARDAPIO}`;
            console.log("Bot:", mensagemInicial);
        } else {
            console.log("pergunta:",pergunta)
            // Caso contrário, processa a pergunta do usuário normalmente
            const resposta = await processarPergunta(pergunta);
            console.log("Bot:", resposta);
        }

        // Inicia uma nova rodada de perguntas
        iniciarChat();
    });
}

module.exports = { processarPergunta };
