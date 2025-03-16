const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/../views');
app.use(express.static(__dirname + '/../public'));
app.use(express.static(__dirname + '/public'));



const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'whatsapp_bot'
};
const sessionStore = new MySQLStore(DB_CONFIG);

app.use(session({
    key: 'sessao_usuario',
    secret: 'seuSegredoSeguro',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 } // 1 dia
}));
async function conectarBanco() {
    const connection = await mysql.createConnection(DB_CONFIG);
    return connection;
}

// Middleware para verificar login
function verificarAutenticacao(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    next();
}
app.get('/', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/dashboard'); // Se estiver logado, vai direto para o dashboard
    }
    res.redirect('/login'); // Se não estiver logado, vai para a tela de login
});
// Página de Login
app.get('/login', (req, res) => {
    res.render('login', { erro: null }); // Defina 'erro' como null inicialmente
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const connection = await conectarBanco();

    try {
        const [usuarios] = await connection.execute('SELECT * FROM usuarios WHERE username = ?', [username]);
        console.log('Usuário retornado do banco:', usuarios); // Ver os dados que vieram do banco
        if (usuarios.length === 0) {
            return res.render('login', { erro: 'Usuario nao encontrado ' });


        }

           if ( await bcrypt.compare(password, usuarios[0].password)) {
            return res.render('login', { erro: 'Usuário ou senha inválidos!' });
        }
        console.log("login realizado com sucesso")
        req.session.usuario = { id: usuarios[0].id, username: usuarios[0].username };
        console.log(req.session.usuario)
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).send('Erro no login.');
    } finally {
        await connection.end();
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            return res.status(500).send('Erro ao sair.');
        }
        res.redirect('/login'); // Redireciona para a página de login após sair
    });
});
// Rotas protegidassrc\public\qrcode.png C:\Users\thela\lanchonete-bot\src\public\qrcode.png
app.get('/dashboard', verificarAutenticacao, (req, res) => {
    res.render('dashboard', { usuario: req.session.usuario , qrCode: '/qrcode.png' });
});

// Chamar QR Code do bot.js após login
const bot = require('../src/bot'); // Importa e inicia o bot automaticamente
//const simulador = require('../src/simulador'); // Importa e inicia o bot automaticamente
app.get('/dashboard/qrcode', verificarAutenticacao, (req, res) => {
    res.render('qrcode', { qrCode: bot.getQRCode() }); // Pega o QR Code do bot
});

///////////////
// Página de Cadastro
app.get('/register', (req, res) => {
    res.render('register', { erro: null });
});

// Processar Cadastro
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const connection = await conectarBanco();

    try {
        // Verifica se o usuário já existe
        const [existe] = await connection.execute('SELECT * FROM usuarios WHERE username = ?', [username]);
        if (existe.length > 0) {
            return res.render('register', { erro: 'Usuário já existe!' });
        }

        // Hash da senha
        const senhaCriptografada = await bcrypt.hash(password, 10);

        // Insere no banco
        const [result] = await connection.execute(
            'INSERT INTO usuarios (username, password) VALUES (?, ?)',
            [username, senhaCriptografada]
        );

        // Autentica automaticamente após cadastro
        req.session.usuario = { id: result.insertId, username };

        console.log("Cadastro realizado com sucesso");
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).send('Erro ao cadastrar usuário.');
    } finally {
        await connection.end();
    }
});

////////////////////

// Rota para a página de gerenciar cardápio
app.get('/dashboard/cardapio',verificarAutenticacao, async (req, res) => {
    const connection = await conectarBanco();
    try {
        const [cardapio] = await connection.execute('SELECT * FROM cardapio');
        res.render('cardapio', { cardapio: cardapio });
    } catch (error) {
        console.error('Erro ao buscar cardápio:', error);
        res.status(500).send('Erro ao carregar cardápio.');
    } finally {
        await connection.end();
    }
});

// Rota para adicionar um item ao cardápio
app.post('/dashboard/cardapio/adicionar', async (req, res) => {
    const { nome, categoria, preco, imagem, synonyms } = req.body;
    const connection = await conectarBanco();
    try {
        const [result] = await connection.execute(
            'INSERT INTO cardapio (nome, categoria, preco, imagem, synonyms) VALUES (?, ?, ?, ?, ?)',
            [nome, categoria, preco, imagem, synonyms]
        );
        res.redirect('/dashboard/cardapio');
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        res.status(500).send('Erro ao adicionar item ao cardápio.');
    } finally {
        await connection.end();
    }
});

// Rota para remover um item do cardápio
app.get('/dashboard/cardapio/remover/:id', async (req, res) => {
    const { id } = req.params;
    const connection = await conectarBanco();
    try {
        await connection.execute('DELETE FROM cardapio WHERE id = ?', [id]);
        res.redirect('/dashboard/cardapio');
    } catch (error) {
        console.error('Erro ao remover item:', error);
        res.status(500).send('Erro ao remover item do cardápio.');
    } finally {
        await connection.end();
    }
});
// pedidos
app.get('/dashboard/pedidos', async (req, res) => {
    const connection = await conectarBanco();
    try {
        const [pedidos] = await connection.execute('SELECT * FROM pedidos');
        res.render('pedidos', { pedidos: pedidos });
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).send('Erro ao carregar pedidos.');
    } finally {
        await connection.end();
    }
});///fim pedido 
//inicio log
app.get('/dashboard/logs', verificarAutenticacao, async (req, res) => {
    const connection = await conectarBanco();
    try {
        const [logs] = await connection.execute('SELECT * FROM logs ORDER BY criado_em DESC');
        res.render('logs', { logs });
    } catch (error) {
        console.error('Erro ao buscar logs:', error);
        res.status(500).send('Erro ao carregar logs.');
    } finally {
        await connection.end();
    }
});
//fim log
// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🌐 Dashboard rodando em http://localhost:${PORT}`));
//app.listen(3000, () => {
   // console.log('🌐 Dashboard rodando em http://localhost:3000');
//});
