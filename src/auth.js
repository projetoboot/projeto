const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg'); // Importa o módulo PostgreSQL

const router = express.Router();

// Configurações do banco de dados PostgreSQL
const DB_CONFIG = {
    user: 'postgres',
    host: 'localhost',
    database: 'whatsapp_bot',
    password: '123',
    port: 5432,
};

// Cria o pool de conexões
const pool = new Pool(DB_CONFIG);

// Middleware para verificar login
function verificarAutenticacao(req, res, next) {
    if (!req.session.usuario) {
        console.log('Usuário não autenticado. Redirecionando para /login...');
        return res.redirect('/login');
    }
    console.log('Usuário autenticado. Continuando...');
    next();
}

// Página de Login
router.get('/login', (req, res) => {
    res.render('login', { erro: null });
});

// Rota de Login (POST)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    let client;
    try {
        client = await pool.connect(); // Obtém uma conexão do pool
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
        if (client) client.release(); // Libera a conexão do pool
    }
});

// Rota de Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            return res.status(500).send('Erro ao sair.');
        }
        res.redirect('/login');
    });
});

// Página de Cadastro
router.get('/register', (req, res) => {
    res.render('register', { erro: null });
});

// Rota de Cadastro (POST)
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    let client;
    try {
        client = await pool.connect(); // Obtém uma conexão do pool
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
        if (client) client.release(); // Libera a conexão do pool
    }
});

module.exports = router;