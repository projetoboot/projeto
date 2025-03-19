const express = require('express');
const { Pool } = require('pg'); // Para PostgreSQL
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // Para sessões com PostgreSQL
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/../views');
app.use(express.static(__dirname + '/../public'));
app.use(express.static(__dirname + '/public'));

// Configurações do banco de dados PostgreSQL
const DB_CONFIG = {
    user: 'postgres', // substitua pelo seu usuário PostgreSQL
    host: 'localhost',
    database: 'whatsapp_bot',
    password: '123', // substitua pela sua senha
    port: 5432, // porta padrão do PostgreSQL
};

const pool = new Pool(DB_CONFIG);

// Middleware para verificar login
function verificarAutenticacao(req, res, next) {
    console.log('Sessão atual:', req.session.usuario);
    if (!req.session.usuario) {
        console.log('Usuário não autenticado. Redirecionando para /login...');
        return res.redirect('/login');
    }
    console.log('Usuário autenticado. Continuando...');
    next();
}

// Middleware para logar a sessão completa
app.use((req, res, next) => {
    console.log('Sessão completa:', req.session);
    next();
});

// Configuração de sessão com PostgreSQL
const sessionStore = new pgSession({
    pool: pool, // Conexão do pool de PostgreSQL
    tableName: 'session', // nome da tabela para armazenar sessões
});

app.use(session({
    key: 'sessao_usuario',
    secret: 'seuSegredoSeguro',
    store: sessionStore, // Usando PostgreSQL para sessões
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: false, maxAge: 24 * 60 * 60 * 1000 } // 1 dia
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

app.get('/', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
});

// Página de Login
app.get('/login', (req, res) => {
    res.render('login', { erro: null });
});

/////login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const client = await conectarBanco();

    try {
        const result = await client.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        const usuarios = result.rows;
        if (usuarios.length === 0) {
            return res.render('login', { erro: 'Usuário não encontrado' });
        }

        if (!(await bcrypt.compare(password, usuarios[0].password))) {
            return res.render('login', { erro: 'Usuário ou senha inválidos!' });
        }

        req.session.usuario = { id: usuarios[0].id, username: usuarios[0].username };
        console.log('Sessão definida após login:', req.session.usuario);

        // Força a gravação da sessão no armazenamento
        req.session.save((err) => {
            if (err) {
                console.error('Erro ao salvar a sessão:', err);
            } else {
                console.log('Sessão salva com sucesso.');
            }
        });

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).send('Erro no login.');
    } finally {
        client.release(); // Liberar o cliente do pool
    }
});
///login 

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            return res.status(500).send('Erro ao sair.');
        }
        res.redirect('/login');
    });
});

app.get('/dashboard', verificarAutenticacao, (req, res) => {
    res.render('dashboard', { usuario: req.session.usuario, qrCode: '/qrcode.png' });
});

// Chamar QR Code do bot.js após login
const bot = require('../src/bot'); // Importa e inicia o bot automaticamente
//const simuladorbot = require('../src/simulador'); // Importa e inicia o bot automaticamente
app.get('/dashboard/qrcode', verificarAutenticacao, (req, res) => {
    res.render('qrcode', { qrCode: bot.getQRCode() });
});

// Página de Cadastro
app.get('/register', (req, res) => {
    res.render('register', { erro: null });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const client = await conectarBanco();

    try {
        const result = await client.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        const existe = result.rows;

        if (existe.length > 0) {
            return res.render('register', { erro: 'Usuário já existe!' });
        }

        const senhaCriptografada = await bcrypt.hash(password, 10);

        const resultInsert = await client.query(
            'INSERT INTO usuarios (username, password) VALUES ($1, $2) RETURNING id',
            [username, senhaCriptografada]
        );

        req.session.usuario = { id: resultInsert.rows[0].id, username };
        console.log('Sessão definida após cadastro:', req.session.usuario);

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).send('Erro ao cadastrar usuário.');
    } finally {
        client.release(); // Liberar o cliente do pool
    }
});

// Rota para a página de gerenciar cardápio
app.get('/dashboard/cardapio', verificarAutenticacao, async (req, res) => {
    const client = await conectarBanco();
    try {
        const result = await client.query('SELECT * FROM cardapio');
        res.render('cardapio', { cardapio: result.rows });
    } catch (error) {
        console.error('Erro ao buscar cardápio:', error);
        res.status(500).send('Erro ao carregar cardápio.');
    } finally {
        client.release();
    }
});

