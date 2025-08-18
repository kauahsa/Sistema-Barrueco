document.addEventListener('DOMContentLoaded', () => {
    // URL base da sua API para facilitar a manutenção

    /**
     * Função centralizada para fazer requisições autenticadas.
     * Garante que o cookie de autenticação seja sempre enviado e trata
     * respostas de erro (401 - Não Autorizado) de forma padronizada.
     */
    async function authenticatedFetch(url, options = {}) {
        const defaultOptions = {
            // ESSENCIAL: Envia o cookie de autenticação com a requisição
            credentials: 'include',
            // devolver os cookies
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, finalOptions);

            // Se o token for inválido ou expirar, o backend pode redirecionar.
            // Se a resposta não for JSON, é um forte sinal de que a autenticação falhou.
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                // Redireciona para a página de login, pois a sessão provavelmente expirou.
                window.location.href = '/login'; 
                // Lança um erro para interromper a execução do código que chamou a função.
                throw new Error('Sessão expirada. Redirecionando para o login.');
            }

            return response;

        } catch (error) {
            console.error('Erro na requisição autenticada:', error);
            // Propaga o erro para que a função que chamou possa tratá-lo.
            throw error;
        }
    }

    // --- LÓGICA PRINCIPAL DA PÁGINA ---

    const articlesGrid = document.getElementById('articlesGrid');

    /**
     * Carrega os artigos da API e os renderiza na tela.
     */
    async function carregarArtigos() {
        showLoadingState();
        try {
            const response = await authenticatedFetch(`/home/artigos`);
            const artigos = await response.json();

            if (!response.ok) {
                throw new Error(artigos.msg || 'Falha ao carregar artigos');
            }

            renderArtigos(artigos);

        } catch (err) {
            console.error('Erro ao carregar artigos:', err);
            // A verificação de autenticação já redireciona, aqui tratamos outros erros de rede/servidor.
            if (!err.message.includes('Sessão expirada')) {
                 renderErrorState(err.message);
            }
        }
    }

    /**
     * Renderiza os cartões de artigo na grade.
     */
    function renderArtigos(artigos) {
        articlesGrid.innerHTML = ''; // Limpa a grade

        if (artigos.length === 0) {
            renderEmptyState();
            return;
        }

        artigos.forEach(artigo => {
            const artigoCard = document.createElement('div');
            artigoCard.className = 'article-card';
            artigoCard.dataset.id = artigo._id;
            artigoCard.dataset.date = artigo.data;

            artigoCard.innerHTML = `
                <div class="article-header">
                    <div class="article-checkbox-container">
                        <input type="checkbox" class="article-checkbox" data-id="${artigo._id}">
                    </div>
                    <div class="article-content">
                        <h3 class="article-title">${escapeHtml(artigo.titulo)}</h3>
                        <p class="article-excerpt">${escapeHtml((artigo.conteudo || '').substring(0, 100))}${artigo.conteudo?.length > 100 ? '...' : ''}</p>
                        <div class="article-meta">
                            <span class="meta-item">📅 ${new Date(artigo.data).toLocaleDateString('pt-BR')}</span>
                            <span class="meta-item">👤 ${escapeHtml(artigo.autor)}</span>
                        </div>
                    </div>
                </div>
                <div class="article-actions">
                    <button class="btn btn-small btn-secondary edit-btn" data-id="${artigo._id}">✏️ Editar</button>
                    <button class="btn btn-small btn-danger delete-btn" data-id="${artigo._id}">🗑️ Apagar</button>
                </div>
            `;
            articlesGrid.appendChild(artigoCard);
        });

        attachEventListeners();
    }

    /**
     * Adiciona os listeners de evento aos botões de editar, apagar e checkboxes.
     */
    function attachEventListeners() {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const artigoId = e.currentTarget.dataset.id;
                showConfirmationModal('Tem certeza que deseja excluir este artigo?', () => {
                    deleteArticle(artigoId);
                });
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const artigoId = e.currentTarget.dataset.id;
                try {
                    const response = await authenticatedFetch(`/artigos/${artigoId}`);
                    const artigo = await response.json();
                    if (!response.ok) throw new Error(artigo.msg);
                    abrirFormularioEdicao(artigo);
                } catch (error) {
                    showToast(`Erro ao buscar dados do artigo: ${error.message}`, 'error');
                }
            });
        });
        
        document.querySelectorAll('.article-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateBulkActions);
        });
    }

    /**
     * Função para deletar um artigo.
     */
    async function deleteArticle(artigoId) {
        try {
            const response = await authenticatedFetch(`/api/artigos/${artigoId}`, {
                method: 'DELETE',
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.msg || 'Erro desconhecido ao excluir');
            }

            const cardElement = document.querySelector(`.article-card[data-id="${artigoId}"]`);
            if (cardElement) {
                cardElement.style.transition = 'opacity 0.3s ease';
                cardElement.style.opacity = '0';
                setTimeout(() => {
                    cardElement.remove();
                    updateBulkActions();
                }, 300);
            }
            
            showToast('✅ Artigo excluído com sucesso!', 'success');

        } catch (err) {
            console.error('Erro ao excluir artigo:', err);
            if (!err.message.includes('Sessão expirada')) {
                showToast(`❌ Falha ao excluir: ${err.message}`, 'error');
            }
        }
    }

    /**
     * Abre o modal de edição com os dados do artigo.
     */
    function abrirFormularioEdicao(artigo) {
        document.getElementById('editModal')?.remove();
        const dataFormatada = new Date(artigo.data).toISOString().split('T')[0];

        const formHtml = `
          <div id="editModal" class="modal">
            <div class="modal-content">
              <h2>Editar Artigo</h2>
              <label>Título</label>
              <input type="text" id="editTitulo" value="${escapeHtml(artigo.titulo)}">
              <label>Conteúdo</label>
              <textarea id="editConteudo" rows="10">${escapeHtml(artigo.conteudo)}</textarea>
              <label>Autor</label>
              <input type="text" id="editAutor" value="${escapeHtml(artigo.autor)}">
              <label>Data</label>
              <input type="date" id="editData" value="${dataFormatada}">
              <div class="modal-actions">
                <button id="saveEdit" class="btn btn-primary">Salvar</button>
                <button id="cancelEdit" class="btn btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHtml);
        const modal = document.getElementById('editModal');

        modal.querySelector('#cancelEdit').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        
        modal.querySelector('#saveEdit').addEventListener('click', async (e) => {
            const saveBtn = e.currentTarget;
            saveBtn.disabled = true;
            saveBtn.textContent = 'Salvando...';

            const dadosAtualizados = {
                titulo: document.getElementById('editTitulo').value,
                conteudo: document.getElementById('editConteudo').value,
                autor: document.getElementById('editAutor').value,
                data: document.getElementById('editData').value,
            };

            try {
                const response = await authenticatedFetch(`/api/artigos/${artigo._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(dadosAtualizados),
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.msg || 'Erro ao atualizar');

                showToast('✅ Artigo atualizado com sucesso!', 'success');
                modal.remove();
                carregarArtigos();

            } catch (err) {
                if (!err.message.includes('Sessão expirada')) {
                    showToast(`❌ Erro: ${err.message}`, 'error');
                }
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Salvar';
            }
        });
    }

    /**
     * Exibe um modal de confirmação customizado.
     */
    function showConfirmationModal(message, onConfirm) {
        document.getElementById('confirmationModal')?.remove();
        const modalHtml = `
            <div id="confirmationModal" class="modal">
                <div class="modal-content">
                    <h2>Confirmação</h2>
                    <p>${escapeHtml(message)}</p>
                    <div class="modal-actions">
                        <button id="confirmBtn" class="btn btn-danger">Confirmar</button>
                        <button id="cancelBtn" class="btn btn-secondary">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('confirmationModal');
        const closeModal = () => modal.remove();
        modal.querySelector('#confirmBtn').addEventListener('click', () => {
            onConfirm();
            closeModal();
        });
        modal.querySelector('#cancelBtn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }

    /**
     * Atualiza a visibilidade e o texto da barra de ações em lote.
     */
    function updateBulkActions() {
        const selectedCount = document.querySelectorAll('.article-checkbox:checked').length;
        const bulkActions = document.getElementById('bulkActions');
        if (!bulkActions) return;

        if (selectedCount > 0) {
            bulkActions.classList.add('show');
            bulkActions.querySelector('span').innerHTML = `<strong>${selectedCount}</strong> artigos selecionados`;
        } else {
            bulkActions.classList.remove('show');
        }
    }

    // --- Funções de UI (Estado de Carregamento, Erro, Vazio) ---
    function showLoadingState() {
        articlesGrid.innerHTML = '<div class="loading-indicator">Carregando artigos...</div>';
    }

    function renderErrorState(message) {
        articlesGrid.innerHTML = `<div class="empty-state"><h3>⚠️ Erro ao carregar</h3><p>${escapeHtml(message)}</p><button onclick="window.location.reload()" class="btn btn-primary">Tentar Novamente</button></div>`;
    }

    function renderEmptyState() {
        articlesGrid.innerHTML = `<div class="empty-state"><h3>Nenhum artigo encontrado</h3><p>Crie seu primeiro artigo para vê-lo aqui.</p></div>`;
    }

    // --- Funções Utilitárias ---
    function showToast(message, type = 'info') {
        document.querySelector('.toast-notification')?.remove();
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type} show`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }

    function escapeHtml(str = '') {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // --- Inicialização ---
    carregarArtigos();

    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', () => {
            const selectedIds = Array.from(document.querySelectorAll('.article-checkbox:checked')).map(cb => cb.dataset.id);
            if (selectedIds.length === 0) {
                showToast('Selecione pelo menos um artigo.', 'warning');
                return;
            }
            showConfirmationModal(`Tem certeza que deseja excluir ${selectedIds.length} artigo(s)?`, () => {
                const deletePromises = selectedIds.map(id => deleteArticle(id));
                Promise.all(deletePromises); // Executa todas as exclusões
            });
        });
    }
});
