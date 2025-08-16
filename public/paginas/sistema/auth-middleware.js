// Middleware de autenticação - Versão com verificação atrasada
console.log('Auth middleware carregado');

// Função para obter token
function getToken() {
    const token = localStorage.getItem('jwt_token');
    console.log('Token no localStorage:', token ? `${token.substring(0, 20)}...` : 'Não encontrado');
    return token;
}

// Função para redirecionar para login
function redirectToLogin(motivo = 'Token não encontrado') {
    console.log(`Redirecionando para login. Motivo: ${motivo}`);
    localStorage.removeItem('jwt_token');
    setTimeout(() => {
        window.location.href = '/login';
    }, 500); // Delay maior para debug
}

// Função para fazer requisições autenticadas
async function authenticatedFetch(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        console.log('authenticatedFetch: Sem token disponível');
        return null; // NÃO redirecionar aqui
    }
    
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    console.log(`Requisição para: ${url}`);
    
    try {
        const response = await fetch(url, options);
        console.log(`Resposta: ${response.status} ${response.statusText}`);
        
        if (response.status === 401) {
            console.log('Token expirado/inválido na requisição');
            redirectToLogin('Token expirado');
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('Erro na requisição:', error);
        return null;
    }
}

// Verificação manual de autenticação (chame quando necessário)
async function verificarAutenticacao() {
    console.log('=== INICIANDO VERIFICAÇÃO DE AUTENTICAÇÃO ===');
    
    const token = getToken();
    if (!token) {
        redirectToLogin('Nenhum token encontrado');
        return false;
    }
    
    console.log('Token encontrado, testando com servidor...');
    
    try {
        const response = await fetch('https://sistema-barrueco.onrender.com/api', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`Teste de autenticação: ${response.status}`);
        
        if (response.status === 401) {
            redirectToLogin('Token inválido no servidor');
            return false;
        }
        
        if (response.ok) {
            const data = await response.json();
            console.log('Autenticação válida:', data);
            return true;
        }
        
        console.log('Resposta inesperada do servidor:', response.status);
        return false;
        
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return false; // Não redirecionar em caso de erro de rede
    }
}

// NÃO verificar automaticamente no DOMContentLoaded
console.log('Auth middleware pronto. Use verificarAutenticacao() para testar.');

// Função para inicializar manualmente
window.iniciarVerificacao = function() {
    console.log('Iniciando verificação manual...');
    setTimeout(verificarAutenticacao, 1000);
};