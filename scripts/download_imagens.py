import os
import requests
from PIL import Image
from io import BytesIO

# URLs das imagens (escolhidas manualmente para garantir qualidade e relevância)
IMAGENS = {
    'cachorro-quente-completo.jpg': 'https://img.freepik.com/free-photo/delicious-hot-dog-with-mustard-onion_23-2148242832.jpg',
    'hamburguer-artesanal.jpg': 'https://img.freepik.com/free-photo/front-view-burger-stand_141793-15542.jpg',
    'pizza-margherita.jpg': 'https://img.freepik.com/free-photo/pizza-pizza-filled-with-tomatoes-salami-olives_140725-1200.jpg',
    'refrigerante-coca.jpg': 'https://img.freepik.com/free-photo/fresh-cola-drink-with-ice-cubes_144627-16201.jpg',
    'suco-laranja-natural.jpg': 'https://img.freepik.com/free-photo/orange-juice-glass-dark-background_1150-45560.jpg',
    'yakisoba-tradicional.jpg': 'https://img.freepik.com/free-photo/stir-fried-noodles-plate_1339-2157.jpg',
    'x-burger-especial.jpg': 'https://img.freepik.com/free-photo/delicious-grilled-burgers_62847-16.jpg',
    'x-salada-completo.jpg': 'https://img.freepik.com/free-photo/fresh-burger-with-salad-onion_144627-9522.jpg',
    'pizza-calabresa.jpg': 'https://img.freepik.com/free-photo/mixed-pizza-with-various-ingridients_140725-3790.jpg',
    'pizza-quatro-queijos.jpg': 'https://img.freepik.com/free-photo/pizza-four-cheese-wooden-board_140725-5093.jpg',
    'batata-frita-crocante.jpg': 'https://img.freepik.com/free-photo/crispy-french-fries-with-ketchup-mayonnaise_1150-26588.jpg',
    'milkshake-chocolate.jpg': 'https://img.freepik.com/free-photo/chocolate-milkshake_144627-2868.jpg',
    'milkshake-morango.jpg': 'https://img.freepik.com/free-photo/strawberry-milkshake-with-whipped-cream_140725-1616.jpg',
    'agua-mineral.jpg': 'https://img.freepik.com/free-photo/water-glass-with-ice-cubes_144627-27126.jpg',
    'combo-sushi.jpg': 'https://img.freepik.com/free-photo/side-view-sushi-set-with-soy-sauce-chopsticks-wooden-serving-board_176474-3234.jpg'
}

def download_e_processar_imagem(url, nome_arquivo, pasta_destino, tamanho=(800, 600)):
    try:
        # Criar pasta se não existir
        if not os.path.exists(pasta_destino):
            os.makedirs(pasta_destino)
        
        # Caminho completo do arquivo
        caminho_arquivo = os.path.join(pasta_destino, nome_arquivo)
        
        # Baixar imagem
        response = requests.get(url)
        imagem = Image.open(BytesIO(response.content))
        
        # Converter para RGB se necessário
        if imagem.mode in ('RGBA', 'P'):
            imagem = imagem.convert('RGB')
        
        # Redimensionar mantendo proporção
        imagem.thumbnail(tamanho, Image.Resampling.LANCZOS)
        
        # Salvar imagem
        imagem.save(caminho_arquivo, 'JPEG', quality=85)
        print(f'✅ Imagem salva com sucesso: {nome_arquivo}')
        
    except Exception as e:
        print(f'❌ Erro ao processar {nome_arquivo}: {str(e)}')

def main():
    pasta_destino = 'public/images'
    print('🚀 Iniciando download das imagens...')
    
    for nome_arquivo, url in IMAGENS.items():
        print(f'📥 Baixando: {nome_arquivo}')
        download_e_processar_imagem(url, nome_arquivo, pasta_destino)
    
    print('✨ Processo concluído!')

if __name__ == '__main__':
    main() 