const express = require('express');
const db = require('../src/db'); 

const router = express.Router();

// Middleware para verificar autenticação
function verificarAutenticacao(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    next();
}

// Rota para listar todos os pedidos
router.get('/', verificarAutenticacao, async (req, res) => {
    const client = await db.pool.connect();
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
router.post('/criar', verificarAutenticacao, async (req, res) => {
    const { produtos, total } = req.body;
    const usuario_id = req.session.usuario.id; // ID do usuário logado
    const client = await db.pool.connect();
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
router.post('/atualizar/:id', verificarAutenticacao, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const client = await db.pool.connect();
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
router.get('/excluir/:id', verificarAutenticacao, async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
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

module.exports = router;