document.addEventListener('DOMContentLoaded', function () {
    const articleForm = document.getElementById('articleForm');
    const tituloInput = document.getElementById('titulo');
    const conteudoInput = document.getElementById('conteudo');
    const autorInput = document.getElementById('autor');
    const dataInput = document.getElementById('data');
    const pdfInput = document.getElementById('pdfInput');
    const pdfUploadArea = document.getElementById('pdfUploadArea');
    const uploadedPdf = document.getElementById('uploadedPdf');
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

    // Função para formatar tamanho de arquivo
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Função para exibir PDF selecionado
    function displaySelectedPdf(file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB
            showMessage('O arquivo PDF deve ter no máximo 2MB!', 'error');
            pdfInput.value = '';
            return;
        }

        uploadedPdf.innerHTML = `
            <div class="pdf-item">
                <div class="pdf-info">
                    <div class="pdf-icon">📄</div>
                    <div class="pdf-details">
                        <div class="pdf-name">${file.name}</div>
                        <div class="pdf-size">${formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button type="button" class="pdf-remove" onclick="removePdf()">×</button>
            </div>
        `;
        
        pdfUploadArea.style.display = 'none';
    }

    // Função para remover PDF
    window.removePdf = function() {
        pdfInput.value = '';
        uploadedPdf.innerHTML = '';
        pdfUploadArea.style.display = 'block';
    }

    // Event listeners para upload de PDF
    pdfInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                showMessage('Apenas arquivos PDF são permitidos!', 'error');
                pdfInput.value = '';
                return;
            }
            displaySelectedPdf(file);
        }
    });

    // Drag and drop para PDF
    pdfUploadArea.addEventListener('click', () => pdfInput.click());

    pdfUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        pdfUploadArea.classList.add('dragover');
    });

    pdfUploadArea.addEventListener('dragleave', () => {
        pdfUploadArea.classList.remove('dragover');
    });

    pdfUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfUploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            pdfInput.files = files;
            displaySelectedPdf(files[0]);
        } else {
            showMessage('Apenas arquivos PDF são permitidos!', 'error');
        }
    });

    // Event listener do formulário
    articleForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Criar FormData para incluir arquivos
        const formData = new FormData();
        formData.append('titulo', tituloInput.value);
        formData.append('conteudo', conteudoInput.value);
        formData.append('autor', autorInput.value);
        formData.append('data', dataInput.value);
        
        // Adicionar PDF se selecionado
        if (pdfInput.files[0]) {
            formData.append('pdf', pdfInput.files[0]);
        }

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
                removePdf(); // Limpar PDF também

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