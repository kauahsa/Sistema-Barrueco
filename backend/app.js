

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


app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: [
    'https://barruecoadvogados.com.br', 
    'http://localhost:3000',
    'https://sistema-barrueco.onrender.com' // ou seu domínio de produção
  ],
  credentials: true,
  exposedHeaders: ['set-cookie']
}));

// Função de verificação de token
function checkToken(req, res, next) {
    const token = req.cookies.token;
    console.log('Token recebido:', token); // Adicione este log

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
    } catch {
        return req.accepts('html')
            ? res.redirect('/login')
            : res.status(400).json({ msg: "Token inválido" });
    }
}

// Servir arquivos estáticos
app.use('/sistema', checkToken, express.static(path.join(__dirname, '..', 'public', 'paginas', 'sistema')));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Configuração do multer
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
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        file.mimetype === 'application/pdf'
            ? cb(null, true)
            : cb(new Error('Apenas arquivos PDF são permitidos!'));
    }
});

// Rotas simples
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));
app.get('/api', checkToken, (req, res) => res.json({ msg: "Olá, bem vindo a API" }));
app.get('/admin', checkToken, (req, res) => {
  return res.redirect('/sistema/sistema.html');
});


// Login
app.post('/auth/login', async (req, res) => {
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
   res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // só HTTPS em produção
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 1000 * 60 * 60 * 3
});

    console.log('Admin encontrado:', admin);
    console.log('Token gerado:', token);
    
    res.cookie('token', token, { /* configurações */ });
    console.log('Cookie definido');
    
    res.json({ msg: "Autenticação realizada com sucesso" });
});

// Publicar artigo
app.post('/postArt', checkToken, upload.single('pdf'), async (req, res) => {
    const { titulo, conteudo, autor, data } = req.body;

    if (!titulo) {
        return res.status(422).json({ msg: "É necessário um titulo" });
    }
     if (!conteudo) {
        return res.status(422).json({ msg: "Adicione um resumo!" });
    }
     if (!autor) {
        return res.status(422).json({ msg: "Cite o autor do Artigo!" });
    }
     if (!data) {
        return res.status(422).json({ msg: "Adicione uma data!" });
    }

    try {
        const novoArtigo = new Artigo({
            titulo,
            conteudo,
            autor,
            data,
            pdf: req.file ? `/uploads/${req.file.filename}` : null
        });

        await novoArtigo.save();
        res.status(201).json({ msg: "Artigo publicado com sucesso!" });
    } catch (error) {
        res.status(500).json({ msg: "Erro ao publicar artigo" });
    }
});

// Deletar artigo
app.delete('/artigos/:id', checkToken, async (req, res) => {
    try {
        const artigo = await Artigo.findById(req.params.id);
        if (!artigo) return res.status(404).json({ msg: 'Artigo não encontrado' });

        if (artigo.pdf) {
            const pdfPath = path.join(__dirname, '..', artigo.pdf);
            if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        }

        await Artigo.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Artigo deletado com sucesso!' });
    } catch {
        res.status(500).json({ msg: 'Erro interno ao deletar artigo' });
    }
});

// Atualizar artigo
app.put('/artigos/:id', checkToken, upload.single('pdf'), async (req, res) => {
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
        res.json({ msg: 'Artigo atualizado com sucesso', artigo: updated });
    } catch {
        res.status(500).json({ msg: 'Erro interno ao atualizar artigo' });
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
    res.json(await buscarNoticias());
});

app.get('/artigos', async (req, res) => {
    res.json(await Artigo.find().sort({ data: -1 }).limit(10));
});
// Conexão MongoDB
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wsmqk1n.mongodb.net/BarruecoAdmin?retryWrites=true&w=majority&appName=Cluster0`)
    .then(() => {
        app.listen(3001, () => console.log("Servidor rodando na porta 3001"));
    })
    .catch(console.error);
