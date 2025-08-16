//Recebendo Formulario 
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.querySelector('.login-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = usernameInput.value;
        const password = passwordInput.value;
        const remember = document.getElementById('remember')?.checked;

        loginBtn.classList.add('loading');
        loginBtn.querySelector('span').style.opacity = '0';

        try {
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

            if (response.ok) {
                // SEMPRE salvar token no localStorage (funciona cross-domain)
                if (data.token) {
                    localStorage.setItem('jwt_token', data.token);
                    console.log('Token salvo no localStorage:', data.token);
                }
                
                showMessage(data.msg, 'success');
                
                setTimeout(() => {
                    // Sempre redirecionar para sistema sem parâmetros extras
                    window.location.href = 'paginas/sistema/sistema.html';
                }, 2000);

            } else {
                showMessage(data.msg, 'error');
                usernameInput.value = '';
                passwordInput.value = '';

                const inputs = document.querySelectorAll('input');
                inputs.forEach(input => {
                    input.style.animation = 'shake 0.5s ease-in-out';
                    setTimeout(() => {
                        input.style.animation = '';
                    }, 500);
                });

                loginBtn.classList.remove('loading');
                loginBtn.querySelector('span').style.opacity = '1';
                return;
            }

        } catch (err) {
            console.error('Erro de conexão:', err);
            showMessage("Erro de conexão com o servidor", 'error');
        } finally {
            setTimeout(() => {
                loginBtn.classList.remove('loading');
                loginBtn.querySelector('span').style.opacity = '1';
            }, 1500);
        }
    });
});

// Elementos do DOM
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const messageContainer = document.getElementById('messageContainer');
const loginBtn = document.querySelector('.login-btn');

// Alternância de visibilidade da senha
togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Função para mostrar mensagens
function showMessage(message, type = 'error') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageDiv);
    
    // Mostrar mensagem com animação
    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 100);
    
    // Remover mensagem após alguns segundos
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, 4000);
}

// Animações de entrada da página
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