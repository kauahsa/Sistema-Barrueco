require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const Parser = require('rss-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const admins = require('./models/admins');
const Artigo = require('./models/artigo');

const app = express();
const parser = new Parser();

// ============ MIDDLEWARES BÁSICOS ============
app.use(express.json({ 
    limit: '10mb',
    type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 1000
}));
app.use(cookieParser());

// ============ CORS OTIMIZADO PARA MOBILE ============
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://barruecoadvogados.com.br',
            'http://localhost:3000',
            'https://sistema-barrueco.onrender.com'
        ];
        
        // Permite requests sem origin (apps mobile nativos)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Para desenvolvimento, permite qualquer origin
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        callback(new Error('Bloqueado pelo CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200, // Para browsers antigos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'Pragma',
        'Cookie'
    ],
    exposedHeaders: ['Content-Type', 'set-cookie', 'X-Total-Count'],
    maxAge: 86400 // Cache preflight por 24 horas
};

app.use(cors(corsOptions));

// ============ MIDDLEWARES PARA MOBILE ============

// Headers de cache e segurança mobile-friendly
app.use((req, res, next) => {
    // Headers para cache mobile
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // Headers de segurança
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    
    // Para iOS Safari
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        res.set('Vary', 'Origin, User-Agent');
    }
    
    next();
});

// Middleware para detectar dispositivos móveis
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    req.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    req.isIOS = /iPad|iPhone|iPod/.test(userAgent);
    req.isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    req.isAndroid = /Android/i.test(userAgent);
    
    // Log apenas para rotas importantes
    if (req.method === 'POST' || req.url.includes('/auth/') || req.url.includes('/postArt')) {
        console.log(`${req.method} ${req.url} - ${req.isMobile ? 'Mobile' : 'Desktop'}:`, {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: userAgent.substring(0, 80) + (userAgent.length > 80 ? '...' : ''),
            isMobile: req.isMobile,
            isIOS: req.isIOS,
            timestamp: new Date().toISOString()
        });
    }
    
    next();
});

// Middleware para timeout específico de mobile
app.use((req, res, next) => {
    const timeoutDuration = req.isMobile ? 45000 : 30000; // 45s para mobile, 30s para desktop
    
    const timeout = setTimeout(() => {
        console.error('Request timeout:', {
            url: req.url,
            method: req.method,
            isMobile: req.isMobile,
            duration: timeoutDuration
        });
        if (!res.headersSent) {
            res.status(408).json({ 
                msg: req.isMobile ? 
                    'Conexão muito lenta. Tente novamente.' : 
                    'Timeout na requisição. Tente novamente.' 
            });
        }
    }, timeoutDuration);
    
    // Limpa o timeout quando a resposta é enviada
    res.on('finish', () => {
        clearTimeout(timeout);
    });
    
    next();
});

// ============ FUNÇÃO DE VERIFICAÇÃO DE TOKEN ============
function checkToken(req, res, next) {
    const token = req.cookies.token;
    console.log('Verificação de token:', { 
        hasToken: !!token, 
        isMobile: req.isMobile,
        url: req.url 
    });

    if (!token) {
        console.log('Nenhum token encontrado');
        return req.accepts('html')
            ? res.redirect('/login')
            : res.status(401).json({ msg: 'Acesso Bloqueado!' });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        req.adminId = decoded.id;
        next();
    } catch (error) {
        console.log('Token inválido:', error.message);
        return req.accepts('html')
            ? res.redirect('/login')
            : res.status(400).json({ msg: "Token inválido" });
    }
}

// ============ SERVIR ARQUIVOS ESTÁTICOS ============
app.use('/sistema', checkToken, express.static(path.join(__dirname, '..', 'public', 'paginas', 'sistema')));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============ CONFIGURAÇÃO DO MULTER ============
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        file.mimetype === 'application/pdf'
            ? cb(null, true)
            : cb(new Error('Apenas arquivos PDF são permitidos!'));
    }
});

// ============ ROTAS SIMPLES ============
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));
app.get('/api', checkToken, (req, res) => res.json({ msg: "Olá, bem vindo a API" }));
app.get('/admin', checkToken, (req, res) => {
    return res.redirect('paginas/sistema/sistema.html');
});

