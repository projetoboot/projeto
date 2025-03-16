const { obterCardapio, registrarLog, registrarPedido, obterPedidos } = require('./db');

async function testar() {
    console.log("🔹 Testando conexão com o banco...");

    // Teste: Buscar cardápio
    const cardapio = await obterCardapio();
    console.log("📜 Cardápio:", cardapio);

    // Teste: Registrar um log
    await registrarLog("123456789", "Mensagem de teste");

    // Teste: Registrar um pedido
    const pedido = await registrarPedido("123456789", [
        { id: 1, quantidade: 2, preco: 25.90 },
        { id: 3, quantidade: 1, preco: 10.00 }
    ]);
    console.log("🛒 Pedido registrado:", pedido);

    // Teste: Buscar pedidos do usuário
    const pedidos = await obterPedidos("123456789");
    console.log("📦 Pedidos do usuário:", pedidos);
}

testar();
