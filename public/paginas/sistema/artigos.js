// Atualiza barra de ações em lote
function updateBulkActions() {
    const checkboxes = document.querySelectorAll('.article-checkbox');
    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const bulkActions = document.getElementById('bulkActions');
    const selectAll = document.getElementById('selectAll');

    if (selectedCount > 0) {
        bulkActions.classList.add('show');
        bulkActions.querySelector('span').innerHTML = `<strong>${selectedCount}</strong> artigos selecionados`;
    } else {
        bulkActions.classList.remove('show');
    }

    // Atualiza "selecionar todos" se existir
    if (selectAll) {
        if (selectedCount === checkboxes.length) {
            selectAll.checked = true;
            selectAll.indeterminate = false;
        } else if (selectedCount > 0) {
            selectAll.indeterminate = true;
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }
    }
}

// Selecionar/deselecionar todos
const selectAllElement = document.getElementById('selectAll');
if (selectAllElement) {
    selectAllElement.addEventListener('change', function () {
        const checkboxes = document.querySelectorAll('.article-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        updateBulkActions();
    });
}

// Limpar filtros
function clearFilters() {
    document.getElementById('searchInput').value = '';
    filterArticles();
}

// Filtrar artigos por título
function filterArticles() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const articles = document.querySelectorAll('.article-card');

    articles.forEach(article => {
        const title = article.querySelector('.article-title').textContent.toLowerCase();
        article.style.display = title.includes(searchTerm) ? 'block' : 'none';
    });
}

document.getElementById('searchInput').addEventListener('input', filterArticles);

// Ordenar artigos
document.getElementById('sortFilter').addEventListener('change', function () {
    const articlesGrid = document.getElementById('articlesGrid');
    const articles = Array.from(articlesGrid.children);
    const sortValue = this.value;

    articles.sort((a, b) => {
        switch (sortValue) {
            case 'date-desc':
                return new Date(b.dataset.date) - new Date(a.dataset.date);
            case 'date-asc':
                return new Date(a.dataset.date) - new Date(b.dataset.date);
            case 'title-asc':
                return a.querySelector('.article-title').textContent.localeCompare(
                    b.querySelector('.article-title').textContent
                );
            case 'title-desc':
                return b.querySelector('.article-title').textContent.localeCompare(
                    a.querySelector('.article-title').textContent
                );
            default:
                return 0;
        }
    });

    articles.forEach(article => articlesGrid.appendChild(article));
});

// Carregar artigos do banco e montar HTML
async function carregarArtigos() {
    try {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = 'Carregando artigos...';
        const container = document.getElementById('articlesGrid');
        container.innerHTML = '';
        container.appendChild(loadingIndicator);

        // Configuração especial para Safari
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const fetchOptions = {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        };

        if (isSafari) {
            fetchOptions.headers['X-Requested-With'] = 'XMLHttpRequest';
        }

        const resp = await fetch('https://sistema-barrueco.onrender.com/artigos', fetchOptions);
        
        // Verificar se a resposta é JSON
        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const errorText = await resp.text();
            throw new Error(isSafari ? 
                'O Safari bloqueou a requisição. Tente desativar a Prevenção Contra Rastreamento nas configurações.' : 
                'Resposta inválida do servidor');
        }
        
        if (!resp.ok) {
            const errorData = await resp.json();
            throw new Error(errorData.message || `Erro ${resp.status} ao buscar artigos`);
        }
        
        const artigos = await resp.json();

        container.innerHTML = '';

        if (artigos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <h3 class="empty-title">Nenhum artigo encontrado</h3>
                    <p class="empty-description">Crie seu primeiro artigo clicando no botão "Novo Artigo"</p>
                </div>
            `;
            return;
        }

        artigos.forEach(artigo => {
            const artigoCard = document.createElement('div');
            artigoCard.className = 'article-card';
            artigoCard.dataset.status = artigo.status || 'draft';
            artigoCard.dataset.pdf = artigo.pdf || '';
            artigoCard.dataset.date = artigo.data || new Date().toISOString();
            artigoCard.dataset.id = artigo._id;

            artigoCard.innerHTML = `
                <div class="article-header">
                    <div class="article-checkbox-container">
                        <input type="checkbox" class="article-checkbox">
                    </div>
                    <div class="article-image">📄</div>
                    <div class="article-content">
                        <h3 class="article-title">${escapeHtml(artigo.titulo || 'Sem título')}</h3>
                        <p class="article-excerpt">${escapeHtml((artigo.conteudo || '').substring(0, 100))}${artigo.conteudo?.length > 100 ? '...' : ''}</p>
                        <div class="article-meta">
                            <span class="meta-item">📅 ${artigo.data ? new Date(artigo.data).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                            <span class="meta-item">👤 ${escapeHtml(artigo.autor || 'Anônimo')}</span>
                        </div>
                    </div>
                </div>
                <div class="article-actions">
                    <div class="action-buttons">
                        <button class="btn btn-small btn-secondary edit-btn" data-id="${artigo._id}">✏️ Editar</button>
                        <button class="btn btn-small btn-danger delete-btn" data-id="${artigo._id}">🗑️ Apagar</button>
                    </div>
                </div>
            `;

            container.appendChild(artigoCard);
        });

        // Atualiza eventos dos botões após criar os elementos
        attachEventListeners();

    } catch (err) {
        console.error('Erro ao carregar artigos:', err);
        const container = document.getElementById('articlesGrid');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3 class="empty-title">Erro ao carregar artigos</h3>
                <p class="empty-description">${escapeHtml(err.message)}</p>
                <button onclick="carregarArtigos()" class="btn btn-small btn-primary">Tentar novamente</button>
            </div>
        `;
    }
}

// Função para anexar eventos aos botões
function attachEventListeners() {
    // Eventos para botões de exclusão
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteArticle);
    });

    // Eventos para botões de edição
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', handleEditArticle);
    });

    // Eventos para checkboxes
    document.querySelectorAll('.article-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActions);
    });
}

