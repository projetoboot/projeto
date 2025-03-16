const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const categorias = {
    "Massas": [
        "Espaguete ao Sugo", "Lasanha Bolonhesa", "Macarrão Carbonara",
        "Fettuccine Alfredo", "Ravioli de Queijo", "Nhoque ao Molho Branco"
    ],
    "Frutos do Mar": [
        "Camarão à Milanesa", "Lula Grelhada", "Bacalhau à Brás",
        "Salmão ao Molho de Maracujá", "Risoto de Frutos do Mar"
    ],
    "Lanches": [
        "Hambúrguer Clássico", "Cheeseburger", "X-Bacon", "Sanduíche de Frango",
        "Wrap Vegetariano", "Cachorro-Quente"
    ],
    "Pizzas": [
        "Pizza Marguerita", "Pizza de Calabresa", "Pizza Portuguesa",
        "Pizza de Pepperoni", "Pizza Quatro Queijos", "Pizza de Frango com Catupiry"
    ],
    "Sobremesas": [
        "Torta de Chocolate", "Pudim de Leite", "Brownie com Sorvete",
        "Cheesecake de Morango", "Mousse de Maracujá"
    ],
    "Bebidas": [
        "Coca-Cola 600ml", "Suco Natural de Laranja", "Água com Gás",
        "Cerveja Artesanal", "Vinho Tinto", "Refrigerante Diet"
    ]
};

const gerarCardapio = () => {
    const cardapio = [];
    for (let i = 0; i < 10000; i++) {
        const categoria = randomItem(Object.keys(categorias));
        const nome = randomItem(categorias[categoria]);
        const preco = (Math.random() * (50 - 5) + 5).toFixed(2); // Preço entre R$5 e R$50
        const calorias = Math.floor(Math.random() * (1500 - 100) + 100); // Calorias entre 100 e 1500
        
        cardapio.push({ categoria, item: nome, preco: parseFloat(preco), calorias });
    }
    return cardapio;
};

const CARDAPIO = gerarCardapio();

module.exports = { CARDAPIO };
