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

    // Detecção aprimorada de dispositivos móveis
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768 || 
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0);
    
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    console.log('Ambiente detectado:', { 
        isMobile, 
        isSafari, 
        isIOS, 
        isAndroid,
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth
    });

    // Função para mostrar loading
    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('show');
        }
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.textContent = isMobile ? 'Enviando...' : 'Publicando...';
        }
    }

    // Função para esconder loading
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.textContent = 'Publicar Artigo';
        }
    }

    // Função aprimorada para mostrar mensagem toast
    function showMessage(msg, type) {
        console.log(`Mensagem: ${type} - ${msg}`);
        
        if (!messageToast || !messageIcon || !messageContent) {
            // Fallback melhorado para mobile
            if (isMobile) {
                const userConfirmed = confirm(msg + '\n\nToque em OK para continuar.');
                return userConfirmed;
            } else {
                alert(msg);
                return;
            }
        }

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️'
        };

        messageIcon.textContent = icons[type] || '💬';
        messageContent.textContent = msg;
        
        // Remove classes existentes
        messageToast.className = 'message-toast';
        messageToast.classList.add(type);
        
        // Força repaint antes de mostrar
        messageToast.offsetHeight;
        
        setTimeout(() => {
            messageToast.classList.add('show');
        }, 100);

        // Auto-hide com tempo maior para mobile
        setTimeout(() => {
            hideMessage();
        }, isMobile ? 8000 : 6000);
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
        // Para mobile, adiciona touch events
        if (isMobile) {
            messageClose.addEventListener('touchend', (e) => {
                e.preventDefault();
                hideMessage();
            });
        }
    }

    // Função para animar erro nos inputs
    function shakeInputs() {
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            if (input.classList) {
                input.classList.add('shake');
                setTimeout(() => {
                    input.classList.remove('shake');
                }, 600);
            }
        });
    }

    // Validação melhorada
    function validateForm() {
        const errors = [];
        
        if (!tituloInput?.value?.trim()) {
            errors.push('Título é obrigatório');
        } else if (tituloInput.value.trim().length < 3) {
            errors.push('Título deve ter pelo menos 3 caracteres');
        }
        
        if (!conteudoInput?.value?.trim()) {
            errors.push('Conteúdo é obrigatório');
        } else if (conteudoInput.value.trim().length < 10) {
            errors.push('Conteúdo deve ter pelo menos 10 caracteres');
        }
        
        if (!autorInput?.value?.trim()) {
            errors.push('Autor é obrigatório');
        }
        
        if (!dataInput?.value) {
            errors.push('Data é obrigatória');
        }

        return errors;
    }

    // Função melhorada para requisições mobile
    async function submitForm(formData, retryCount = 0) {
        const maxRetries = isMobile ? 3 : 1; // Mais tentativas para mobile
        const baseTimeout = isMobile ? 30000 : 15000; // Timeout maior para mobile
        const timeoutDuration = baseTimeout + (retryCount * 5000); // Timeout incremental
        
        console.log(`Tentativa ${retryCount + 1}/${maxRetries + 1} - Timeout: ${timeoutDuration}ms`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            console.log('Timeout atingido, abortando requisição');
            controller.abort();
        }, timeoutDuration);

        try {
            // Configurações base da requisição
            const fetchOptions = {
                method: 'POST',
                body: formData,
                signal: controller.signal,
                headers: {}
            };

            // Headers específicos para mobile
            if (isMobile) {
                // Headers anti-cache para mobile
                fetchOptions.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                fetchOptions.headers['Pragma'] = 'no-cache';
                fetchOptions.headers['Expires'] = '0';
                
                // Para iOS Safari - configurações específicas
                if (isIOS || isSafari) {
                    fetchOptions.mode = 'cors';
                    fetchOptions.credentials = 'omit'; // Remove cookies que podem causar problemas
                    fetchOptions.headers['Accept'] = 'application/json, text/plain, */*';
                    fetchOptions.headers['X-Requested-With'] = 'XMLHttpRequest';
                    
                    // Para iOS específico
                    if (isIOS) {
                        fetchOptions.headers['User-Agent'] = navigator.userAgent;
                    }
                } 
                // Para Android
                else if (isAndroid) {
                    fetchOptions.mode = 'cors';
                    fetchOptions.credentials = 'same-origin';
                    fetchOptions.headers['Accept'] = 'application/json';
                }
                // Outros dispositivos móveis
                else {
                    fetchOptions.credentials = 'same-origin';
                    fetchOptions.headers['Accept'] = 'application/json';
                }
            } 
            // Configurações para desktop
            else {
                fetchOptions.credentials = 'include';
                fetchOptions.headers['Accept'] = 'application/json';
            }

            console.log('Configurações da requisição:', {
                method: fetchOptions.method,
                credentials: fetchOptions.credentials,
                mode: fetchOptions.mode,
                headers: fetchOptions.headers
            });

            // Faz a requisição
            const response = await fetch('https://sistema-barrueco.onrender.com/postArt', fetchOptions);
            
            clearTimeout(timeout);

            console.log('Resposta recebida:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            // Processamento da resposta mais robusto
            const contentType = response.headers.get('content-type') || '';
            let result;

            try {
                if (contentType.includes('application/json')) {
                    result = await response.json();
                } else {
                    const textResponse = await response.text();
                    console.log('Resposta em texto (primeiros 500 chars):', textResponse.substring(0, 500));
                    
                    // Tenta extrair JSON da resposta
                    const jsonMatch = textResponse.match(/\{[^}]*"msg"[^}]*\}/);
                    if (jsonMatch) {
                        result = JSON.parse(jsonMatch[0]);
                    } else if (textResponse.includes('success') || textResponse.includes('sucesso')) {
                        result = { msg: 'Artigo publicado com sucesso!' };
                    } else if (response.ok) {
                        result = { msg: 'Artigo enviado com sucesso!' };
                    } else {
                        throw new Error(`Resposta inválida do servidor (Status: ${response.status})`);
                    }
                }
            } catch (parseError) {
                console.error('Erro ao processar resposta:', parseError);
                
                if (response.ok) {
                    result = { msg: 'Artigo publicado com sucesso!' };
                } else {
                    throw new Error(`Erro do servidor: ${response.status} - ${response.statusText}`);
                }
            }

            console.log('Resultado processado:', result);
            return { response, result };

        } catch (error) {
            clearTimeout(timeout);
            console.error(`Erro na tentativa ${retryCount + 1}:`, error);
            
            // Lógica de retry mais inteligente para mobile
            const shouldRetry = (
                retryCount < maxRetries && 
                isMobile && 
                (
                    error.name === 'AbortError' || 
                    error.message.includes('fetch') || 
                    error.message.includes('network') ||
                    error.message.includes('timeout') ||
                    error.message.includes('Failed to fetch')
                )
            );
            
            if (shouldRetry) {
                console.log(`Tentando novamente em ${(retryCount + 1) * 2} segundos...`);
                await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
                return submitForm(formData, retryCount + 1);
            }
            
            throw error;
        }
    }

    // Event listener principal do formulário
    if (articleForm) {
        articleForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            console.log('=== INÍCIO DO ENVIO ===');
            console.log('Timestamp:', new Date().toISOString());

            // Verificação de conectividade
            if (!navigator.onLine) {
                showMessage("Sem conexão com a internet. Verifique sua conexão.", 'error');
                return;
            }

            // Validação dos campos
            const errors = validateForm();
            if (errors.length > 0) {
                showMessage(errors.join(', '), 'error');
                shakeInputs();
                return;
            }

            // Preparação dos dados
            const formData = new FormData();
            const titulo = tituloInput.value.trim();
            const conteudo = conteudoInput.value.trim();
            const autor = autorInput.value.trim();
            const data = dataInput.value;

            formData.append('titulo', titulo);
            formData.append('conteudo', conteudo);
            formData.append('autor', autor);
            formData.append('data', data);

            console.log('Dados sendo enviados:', {
                titulo: titulo.substring(0, 50) + (titulo.length > 50 ? '...' : ''),
                conteudo: conteudo.substring(0, 100) + (conteudo.length > 100 ? '...' : ''),
                autor,
                data
            });

            showLoading();

            try {
                const { response, result } = await submitForm(formData);
                
                // Delay visual para melhor UX
                const delay = isMobile ? 2000 : 1500;
                
                setTimeout(() => {
                    hideLoading();
                    
                    if (!response.ok) {
                        const errorMsg = result.msg || `Erro ${response.status}: ${response.statusText}`;
                        showMessage(errorMsg, 'error');
                        shakeInputs();
                        console.log('=== ERRO NO SERVIDOR ===');
                        return;
                    }

                    // Sucesso
                    const successMsg = result.msg || 'Artigo publicado com sucesso!';
                    showMessage(successMsg, 'success');
                    
                    // Limpar formulário após sucesso
                    setTimeout(() => {
                        if (tituloInput) tituloInput.value = '';
                        if (conteudoInput) conteudoInput.value = '';
                        if (autorInput) autorInput.value = '';
                        if (dataInput) dataInput.value = '';
                        console.log('=== SUCESSO - FORMULÁRIO LIMPO ===');
                    }, 1000);

                }, delay);

            } catch (error) {
                console.error('=== ERRO FINAL ===', error);
                
                setTimeout(() => {
                    hideLoading();
                    
                    let errorMsg = 'Erro desconhecido ao publicar artigo';
                    
                    if (error.name === 'AbortError') {
                        errorMsg = isMobile ? 
                            "Conexão muito lenta. Tente novamente em um local com melhor sinal." : 
                            "Tempo limite excedido. Tente novamente.";
                    } else if (error.message.includes('Failed to fetch') || 
                              error.message.includes('network') || 
                              error.message.includes('fetch')) {
                        errorMsg = isMobile ?
                            "Problema de conexão. Verifique se está conectado à internet (3G/4G/WiFi)." :
                            "Erro de rede. Verifique sua conexão.";
                    } else if (error.message.includes('blocked') || 
                              error.message.includes('cors') ||
                              error.message.includes('CORS')) {
                        errorMsg = "Erro de segurança. Tente recarregar a página ou usar outro navegador.";
                    } else if (error.message.includes('timeout')) {
                        errorMsg = "Timeout na conexão. Tente novamente.";
                    } else {
                        errorMsg = `Erro: ${error.message}`;
                    }
                    
                    showMessage(errorMsg, 'error');
                    shakeInputs();
                }, 1500);
            }
        });
    }

    // Prevenção de double-submit
    let isSubmitting = false;
    if (publishBtn) {
        publishBtn.addEventListener('click', (e) => {
            if (isSubmitting) {
                e.preventDefault();
                return false;
            }
            isSubmitting = true;
            setTimeout(() => {
                isSubmitting = false;
            }, 3000);
        });
    }

    // Log de inicialização com mais detalhes
    console.log('=== SCRIPT INICIALIZADO ===');
    console.log('Dispositivo:', isMobile ? 'Mobile' : 'Desktop');
    console.log('Navegador:', {
        isSafari,
        isIOS,
        isAndroid,
        userAgent: navigator.userAgent
    });
    console.log('Elementos encontrados:', {
        articleForm: !!articleForm,
        inputs: !!(tituloInput && conteudoInput && autorInput && dataInput),
        ui: !!(publishBtn && loadingOverlay && messageToast)
    });
});