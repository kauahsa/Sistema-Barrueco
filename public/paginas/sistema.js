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
        // Definir ícone baseado no tipo
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️'
        };

        messageIcon.textContent = icons[type] || '💬';
        messageContent.textContent = msg;
        
        // Remover classes anteriores e adicionar nova
        messageToast.className = `message-toast ${type}`;
        
        // Mostrar toast
        setTimeout(() => {
            messageToast.classList.add('show');
        }, 100);

        // Auto-hide após 5 segundos
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
        
        const titulo = tituloInput.value;
        const conteudo = conteudoInput.value;
        const autor = autorInput.value;
        const data = dataInput.value;

        // Mostrar loading imediatamente
        showLoading();

        try {
            const response = await fetch('http://localhost:3001/postArt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ titulo, conteudo, autor, data })
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

                
            }, 2000); // 2 segundos de loading mínimo

        } catch (err) {
            // Em caso de erro, também aguardar 2 segundos antes de esconder
            setTimeout(() => {
                hideLoading();
                showMessage("Erro de conexão com o servidor", 'error');
                shakeInputs();
            }, 2000);
            console.error('Erro:', err);
        }
    });
});