const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcrypt');
const axios = require('axios'); 
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
        console.log('Conexão com o banco de dados estabelecida.');
        return client;
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
        throw error;
    }
}

// Middleware para verificar se o telefone foi registrado
function verificarTelefone(req, res, next) {
    if (!req.session.telefone) {
        return res.redirect('/registrar-telefone');
    }
    next();
}

// Página inicial - redireciona para registro de telefone ou cardápio
app.get('/', (req, res) => {
    if (req.session.telefone) {
        return res.redirect('/cardapio');
    }
    res.redirect('/registrar-telefone');
});

// Página de registro de telefone
app.get('/registrar-telefone', (req, res) => {
    res.render('registrar-telefone', { erro: null });
});

// Processar registro de telefone
app.post('/registrar-telefone', async (req, res) => {
    const { telefone, nome } = req.body;
    
    // Validação básica do telefone
    const telefoneRegex = /^\d{10,11}$/;
    if (!telefoneRegex.test(telefone)) {
        return res.render('registrar-telefone', { 
            erro: 'Por favor, digite um número de telefone válido (10 ou 11 dígitos)' 
        });
    }
    
    const client = await conectarBanco();
    try {
        // Verificar se o telefone já existe
        const checkResult = await client.query('SELECT * FROM clientes WHERE telefone = $1', [telefone]);
        
        if (checkResult.rows.length === 0) {
            // Telefone não existe, registrar novo cliente
            await client.query(
                'INSERT INTO clientes (telefone, nome, data_registro) VALUES ($1, $2, NOW())',
                [telefone, nome || 'Cliente']
            );
        }
        
        // Salvar telefone na sessão
        req.session.telefone = telefone;
        req.session.nome = nome || 'Cliente';
        
        // Redirecionar para o cardápio
        res.redirect('/cardapio');
    } catch (error) {
        console.error('Erro ao registrar telefone:', error);
        res.render('registrar-telefone', { erro: 'Erro ao registrar telefone. Tente novamente.' });
    } finally {
        client.release();
    }
});
// Adicionar antes da rota de cardápio_digital
app.get('/images/:imageName', async (req, res) => {
    try {
        const produto = await pool.query('SELECT imagem FROM produtos WHERE imagem LIKE $1', ['%' + req.params.imageName]);
        if (produto.rows.length > 0) {
            const imageUrl = produto.rows[0].imagem;
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const contentType = response.headers['content-type'];
            
            res.set('Content-Type', contentType);
            res.send(Buffer.from(response.data, 'binary'));
        } else {
            res.status(404).send('Imagem não encontrada');
        }
    } catch (error) {
        console.error('Erro ao buscar imagem:', error);
        res.status(500).send('Erro ao carregar imagem');
    }
});
// Página do cardápio
app.get('/cardapio_digital', verificarTelefone, async (req, res) => {
    const client = await conectarBanco();
    try {
        // Buscar categorias distintas para o menu
        const categoriasResult = await client.query('SELECT DISTINCT categoria FROM produtos ORDER BY categoria');
        const categorias = categoriasResult.rows.map(row => row.categoria);
        
        // Buscar itens do cardápio
        const result = await client.query('SELECT * FROM produtos ORDER BY categoria, nome');
        
        // Organizar itens por categoria
        const cardapioPorCategoria = {};
        categorias.forEach(categoria => {
            cardapioPorCategoria[categoria] = result.rows.filter(item => item.categoria === categoria);
        });
        
        // Buscar itens em promoção
        const promoResult = await client.query('SELECT * FROM produtos WHERE promocao = \'sim\' LIMIT 5');
        const promocoes = promoResult.rows;
        
        res.render('cardapio_digital', { 
            cardapio: cardapioPorCategoria, 
            categorias,
            promocoes,
            telefone: req.session.telefone,
            nome: req.session.nome
        });
    } catch (error) {
        console.error('Erro ao buscar cardápio:', error);
        res.status(500).send('Erro ao carregar cardápio.');
    } finally {
        client.release();
    }
});

