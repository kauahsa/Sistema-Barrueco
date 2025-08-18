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

    // Verifica se estamos em um dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Verifica se é Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // Função para mostrar loading
    function showLoading() {
        loadingOverlay.classList.add('show');
        publishBtn.disabled = true;
    }

    // Função para esconder loading
    function hideLoading() {
        loadingOverlay.classList.remove('show');
        publishBtn.disabled = false;
    }

    // Função para mostrar mensagem toast
    function showMessage(msg, type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️'
        };

        messageIcon.textContent = icons[type] || '💬';
        messageContent.textContent = msg;
        
        messageToast.className = `message-toast ${type}`;
        
        setTimeout(() => {
            messageToast.classList.add('show');
        }, 100);

        setTimeout(() => {
            hideMessage();
        }, 5000);
    }

    // Função para esconder mensagem
    function hideMessage() {
        messageToast.classList.remove('show');
    }

    // Event listener para fechar mensagem
    messageClose.addEventListener('click', hideMessage);

    // Função para animar erro nos inputs
    function shakeInputs() {
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.classList.add('shake');
            setTimeout(() => {
                input.classList.remove('shake');
            }, 500);
        });
    }

    // Event listener do formulário
    articleForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Verificar conexão antes de enviar
        if (!navigator.onLine) {
            showMessage("Você está offline. Conecte-se para publicar.", 'error');
            return;
        }

        // Validar campos obrigatórios
        if (!tituloInput.value.trim() || !conteudoInput.value.trim() || !autorInput.value.trim() || !dataInput.value) {
            showMessage("Preencha todos os campos obrigatórios", 'error');
            shakeInputs();
            return;
        }

        // Criar FormData
        const formData = new FormData();
        formData.append('titulo', tituloInput.value.trim());
        formData.append('conteudo', conteudoInput.value.trim());
        formData.append('autor', autorInput.value.trim());
        formData.append('data', dataInput.value);

        showLoading();

        const timeoutDuration = isMobile ? 15000 : 8000;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutDuration);

        try {
            // Configuração específica para Safari
            const fetchOptions = {
                method: 'POST',
                body: formData,
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            };

            // No Safari, modifica as opções
            if (isSafari) {
                // Tenta primeiro sem credentials
                fetchOptions.credentials = 'omit';
                
                // Adiciona header específico para Safari
                fetchOptions.headers['X-Requested-With'] = 'XMLHttpRequest';
            } else {
                fetchOptions.credentials = 'include';
            }

            const response = await fetch('https://sistema-barrueco.onrender.com/postArt', fetchOptions);

            clearTimeout(timeout);
            
            // Verificação robusta do content-type
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const errorText = await response.text();
                console.error('Resposta não-JSON:', errorText.substring(0, 200));
                
                // Tentativa de fallback para Safari
                if (isSafari) {
                    try {
                        const jsonStart = errorText.indexOf('{');
                        if (jsonStart > -1) {
                            const jsonString = errorText.substring(jsonStart);
                            const result = JSON.parse(jsonString);
                            if (result.msg) {
                                showMessage(result.msg, response.ok ? 'success' : 'error');
                                return;
                            }
                        }
                    } catch (e) {
                        console.error('Fallback parsing failed:', e);
                    }
                }
                
                throw new Error(isSafari ? 
                    'Configuração de segurança do Safari bloqueou a requisição. Tente outro navegador.' : 
                    'Resposta inválida do servidor');
            }
            
            const result = await response.json();
            
            setTimeout(() => {
                hideLoading();
                
                if (!response.ok) {
                    showMessage(result.msg || "Erro ao processar sua solicitação", 'error');
                    shakeInputs();
                    return;
                }

                showMessage(result.msg, 'success');
                tituloInput.value = '';
                conteudoInput.value = '';
                autorInput.value = '';
                dataInput.value = '';

            }, 2000);

        } catch (err) {
            clearTimeout(timeout);
            setTimeout(() => {
                hideLoading();
                let errorMsg = err.message;
                
                if (err.name === 'AbortError') {
                    errorMsg = "A requisição demorou muito. Verifique sua conexão.";
                } else if (isSafari) {
                    errorMsg = "Problema no Safari:\n" +
                        "1. Acesse Ajustes > Safari\n" +
                        "2. Desative 'Prevenção Contra Rastreamento'\n" +
                        "3. Tente novamente";
                }
                
                showMessage(errorMsg, 'error');
                shakeInputs();
            }, 2000);
            console.error('Erro detalhado:', err);
            
            // Tentativa alternativa para Safari
            if (isSafari && err.message.includes('Failed to fetch')) {
                console.warn('Tentando fallback para Safari...');
                // Aqui você poderia implementar uma segunda tentativa
                // com configurações diferentes se necessário
            }
        }
    });
});