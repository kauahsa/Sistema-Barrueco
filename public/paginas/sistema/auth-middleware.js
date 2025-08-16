// Middleware de autenticação para o frontend
function checkAuthentication() {
    let token = localStorage.getItem('jwt_token');
    console.log('Token do localStorage:', token);
    
    // Se não encontrou no localStorage, tentar cookie como fallback
    if (!token) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token') {
                token = value;
                console.log('Token encontrado no cookie:', token);
                // Salvar no localStorage para próximas tentativas
                localStorage.setItem('jwt_token', token);
                break;
            }
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
    const token = localStorage.getItem('jwt_token');
    
    if (!token) {
        console.log('Token não encontrado, redirecionando para login');
        window.location.href = '/login';
        return null;
    }
    
    // Sempre usar Authorization header para cross-domain
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    // Não incluir credentials para evitar problemas CORS
    options.credentials = 'omit';
    
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
document.addEventListener('DOMContentLoaded', async function() {
    const token = checkAuthentication();
    
    if (token) {
        // Testar se o token está funcionando fazendo uma requisição de teste
        try {
            const testResponse = await authenticatedFetch('https://sistema-barrueco.onrender.com/api');
            if (!testResponse || !testResponse.ok) {
                console.log('Token inválido, redirecionando para login');
                localStorage.removeItem('jwt_token');
                window.location.href = '/login';
            } else {
                console.log('Token válido, usuário autenticado');
            }
        } catch (error) {
            console.error('Erro ao testar token:', error);
            localStorage.removeItem('jwt_token');
            window.location.href = '/login';
        }
    }
});