// ============ LOGIN OTIMIZADO PARA MOBILE ============
app.post('/auth/login', async (req, res) => {
    const startTime = Date.now();
    
    try {
        console.log('=== LOGIN REQUEST ===');
        console.log('Device:', req.isMobile ? 'Mobile' : 'Desktop');
        
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(422).json({ msg: "Usuário e senha são obrigatórios" });
        }

        if (password.length < 8) {
            return res.status(422).json({ msg: 'A senha deve ter no mínimo 8 caracteres!' });
        }

        const admin = await admins.findOne({ username, password });
        if (!admin) {
            return res.status(404).json({ msg: 'Usuário ou senha inválidos' });
        }

        const token = jwt.sign({ id: admin._id }, process.env.SECRET);
        
        // Configurações de cookie específicas por dispositivo
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 60 * 3 // 3 horas
        };
        
        // Para mobile, usa configurações mais permissivas
        if (req.isMobile) {
            cookieOptions.sameSite = req.isIOS ? 'None' : 'Lax';
            if (req.isIOS) {
                cookieOptions.secure = true; // iOS sempre precisa de secure para sameSite=None
            }
        } else {
            cookieOptions.sameSite = 'Strict';
        }
        
        res.cookie('token', token, cookieOptions);

        const processTime = Date.now() - startTime;
        console.log(`Login successful in ${processTime}ms for ${req.isMobile ? 'mobile' : 'desktop'}`);

        // Para iOS, força content-type
        if (req.isIOS) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }

        res.json({ 
            msg: "Autenticação realizada com sucesso",
            token: token, // Fallback para dispositivos com problemas de cookie
            processTime: `${processTime}ms`
        });
        
    } catch (error) {
        const processTime = Date.now() - startTime;
        console.error('Login error:', error);
        res.status(500).json({ 
            msg: "Erro interno no servidor",
            processTime: `${processTime}ms`
        });
    }
});

// ============ PUBLICAR ARTIGO OTIMIZADO PARA MOBILE ============
app.post('/postArt', checkToken, upload.single('pdf'), async (req, res) => {
    const startTime = Date.now();
    
    try {
        console.log('=== POST ARTICLE REQUEST ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Device:', req.isMobile ? 'Mobile' : 'Desktop');
        console.log('Headers relevantes:', {
            'content-type': req.headers['content-type']?.substring(0, 50),
            'content-length': req.headers['content-length'],
            'user-agent': req.headers['user-agent']?.substring(0, 80)
        });
        
        const { titulo, conteudo, autor, data } = req.body;

        // Validações melhoradas
        if (!titulo || !titulo.trim()) {
            return res.status(422).json({ msg: "É necessário um título" });
        }
        if (titulo.trim().length < 3) {
            return res.status(422).json({ msg: "Título deve ter pelo menos 3 caracteres" });
        }
        if (!conteudo || !conteudo.trim()) {
            return res.status(422).json({ msg: "Adicione um resumo!" });
        }
        if (conteudo.trim().length < 10) {
            return res.status(422).json({ msg: "Conteúdo deve ter pelo menos 10 caracteres" });
        }
        if (!autor || !autor.trim()) {
            return res.status(422).json({ msg: "Cite o autor do Artigo!" });
        }
        if (!data) {
            return res.status(422).json({ msg: "Adicione uma data!" });
        }

        console.log('Dados validados:', {
            titulo: titulo.substring(0, 50) + (titulo.length > 50 ? '...' : ''),
            conteudo: conteudo.substring(0, 100) + (conteudo.length > 100 ? '...' : ''),
            autor: autor.trim(),
            data,
            hasPDF: !!req.file
        });

        // Criação do artigo
        const novoArtigo = new Artigo({
            titulo: titulo.trim(),
            conteudo: conteudo.trim(),
            autor: autor.trim(),
            data,
            pdf: req.file ? `/uploads/${req.file.filename}` : null
        });

        await novoArtigo.save();
        
        const processTime = Date.now() - startTime;
        console.log(`Article saved successfully in ${processTime}ms`);

        // Resposta otimizada para mobile
        const successResponse = {
            msg: "Artigo publicado com sucesso!",
            id: novoArtigo._id,
            timestamp: new Date().toISOString(),
            processTime: `${processTime}ms`
        };

        // Para iOS, força content-type
        if (req.isIOS) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }

        console.log('Sending success response:', successResponse);
        res.status(201).json(successResponse);
        
    } catch (error) {
        const processTime = Date.now() - startTime;
        console.error('=== POST ARTICLE ERROR ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('Process time:', `${processTime}ms`);
        
        const errorResponse = {
            msg: req.isMobile ? 
                "Erro ao publicar artigo. Tente novamente." : 
                "Erro ao publicar artigo",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString(),
            processTime: `${processTime}ms`
        };
        
        res.status(500).json(errorResponse);
    }
});

// ============ DEMAIS ROTAS (OTIMIZADAS) ============

