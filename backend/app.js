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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS melhorado
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://barruecoadvogados.com.br',
            'http://localhost:3000',
            'https://sistema-barrueco.onrender.com',
            'http://localhost:3001'
        ];
        
        console.log('CORS Origin request:', origin);
        
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS permitindo origem não listada para debug:', origin);
            callback(null, true); // Temporariamente permitir para debug
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
    console.log('Headers recebidos:', {
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? 'Bearer [HIDDEN]' : 'null',
        'cookie': req.headers.cookie ? '[PRESENT]' : 'null',
        'origin': req.headers.origin,
        'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
    });
    next();
});

// Função de verificação de token melhorada
function checkToken(req, res, next) {
    const token = req.cookies.token;
    const authHeader = req.headers.authorization;
    
    console.log('=== DEBUG AUTH ===');
    console.log('Cookie token:', token ? '[PRESENT]' : 'null');
    console.log('Auth header:', authHeader ? 'Bearer [PRESENT]' : 'null');
    console.log('==================');

    // Tenta pegar o token do cookie primeiro, depois do header
    let tokenToUse = token;
    if (!tokenToUse && authHeader && authHeader.startsWith('Bearer ')) {
        tokenToUse = authHeader.substring(7);
        console.log('Usando token do header Authorization');
    }

    if (!tokenToUse) {
        console.log('Nenhum token encontrado');
        
        // Se é uma requisição AJAX/API, retorna JSON
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ 
                msg: 'Acesso Bloqueado! Token não encontrado.',
                debug: {
                    cookiePresent: !!token,
                    headerPresent: !!authHeader,
                    userAgent: req.get('User-Agent')?.substring(0, 50)
                }
            });
        }
        
        // Senão, redireciona para login (requests de HTML)
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(tokenToUse, process.env.SECRET);
        req.adminId = decoded.id;
        console.log('Token válido para admin:', decoded.id);
        next();
    } catch (error) {
        console.log('Token inválido:', error.message);
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ 
                msg: "Token inválido ou expirado",
                error: error.message
            });
        }
        
        return res.redirect('/login');
    }
}

// Servir arquivos estáticos
app.use('/sistema', checkToken, express.static(path.join(__dirname, '..', 'public', 'paginas', 'sistema')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rotas básicas
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));
app.get('/api', checkToken, (req, res) => res.json({ msg: "Olá, bem vindo a API" }));
app.get('/admin', checkToken, (req, res) => {
  return res.redirect('paginas/sistema/sistema.html');
});

// Login melhorado
app.post('/auth/login', async (req, res) => {
    console.log('Tentativa de login:', { username: req.body.username });

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(422).json({ msg: "Usuário e senha são obrigatórios" });
    }

    if (password.length < 8) {
        return res.status(422).json({ msg: 'A senha deve ter no mínimo 8 caracteres!' });
    }

    try {
        const admin = await admins.findOne({ username, password });
        if (!admin) {
            return res.status(404).json({ msg: 'Usuário ou senha inválidos' });
        }

        const token = jwt.sign({ id: admin._id }, process.env.SECRET, { expiresIn: '3h' });
        
        // Configurações de cookie mais robustas
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 3, // 3 horas
            sameSite: isProduction ? 'None' : 'Lax',
            secure: isProduction || req.secure || req.get('X-Forwarded-Proto') === 'https'
        };

        console.log('Configurando cookie com opções:', cookieOptions);
        res.cookie('token', token, cookieOptions);

        console.log('Login bem-sucedido para:', username);
        res.json({ 
            msg: "Autenticação realizada com sucesso",
            token: token,
            debug: {
                cookieSet: true,
                secure: cookieOptions.secure,
                sameSite: cookieOptions.sameSite
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ msg: 'Erro interno no servidor' });
    }
});

