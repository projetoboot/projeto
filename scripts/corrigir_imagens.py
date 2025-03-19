import requests
import os
from PIL import Image
from io import BytesIO

# Criar diretório de imagens se não existir
if not os.path.exists('public/images'):
    os.makedirs('public/images')

# Dicionário com nomes dos arquivos e URLs das imagens corretas
imagens = {
    'pizza-quatro-queijos.jpg': 'https://images.unsplash.com/photo-1513104890138-7c749659a591',  # Pizza 4 queijos
    'agua-mineral.jpg': 'https://images.unsplash.com/photo-1523362628745-0c100150b504',  # Garrafa de água mineral real
    'cachorro-quente-completo.jpg': 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a',  # Cachorro quente completo
    'milkshake-chocolate.jpg': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699',  # Milkshake de chocolate real
    'milkshake-morango.jpg': 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc',  # Milkshake de morango
    'batata-frita-crocante.jpg': 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d',  # Batata frita crocante
    'refrigerante-coca.jpg': 'https://images.unsplash.com/photo-1554866585-cd94860890b7',  # Coca-Cola real
    'suco-laranja-natural.jpg': 'https://images.unsplash.com/photo-1613478223719-2ab802602423'  # Suco de laranja natural
}

def baixar_e_salvar_imagem(nome_arquivo, url):
    try:
        print(f'📥 Baixando: {nome_arquivo}')
        response = requests.get(url)
        response.raise_for_status()
        
        imagem = Image.open(BytesIO(response.content))
        
        # Redimensionar para 300x300 mantendo proporção
        tamanho = (300, 300)
        imagem.thumbnail(tamanho)
        
        # Criar nova imagem com fundo branco
        nova_imagem = Image.new('RGB', tamanho, 'white')
        
        # Calcular posição para centralizar
        x = (tamanho[0] - imagem.size[0]) // 2
        y = (tamanho[1] - imagem.size[1]) // 2
        
        # Colar imagem redimensionada no centro
        nova_imagem.paste(imagem, (x, y))
        
        # Salvar imagem
        caminho_arquivo = os.path.join('public/images', nome_arquivo)
        nova_imagem.save(caminho_arquivo, 'JPEG', quality=85)
        print(f'✅ Imagem salva com sucesso: {nome_arquivo}')
        
    except Exception as e:
        print(f'❌ Erro ao processar {nome_arquivo}: {str(e)}')

# Baixar todas as imagens
for nome_arquivo, url in imagens.items():
    baixar_e_salvar_imagem(nome_arquivo, url)

print('✨ Processo concluído!') 