document.addEventListener('DOMContentLoaded', function () {
    const TituloInput = document.getElementById('titulo');
    const ConteudoInput = document.getElementById('conteudo');
    const AutorInput = document.getElementById('autor');
    const DataInput = document.getElementById('data');

    //Enviando artigo ao Banco
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const Titulo = TituloInput.value;
        const Conteudo = ConteudoInput.value;
        const Autor = AutorInput.value;
        const Data = DataInput.value;

        try {
            const response = await fetch('http://localhost:3001/postArt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ Titulo, Conteudo, Autor, Data }) 
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
                window.location.href = '/admin';
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







