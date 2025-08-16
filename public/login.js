// Login Handler
document.addEventListener('DOMContentLoaded', function () {
    console.log('Login script carregado');
    
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.querySelector('.login-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (!loginForm) {
        console.error('Formulário de login não encontrado!');
        return;
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log('Formulário submetido');

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        console.log('Dados do login:', { username: username, password: '***' });

        if (!username || !password) {
            showMessage('Preencha todos os campos', 'error');
            return;
        }

        // Mostrar loading
        loginBtn.classList.add('loading');
        loginBtn.querySelector('span').style.opacity = '0';

        try {
            console.log('Fazendo requisição para a API...');
            
            const response = await fetch('https://sistema-barrueco.onrender.com/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', [...response.headers.entries()]);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok && data.token) {
                console.log('Login bem-sucedido! Salvando token...');
                
                // SALVAR TOKEN NO LOCALSTORAGE
                localStorage.setItem('jwt_token', data.token);
                console.log('Token salvo:', localStorage.getItem('jwt_token'));
                
                // Verificar se realmente foi salvo
                const tokenSalvo = localStorage.getItem('jwt_token');
                if (tokenSalvo) {
                    console.log('✅ Confirmado: Token salvo no localStorage');
                    showMessage('Login realizado com sucesso!', 'success');
                    
                    // Aguardar um pouco antes do redirecionamento
                    setTimeout(() => {
                        console.log('Redirecionando para o sistema...');
                        window.location.href = '/sistema/sistema-teste.html'; // Use a página de teste primeiro
                    }, 2000);
                } else {
                    console.error('❌ ERRO: Token não foi salvo no localStorage');
                    showMessage('Erro ao salvar dados de login', 'error');
                }
                
            } else if (response.ok) {
                console.error('Login OK mas sem token na resposta');
                showMessage('Erro: Token não recebido do servidor', 'error');
                
            } else {
                console.log('Login falhou:', data.msg);
                showMessage(data.msg || 'Erro no login', 'error');
                
                // Limpar campos
                usernameInput.value = '';
                passwordInput.value = '';

                // Animação de erro
                const inputs = document.querySelectorAll('input');
                inputs.forEach(input => {
                    input.style.animation = 'shake 0.5s ease-in-out';
                    setTimeout(() => {
                        input.style.animation = '';
                    }, 500);
                });
            }

        } catch (error) {
            console.error('Erro na requisição:', error);
            showMessage('Erro de conexão com o servidor', 'error');
        } finally {
            // Remover loading
            setTimeout(() => {
                loginBtn.classList.remove('loading');
                loginBtn.querySelector('span').style.opacity = '1';
            }, 1500);
        }
    });
});

// Toggle senha
document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
});

// Função para mostrar mensagens
function showMessage(message, type = 'error') {
    console.log(`Mensagem (${type}):`, message);
    
    const messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        console.error('Container de mensagem não encontrado');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, 4000);
}

// Animações da página
document.addEventListener('DOMContentLoaded', function() {
    // Efeito parallax nas partículas
    document.addEventListener('mousemove', function(e) {
        const particles = document.querySelectorAll('.particle');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        particles.forEach((particle, index) => {
            const speed = (index + 1) * 0.5;
            const xMove = (x - 0.5) * speed;
            const yMove = (y - 0.5) * speed;
            
            particle.style.transform = `translate(${xMove}px, ${yMove}px)`;
        });
    });

    // Animações nos inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.closest('.form-group').style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', function() {
            this.closest('.form-group').style.transform = 'scale(1)';
        });
    });
});

// Debug inicial
console.log('Estado inicial do localStorage:', localStorage.getItem('jwt_token'));