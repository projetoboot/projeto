-- Primeiro, vamos remover as entradas duplicadas mantendo apenas os IDs mais baixos
DELETE FROM produtos 
WHERE id IN (38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48);

-- Agora vamos atualizar as imagens dos produtos para usar os arquivos .png locais
UPDATE produtos 
SET imagem = 'xbacon.png'
WHERE id = 16;

UPDATE produtos 
SET imagem = 'xtudo.png'
WHERE id = 17;

UPDATE produtos 
SET imagem = 'pizza_portuguesa.png'
WHERE id = 18;

UPDATE produtos 
SET imagem = 'pizza_frango_catupiry.png'
WHERE id = 19;

UPDATE produtos 
SET imagem = 'onion_rings.png'
WHERE id = 20;

UPDATE produtos 
SET imagem = 'nuggets.png'
WHERE id = 21;

UPDATE produtos 
SET imagem = 'cerveja.png'
WHERE id = 22;

UPDATE produtos 
SET imagem = 'caipirinha.png'
WHERE id = 23;

UPDATE produtos 
SET imagem = 'torta_chocolate.png'
WHERE id = 24;

UPDATE produtos 
SET imagem = 'petit_gateau.png'
WHERE id = 25;

UPDATE produtos 
SET imagem = 'brownie_sorvete.png'
WHERE id = 26; 