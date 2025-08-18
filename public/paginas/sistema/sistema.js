document.addEventListener('DOMContentLoaded', function () {
    const articleForm = document.getElementById('articleForm');
    const tituloInput = document.getElementById('titulo');
    const conteudoInput = document.getElementById('conteudo');
    const autorInput = document.getElementById('autor');
    const dataInput = document.getElementById('data');
    const publishBtn = document.getElementById('publishBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const messageToast = document.getElementById('messageToast');
    const messageIcon = document.getElementById('messageIcon');
    const messageContent = document.getElementById('messageContent');
    const messageClose = document.getElementById('messageClose');

    // Função para fazer requisições autenticadas (o cookie é enviado automaticamente)
    async function authenticatedFetch(url, options = {}) {
        const finalOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };
        
        try {
            const response = await fetch(url, finalOptions);
            if (response.status === 401) {
                // Se não autorizado, redireciona para o login
                window.location.href = '/login';
                return null;
            }
            return response;
        } catch (error) {
            console.error('Erro na requisição autenticada:', error);
            throw error;
        }
    }

    function showLoading() {
        if (loadingOverlay) loadingOverlay.classList.add('show');
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.textContent = 'Publicando...';
        }
    }

    function hideLoading() {
        if (loadingOverlay) loadingOverlay.classList.remove('show');
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.textContent = '🚀 Publicar Artigo';
        }
    }

    function showMessage(msg, type) {
        // ... (função showMessage permanece a mesma) ...
    }
    
    // ... (demais funções de UI como hideMessage, shakeInputs permanecem as mesmas) ...

    function validateForm() {
        const errors = [];
        if (!tituloInput?.value?.trim()) errors.push('Título é obrigatório');
        if (!conteudoInput?.value?.trim()) errors.push('Conteúdo é obrigatório');
        if (!autorInput?.value?.trim()) errors.push('Autor é obrigatório');
        if (!dataInput?.value) errors.push('Data é obrigatória');
        return errors;
    }
    
    if (articleForm) {
        articleForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const errors = validateForm();
            if (errors.length > 0) {
                showMessage(errors.join(', '), 'error');
                shakeInputs();
                return;
            }

            const articleData = {
                titulo: tituloInput.value.trim(),
                conteudo: conteudoInput.value.trim(),
                autor: autorInput.value.trim(),
                data: new Date(dataInput.value).toISOString(),
            };

            showLoading();

            try {
                const response = await authenticatedFetch('/api/artigos', {
                    method: 'POST',
                    body: JSON.stringify(articleData),
                });

                if (!response) return; // Redirecionamento já tratado
                
                const result = await response.json();

                hideLoading();
                
                if (!response.ok) {
                    throw new Error(result.msg || `Erro ${response.status}`);
                }
                
                showMessage(result.msg || 'Artigo publicado com sucesso!', 'success');
                articleForm.reset();

            } catch (error) {
                console.error('Erro ao publicar artigo:', error);
                hideLoading();
                showMessage(`Erro: ${error.message}`, 'error');
                shakeInputs();
            }
        });
    }
});