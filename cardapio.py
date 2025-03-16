import random

# Categorias do cardápio
categorias = {
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
}

# Gerar um cardápio com 10.000 itens aleatórios
def gerar_cardapio():
    cardapio = []
    for _ in range(10000):
        categoria = random.choice(list(categorias.keys()))
        nome = random.choice(categorias[categoria])
        preco = round(random.uniform(5, 50), 2)  # Preço entre R$5 e R$50
        calorias = random.randint(100, 1500)  # Calorias entre 100 e 1500
        cardapio.append({"categoria": categoria, "item": nome, "preco": preco, "calorias": calorias})
    return cardapio

# Criar variável global para o cardápio
CARDAPIO = gerar_cardapio()