// Deletar artigo
app.delete('/artigos/:id', checkToken, async (req, res) => {
    const startTime = Date.now();
    try {
        const artigo = await Artigo.findById(req.params.id);
        if (!artigo) return res.status(404).json({ msg: 'Artigo não encontrado' });

        if (artigo.pdf) {
            const pdfPath = path.join(__dirname, '..', artigo.pdf);
            if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        }

        await Artigo.findByIdAndDelete(req.params.id);
        
        const processTime = Date.now() - startTime;
        res.json({ 
            msg: 'Artigo deletado com sucesso!',
            processTime: `${processTime}ms`
        });
    } catch (error) {
        const processTime = Date.now() - startTime;
        console.error('Delete error:', error);
        res.status(500).json({ 
            msg: 'Erro interno ao deletar artigo',
            processTime: `${processTime}ms`
        });
    }
});

// Atualizar artigo
app.put('/artigos/:id', checkToken, upload.single('pdf'), async (req, res) => {
    const startTime = Date.now();
    try {
        const artigo = await Artigo.findById(req.params.id);
        if (!artigo) return res.status(404).json({ msg: 'Artigo não encontrado' });

        const updateData = { ...req.body };
        if (req.file) {
            if (artigo.pdf) {
                const oldPath = path.join(__dirname, '..', artigo.pdf);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            updateData.pdf = `/uploads/${req.file.filename}`;
        }

        const updated = await Artigo.findByIdAndUpdate(req.params.id, updateData, { new: true });
        
        const processTime = Date.now() - startTime;
        res.json({ 
            msg: 'Artigo atualizado com sucesso', 
            artigo: updated,
            processTime: `${processTime}ms`
        });
    } catch (error) {
        const processTime = Date.now() - startTime;
        console.error('Update error:', error);
        res.status(500).json({ 
            msg: 'Erro interno ao atualizar artigo',
            processTime: `${processTime}ms`
        });
    }
});

// ============ FUNÇÕES DE NOTÍCIAS ============
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

// Buscar artigo por ID
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

// Buscar notícias
app.get('/noticias', async (req, res) => {
    try {
        const noticias = await buscarNoticias();
        res.json(noticias);
    } catch (error) {
        console.error('Erro ao buscar notícias:', error);
        res.status(500).json({ msg: 'Erro ao buscar notícias' });
    }
});

// Listar artigos
app.get('/artigos', async (req, res) => {
    try {
        const artigos = await Artigo.find().sort({ data: -1 }).limit(10);
        res.json(artigos);
    } catch (error) {
        console.error('Erro ao buscar artigos:', error);
        res.status(500).json({ msg: 'Erro ao buscar artigos' });
    }
});

// ============ TRATAMENTO DE ERROS ============

// Middleware para tratamento de erros do multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ msg: 'Arquivo muito grande. Máximo 10MB.' });
        }
        return res.status(400).json({ msg: 'Erro no upload do arquivo.' });
    }
    
    if (error.message === 'Apenas arquivos PDF são permitidos!') {
        return res.status(400).json({ msg: error.message });
    }
    
    next(error);
});

// Handler para erros não capturados
app.use((error, req, res, next) => {
    console.error('Erro não capturado:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        isMobile: req.isMobile
    });
    
    if (!res.headersSent) {
        res.status(500).json({
            msg: req.isMobile ? 
                'Erro no servidor. Tente novamente.' : 
                'Erro interno do servidor',
            timestamp: new Date().toISOString()
        });
    }
});

// Handler para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({
        msg: 'Endpoint não encontrado',
        requested: req.url,
        method: req.method
    });
});

// ============ TRATAMENTO DE PROCESSO ============

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Recebido SIGINT, fechando servidor...');
    mongoose.connection.close(() => {
        console.log('Conexão MongoDB fechada');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('Recebido SIGTERM, fechando servidor...');
    mongoose.connection.close(() => {
        console.log('Conexão MongoDB fechada');
        process.exit(0);
    });
});

// Trata erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// ============ CONEXÃO MONGODB E INICIALIZAÇÃO ============
const PORT = process.env.PORT || 3001;

mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wsmqk1n.mongodb.net/BarruecoAdmin?retryWrites=true&w=majority&appName=Cluster0`)
    .then(() => {
        app.listen(PORT, () => {
            console.log('=== SERVIDOR BARRUECO INICIADO ===');
            console.log(`Porta: ${PORT}`);
            console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`MongoDB: Conectado`);
            console.log(`Otimizações Mobile: Ativas`);
            console.log(`Timestamp: ${new Date().toISOString()}`);
            console.log('=====================================');
        });
    })
    .catch((error) => {
        console.error('Erro ao conectar MongoDB:', error);
        process.exit(1);
    });