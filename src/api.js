const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const app = express();
app.use(express.json()); // Middleware para interpretar JSON no corpo da requisição

// Configurações do banco de dados PostgreSQL
const DB_CONFIG = {
    user: 'postgres',
    host: 'localhost',
    database: 'whatsapp_bot',
    password: '123',
    port: 5432,
};

const pool = new Pool(DB_CONFIG);

// Configuração de sessão com PostgreSQL
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
});

app.use(session({
    key: 'sessao_usuario',
    secret: 'seuSegredoSeguro',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Função para conectar ao banco de dados
async function conectarBanco() {
    try {
        const client = await pool.connect();
        console.log('Conexão com o banco de dados estabelecida.');
        return client;
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
        throw error;
    }
}

// Rota POST para finalizar pedido
app.post('/finalizar_pedido', async (req, res) => {
    console.log("📥 Recebendo requisição para finalizar pedido...");

    // Verificar se os dados estão chegando corretamente
    console.log("🔍 Corpo da requisição:", req.body);

    if (!req.body.dadosPedido) {
        console.log("❌ Erro: dadosPedido não foi enviado na requisição.");
        return res.status(400).json({ erro: 'Dados do pedido ausentes' });
    }

    const { tipo_entrega, endereco, carrinho } = req.body.dadosPedido;

    console.log('📌 Tipo de entrega:', tipo_entrega);
    console.log('📌 Endereço:', endereco);
    console.log('📌 Carrinho:', carrinho);

    if (!carrinho || !Array.isArray(carrinho) || carrinho.length === 0) {
        console.log('❌ Erro: Carrinho vazio ou inválido');
        return res.status(400).json({ erro: 'Carrinho vazio ou inválido' });
    }

    console.log("🔌 Conectando ao banco de dados...");
    const client = await conectarBanco();

    try {
        console.log("✅ Conexão ao banco bem-sucedida!");

        // Validar tipo de entrega
        if (!['local', 'retirada', 'entrega'].includes(tipo_entrega)) {
            console.log("❌ Erro: Tipo de entrega inválido");
            return res.status(400).json({ erro: 'Tipo de entrega inválido' });
        }

        // Validar endereço para entrega
        if (tipo_entrega === 'entrega' && !endereco) {
            console.log("❌ Erro: Endereço é obrigatório para delivery");
            return res.status(400).json({ erro: 'Endereço é obrigatório para delivery' });
        }

        console.log("📝 Inserindo pedido na tabela pedidos2...");
        const pedidoResult = await client.query(
            'INSERT INTO pedidos2 (cliente_telefone, tipo_entrega, endereco_entrega, status, data_pedido) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
            [req.session.telefone, tipo_entrega, endereco || null, 'pendente']
        );

        console.log("✅ Pedido inserido com sucesso!", pedidoResult.rows);
        const pedidoId = pedidoResult.rows[0].id;

        console.log("🛒 Inserindo itens do carrinho...");
        for (const item of carrinho) {
            console.log(`📦 Inserindo item: Produto ID ${item.produto.id}, Quantidade: ${item.quantidade}, Preço: ${item.produto.preco}`);
            await client.query(
                'INSERT INTO itens_pedido2 (pedido_id, produto_id, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
                [pedidoId, item.produto.id, item.quantidade, item.produto.preco]
            );
        }

        console.log("✅ Todos os itens do pedido foram inseridos com sucesso!");
        res.json({ sucesso: true, pedido_id: pedidoId });

    } catch (error) {
        console.error('❌ Erro ao finalizar pedido:', error);
        res.status(500).json({ erro: 'Erro ao finalizar pedido' });
    } finally {
        console.log("🔌 Liberando conexão com o banco...");
        client.release();
    }
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';  // Permite acessar de outro dispositivo

app.listen(PORT, HOST, () => {
    console.log(`🌐 Servidor api rodando em http://192.168.1.3:${PORT}`);
});