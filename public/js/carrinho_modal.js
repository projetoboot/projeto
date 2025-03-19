document.addEventListener('DOMContentLoaded', function () {
    console.log("🔄 Página carregada: Iniciando script do carrinho");

    const tipoEntregaInputs = document.querySelectorAll('input[name="tipo-entrega"]');
    const enderecoEntrega = document.querySelector('.endereco-entrega');
    const finalizarPedidoBtn = document.querySelector('.finalizar-pedido-btn');

    if (!tipoEntregaInputs.length || !enderecoEntrega || !finalizarPedidoBtn) {
        console.error("❌ ERRO: Elementos do DOM não encontrados!");
        return;
    }

    // Mostrar/ocultar campo de endereço quando selecionar delivery
    tipoEntregaInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            console.log(`🛵 Tipo de entrega alterado: ${e.target.value}`);
            enderecoEntrega.style.display = e.target.value === 'entrega' ? 'block' : 'none';
        });
    });

    // Função para validar os dados do carrinho
    function validarCarrinho(carrinho) {
        if (!carrinho || !carrinho.items || carrinho.items.length === 0) {
            throw new Error('Seu carrinho está vazio!');
        }

        if (!Array.isArray(carrinho.items) || !carrinho.items.every(item => item.produto.id && item.produto.preco && item.quantidade)) {
            throw new Error('Dados do carrinho inválidos.');
        }
    }

    // Função para formatar os dados do pedido
    function formatarDadosPedido(tipoEntrega, endereco, carrinho) {
        return {
            tipo_entrega: tipoEntrega,
            endereco: endereco || null,
            carrinho: carrinho.items.map(item => ({
                produto: {
                    id: item.produto.id,
                    preco: item.produto.preco
                },
                quantidade: item.quantidade,
                opcionais: item.opcionais || []
            }))
        };
    }

    // Função para enviar o pedido ao servidor
    async function enviarPedido(pedidoData) {
        try {
            console.log("📤 Enviando dados do pedido:", JSON.stringify(pedidoData, null, 2));

            const response = await fetch('/finalizar_pedido', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ dadosPedido: pedidoData })
            });

            console.log("📥 Resposta recebida do servidor:", response);

            if (!response.ok) {
                let errorMessage;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.erro || `Erro ${response.status}: ${response.statusText}`;
                    console.error("❌ Erro na resposta do servidor:", errorData);
                } catch {
                    errorMessage = `Erro ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log("✅ Resposta JSON do servidor:", data);

            if (!data.sucesso) {
                throw new Error(data.erro || 'Erro ao finalizar pedido.');
            }

            return data;
        } catch (error) {
            console.error('❌ ERRO ao enviar pedido:', error);
            throw error;
        }
    }

    // Função principal para lidar com o clique no botão "Finalizar Pedido"
    finalizarPedidoBtn.addEventListener('click', async function () {
        try {
            console.log("🛒 Botão 'Finalizar Pedido' clicado.");

            // Recuperar carrinho do localStorage
            const carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]');
            console.log("📦 Conteúdo do carrinho antes do envio:", carrinho);

            // Validar carrinho
            validarCarrinho(carrinho);

            // Obter tipo de entrega e endereço
            const tipoEntregaElement = document.querySelector('input[name="tipo-entrega"]:checked');
            const tipoEntrega = tipoEntregaElement ? tipoEntregaElement.value : null;
            const enderecoElement = document.querySelector('.endereco-entrega textarea');
            const endereco = enderecoElement ? enderecoElement.value.trim() : '';

            console.log(`🚚 Tipo de entrega selecionado: ${tipoEntrega}`);
            console.log(`🏠 Endereço digitado: ${endereco || '(Não informado)'}`);

            // Validar tipo de entrega
            if (!tipoEntrega) {
                alert('Por favor, selecione um tipo de entrega.');
                console.warn("⚠️ Nenhum tipo de entrega selecionado.");
                return;
            }

            // Validar endereço para entrega
            if (tipoEntrega === 'entrega' && (!endereco || endereco.length < 5)) {
                alert('Por favor, informe um endereço válido.');
                console.warn("⚠️ Endereço inválido informado.");
                return;
            }

            // Formatar os dados do pedido
            const pedidoData = formatarDadosPedido(tipoEntrega, endereco, carrinho);

            // Enviar pedido ao servidor
            const respostaServidor = await enviarPedido(pedidoData);

            console.log("🎉 Pedido finalizado com sucesso!");

            // Salvar dados do pedido no localStorage antes de redirecionar
            const dadosPedido = {
                carrinho: carrinho,
                tipoEntrega: tipoEntrega,
                enderecoEntrega: endereco
            };
            const dadosPedidoStr = encodeURIComponent(JSON.stringify(dadosPedido));

            // Redirecionar para a página de confirmação do pedido
            console.log("🔀 Redirecionando para a página de confirmação...");
            window.location.href = `/pedido_confirmado?dadosPedido=${dadosPedidoStr}`;

            // Limpar carrinho após finalizar pedido
            localStorage.removeItem('carrinho');
        } catch (error) {
            console.error('❌ ERRO ao finalizar pedido:', error);
            alert(error.message || 'Erro ao finalizar pedido. Tente novamente.');
        }
    });
});