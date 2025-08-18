
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const Parser = require('rss-parser');

const parser = new Parser();

// Importa os models
const admins = require('./models/admins');
const Artigo = require('./models/artigo');

const app = express();

// --- CONFIGURAÇÃO DE MIDDLEWARES ---

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Configuração do CORS
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://barruecoadvogados.com.br',
            'http://localhost:3000',
            'https://sistema-barrueco.onrender.com',
            'http://localhost:3001',
            // Adicione aqui a URL do seu site de produção se for diferente
        ];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Não permitido por CORS'));
        }
    },
    credentials: true, // Essencial para permitir o envio de cookies
}));

app.use(express.static(path.join(__dirname, '..', 'public')));


// --- MIDDLEWARE DE AUTENTICAÇÃO (CHECK TOKEN) ---
function checkToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            // Retorna a mensagem de erro específica que você viu no console
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


// --- ROTAS DE RENDERIZAÇÃO DE PÁGINAS HTML ---
// (O código das rotas de páginas permanece o mesmo)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));
const publicPages = {
    '/sobre': 'paginas/sobre.html', '/atuacao': 'paginas/atuacao.html', '/equipe': 'paginas/equipe.html',
    '/noticias': 'paginas/noticias.html', '/artigos': 'paginas/artigo.html', '/contato': 'paginas/contato.html',
    '/andre_andrade': 'paginas/andre_andrade.html', '/carolina': 'paginas/carolina.html', '/zacarias': 'paginas/zacarias.html',
};
for (const [route, file] of Object.entries(publicPages)) {
    app.get(route, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', file)));
}
app.get('/sistema', checkToken, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'paginas', 'sistema', 'sistema.html')));
app.get('/sistema/artigo', checkToken, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'paginas', 'sistema', 'artigos.html')));


// --- ROTAS DE API ---

const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
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
        
        // --- ALTERAÇÃO PRINCIPAL AQUI ---
        rres.cookie('token', token, {
  httpOnly: true,
  maxAge: 8 * 60 * 60 * 1000,
  secure: process.env.NODE_ENV === 'production', 
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
});


        res.json({ msg: "Autenticação realizada com sucesso" });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ msg: 'Erro interno no servidor' });
    }
});

authRouter.post('/logout', (req, res) => {
    // Ao fazer logout, limpe o cookie com as mesmas propriedades de segurança
    res.clearCookie('token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
})
       .json({ msg: 'Logout realizado com sucesso' });
});

app.use('/auth', authRouter);

const apiRouter = express.Router();
apiRouter.use(checkToken);

// Rotas de API para /PostArt, /artigos/:id (GET, DELETE, PUT)
// (O código das rotas da API permanece o mesmo)
apiRouter.post('/PostArt', async (req, res) => {
    const { titulo, conteudo, autor, data } = req.body;
    if (!titulo || !conteudo || !autor || !data) {
        return res.status(422).json({ msg: "Todos os campos são obrigatórios." });
    }
    try {
        const novoArtigo = new Artigo({ titulo, conteudo, autor, data: new Date(data), createdBy: req.adminId });
        await novoArtigo.save();
        res.status(201).json({ msg: "Artigo publicado com sucesso!" });
    } catch (error) {
        console.error('Erro ao salvar artigo:', error);
        res.status(500).json({ msg: "Erro interno ao publicar artigo" });
    }
});

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

// Rota pública para listar artigos (não precisa de token)
app.get('/home/artigos', async (req, res) => {
    try {
        const artigos = await Artigo.find().sort({ data: -1 }).limit(10);
        res.json(artigos); // <<< TEM QUE RESPONDER JSON
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar artigos' });
    }
});

async function buscarNoticias() {
  const fontes = [
    { nome: 'STF', url: 'https://portal.stf.jus.br/rss/STF-noticias.xml' },
    { nome: 'STJ', url: 'https://www.stj.jus.br/sites/portalp/Paginas/rss.aspx' },
    { nome: 'Conjur', url: 'https://www.conjur.com.br/rss.xml' },
  { nome: 'Migalhas', url: 'https://www.migalhas.com.br/rss' }
  ];

  const todasNoticias = [];

  for (const fonte of fontes) {
    try {
      const feed = await parser.parseURL(fonte.url);
      feed.items.slice(0, 5).forEach(item => {
        todasNoticias.push({
          fonte: fonte.nome,
          titulo: item.title,
          link: item.link,
          data: item.pubDate || item.isoDate || '',
          resumo: item.contentSnippet || item.content || ''
        });
      });
    } catch (e) {
      console.error(`Erro na fonte ${fonte.nome}:`, e.message);
    }
  }

  return todasNoticias;
}

app.get('/home/noticias', async (req, res) => {
    const noticias = await buscarNoticias();
  res.json(noticias);
});

// Rota pública para buscar um artigo (não precisa de token)
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
        res.status(500).json({ msg: 'Erro interno ao buscar artigo' });
    }
});
   


// --- CONEXÃO COM O BANCO DE DADOS E INICIALIZAÇÃO DO SERVIDOR ---
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;

mongoose.connect(`mongodb+srv://${DB_USER}:${DB_PASS}@cluster0.wsmqk1n.mongodb.net/BarruecoAdmin?retryWrites=true&w=majority&appName=Cluster0`)
    .then(() => {
        console.log('Conectado ao MongoDB com sucesso!');
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Erro ao conectar ao MongoDB:', err);
        process.exit(1);
    });