// Publicar artigo - melhorado
app.post('/postArt', checkToken, async (req, res) => {
    console.log('=== POSTANDO ARTIGO ===');
    console.log('Body recebido:', req.body);
    console.log('Admin ID:', req.adminId);

    const { titulo, conteudo, autor, data } = req.body;

    // Validações
    if (!titulo || !titulo.trim()) {
        return res.status(422).json({ msg: "É necessário um titulo" });
    }
    if (!conteudo || !conteudo.trim()) {
        return res.status(422).json({ msg: "Adicione um resumo!" });
    }
    if (!autor || !autor.trim()) {
        return res.status(422).json({ msg: "Cite o autor do Artigo!" });
    }
    if (!data) {
        return res.status(422).json({ msg: "Adicione uma data!" });
    }

    try {
        const novoArtigo = new Artigo({
            titulo: titulo.trim(),
            conteudo: conteudo.trim(),
            autor: autor.trim(),
            data: new Date(data)
        });

        const artigoSalvo = await novoArtigo.save();
        console.log('Artigo salvo com sucesso:', artigoSalvo._id);

        res.status(201).json({ 
            msg: "Artigo publicado com sucesso!",
            artigo: artigoSalvo
        });

    } catch (error) {
        console.error('Erro ao salvar artigo:', error);
        res.status(500).json({ 
            msg: "Erro interno ao publicar artigo",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Deletar artigo
app.delete('/artigos/:id', checkToken, async (req, res) => {
    try {
        console.log('Deletando artigo:', req.params.id);
        
        const artigo = await Artigo.findById(req.params.id);
        if (!artigo) {
            return res.status(404).json({ msg: 'Artigo não encontrado' });
        }

        await Artigo.findByIdAndDelete(req.params.id);
        console.log('Artigo deletado com sucesso');
        
        res.json({ msg: 'Artigo deletado com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar artigo:', error);
        res.status(500).json({ msg: 'Erro interno ao deletar artigo' });
    }
});

// Atualizar artigo
app.put('/artigos/:id', checkToken, async (req, res) => {
    try {
        console.log('Atualizando artigo:', req.params.id);
        console.log('Dados para atualização:', req.body);
        
        const artigo = await Artigo.findById(req.params.id);
        if (!artigo) {
            return res.status(404).json({ msg: 'Artigo não encontrado' });
        }

        const updateData = {
            titulo: req.body.titulo?.trim(),
            conteudo: req.body.conteudo?.trim(),
            autor: req.body.autor?.trim(),
            data: req.body.data ? new Date(req.body.data) : artigo.data
        };

        const updated = await Artigo.findByIdAndUpdate(req.params.id, updateData, { new: true });
        console.log('Artigo atualizado com sucesso');
        
        res.json({ 
            msg: 'Artigo atualizado com sucesso', 
            artigo: updated 
        });
    } catch (error) {
        console.error('Erro ao atualizar artigo:', error);
        res.status(500).json({ msg: 'Erro interno ao atualizar artigo' });
    }
});

// Buscar artigo específico
app.get('/artigos/:id', async (req, res) => {
    try {
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

// Listar todos os artigos
app.get('/artigos', async (req, res) => {
    try {
        console.log('Buscando todos os artigos...');
        const artigos = await Artigo.find().sort({ data: -1 }).limit(10);
        console.log(`Encontrados ${artigos.length} artigos`);
        
        res.json(artigos);
    } catch (error) {
        console.error('Erro ao buscar artigos:', error);
        res.status(500).json({ msg: 'Erro interno ao buscar artigos' });
    }
});

// Notícias
async function buscarNoticias() {
    const fontes = [
        { nome: 'Conjur', url: 'https://www.conjur.com.br/rss.xml' },
        { nome: 'STF', url: 'https://portal.stf.jus.br/rss/STF-noticias.xml' },
        { nome: 'STJ', url: 'https://res.stj.jus.br/hrestp-c-portalp/RSS.xml' }
    ];

    const todasNoticias = [];
    for (const fonte of fontes) {
        try {
            const feed = await parser.parseURL(fonte.url);
            feed.items.slice(0, 6).forEach(item => {
                todasNoticias.push({
                    fonte: fonte.nome,
                    titulo: item.title,
                    link: item.link,
                    data: item.pubDate || item.isoDate || '',
                    resumo: item.contentSnippet || item.content || ''
                });
            });
        } catch (e) {
            console.error(`Erro na fonte ${fonte.nome}: ${e.message}`);
        }
    }
    return todasNoticias;
}

app.get('/noticias', async (req, res) => {
    try {
        const noticias = await buscarNoticias();
        res.json(noticias);
    } catch (error) {
        console.error('Erro ao buscar notícias:', error);
        res.status(500).json({ msg: 'Erro ao buscar notícias' });
    }
});

// Middleware de erro global
app.use((error, req, res, next) => {
    console.error('Erro não capturado:', error);
    res.status(500).json({ 
        msg: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    console.log('Rota não encontrada:', req.path);
    res.status(404).json({ msg: 'Rota não encontrada' });
});

// Conexão MongoDB e inicialização
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wsmqk1n.mongodb.net/BarruecoAdmin?retryWrites=true&w=majority&appName=Cluster0`)
    .then(() => {
        console.log('Conectado ao MongoDB');
        app.listen(3001, () => {
            console.log("Servidor rodando na porta 3001");
            console.log("Ambiente:", process.env.NODE_ENV || 'development');
        });
    })
    .catch(err => {
        console.error('Erro ao conectar MongoDB:', err);
        process.exit(1);
    });