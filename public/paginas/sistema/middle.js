// Middleware de autenticação para o frontend
function checkAuthentication() {
    const urlParams = new URLSearchParams(window.location.search);
    const authType = urlParams.get('auth');
    
    let token = null;
    
    // Verificar se deve usar localStorage
    if (authType === 'local') {
        token = localStorage.getItem('jwt_token');
        console.log('Usando token do localStorage:', token);
    } else {
        // Tentar pegar do cookie primeiro
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token') {
                token = value;
                console.log('Usando token do cookie:', token);
                break;
            }
        }
        
        // Se não encontrou no cookie, tentar localStorage como fallback
        if (!token) {
            token = localStorage.getItem('jwt_token');
            console.log('Token não encontrado no cookie, usando localStorage:', token);
        }
    }
    
    if (!token) {
        console.log('Nenhum token encontrado, redirecionando para login');
        window.location.href = '/login';
        return false;
    }
    
    return token;
}

// Função para fazer requisições autenticadas
async function authenticatedFetch(url, options = {}) {
    const token = checkAuthentication();
    if (!token) return null;
    
    const urlParams = new URLSearchParams(window.location.search);
    const authType = urlParams.get('auth');
    
    // Se usando localStorage, adicionar Authorization header
    if (authType === 'local') {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    } else {
        // Se usando cookie, incluir credentials
        options.credentials = 'include';
    }
    
    try {
        const response = await fetch(url, options);
        
        if (response.status === 401) {
            console.log('Token expirado ou inválido, redirecionando para login');
            localStorage.removeItem('jwt_token');
            window.location.href = '/login';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('Erro na requisição autenticada:', error);
        throw error;
    }
}

// Executar verificação quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
});