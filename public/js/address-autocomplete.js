// Função para inicializar o autocompletar de endereços
function initAddressAutocomplete() {
    // Observa mudanças no DOM para detectar quando o modal do carrinho é aberto
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.style.display === 'block' && mutation.target.id === 'modalCarrinho') {
                setupAddressAutocomplete();
            }
        });
    });

    // Configura o observer para monitorar mudanças no display do modal
    const modalCarrinho = document.getElementById('modalCarrinho');
    if (modalCarrinho) {
        observer.observe(modalCarrinho, { attributes: true, attributeFilter: ['style'] });
    }

    // Configura o autocomplete quando a página carrega (caso o modal já esteja aberto)
    setupAddressAutocomplete();
}

// Função para configurar o autocomplete no campo de endereço
function setupAddressAutocomplete() {
    try {
        const addressInput = document.querySelector('#modalCarrinho .endereco-entrega textarea');
        if (!addressInput) {
            console.warn('Campo de endereço não encontrado');
            return;
        }

        // Verifica se o autocomplete já foi inicializado neste campo
        if (addressInput.hasAttribute('data-autocomplete-initialized')) return;
        addressInput.setAttribute('data-autocomplete-initialized', 'true');

        // Configurações do Autocomplete do Google Places
        const options = {
            componentRestrictions: { country: 'br' },
            types: ['address'],
            fields: ['address_components', 'formatted_address', 'geometry']
        };

        // Inicializa o Autocomplete do Google Places
        const autocomplete = new google.maps.places.Autocomplete(addressInput, options);
        
        // Previne o comportamento padrão de submit do formulário ao pressionar Enter
        addressInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });

    // Adiciona evento para quando um endereço é selecionado
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.geometry) {
            console.warn('Nenhum detalhe disponível para o endereço selecionado');
            return;
        }

        // Formata o endereço selecionado
        const addressComponents = place.address_components;
        let formattedAddress = '';
        let number = '';
        let street = '';
        let neighborhood = '';
        let city = '';
        let state = '';

        addressComponents.forEach(component => {
            const type = component.types[0];
            switch (type) {
                case 'street_number':
                    number = component.long_name;
                    break;
                case 'route':
                    street = component.long_name;
                    break;
                case 'sublocality_level_1':
                    neighborhood = component.long_name;
                    break;
                case 'administrative_area_level_2':
                    city = component.long_name;
                    break;
                case 'administrative_area_level_1':
                    state = component.short_name;
                    break;
            }
        });

        // Monta o endereço formatado
        formattedAddress = `${street}, ${number}`;
        if (neighborhood) formattedAddress += ` - ${neighborhood}`;
        formattedAddress += `\n${city} - ${state}`;

        // Atualiza o campo de endereço
        addressInput.value = formattedAddress;
        addressInput.dispatchEvent(new Event('change'));
    });

    // Previne o envio do formulário ao pressionar Enter
    addressInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
}

// Inicializa o autocompletar quando a página carregar
window.addEventListener('load', initAddressAutocomplete);