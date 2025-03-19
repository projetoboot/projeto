const express = require('express');
const { Pool } = require('pg'); // Para PostgreSQL
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // Para sessões com PostgreSQL

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/../views');
app.use(express.static(__dirname + '/../public'));
app.use(express.static(__dirname + '/public'));

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

async function conectarBanco() {
    try {
        const client = await pool.connect();
        console.log('Conexão com o banco de dados estabelecida em cardapio.js.');
        return client;
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
        throw error;
    }
}

// Página inicial - Inserção de número de telefone
app.get('/', (req, res) => {
    if (!req.session.telefone) {
        res.render('telefone', { erro: null });
    } else{
        return res.redirect('/cardapio_digital');
    }

    res.render('telefone', { erro: null });
});

app.post('/salvar-telefone', async (req, res) => {
    const { telefone } = req.body;
    if (!telefone) {
        return res.render('telefone', { erro: 'Número de telefone é obrigatório' });
    }

    const client = await conectarBanco();
    try {
        // Verificar se o telefone já existe
        const result = await client.query('SELECT id FROM cliente WHERE telefone = $1', [telefone]);
        
        if (result.rows.length > 0) {
            // Se já existir, atualizar o último acesso
            await client.query('UPDATE cliente SET data_ultimo_acesso = $1 WHERE telefone = $2', [new Date(), telefone]);
        } else {
            // Se não existir, criar um novo cliente com o primeiro acesso
            await client.query('INSERT INTO cliente (telefone, data_primeiro_acesso, data_ultimo_acesso) VALUES ($1, $2, $3)', [telefone, new Date(), new Date()]);
        }

        req.session.telefone = telefone;
        res.redirect('/cardapio_digital');
    } catch (error) {
        console.error('Erro ao salvar telefone:', error);
        res.status(500).send('Erro ao salvar número de telefone.');
    } finally {
        client.release();
    }
});
// Página de visualização do cardápio
app.get('/cardapio_digital', async (req, res) => {
    if (!req.session.telefone) {
        return res.redirect('/telefone');
    }

    const client = await conectarBanco();
    try {
        // Buscar produtos
        const produtosResult = await client.query('SELECT * FROM produtos');
        
        // Buscar opcionais
        const opcionaisResult = await client.query('SELECT * FROM opcionais');
        
        // Buscar relacionamentos produto-opcional
        const produtoOpcionaisResult = await client.query('SELECT * FROM produto_opcionais');
        
        // Organizar os dados e converter preços para número
        const produtos = produtosResult.rows.map(produto => {
            const opcionais = produtoOpcionaisResult.rows
                .filter(po => po.produto_id === produto.id)
                .map(po => {
                    const opcional = opcionaisResult.rows.find(o => o.id === po.opcional_id);
                    if (opcional) {
                        return {
                            ...opcional,
                            preco_adicional: parseFloat(opcional.preco_adicional)
                        };
                    }
                    return undefined;
                })
                .filter(o => o !== undefined);
            
            return {
                ...produto,
                preco: parseFloat(produto.preco),
                opcionais
            };
        });

                res.render('cardapio_digital', { 
            cardapio: produtos, 
            telefone: req.session.telefone,
            carrinho: [] // O carrinho agora é gerenciado pelo localStorage no cliente
        });
    } catch (error) {
        console.error('Erro ao buscar cardápio:', error);
        res.status(500).send('Erro ao carregar cardápio.');
    } finally {
        client.release();
    }
});


// Rota para processar a finalização do pedido
// Rota para confirmação do pedido



