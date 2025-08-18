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
        
        // Criar FormData para incluir arquivos
        const formData = new FormData();
        formData.append('titulo', tituloInput.value);
        formData.append('conteudo', conteudoInput.value);
        formData.append('autor', autorInput.value);
        formData.append('data', dataInput.value);

        // Mostrar loading imediatamente
        showLoading();

        try {
            const response = await fetch('https://sistema-barrueco.onrender.com/postArt', {
                method: 'POST',
                credentials: 'include',
                body: formData // Usar FormData em vez de JSON
            });

            const result = await response.json();
            
            // Aguardar pelo menos 2 segundos antes de esconder o loading
            setTimeout(() => {
                hideLoading();
                
                if (!response.ok) {
                    showMessage(result.msg, 'error');
                    shakeInputs();
                    return;
                }

                // Sucesso
                showMessage(result.msg, 'success');
                
                // Limpar campos após sucesso
                tituloInput.value = '';
                conteudoInput.value = '';
                autorInput.value = '';
                dataInput.value = '';

            }, 2000);

        } catch (err) {
            setTimeout(() => {
                hideLoading();
                showMessage("Erro de conexão com o servidor", 'error');
                shakeInputs();
            }, 2000);
            console.error('Erro:', err);
        }
    });
});