// Funções auxiliares para manipulação de eventos
function handleDeleteArticle(e) {
    const btn = e.currentTarget;
    const artigoId = btn.getAttribute('data-id');
    const card = btn.closest('.article-card');

    if (confirm('Tem certeza que deseja excluir este artigo?')) {
        deleteArticle(artigoId, card);
    }
}

function handleEditArticle(e) {
    const btn = e.currentTarget;
    const artigoId = btn.getAttribute('data-id');
    const card = btn.closest('.article-card');
    abrirFormularioEdicao(card, artigoId);
}

async function deleteArticle(artigoId, cardElement) {
    try {
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const fetchOptions = {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        };

        if (!isSafari) {
            fetchOptions.credentials = 'include';
        }

        const resp = await fetch(`https://sistema-barrueco.onrender.com/artigos/${artigoId}`, fetchOptions);

        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const errorText = await resp.text();
            throw new Error(`Resposta inválida: ${errorText.substring(0, 100)}`);
        }

        const result = await resp.json();

        if (resp.ok) {
            cardElement.remove();
            updateBulkActions();
            showToast('✅ Artigo excluído com sucesso!', 'success');
        } else {
            throw new Error(result.msg || 'Erro ao excluir artigo');
        }
    } catch (err) {
        console.error('Erro ao excluir artigo:', err);
        showToast(`❌ Falha ao excluir: ${err.message}`, 'error');
    }
}

function abrirFormularioEdicao(card, artigoId) {
    if (!artigoId) {
        showToast('ID do artigo não encontrado', 'error');
        console.error('data-id inexistente no card:', card);
        return;
    }

    const titulo = card.querySelector('.article-title')?.textContent?.trim() || '';
    const excerpt = card.querySelector('.article-excerpt')?.textContent?.replace('...', '').trim() || '';
    const metaItems = card.querySelectorAll('.article-meta .meta-item');
    const dataRaw = card.dataset.date || '';
    const autor = (metaItems[1] ? metaItems[1].textContent.replace('👤', '').trim() : '') || '';

    const dataIso = dataRaw ? new Date(dataRaw).toISOString().split('T')[0] : '';

    // Fechar modal existente se houver
    const modalExistente = document.getElementById('editModal');
    if (modalExistente) modalExistente.remove();

    const formHtml = `
      <div id="editModal" class="modal">
        <div class="modal-content">
          <h2>Editar Artigo</h2>
          <label>Título</label>
          <input type="text" id="editTitulo" value="${escapeHtml(titulo)}">
          <label>Conteúdo</label>
          <textarea id="editConteudo">${escapeHtml(excerpt)}</textarea>
          <label>Autor</label>
          <input type="text" id="editAutor" value="${escapeHtml(autor)}">
          <label>Data</label>
          <input type="date" id="editData" value="${dataIso}">
          <div class="modal-actions">
            <button id="saveEdit" class="btn btn-primary">Salvar</button>
            <button id="cancelEdit" class="btn btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHtml);

    // Adicionar evento para fechar modal ao clicar no fundo escuro
    const modal = document.getElementById('editModal');
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });

    // Evento para cancelar
    document.getElementById('cancelEdit').addEventListener('click', function() {
        document.getElementById('editModal').remove();
    });

    // Evento para salvar
    document.getElementById('saveEdit').addEventListener('click', async function() {
        const saveBtn = this;
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando...';

        try {
            const formData = new FormData();
            formData.append('titulo', document.getElementById('editTitulo').value);
            formData.append('conteudo', document.getElementById('editConteudo').value);
            formData.append('autor', document.getElementById('editAutor').value);
            formData.append('data', document.getElementById('editData').value);

            const resp = await fetch(`https://sistema-barrueco.onrender.com/artigos/${artigoId}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const contentType = resp.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await resp.text();
                throw new Error(`Resposta não é JSON: ${text.substring(0, 100)}`);
            }

            const result = await resp.json();

            if (!resp.ok) {
                throw new Error(result.msg || 'Erro ao atualizar artigo');
            }

            showToast('✅ Artigo atualizado com sucesso!', 'success');
            document.getElementById('editModal').remove();
            carregarArtigos();
        } catch (err) {
            console.error('Falha na requisição PUT:', err);
            showToast(`❌ Erro: ${err.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    });
}

// Função para mostrar notificação toast
function showToast(message, type = 'info') {
    // Remove toasts existentes
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    
    // Adicionar estilos inline para garantir que apareça
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    // Definir cores baseadas no tipo
    switch (type) {
        case 'success':
            toast.style.backgroundColor = '#059669';
            break;
        case 'error':
            toast.style.backgroundColor = '#DC2626';
            break;
        case 'warning':
            toast.style.backgroundColor = '#D97706';
            break;
        default:
            toast.style.backgroundColor = '#3B82F6';
    }
    
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Animar saída e remover
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Função para escapar HTML
function escapeHtml(str = '') {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarArtigos();
    
    // Event listener para exclusão em lote
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', () => {
            const selected = Array.from(document.querySelectorAll('.article-checkbox:checked'));
            if (selected.length === 0) {
                showToast('Selecione pelo menos um artigo', 'warning');
                return;
            }
            
            if (confirm(`Tem certeza que deseja excluir ${selected.length} artigo(s)?`)) {
                selected.forEach(checkbox => {
                    const card = checkbox.closest('.article-card');
                    const deleteBtn = card.querySelector('.delete-btn');
                    const artigoId = deleteBtn.getAttribute('data-id');
                    deleteArticle(artigoId, card);
                });
            }
        });
    }
});