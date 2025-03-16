const mysql = require('mysql2/promise');

// Configuração da conexão com o banco de dados
const pool = mysql.createPool({
    host: 'localhost',       // Host do banco (padrão no XAMPP)
    user: 'root',            // Usuário padrão do MySQL no XAMPP
    password: '',            // Senha vazia por padrão no XAMPP
    database: 'whatsapp_bot',// Nome do banco de dados
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 🔹 Buscar o cardápio do banco de dados
async function obterCardapio() {
    try {
        const [rows] = await pool.query("SELECT * FROM cardapio");
        return rows;
    } catch (error) {
        console.error("Erro ao obter cardápio:", error);
        return [];
    }
}

// 🔹 Registrar mensagens no log
async function registrarLog(usuario, mensagem) {
    try {
        await pool.query("INSERT INTO logs (usuario, mensagem) VALUES (?, ?)", [usuario, mensagem]);
    } catch (error) {
        console.error("Erro ao registrar log:", error);
    }
}

// 🔹 Registrar um novo pedido
async function registrarPedido(usuario, itens) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Verifica se o usuário já existe
        let [rows] = await conn.query("SELECT id FROM usuarios WHERE telefone = ?", [usuario]);
        let usuarioId;

        if (rows.length === 0) {
            const [result] = await conn.query("INSERT INTO usuarios (telefone) VALUES (?)", [usuario]);
            usuarioId = result.insertId;
        } else {
            usuarioId = rows[0].id;
        }

        // Registra o pedido
        const total = itens.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        const [pedidoResult] = await conn.query("INSERT INTO pedidos (usuario_id, total) VALUES (?, ?)", [usuarioId, total]);
        const pedidoId = pedidoResult.insertId;

        // Insere os itens do pedido
        for (const item of itens) {
            await conn.query("INSERT INTO pedido_itens (pedido_id, item_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)", 
                [pedidoId, item.id, item.quantidade, item.preco]);
        }

        await conn.commit();
        return { pedidoId, total };
    } catch (error) {
        await conn.rollback();
        console.error("Erro ao registrar pedido:", error);
        return null;
    } finally {
        conn.release();
    }
}

// 🔹 Buscar pedidos de um usuário
async function obterPedidos(usuario) {
    try {
        const [rows] = await pool.query(`
            SELECT p.id AS pedido_id, p.total, p.status, pi.quantidade, c.nome, pi.preco_unitario
            FROM pedidos p
            JOIN usuarios u ON p.usuario_id = u.id
            JOIN pedido_itens pi ON pi.pedido_id = p.id
            JOIN cardapio c ON pi.item_id = c.id
            WHERE u.telefone = ?
            ORDER BY p.criado_em DESC
        `, [usuario]);

        return rows;
    } catch (error) {
        console.error("Erro ao obter pedidos:", error);
        return [];
    }
}

// Exporta as funções para serem usadas no bot
module.exports = { obterCardapio, registrarLog, registrarPedido, obterPedidos };