// Rota para adicionar um item ao cardápio
app.post('/dashboard/cardapio/adicionar', async (req, res) => {
    const { nome, categoria, preco, imagem, synonyms } = req.body;

    // Função para limpar e validar os sinônimos
    function formatarSynonyms(synonyms) {
        if (!synonyms || typeof synonyms !== 'string') return '{}'; // Retorna array vazio se for inválido
        // Remove espaços extras e divide por vírgula
        const synonymsArray = synonyms
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        // Formata como array JSON
        return `{${synonymsArray.map(s => `"${s}"`).join(',')}}`;
    }

    // Limpa os sinônimos
    const formattedSynonyms = formatarSynonyms(synonyms);
    const client = await conectarBanco();
    try {
        
        await client.query(
            'INSERT INTO cardapio (nome, categoria, preco, imagem, synonyms) VALUES ($1, $2, $3, $4, $5)',
            [nome, categoria, preco, imagem, formattedSynonyms]
        );
        res.redirect('/dashboard/cardapio');
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        res.status(500).send('Erro ao adicionar item ao cardápio.');
    } finally {
        client.release();
    }
});

// Rota para remover um item do cardápio
app.get('/dashboard/cardapio/remover/:id', async (req, res) => {
    const { id } = req.params;
    const client = await conectarBanco();
    try {
        await client.query('DELETE FROM cardapio WHERE id = $1', [id]);
        res.redirect('/dashboard/cardapio');
    } catch (error) {
        console.error('Erro ao remover item:', error);
        res.status(500).send('Erro ao remover item do cardápio.');
    } finally {
        client.release();
    }
});

// pedidos
// Rota para listar todos os pedidos
app.get('/dashboard/pedidos', verificarAutenticacao, async (req, res) => {
    const client = await conectarBanco();
    try {
        console.log('Buscando todos os pedidos...');
        const result = await client.query('SELECT * FROM pedidos ORDER BY data_criacao DESC');
        console.log('Pedidos encontrados:', result.rows);
        res.render('pedidos', { pedidos: result.rows });
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).send('Erro ao carregar pedidos.');
    } finally {
        client.release();
    }
});

// Rota para criar um novo pedido
app.post('/dashboard/pedidos/criar', verificarAutenticacao, async (req, res) => {
    const { produtos, total } = req.body;
    const usuario_id = req.session.usuario.id; // ID do usuário logado
    const client = await conectarBanco();

    try {
        console.log('Criando novo pedido para o usuário:', usuario_id);
        console.log('Produtos recebidos:', produtos);
        console.log('Total do pedido:', total);

        const result = await client.query(
            'INSERT INTO pedidos (usuario_id, produtos, total, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [usuario_id, produtos, total, 'pendente']
        );

        console.log('Pedido criado com sucesso. ID do pedido:', result.rows[0].id);
        res.redirect('/dashboard/pedidos');
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).send('Erro ao criar pedido.');
    } finally {
        client.release();
    }
});

// Rota para atualizar o status de um pedido
app.post('/dashboard/pedidos/atualizar/:id', verificarAutenticacao, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const client = await conectarBanco();

    try {
        console.log(`Atualizando status do pedido ${id} para "${status}"...`);
        const result = await client.query(
            'UPDATE pedidos SET status = $1 WHERE id = $2',
            [status, id]
        );

        if (result.rowCount === 0) {
            console.log(`Pedido ${id} não encontrado.`);
            return res.status(404).send('Pedido não encontrado.');
        }

        console.log(`Status do pedido ${id} atualizado para "${status}".`);
        res.redirect('/dashboard/pedidos');
    } catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        res.status(500).send('Erro ao atualizar pedido.');
    } finally {
        client.release();
    }
});

// Rota para excluir um pedido
app.get('/dashboard/pedidos/excluir/:id', verificarAutenticacao, async (req, res) => {
    const { id } = req.params;
    const client = await conectarBanco();

    try {
        console.log(`Excluindo pedido ${id}...`);
        const result = await client.query('DELETE FROM pedidos WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            console.log(`Pedido ${id} não encontrado.`);
            return res.status(404).send('Pedido não encontrado.');
        }

        console.log(`Pedido ${id} excluído com sucesso.`);
        res.redirect('/dashboard/pedidos');
    } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        res.status(500).send('Erro ao excluir pedido.');
    } finally {
        client.release();
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🌐 Dashboard rodando em http://localhost:${PORT}`));