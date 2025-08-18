// Aguarda o conteúdo do DOM ser completamente carregado
document.addEventListener('DOMContentLoaded', function () {
    
    // Elementos do DOM
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.querySelector('.login-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const messageContainer = document.getElementById('messageContainer');
    const togglePassword = document.getElementById('togglePassword');
    const allInputs = document.querySelectorAll('input');

    // Manipulador de envio do formulário de login
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = usernameInput.value;
            const password = passwordInput.value;

            loginBtn.classList.add('loading');
            loginBtn.querySelector('span').style.opacity = '0';

            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }) 
                });
                
                const data = await response.json();

                if (response.ok) {
                    showMessage(data.msg, 'success');
                    setTimeout(() => {
                        window.location.href = '/sistema'; // Redireciona para a página do sistema
                    }, 1500);
                } else {
                    throw new Error(data.msg || 'Falha na autenticação');
                }

            } catch (err) {
                console.error('Erro de login:', err);
                showMessage(err.message, 'error');
                usernameInput.value = '';
                passwordInput.value = '';
                allInputs.forEach(input => {
                    input.style.animation = 'shake 0.5s ease-in-out';
                    setTimeout(() => { input.style.animation = ''; }, 500);
                });
            } finally {
                setTimeout(() => {
                    loginBtn.classList.remove('loading');
                    loginBtn.querySelector('span').style.opacity = '1';
                }, 500);
            }
        });
    }

    // Alternância de visibilidade da senha
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Função para mostrar mensagens
    function showMessage(message, type = 'error') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        messageContainer.innerHTML = '';
        messageContainer.appendChild(messageDiv);
        
        // Mostrar mensagem com animação
        setTimeout(() => messageDiv.classList.add('show'), 100);
        
        // Remover mensagem após alguns segundos
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => messageDiv.remove(), 300);
        }, 4000);
    }

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
    allInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.closest('.form-group').style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', function() {
            this.closest('.form-group').style.transform = 'scale(1)';
        });
    });
});