app.get('/pedido_confirmado', (req, res) => {
    try {
        // Recupera os dados do pedido da query string
        const dadosPedidoStr = req.query.dadosPedido;
        if (!dadosPedidoStr) {
            return res.redirect('/cardapio_digital');
        }
        console.log('dados brutos:', dadosPedidoStr);
        const dadosPedido = JSON.parse(decodeURIComponent(dadosPedidoStr));
        const carrinhoSessao = dadosPedido.carrinho || { items: [] };
        
        // Valida se existem itens no carrinho
        if (!carrinhoSessao.items || carrinhoSessao.items.length === 0) {
            return res.redirect('/cardapio_digital');
        }

        console.log('dados para pedido confirmado:', carrinhoSessao);
        const totalPedido = carrinhoSessao.total;

        // Exibir o valor recuperado
        console.log('Valor total do pedido:', totalPedido);
        // Calcula o total apenas se houver itens
        const total = carrinhoSessao.items.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        
        res.render('pedido_confirmado', {
            carrinho: carrinhoSessao,
            tipoEntrega: dadosPedido.tipoEntrega || '',
            enderecoEntrega: dadosPedido.enderecoEntrega || '',
            total: totalPedido ,
            telefone: req.session.telefone
        })
    } catch (error) {
        console.error('Erro ao renderizar página de confirmação:', error);
        res.redirect('/cardapio_digital');
    }
});



//////////////////////////////
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
            'INSERT INTO pedidos (cliente_telefone, tipo_entrega, endereco_entrega, status, data_pedido) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
            [req.session.telefone, tipo_entrega, endereco || null, 'pendente']
        );

        console.log("✅ Pedido inserido com sucesso!", pedidoResult.rows);
        const pedidoId = pedidoResult.rows[0].id;

        console.log("🛒 Inserindo itens do carrinho...");
        for (const item of carrinho) {
            console.log(`📦 Inserindo item: Produto ID ${item.produto.id}, Quantidade: ${item.quantidade}, Preço: ${item.produto.preco}`);
            await client.query(
                'INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
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

////////////////////////////////
// Middleware para verificar se o telefone está na sessão
function verificarTelefone(req, res, next) {
    if (!req.session.telefone) {
        return res.redirect('/telefone');
    }
    next();
}

// Rota para exibir o perfil do cliente
app.get('/pedidos', verificarTelefone, async (req, res) => {
    const telefone = req.session.telefone;
    const client = await conectarBanco();

    try {
        // Buscar pedidos do cliente
        const pedidosResult = await client.query(
            'SELECT id, data_pedido, tipo_entrega FROM pedidos WHERE cliente_telefone = $1 ORDER BY data_pedido DESC',
            [telefone]
        );

        const pedidos = await Promise.all(pedidosResult.rows.map(async (pedido) => {
            // Buscar itens do pedido com imagem do produto
            const itensResult = await client.query(
                `SELECT 
                    pi.quantidade, 
                    pi.preco_unitario, 
                    p.nome, 
                    p.imagem 
                FROM pedido_itens pi 
                JOIN produtos p ON pi.produto_id = p.id 
                WHERE pi.pedido_id = $1`,
                [pedido.id]
            );

            const itens = itensResult.rows.map(item => ({
                ...item,
                preco_unitario: parseFloat(item.preco_unitario)
            }));

            const total = itens.reduce((sum, item) => sum + (item.preco_unitario * item.quantidade), 0);

            return {
                ...pedido,
                itens,
                total
            };
        }));

        res.render('perfil', {
            pedidos: pedidos.length === 0 ? "Você ainda não fez pedidos em nosso cardápio" : pedidos,
            telefone,
            nome: req.session.nome
        });
    } catch (error) {
        console.error('Erro ao buscar pedidos do cliente:', error);
        res.status(500).send('Erro ao carregar perfil do cliente.');
    } finally {
        client.release();
    }
});
// Sair (limpar sessão)
app.get('/sair', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});
//////////////////////////

const PORT = process.env.PORT || 3008;
const HOST = '0.0.0.0';  // Permite acessar de outro dispositivo

app.listen(PORT, () => {
    console.log(`🌐 Servidor rodando em http://localhost:${PORT}`);
});
// Iniciar servidor 192.168.1.3
