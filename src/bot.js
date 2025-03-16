const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const qrcodeImage = require('qrcode');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2/promise');
const stringSimilarity = require('string-similarity');
const { obterCardapio, registrarLog, registrarPedido } = require('./db');

// =================== CONFIGURAÇÕES ===================
const CONFIG = {
    SIMILARITY_THRESHOLD: 0.7,
    MAX_SUGGESTIONS: 3,
    TIMEOUT_PEDIDO: 3600000, // 1 hora
    RESTAURANTE_ENDERECO: 'Praça da Sé, 250 - Centro Histórico de São Paulo, São Paulo - SP, 01001-000',
    LATITUDE: -46.63465,
    LONGITUDE: -46.634654,
    OSRM_API_URL: 'https://router.project-osrm.org/route/v1/driving/'
};

// =================== CLIENTE WHATSAPP ===================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Variável global para armazenar o QR Code
let qrCodeString = '';

// Quando o QR Code for gerado
client.on('qr', (qr) => {
    qrCodeString = qr;
    //qrcode.generate(qr, { small: true });  // Exibe no terminal
    //console.log('QR Code gerado, escaneie o código!');
    
    // Salva o QR Code como uma imagem no sistema
    qrcodeImage.toFile(path.join(__dirname, 'public', 'qrcode.png'), qr, (err) => {
        if (err) {
            console.error('Erro ao salvar o QR Code:', err);
        } else {
            //console.log('QR Code salvo como imagem em qrcode.png');
        }
    });
});

// Quando o WhatsApp estiver pronto
client.on('ready', async () => {
    console.log('🤖 Bot pronto!');

    // Registrar log do bot iniciado
    await registrarLog('BOT', 'Bot iniciado.');
});

// Função para obter o QR Code como imagem base64
function getQRCodeBase64() {
    return new Promise((resolve, reject) => {
        if (!qrCodeString) {
            reject('QR Code ainda não foi gerado.');
        }
        qrcodeImage.toDataURL(qrCodeString, (err, url) => {
            if (err) {
                reject('Erro ao gerar a imagem do QR Code.');
            }
            resolve(url);  // Retorna a imagem como uma string base64
        });
    });
}

// =================== SERVIDOR EXPRESS ===================
const app = express();
const PORT = 3000;

// =================== MIDDLEWARES ===================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'segredo',
    resave: false,
    saveUninitialized: true
}));

// =================== ROTAS ===================

// Rota de login


// Página principal (após login)


// Exibe o QR Code após o login

// =================== LOGICA DO WHATSAPP =================

// Processamento de mensagens
client.on('message', async (msg) => {
    if (msg.fromMe) return;
    if (msg.from.includes('@g.us')) {
      //  return msg.reply("❌ Desculpe, não atendemos pedidos em grupos. Por favor, envie sua mensagem diretamente.");
    }

    const usuario = msg.from;
    const texto = normalizarTexto(msg.body);

    try {
        await registrarLog(usuario, texto);

        if (texto.match(/cardapio|menu/)) {
            const cardapio = await obterCardapio();
            const menuFormatado = formatarCardapio(cardapio);
            return msg.reply(menuFormatado);
        }

        if (texto.match(/ajuda/)) {
            return msg.reply(gerarRespostaAjuda());
        }

        if (texto.match(/localizacao|onde/)) {
            return msg.reply(gerarRespostaLocalizacao());
        }

        if (texto.match(/confirmar/)) {
            return msg.reply("✅ Pedido confirmado! Estamos preparando seu lanche.");
        }

        if (texto.match(/cancelar/)) {
            return msg.reply("❌ Pedido cancelado. Se precisar, estou à disposição!");
        }

        if (texto.match(/entrega/)) {
            return msg.reply("🚚 Por favor, envie seu endereço completo para calcular a distância e o tempo estimado de entrega.");
        }

        if (texto.includes(',')) {
            const distanciaTempo = await calcularDistanciaTempo(texto);
            if (distanciaTempo) {
                return msg.reply(`📍 Distância: ${distanciaTempo.distancia} km\n⏳ Tempo estimado: ${distanciaTempo.tempo} min`);
            } else {
                return msg.reply("❌ Não foi possível calcular a distância. Verifique o endereço e tente novamente.");
            }
        }

        const cardapio = await obterCardapio();
        const itens = await processarPedido(cardapio, texto);

        if (itens.length === 0) {
            return msg.reply("🤔 Não entendi seu pedido. Tente novamente ou digite 'ajuda' para ver os comandos disponíveis.");
        }

        const total = itens.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        await registrarPedido(usuario, itens);

        return msg.reply(gerarRespostaPedido(itens, total));
    } catch (error) {
        console.error('Erro:', error);
        return msg.reply("❌ Ops! Algo deu errado. Tente novamente ou entre em contato conosco.");
    }
});

// Inicializando o cliente do WhatsApp
client.initialize();

// =================== FUNÇÕES AUXILIARES =================

// Funções de manipulação de pedido, localização e cardápio
// (Veja as implementações das funções já fornecidas no seu código)

function normalizarTexto(texto) {
    return texto
        .normalize('NFD').replace(/[̀-\u036f]/g, ' ')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function processarPedido(cardapio, texto) {
    const regexQuantidade = /(\d+)\s*(?:unidade|unidades|x)?\s*([a-z\s]+)/gi;
    const itens = [];
    let match;

    while ((match = regexQuantidade.exec(texto)) !== null) {
        const quantidade = parseInt(match[1]);
        const termoItem = match[2].trim();
        const item = encontrarItem(cardapio, termoItem);

        if (item) {
            itens.push({ ...item, quantidade });
        }
    }

    return itens;
}

function encontrarItem(cardapio, texto) {
    const textoNormalizado = normalizarTexto(texto);
    let melhorMatch = { score: 0, item: null };
    for (const item of cardapio) {
        const termos = [item.nome, ...(item.synonyms ? item.synonyms.split(',') : [])];
        
        for (const termo of termos) {
            const termoNormalizado = normalizarTexto(termo);
            const score = stringSimilarity.compareTwoStrings(textoNormalizado, termoNormalizado);
            
            if (score > melhorMatch.score && score >= CONFIG.SIMILARITY_THRESHOLD) {
                melhorMatch = {
                    score,
                    item: item
                };
            }
        }
    }
    return melhorMatch.item;
}

// Inicializa o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
