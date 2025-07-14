//Recebendo Formulario 
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.querySelector('.login-btn'); // mover para dentro do DOMContentLoaded
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
            const response = await fetch('http://localhost:3001/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }) 
            });

            const data = await response.json();

            if (!response.ok) {
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

            showMessage(data.msg, 'success');

            setTimeout(() => {
                window.location.href = '/sistema';
            }, 2000);
        } catch (err) {
            showMessage("Erro de conexão com o servidor", 'error');
        } finally {
            // garantir que o loading desapareça se não for redirecionado
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

        // Validação em tempo real
        const usernameInput = document.getElementById('username');
        const passwordInputField = document.getElementById('password');

        usernameInput.addEventListener('input', function() {
            if (this.value.length < 3) {
                this.style.borderColor = 'var(--warning)';
            } else {
                this.style.borderColor = 'var(--success)';
            }
        });

        passwordInputField.addEventListener('input', function() {
            if (this.value.length < 6) {
                this.style.borderColor = 'var(--warning)';
            } else {
                this.style.borderColor = 'var(--success)';
            }
        });

        // Proteção contra múltiplas tentativas
        let loginAttempts = 0;
        const maxAttempts = 5;
        const lockoutTime = 300000; // 5 minutos

        function checkLockout() {
            const lastAttempt = localStorage.getItem('lastLoginAttempt');
            const attempts = parseInt(localStorage.getItem('loginAttempts') || '0');
            
            if (attempts >= maxAttempts && lastAttempt) {
                const timePassed = Date.now() - parseInt(lastAttempt);
                if (timePassed < lockoutTime) {
                    const remainingTime = Math.ceil((lockoutTime - timePassed) / 60000);
                    showMessage(`Muitas tentativas. Tente novamente em ${remainingTime} minutos.`, 'error');
                    loginBtn.disabled = true;
                    return false;
                }
            }
            return true;
        }

        // Verificar bloqueio ao carregar a página
        if (!checkLockout()) {
            loginBtn.style.opacity = '0.5';
            loginBtn.style.cursor = 'not-allowed';
        }

        // Registrar tentativas de login
        loginForm.addEventListener('submit', function() {
            loginAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');
            loginAttempts++;
            localStorage.setItem('loginAttempts', loginAttempts.toString());
            localStorage.setItem('lastLoginAttempt', Date.now().toString());
            
            if (loginAttempts >= maxAttempts) {
                showMessage('Muitas tentativas de login. Conta temporariamente bloqueada.', 'error');
            }
        });

        // Limpar tentativas em caso de sucesso
        function clearLoginAttempts() {
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lastLoginAttempt');
        }