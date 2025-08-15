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

    // Atualiza "selecionar todos"
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

// Selecionar/deselecionar todos
document.getElementById('selectAll').addEventListener('change', function () {
    const checkboxes = document.querySelectorAll('.article-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
    });
    updateBulkActions();
});

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
            default:
                return 0;
        }
    });

    articles.forEach(article => articlesGrid.appendChild(article));
});

// Carregar artigos do banco e montar HTML
async function carregarArtigos() {
    try {
        const resp = await fetch('/artigos');
        
        // Verificar se a resposta é JSON
        const contentType = resp.headers.get('content-type');
        if (!resp.ok || !contentType || !contentType.includes('application/json')) {
            const errorText = await resp.text();
            throw new Error(errorText || 'Erro ao buscar artigos');
        }
        
        const artigos = await resp.json();

        const container = document.getElementById('articlesGrid');
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
            artigoCard.classList.add('article-card');
            artigoCard.dataset.status = artigo.status || 'draft';
            artigoCard.dataset.pdf = artigo.pdf || '';
            artigoCard.dataset.date = artigo.data;
            artigoCard.dataset.id = artigo._id;

            artigoCard.innerHTML = `
                <div class="article-header">
                    
                    <div class="article-image">📄</div>
                    <div class="article-content">
                        <h3 class="article-title">${escapeHtml(artigo.titulo)}</h3>
                        <p class="article-excerpt">${escapeHtml(artigo.conteudo.substring(0, 100))}...</p>
                        <div class="article-meta">
                            <span class="meta-item">📅 ${new Date(artigo.data).toLocaleDateString('pt-BR')}</span>
                            <span class="meta-item">👤 ${escapeHtml(artigo.autor)}</span>
                        </div>
                    </div>
                </div>
                <div class="article-stats">
                    <div class="stat-item">
                        <span>⏰</span>
                        <span class="stat-value">-</span>
                        <span>atrás</span>
                    </div>
                </div>
                <div class="article-actions">
                    <div class="action-buttons">
                        <button class="btn btn-small btn-secondary">✏️ Editar</button>
                        <button class="btn btn-small btn-danger">🗑️ Apagar</button>
                    </div>
                </div>
            `;

            container.appendChild(artigoCard);
        });

        // Atualiza eventos dos botões após carregar os artigos
        document.querySelectorAll('.btn-danger').forEach(btn => {
            btn.addEventListener('click', handleDeleteArticle);
        });

        document.querySelectorAll('.btn-secondary').forEach(btn => {
            btn.addEventListener('click', handleEditArticle);
        });

    } catch (err) {
        console.error('Erro ao carregar artigos:', err);
        const container = document.getElementById('articlesGrid');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3 class="empty-title">Erro ao carregar artigos</h3>
                <p class="empty-description">${err.message}</p>
                <button onclick="carregarArtigos()" class="btn btn-small btn-primary">Tentar novamente</button>
            </div>
        `;
    }
}

// Funções auxiliares para manipulação de eventos
function handleDeleteArticle(e) {
    const card = e.target.closest('.article-card');
    const artigoId = card.dataset.id;

    if (confirm('Tem certeza que deseja excluir este artigo?')) {
        deleteArticle(artigoId, card);
    }
}

function handleEditArticle(e) {
    const card = e.target.closest('.article-card');
    abrirFormularioEdicao(card);
}

async function deleteArticle(artigoId, cardElement) {
    try {
        const resp = await fetch(`/artigos/${artigoId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Verificar se a resposta é JSON
        const contentType = resp.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const errorText = await resp.text();
            throw new Error(`Resposta inválida do servidor: ${errorText.substring(0, 100)}`);
        }

        const result = await resp.json();

        if (resp.ok) {
            cardElement.remove();
            updateBulkActions();
            console.log('✅ Artigo excluído:', result.msg);
        } else {
            throw new Error(result.msg || 'Erro ao excluir artigo');
        }
    } catch (err) {
        console.error('Erro ao excluir artigo:', err);
        alert(`Falha ao excluir artigo: ${err.message}`);
    }
}

function abrirFormularioEdicao(card) {
    const artigoId = card.dataset.id;
    if (!artigoId) {
        alert('ID do artigo não encontrado no elemento. Verifique data-id.');
        console.error('data-id inexistente no card:', card);
        return;
    }

    const titulo = card.querySelector('.article-title')?.textContent?.trim() || '';
    const excerpt = card.querySelector('.article-excerpt')?.textContent || '';
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
          <textarea id="editConteudo">${escapeHtml(excerpt.replace('...', ''))}</textarea>
          <label>Autor</label>
          <input type="text" id="editAutor" value="${escapeHtml(autor)}">
          <label>Data</label>
          <input type="date" id="editData" value="${dataIso}">
          <label>PDF (opcional)</label>
          <input type="file" id="editPdf" accept="application/pdf">
          <div class="modal-actions">
            <button id="saveEdit" class="btn btn-primary">Salvar</button>
            <button id="cancelEdit" class="btn btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHtml);

    document.getElementById('cancelEdit').onclick = () => document.getElementById('editModal').remove();

    document.getElementById('saveEdit').onclick = async () => {
        const saveBtn = document.getElementById('saveEdit');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando...';

        try {
            const formData = new FormData();
            formData.append('titulo', document.getElementById('editTitulo').value);
            formData.append('conteudo', document.getElementById('editConteudo').value);
            formData.append('autor', document.getElementById('editAutor').value);
            formData.append('data', document.getElementById('editData').value);

            const pdfFile = document.getElementById('editPdf').files[0];
            if (pdfFile) formData.append('pdf', pdfFile);

            const resp = await fetch(`/artigos/${artigoId}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });

            // Verificar se a resposta é JSON
            const contentType = resp.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await resp.text();
                throw new Error(`Resposta não é JSON: ${text.substring(0, 100)}`);
            }

            const result = await resp.json();

            if (!resp.ok) {
                throw new Error(result.msg || 'Erro ao atualizar artigo');
            }

            alert('✅ Artigo atualizado com sucesso!');
            document.getElementById('editModal').remove();
            carregarArtigos(); // Recarregar a lista de artigos
        } catch (err) {
            console.error('Falha na requisição PUT:', err);
            alert(`Erro: ${err.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salvar';
        }
    };
}

// Função para escapar HTML (para evitar injeção)
function escapeHtml(str = '') {
    return str.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}

// Inicializa carregando artigos
document.addEventListener('DOMContentLoaded', carregarArtigos);