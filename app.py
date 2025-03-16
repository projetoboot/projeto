
GEMINI_API_KEY = "AIzaSyDI8I3ZeLJwrGt_F5P61BrR6oMtBvjewco"

import requests
import os
from dotenv import load_dotenv
from cardapio import CARDAPIO  # Importa os 10.000 itens gerados

# Carregar variáveis de ambiente
load_dotenv()


# URL da API Gemini
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

# Função para obter resposta do Gemini
def get_gemini_response(prompt):
    # Exibir apenas uma amostra do cardápio
    menu_sample = "\n".join(
        [f"{item['categoria']} - {item['item']} - R$ {item['preco']:.2f} - {item['calorias']} kcal" for item in CARDAPIO[:10]]
    )

    additional_info = (
        "Nome da Lanchonete: Lanchonete Sabor do Dia.\n"
        "Horários: 10h - 22h.\n"
        "Localização: Avenida Paulista, 1578, Bela Vista, São Paulo, SP.\n" 
        "Prato mais vendido: Hambúrguer Especial.\n"
        "Dono: João da Silva.\n"
        "Cardápio (amostra):\n" + menu_sample
    )

    full_prompt = f"{additional_info}\n\nUsuário: {prompt}"

    data = {
        "contents": [{
            "parts": [{"text": full_prompt}]
        }]
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(GEMINI_URL, json=data, headers=headers)
        response_json = response.json()

        if "candidates" in response_json:
            return response_json["candidates"][0]["content"]["parts"][0]["text"]
        else:
            return "Erro ao processar resposta do Gemini."

    except Exception as e:
        return f"Erro na requisição: {str(e)}"

# Exibir os primeiros 10 itens do cardápio
#print("Cardápio da Lanchonete Sabor do Dia (Amostra):")
#for item in CARDAPIO[:1000]:
    #print(f"- {item['categoria']} | {item['item']} | R$ {item['preco']:.2f} | {item['calorias']} kcal")

print("\nPergunte algo sobre a lanchonete ou digite 'sair' para encerrar.")

# Loop para interação
while True:
    user_input = input("\nDigite sua pergunta: ")
    if user_input.lower() == 'sair':
        print("Encerrando o programa.")
        break

    response = get_gemini_response(user_input)
    print(f"Resposta: {response}")
