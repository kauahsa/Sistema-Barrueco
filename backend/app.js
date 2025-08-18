require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const Parser = require('rss-parser');
const cors = require('cors');

const admins = require('./models/admins');
const Artigo = require('./models/artigo');

const app = express();
const parser = new Parser();

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://barruecoadvogados.com.br',
            'http://localhost:3000',
            'https://sistema-barrueco.onrender.com',
            'http://localhost:3001'
        ];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Em produção, seria ideal logar e bloquear a origem não permitida.
            // Para depuração, estamos permitindo.
            console.log('CORS permitindo origem não listada para debug:', origin);
            callback(null, true); 
        }
    },
    credentials: true,
    exposedHeaders: ['set-cookie'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Middleware de verificação de token
function checkToken(req, res, next) {
    const token = req.cookies.token;
    
    if (!token) {
        // Se a requisição espera JSON, retorna erro. Senão, redireciona para login.
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ msg: 'Acesso negado. Nenhum token fornecido.' });
        }
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        req.adminId = decoded.id;
        next();
    } catch (error) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ msg: 'Token inválido ou expirado.' });
        }
        return res.redirect('/login');
    }
}

// Servir arquivos estáticos da pasta public (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- ROTAS PÚBLICAS ---
const publicRoutes = {
    '/': 'index.html',
    '/sobre': 'paginas/sobre.html',
    '/atuacao': 'paginas/atuacao.html',
    '/equipe': 'paginas/equipe.html',
    '/noticias': 'paginas/noticias.html',
    '/artigo': 'paginas/artigo.html',
    '/contato': 'paginas/contato.html',
    '/andre_andrade': 'paginas/andre_andrade.html',
    '/carolina': 'paginas/carolina.html',
    '/zacarias': 'paginas/zacarias.html',
    '/login': 'login.html'
};

for (const [route, file] of Object.entries(publicRoutes)) {
    app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', file));
    });
}

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(422).json({ msg: "Usuário e senha são obrigatórios" });
    }

    try {
        const admin = await admins.findOne({ username, password });
        if (!admin) {
            return res.status(404).json({ msg: 'Usuário ou senha inválidos' });
        }

        const token = jwt.sign({ id: admin._id }, process.env.SECRET, { expiresIn: '8h' });
        
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 8 * 60 * 60 * 1000, // 8 horas
            sameSite: isProduction ? 'None' : 'Lax',
            secure: isProduction,
        });

        res.json({ msg: "Autenticação realizada com sucesso" });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ msg: 'Erro interno no servidor' });
    }
});

app.post('/auth/logout', (req, res) => {
    res.clearCookie('token').json({ msg: 'Logout realizado com sucesso' });
});

// --- ROTAS PROTEGIDAS (PAINEL ADMIN) ---
app.get('/sistema', checkToken, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'paginas', 'sistema', 'sistema.html'));
});

app.get('/sistema/artigos', checkToken, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'paginas', 'sistema', 'artigos.html'));
});

// Rota de verificação de autenticação para o frontend
app.get('/api/check-auth', checkToken, (req, res) => {
    res.json({ authenticated: true });
});

// --- API DE ARTIGOS (PROTEGIDA) ---
const apiRouter = express.Router();
apiRouter.use(checkToken);

// Publicar artigo
apiRouter.post('/artigos', async (req, res) => {
    const { titulo, conteudo, autor, data } = req.body;

    if (!titulo || !conteudo || !autor || !data) {
        return res.status(422).json({ msg: "Todos os campos são obrigatórios." });
    }

    try {
        const novoArtigo = new Artigo({
            titulo,
            conteudo,
            autor,
            data: new Date(data),
            createdBy: req.adminId
        });
        await novoArtigo.save();
        res.status(201).json({ msg: "Artigo publicado com sucesso!" });
    } catch (error) {
        console.error('Erro ao salvar artigo:', error);
        res.status(500).json({ msg: "Erro interno ao publicar artigo" });
    }
});

// Deletar artigo
apiRouter.delete('/artigos/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'ID do artigo inválido' });
        }
        const artigo = await Artigo.findByIdAndDelete(req.params.id);
        if (!artigo) {
            return res.status(404).json({ msg: 'Artigo não encontrado' });
        }
        res.json({ msg: 'Artigo deletado com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar artigo:', error);
        res.status(500).json({ msg: 'Erro interno ao deletar artigo' });
    }
});

// Atualizar artigo
apiRouter.put('/artigos/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'ID do artigo inválido' });
        }
        const { titulo, conteudo, autor, data } = req.body;
        const updatedArtigo = await Artigo.findByIdAndUpdate(
            req.params.id, 
            { titulo, conteudo, autor, data: new Date(data), updatedAt: new Date(), updatedBy: req.adminId }, 
            { new: true, runValidators: true }
        );

        if (!updatedArtigo) {
            return res.status(404).json({ msg: 'Artigo não encontrado' });
        }
        res.json({ msg: 'Artigo atualizado com sucesso', artigo: updatedArtigo });
    } catch (error) {
        console.error('Erro ao atualizar artigo:', error);
        res.status(500).json({ msg: 'Erro interno ao atualizar artigo' });
    }
});

app.use('/api', apiRouter);

// --- API PÚBLICA (ARTIGOS E NOTÍCIAS) ---

// Listar todos os artigos (público)
app.get('/artigos', async (req, res) => {
    try {
        const artigos = await Artigo.find().sort({ data: -1 });
        res.json(artigos);
    } catch (error) {
        console.error('Erro ao buscar artigos:', error);
        res.status(500).json({ msg: 'Erro interno ao buscar artigos' });
    }
});

// Buscar artigo específico (público)
app.get('/artigos/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'ID do artigo inválido' });
        }
        const artigo = await Artigo.findById(req.params.id);
        if (!artigo) {
            return res.status(404).json({ msg: 'Artigo não encontrado' });
        }
        res.json(artigo);
    } catch (err) {
        console.error('Erro ao buscar artigo:', err);
        res.status(500).json({ msg: 'Erro interno ao buscar artigo' });
    }
});

// Rota de Notícias
async function buscarNoticias() {
    // ... (função buscarNoticias permanece a mesma)
}

app.get('/api/noticias', async (req, res) => {
    try {
        const noticias = await buscarNoticias();
        res.json(noticias);
    } catch (error) {
        console.error('Erro ao buscar notícias:', error);
        res.status(500).json({ msg: 'Erro ao buscar notícias' });
    }
});


// --- CONEXÃO E INICIALIZAÇÃO ---
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wsmqk1n.mongodb.net/BarruecoAdmin?retryWrites=true&w=majority&appName=Cluster0`)
    .then(() => {
        console.log('Conectado ao MongoDB');
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Erro ao conectar MongoDB:', err);
        process.exit(1);
    });