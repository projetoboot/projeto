import requests
import os
from PIL import Image
from io import BytesIO

# Criar diretório de imagens se não existir
if not os.path.exists('public/images'):
    os.makedirs('public/images')

# Dicionário com nomes dos arquivos e URLs das imagens
imagens = {
    'xbacon.png': 'https://images.unsplash.com/photo-1553979459-d2229ba7433b',
    'pizza_portuguesa.png': 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3',
    'pizza_frango_catupiry.png': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
    'onion_rings.png': 'https://images.unsplash.com/photo-1639024471283-03518883512d',
    'nuggets.png': 'https://images.unsplash.com/photo-1619881590738-a111d176d906',
    'cerveja.png': 'https://images.unsplash.com/photo-1608270586620-248524c67de9',
    'caipirinha.png': 'https://images.unsplash.com/photo-1609951651556-5334e2706168',
    'torta_chocolate.png': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587',
    'petit_gateau.png': 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51',
    'brownie_sorvete.png': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c'
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
        nova_imagem.save(caminho_arquivo, 'PNG')
        print(f'✅ Imagem salva com sucesso: {nome_arquivo}')
        
    except Exception as e:
        print(f'❌ Erro ao processar {nome_arquivo}: {str(e)}')

# Baixar todas as imagens
for nome_arquivo, url in imagens.items():
    baixar_e_salvar_imagem(nome_arquivo, url)

print('✨ Processo concluído!') 