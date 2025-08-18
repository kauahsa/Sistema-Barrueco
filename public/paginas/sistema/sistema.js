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

    // Detecção mais robusta de dispositivos móveis
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768 || 
                     ('ontouchstart' in window);
    
    // Detecção mais precisa do Safari
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    console.log('Dispositivo detectado:', { isMobile, isSafari, isIOS });

    // Função para mostrar loading
    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('show');
        }
        if (publishBtn) {
            publishBtn.disabled = true;
        }
    }

    // Função para esconder loading
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
        if (publishBtn) {
            publishBtn.disabled = false;
        }
    }

    // Função para mostrar mensagem toast
    function showMessage(msg, type) {
        if (!messageToast || !messageIcon || !messageContent) {
            alert(msg); // Fallback para alert se elementos não existirem
            return;
        }

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

        // Auto-hide após 6 segundos (mais tempo para mobile)
        setTimeout(() => {
            hideMessage();
        }, 6000);
    }

    // Função para esconder mensagem
    function hideMessage() {
        if (messageToast) {
            messageToast.classList.remove('show');
        }
    }

    // Event listener para fechar mensagem
    if (messageClose) {
        messageClose.addEventListener('click', hideMessage);
    }

    // Função para animar erro nos inputs
    function shakeInputs() {
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            if (input.classList) {
                input.classList.add('shake');
                setTimeout(() => {
                    input.classList.remove('shake');
                }, 500);
            }
        });
    }

    // Função de validação melhorada
    function validateForm() {
        const errors = [];
        
        if (!tituloInput?.value?.trim()) {
            errors.push('Título é obrigatório');
        }
        if (!conteudoInput?.value?.trim()) {
            errors.push('Conteúdo é obrigatório');
        }
        if (!autorInput?.value?.trim()) {
            errors.push('Autor é obrigatório');
        }
        if (!dataInput?.value) {
            errors.push('Data é obrigatória');
        }

        return errors;
    }

    // Função para fazer a requisição com retry
    async function submitForm(formData, retryCount = 0) {
        const maxRetries = isMobile ? 2 : 1;
        const timeoutDuration = isMobile ? 25000 : 12000; // Mais tempo para mobile
        
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, timeoutDuration);

        try {
            // Configurações específicas por dispositivo
            const fetchOptions = {
                method: 'POST',
                body: formData,
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            };

            // Configurações específicas para dispositivos móveis
            if (isMobile) {
                fetchOptions.headers['Cache-Control'] = 'no-cache, no-store';
                fetchOptions.headers['Pragma'] = 'no-cache';
                
                // Para iOS Safari
                if (isIOS || isSafari) {
                    fetchOptions.credentials = 'omit';
                    fetchOptions.headers['X-Requested-With'] = 'XMLHttpRequest';
                    fetchOptions.mode = 'cors';
                } else {
                    fetchOptions.credentials = 'same-origin';
                }
            } else {
                fetchOptions.credentials = 'include';
            }

            console.log('Enviando requisição:', fetchOptions);

            const response = await fetch('https://sistema-barrueco.onrender.com/postArt', fetchOptions);
            
            clearTimeout(timeout);

            // Log da resposta para debug
            console.log('Status da resposta:', response.status);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            // Verificação do content-type mais flexível
            const contentType = response.headers.get('content-type') || '';
            let result;

            if (contentType.includes('application/json')) {
                result = await response.json();
            } else {
                // Tenta extrair JSON da resposta de texto
                const textResponse = await response.text();
                console.log('Resposta de texto:', textResponse.substring(0, 300));
                
                try {
                    // Procura por JSON na resposta
                    const jsonMatch = textResponse.match(/\{.*\}/);
                    if (jsonMatch) {
                        result = JSON.parse(jsonMatch[0]);
                    } else {
                        throw new Error('Formato de resposta inválido');
                    }
                } catch (parseError) {
                    console.error('Erro ao parsear resposta:', parseError);
                    
                    // Se a resposta indica sucesso mas não conseguimos parsear
                    if (response.ok) {
                        result = { msg: 'Artigo enviado com sucesso!' };
                    } else {
                        throw new Error(`Erro do servidor: ${response.status}`);
                    }
                }
            }

            return { response, result };

        } catch (error) {
            clearTimeout(timeout);
            
            // Retry logic para dispositivos móveis
            if (retryCount < maxRetries && 
                (error.name === 'AbortError' || 
                 error.message.includes('fetch') || 
                 error.message.includes('network'))) {
                
                console.log(`Tentativa ${retryCount + 1} falhou, tentando novamente...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2s
                return submitForm(formData, retryCount + 1);
            }
            
            throw error;
        }
    }

    // Event listener do formulário principal
    if (articleForm) {
        articleForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            console.log('Formulário submetido');

            // Verificar conexão
            if (!navigator.onLine) {
                showMessage("Você está offline. Conecte-se para publicar.", 'error');
                return;
            }

            // Validar campos
            const errors = validateForm();
            if (errors.length > 0) {
                showMessage(errors.join(', '), 'error');
                shakeInputs();
                return;
            }

            // Preparar dados
            const formData = new FormData();
            formData.append('titulo', tituloInput.value.trim());
            formData.append('conteudo', conteudoInput.value.trim());
            formData.append('autor', autorInput.value.trim());
            formData.append('data', dataInput.value);

            // Log dos dados para debug
            console.log('Dados do formulário:', {
                titulo: tituloInput.value.trim(),
                autor: autorInput.value.trim(),
                data: dataInput.value
            });

            showLoading();

            try {
                const { response, result } = await submitForm(formData);
                
                // Adiciona delay visual (menor para mobile)
                const delay = isMobile ? 1500 : 2000;
                
                setTimeout(() => {
                    hideLoading();
                    
                    if (!response.ok) {
                        showMessage(result.msg || `Erro ${response.status}: ${response.statusText}`, 'error');
                        shakeInputs();
                        return;
                    }

                    // Sucesso
                    showMessage(result.msg || 'Artigo publicado com sucesso!', 'success');
                    
                    // Limpar formulário
                    if (tituloInput) tituloInput.value = '';
                    if (conteudoInput) conteudoInput.value = '';
                    if (autorInput) autorInput.value = '';
                    if (dataInput) dataInput.value = '';

                }, delay);

            } catch (error) {
                console.error('Erro completo:', error);
                
                setTimeout(() => {
                    hideLoading();
                    
                    let errorMsg = 'Erro desconhecido ao enviar artigo';
                    
                    if (error.name === 'AbortError') {
                        errorMsg = isMobile ? 
                            "Conexão lenta detectada. Tente novamente." : 
                            "Tempo limite excedido. Tente novamente.";
                    } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
                        errorMsg = isMobile ?
                            "Erro de rede. Verifique sua conexão 3G/4G/WiFi." :
                            "Erro de conexão. Verifique sua internet.";
                    } else if (error.message.includes('blocked') || error.message.includes('cors')) {
                        errorMsg = "Bloqueio de segurança detectado. Tente outro navegador.";
                    } else {
                        errorMsg = `Erro: ${error.message}`;
                    }
                    
                    showMessage(errorMsg, 'error');
                    shakeInputs();
                }, 1500);
            }
        });
    }

    // Log de inicialização
    console.log('Script carregado com sucesso para:', isMobile ? 'Mobile' : 'Desktop');
});