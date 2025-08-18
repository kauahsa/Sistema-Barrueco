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

    // Verificar autenticação na inicialização
    checkAuthentication();

    // Função para verificar autenticação
    async function checkAuthentication() {
        try {
            const response = await authenticatedFetch('https://sistema-barrueco.onrender.com/api');
            
            if (!response || !response.ok) {
                console.log('Não autenticado, redirecionando...');
                // Tentar obter token do localStorage
                const token = localStorage.getItem('authToken');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }
            }
            console.log('Usuário autenticado');
        } catch (error) {
            console.error('Erro na verificação de autenticação:', error);
            window.location.href = '/login';
        }
    }

    // Função para fazer requisições autenticadas
    async function authenticatedFetch(url, options = {}) {
        const baseOptions = {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        };

        // Pega o token do localStorage se existir
        const token = localStorage.getItem('authToken');
        if (token) {
            baseOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        // Merge das opções
        const finalOptions = {
            ...baseOptions,
            ...options,
            headers: {
                ...baseOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            
            // Se retornar 401, limpa token e redireciona
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                console.log('Token inválido, redirecionando para login');
                window.location.href = '/login';
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('Erro na requisição autenticada:', error);
            throw error;
        }
    }

    // Detecção de dispositivos
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768 || 
                     ('ontouchstart' in window);
    
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
            publishBtn.textContent = 'Publicando...';
        }
    }

    // Função para esconder loading
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.textContent = '🚀 Publicar Artigo';
        }
    }

    // Função para mostrar mensagem toast
    function showMessage(msg, type) {
        if (!messageToast || !messageIcon || !messageContent) {
            alert(msg);
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

    // Função de validação
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

    // Função para fazer a requisição
    async function submitForm(formData, retryCount = 0) {
        const maxRetries = 2;
        const timeoutDuration = 15000;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, timeoutDuration);

        try {
            console.log('Enviando dados:', Object.fromEntries(formData));

            const response = await authenticatedFetch('https://sistema-barrueco.onrender.com/postArt', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeout);

            if (!response) {
                // authenticatedFetch já tratou o erro 401
                return;
            }

            console.log('Status da resposta:', response.status);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            // Verificação mais rigorosa do content-type
            const contentType = response.headers.get('content-type') || '';
            console.log('Content-Type:', contentType);

            if (!contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.log('Resposta HTML/texto:', textResponse.substring(0, 500));
                
                // Se recebeu HTML, provavelmente perdeu a autenticação
                if (textResponse.includes('<!DOCTYPE html>') || textResponse.includes('<html>')) {
                    throw new Error('Você foi desconectado. Por favor, faça login novamente.');
                }
                
                throw new Error('Servidor retornou formato inválido');
            }

            const result = await response.json();
            console.log('Resposta JSON:', result);

            return { response, result };

        } catch (error) {
            clearTimeout(timeout);
            
            if (retryCount < maxRetries && 
                (error.name === 'AbortError' || 
                 error.message.includes('fetch') || 
                 error.message.includes('network'))) {
                
                console.log(`Tentativa ${retryCount + 1} falhou, tentando novamente...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return submitForm(formData, retryCount + 1);
            }
            
            throw error;
        }
    }

    // Event listener do formulário
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
            
            // Formatear a data corretamente
            const dataValue = dataInput.value;
            if (dataValue) {
                // Converter datetime-local para formato ISO
                const date = new Date(dataValue);
                formData.append('data', date.toISOString());
            } else {
                // Usar data atual se não especificada
                formData.append('data', new Date().toISOString());
            }

            console.log('Dados preparados:', {
                titulo: tituloInput.value.trim(),
                autor: autorInput.value.trim(),
                data: dataValue || 'atual'
            });

            showLoading();

            try {
                const result = await submitForm(formData);
                
                if (!result) {
                    // Erro já foi tratado (provavelmente redirecionamento)
                    return;
                }

                const { response, result: data } = result;
                
                setTimeout(() => {
                    hideLoading();
                    
                    if (!response.ok) {
                        let errorMsg = data.msg || `Erro ${response.status}: ${response.statusText}`;
                        showMessage(errorMsg, 'error');
                        shakeInputs();
                        return;
                    }

                    // Sucesso
                    showMessage(data.msg || 'Artigo publicado com sucesso!', 'success');
                    
                    // Limpar formulário após sucesso
                    setTimeout(() => {
                        if (tituloInput) tituloInput.value = '';
                        if (conteudoInput) conteudoInput.value = '';
                        if (autorInput) autorInput.value = '';
                        if (dataInput) dataInput.value = '';
                    }, 1000);

                }, 1500);

            } catch (error) {
                console.error('Erro completo:', error);
                
                setTimeout(() => {
                    hideLoading();
                    
                    let errorMsg = 'Erro desconhecido ao enviar artigo';
                    
                    if (error.message.includes('desconectado') || error.message.includes('login')) {
                        errorMsg = error.message;
                        // Redirecionar para login após mostrar a mensagem
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 3000);
                    } else if (error.name === 'AbortError') {
                        errorMsg = "Tempo limite excedido. Tente novamente.";
                    } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
                        errorMsg = "Erro de conexão. Verifique sua internet.";
                    } else if (error.message.includes('blocked') || error.message.includes('cors')) {
                        errorMsg = "Bloqueio de segurança detectado. Tente outro navegador.";
                    } else {
                        errorMsg = `Erro: ${error.message}`;
                    }
                    
                    showMessage(errorMsg, 'error');
                    shakeInputs();
                }, 1000);
            }
        });
    }

    console.log('Script carregado com sucesso');
});