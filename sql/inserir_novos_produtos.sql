-- Inserindo novos produtos
INSERT INTO produtos (nome, categoria, preco, imagem, synonyms) VALUES
('X-Bacon', 'Lanches', 22.00, 'xbacon.jpg', '{"x-bacon", "cheesebacon"}'),
('X-Tudo', 'Lanches', 28.00, 'xtudo.jpg', '{"x-tudo", "xtudao"}'),
('Pizza Portuguesa', 'Pizzas', 40.00, 'pizza_portuguesa.jpg', '{"portuguesa"}'),
('Pizza Frango com Catupiry', 'Pizzas', 39.00, 'pizza_frango_catupiry.jpg', '{"frango catupiry", "frango catu"}'),
('Onion Rings', 'Acompanhamentos', 12.00, 'onion_rings.jpg', '{"anéis de cebola", "onion"}'),
('Nuggets de Frango', 'Acompanhamentos', 15.00, 'nuggets.jpg', '{"nuggets", "nuggets frango"}'),
('Cerveja Long Neck', 'Bebidas', 8.00, 'cerveja.jpg', '{"long neck", "beer"}'),
('Caipirinha', 'Bebidas', 18.00, 'caipirinha.jpg', '{"caipi", "caipirinha"}'),
('Torta de Chocolate', 'Sobremesas', 14.00, 'torta_chocolate.jpg', '{"torta chocolate", "bolo chocolate"}'),
('Petit Gateau', 'Sobremesas', 20.00, 'petit_gateau.jpg', '{"petit gateau", "chocolate quente"}'),
('Brownie com Sorvete', 'Sobremesas', 18.00, 'brownie_sorvete.jpg', '{"brownie", "brownie sorvete"}');

-- Inserindo opcionais
INSERT INTO opcionais (nome, preco_adicional) VALUES
('Pepperoni', 5.00),
('Molho Barbecue', 3.00),
('Molho Especial', 4.00),
('Alho Frito', 2.00),
('Calabresa Extra', 4.50),
('Queijo Gorgonzola', 4.00),
('Pimenta Dedo de Moça', 1.50),
('Azeitona Preta', 2.00),
('Leite Condensado', 2.50),
('Sorvete de Creme', 5.00);

-- Associando opcionais aos produtos
INSERT INTO produto_opcionais (produto_id, opcional_id) VALUES
-- Opcionais para X-Bacon
(15, 2), -- Queijo Mussarela
(15, 3), -- Molho Barbecue
(15, 5), -- Calabresa Extra

-- Opcionais para X-Tudo
(16, 1), -- Queijo Provolone
(16, 2), -- Queijo Mussarela
(16, 4), -- Alho Frito
(16, 6), -- Queijo Gorgonzola

-- Opcionais para Pizzas
(17, 7), -- Pimenta Dedo de Moça
(17, 8), -- Azeitona Preta
(17, 5), -- Calabresa Extra
(18, 1), -- Pepperoni
(18, 3), -- Molho Especial
(18, 6), -- Queijo Gorgonzola

-- Opcionais para Acompanhamentos
(19, 3), -- Molho Especial
(19, 4), -- Alho Frito
(20, 3), -- Molho Especial
(20, 7), -- Pimenta Dedo de Moça

-- Opcionais para Bebidas
(21, 10), -- Gelo
(22, 7), -- Pimenta Dedo de Moça (para um toque especial)

-- Opcionais para Sobremesas
(23, 9), -- Leite Condensado
(23, 10), -- Sorvete de Creme
(24, 10), -- Sorvete de Creme
(25, 9), -- Leite Condensado
(25, 10); -- Sorvete de Creme 