// Adicionar item ao carrinho
app.post('/adicionar-ao-carrinho', verificarTelefone, async (req, res) => {
    const { item_id, quantidade } = req.body;
    
    if (!req.session.carrinho) {
        req.session.carrinho = [];
    }
    
    const client = await conectarBanco();
    try {
        // Buscar informações do item
        const result = await client.query('SELECT * FROM produtos WHERE id = $1', [item_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Item não encontrado' });
        }
        
        const item = result.rows[0];
        
        // Verificar se o item já está no carrinho
        const itemIndex = req.session.carrinho.findIndex(i => i.id === item.id);
        
        if (itemIndex >= 0) {
            // Atualizar quantidade se o item já estiver no carrinho
            req.session.carrinho[itemIndex].quantidade += parseInt(quantidade);
        } else {
            // Adicionar novo item ao carrinho
            req.session.carrinho.push({
                id: item.id,
                nome: item.nome,
                preco: item.preco,
                quantidade: parseInt(quantidade)
            });
        }
        
        res.json({ 
            sucesso: true, 
            mensagem: `${item.nome} adicionado ao carrinho`,
            carrinho: req.session.carrinho
        });
    } catch (error) {
        console.error('Erro ao adicionar item ao carrinho:', error);
        res.status(500).json({ erro: 'Erro ao adicionar item ao carrinho' });
    } finally {
        client.release();
    }
});

// Ver carrinho
app.get('/carrinho', verificarTelefone, (req, res) => {
    const carrinho = req.session.carrinho || [];
    const total = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    
    res.render('carrinho', { 
        carrinho, 
        total,
        telefone: req.session.telefone,
        nome: req.session.nome
    });
});

// Função para salvar pedido no banco de dados
async function salvarPedido(telefone, itens, total) {
    const client = await conectarBanco();
    try {
        await client.query(
            'INSERT INTO pedidos (cliente_telefone, itens, total) VALUES ($1, $2, $3)',
            [telefone, itens, total]
        );
    } catch (error) {
        console.error('Erro ao salvar pedido:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Finalizar pedido
app.post('/finalizar-pedido', verificarTelefone, async (req, res) => {
    const { itens, total } = req.body;
    const telefone = req.session.telefone;
    try {
        await salvarPedido(telefone, itens, total);
        res.sendStatus(200);
    } catch (error) {
        res.status(500).send('Erro ao salvar pedido.');
    }
});

// Página de confirmação de pedido
app.get('/pedido-confirmado/:id', verificarTelefone, async (req, res) => {
    const { id } = req.params;
    const client = await conectarBanco();
    
    try {
        // Buscar informações do pedido
        const pedidoResult = await client.query('SELECT * FROM pedidos WHERE id = $1', [id]);
        
        if (pedidoResult.rows.length === 0) {
            return res.status(404).send('Pedido não encontrado');
        }
        
        const pedido = pedidoResult.rows[0];
        
        // Buscar itens do pedido
        const itensResult = await client.query(`
            SELECT pi.*, c.nome 
            FROM pedido_itens pi 
            JOIN cardapio c ON pi.item_id = c.id 
            WHERE pi.pedido_id = $1
        `, [id]);
        
        res.render('pedido-confirmado', {
            pedido,
            itens: itensResult.rows,
            telefone: req.session.telefone,
            nome: req.session.nome
        });
    } catch (error) {
        console.error('Erro ao buscar informações do pedido:', error);
        res.status(500).send('Erro ao carregar informações do pedido.');
    } finally {
        client.release();
    }
});

// Histórico de pedidos do cliente
app.get('/meus-pedidos', verificarTelefone, async (req, res) => {
    const client = await conectarBanco();
    
    try {
        const result = await client.query(
            'SELECT * FROM pedidos WHERE cliente_telefone = $1 ORDER BY data_criacao DESC',
            [req.session.telefone]
        );
        
        res.render('meus-pedidos', {
            pedidos: result.rows,
            telefone: req.session.telefone,
            nome: req.session.nome
        });
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).send('Erro ao carregar histórico de pedidos.');
    } finally {
        client.release();
    }
});

// Rota para exibir o perfil do cliente
app.get('/perfil', verificarTelefone, async (req, res) => {
    const telefone = req.session.telefone;
    const client = await conectarBanco();
    
    try {
        // Buscar pedidos do cliente
        const pedidosResult = await client.query(
            'SELECT * FROM pedidos WHERE cliente_telefone = $1 ORDER BY data_criacao DESC',
            [telefone]
        );
        
        const pedidos = pedidosResult.rows;
        
        res.render('perfil', { pedidos, telefone, nome: req.session.nome });
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

// Iniciar servidor
const PORT = process.env.PORT || 3008;
app.listen(PORT, () => console.log(`🌐 Serviço de cardápio rodando em http://localhost:${PORT}`));
