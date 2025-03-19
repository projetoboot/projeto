class Carrinho {
    constructor() {
        this.items = [];
        this.total = 0;
        this.quantidade = 0;
    }

    adicionarItem(produto, quantidade, opcionaisSelecionados) {
        // Garantir que todos os dados necessários do produto sejam salvos
        const item = {
            produto: {
                id: produto.id,
                nome: produto.nome,
                preco: Number(produto.preco),
                categoria: produto.categoria
            },
            quantidade: Number(quantidade),
            opcionaisSelecionados: opcionaisSelecionados.map(opcional => ({
                nome: opcional.nome,
                preco: Number(opcional.preco)
            }))
        };

        this.items.push(item);
        this.atualizarTotais();
        this.salvarCarrinho();
        this.atualizarUI();
    }

    removerItem(index) {
        this.items.splice(index, 1);
        this.atualizarTotais();
        this.salvarCarrinho();
        this.atualizarUI();
    }

    calcularPrecoItem(produto, quantidade, opcionaisSelecionados) {
        if (!produto || typeof produto.preco === 'undefined') {
            console.error('Produto inválido:', produto);
            return 0;
        }

        // Garantir que produto.preco seja um número
        const precoBase = Number(produto.preco) || 0;
        const precoTotal = precoBase * quantidade;

        // Calcular o preço dos opcionais
        const precoOpcionais = Array.isArray(opcionaisSelecionados) ? 
            opcionaisSelecionados.reduce((total, opcional) => {
                const precoOpcional = Number(opcional.preco) || 0;
                return total + (precoOpcional * quantidade);
            }, 0) : 0;

        return precoTotal + precoOpcionais;
    }

    atualizarTotais() {
        this.quantidade = this.items.reduce((total, item) => total + Number(item.quantidade), 0);
        this.total = this.items.reduce((total, item) => {
            return total + this.calcularPrecoItem(
                item.produto,
                item.quantidade,
                item.opcionaisSelecionados
            );
        }, 0);
    }

    salvarCarrinho() {
        const dadosParaSalvar = {
            items: this.items.map(item => ({
                produto: {
                    id: item.produto.id,
                    nome: item.produto.nome,
                    preco: Number(item.produto.preco),
                    categoria: item.produto.categoria
                },
                quantidade: Number(item.quantidade),
                opcionaisSelecionados: item.opcionaisSelecionados.map(opcional => ({
                    nome: opcional.nome,
                    preco: Number(opcional.preco)
                }))
            })),
            total: Number(this.total),
            quantidade: Number(this.quantidade)
        };

        localStorage.setItem('carrinho', JSON.stringify(dadosParaSalvar));
    }

    carregarCarrinho() {
        const carrinhoSalvo = localStorage.getItem('carrinho');
        if (carrinhoSalvo) {
            try {
                const dados = JSON.parse(carrinhoSalvo);
                
                // Garantir que os dados carregados tenham a estrutura correta
                this.items = Array.isArray(dados.items) ? dados.items.map(item => ({
                    produto: {
                        id: item.produto.id,
                        nome: item.produto.nome,
                        preco: Number(item.produto.preco),
                        categoria: item.produto.categoria
                    },
                    quantidade: Number(item.quantidade),
                    opcionaisSelecionados: Array.isArray(item.opcionaisSelecionados) ? 
                        item.opcionaisSelecionados.map(opcional => ({
                            nome: opcional.nome,
                            preco: Number(opcional.preco)
                        })) : []
                })) : [];

                this.total = Number(dados.total) || 0;
                this.quantidade = Number(dados.quantidade) || 0;
                this.atualizarUI();
            } catch (error) {
                console.error('Erro ao carregar carrinho:', error);
                this.items = [];
                this.total = 0;
                this.quantidade = 0;
                localStorage.removeItem('carrinho');
            }
        }
    }

    atualizarUI() {
        const contadorCarrinho = document.querySelector('.carrinho-quantidade');
        if (contadorCarrinho) {
            contadorCarrinho.textContent = this.quantidade || 0;
        }

        const totalCarrinho = document.querySelector('.carrinho-total');
        if (totalCarrinho) {
            const total = this.total || 0;
            totalCarrinho.textContent = `R$ ${total.toFixed(2)}`;
        }

        // Atualizar o modal do carrinho
        this.atualizarModalCarrinho();
    }

    atualizarModalCarrinho() {
        const listaCarrinho = document.querySelector('.carrinho-lista');
        const carrinhoVazio = document.querySelector('.carrinho-vazio');
        const totalModal = document.querySelector('.carrinho-total-modal');
        const finalizarBtn = document.querySelector('.finalizar-pedido-btn');

        if (!listaCarrinho || !carrinhoVazio || !totalModal || !finalizarBtn) return;

        // Mostrar mensagem de carrinho vazio ou lista de items
        if (this.items.length === 0) {
            listaCarrinho.style.display = 'none';
            carrinhoVazio.style.display = 'block';
            finalizarBtn.disabled = true;
        } else {
            listaCarrinho.style.display = 'block';
            carrinhoVazio.style.display = 'none';
            finalizarBtn.disabled = false;

            // Atualizar lista de items
            listaCarrinho.innerHTML = this.items.map((item, index) => `
                <div class="carrinho-item">
                    <div class="carrinho-item-info">
                        <h4>${item.produto.nome}</h4>
                        <p>Quantidade: ${item.quantidade}</p>
                        ${item.opcionaisSelecionados.length > 0 ? `
                            <small>
                                Opcionais: ${item.opcionaisSelecionados.map(op => op.nome).join(', ')}
                            </small>
                        ` : ''}
                    </div>
                    <div class="carrinho-item-acoes">
                        <div class="carrinho-item-preco">
                            R$ ${this.calcularPrecoItem(item.produto, item.quantidade, item.opcionaisSelecionados).toFixed(2)}
                        </div>
                        <button class="remover-item" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            // Adicionar eventos aos botões de remover
            listaCarrinho.querySelectorAll('.remover-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    this.removerItem(index);
                });
            });
        }

        // Atualizar total
        totalModal.textContent = `Total: R$ ${this.total.toFixed(2)}`;
    }
}

class CardapioUI {
    constructor() {
        this.carrinho = new Carrinho();
        this.produtoAtual = null;
        this.quantidadeAtual = 1;
        this.opcionaisSelecionados = [];
        this.tipoEntrega = 'local';
        this.enderecoEntrega = '';
        this.inicializar();
    }

    inicializar() {
        this.configurarProdutos();
        this.configurarModal();
        this.configurarCarrinho();
        this.carrinho.carregarCarrinho();
    }

    configurarProdutos() {
        document.querySelectorAll('.produto-card').forEach(card => {
            card.addEventListener('click', () => {
                const produto = {
                    id: card.dataset.id,
                    nome: card.dataset.nome,
                    preco: Number(card.dataset.preco),
                    categoria: card.dataset.categoria,
                    imagem: card.dataset.imagem,
                    opcionais: JSON.parse(card.dataset.opcionais || '[]')
                };
                this.abrirModal(produto);
            });
        });
    }

    configurarModal() {
        const modal = document.getElementById('modalProduto');
        const closeBtn = modal.querySelector('.modal-close');
        const addBtn = modal.querySelector('.adicionar-carrinho-btn');
        const diminuirBtn = modal.querySelector('.diminuir');
        const aumentarBtn = modal.querySelector('.aumentar');

        closeBtn.addEventListener('click', () => this.fecharModal());
        addBtn.addEventListener('click', () => this.adicionarAoCarrinho());
        diminuirBtn.addEventListener('click', () => this.alterarQuantidade(-1));
        aumentarBtn.addEventListener('click', () => this.alterarQuantidade(1));
    }

    configurarCarrinho() {
        // Configurar botão do carrinho flutuante
        const carrinhoBtn = document.querySelector('.carrinho-flutuante');
        if (carrinhoBtn) {
            carrinhoBtn.addEventListener('click', () => this.abrirModalCarrinho());
        }

        // Configurar modal do carrinho
        const modalCarrinho = document.getElementById('modalCarrinho');
        if (modalCarrinho) {
            const closeBtn = modalCarrinho.querySelector('.modal-close');
            const finalizarBtn = modalCarrinho.querySelector('.finalizar-pedido-btn');

            closeBtn.addEventListener('click', () => this.fecharModalCarrinho());
            finalizarBtn.addEventListener('click', () => this.finalizarPedido());
        }
    }

    configurarCarrinhoModal() {
        const modal = document.getElementById('modalCarrinho');
        const btnFechar = modal.querySelector('.modal-close');
        const btnContinuar = modal.querySelector('.continuar-comprando-btn');
        
        btnFechar.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        btnContinuar.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Fechar modal ao clicar fora
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    abrirModal(produto) {
        this.produtoAtual = produto;
        this.quantidadeAtual = 1;
        this.opcionaisSelecionados = [];

        const modal = document.getElementById('modalProduto');
        modal.querySelector('.modal-title').textContent = produto.nome;
        modal.querySelector('.quantidade-input').value = '1';

        // Atualizar a imagem do produto
        const imagemProduto = modal.querySelector('.modal-produto-img');
        imagemProduto.src = `/images/${produto.imagem || 'default.jpg'}`;
        imagemProduto.alt = produto.nome;

        // Renderizar opcionais
        const opcionaisLista = modal.querySelector('.opcionais-lista');
        opcionaisLista.innerHTML = produto.opcionais.map(opcional => {
            const preco = Number(opcional.preco_adicional) || 0;
            return `
                <div class="opcional-item">
                    <div class="opcional-info">
                        <input type="checkbox" 
                               class="opcional-checkbox" 
                               data-nome="${opcional.nome || ''}"
                               data-preco="${preco}">
                        <label>${opcional.nome || ''}</label>
                    </div>
                    <span class="opcional-preco">+R$ ${preco.toFixed(2)}</span>
                </div>
            `;
        }).join('');

        // Adicionar listeners para os checkboxes
        opcionaisLista.querySelectorAll('.opcional-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.atualizarOpcionaisSelecionados());
        });

        this.atualizarPrecoTotal();
        modal.style.display = 'block';
    }

    fecharModal() {
        const modal = document.getElementById('modalProduto');
        modal.style.display = 'none';
        this.produtoAtual = null;
        this.opcionaisSelecionados = [];
    }

    alterarQuantidade(delta) {
        const novaQuantidade = this.quantidadeAtual + delta;
        if (novaQuantidade >= 1 && novaQuantidade <= 10) {
            this.quantidadeAtual = novaQuantidade;
            document.querySelector('.quantidade-input').value = novaQuantidade;
            this.atualizarPrecoTotal();
        }
    }

    atualizarOpcionaisSelecionados() {
        const checkboxes = document.querySelectorAll('.opcional-checkbox:checked');
        this.opcionaisSelecionados = Array.from(checkboxes).map(checkbox => ({
            nome: checkbox.dataset.nome,
            preco: Number(checkbox.dataset.preco)
        }));
        this.atualizarPrecoTotal();
    }

    atualizarPrecoTotal() {
        if (!this.produtoAtual) return;

        const total = this.carrinho.calcularPrecoItem(
            this.produtoAtual,
            this.quantidadeAtual,
            this.opcionaisSelecionados
        );

        document.querySelector('.total-preco').textContent = `R$ ${total.toFixed(2)}`;
        document.querySelector('.adicionar-carrinho-btn').textContent = `Adicionar • R$ ${total.toFixed(2)}`;
    }

    adicionarAoCarrinho() {
        if (!this.produtoAtual) return;

        this.carrinho.adicionarItem(
            this.produtoAtual,
            this.quantidadeAtual,
            this.opcionaisSelecionados
        );

        this.fecharModal();
    }

    abrirModalCarrinho() {
        const modal = document.getElementById('modalCarrinho');
        if (modal) {
            this.carrinho.atualizarModalCarrinho();
            modal.style.display = 'block';
        }
    }

    fecharModalCarrinho() {
        const modal = document.getElementById('modalCarrinho');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    finalizarPedido() {
        if (this.carrinho.items.length === 0) {
            alert('Adicione itens ao carrinho antes de finalizar o pedido.');
            return;
        }

        // Salvar o estado atual do carrinho antes de redirecionar
        this.carrinho.salvarCarrinho();
        
        // Redirecionar para a página de tipo de entrega
        window.location.href = '/tipo-entrega';
        this.fecharModalCarrinho();
    }
}

// Inicializar a UI quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new CardapioUI();
});