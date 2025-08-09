// Ignora verificação SSL (solução temporária para certificados inválidos)
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const path = require('path')
const Parser = require('rss-parser')
const cors = require('cors')

const admins = require('./models/admins')
const Artigo = require('./models/artigo')

const app = express()
const parser = new Parser();

app.use(cors());
app.use(express.json())
app.use(cookieParser())
app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(express.static(path.join(__dirname, '..', 'public', 'paginas')));


console.log("Ola")

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
})

app.get('/api', (req,res) => {
    res.status(200).json({msg: "Olá, bem vindo a API"})
})

app.get('/login', (req,res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'))
})

app.get('/admin', checkToken, (req,res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'paginas', 'sistema.html'))
})

app.post('/postArt', async (req, res) => {
  const {titulo, conteudo, autor, data} = req.body

  if(!titulo){
    return res.status(422).json({msg: "É necessario um titulo!"})
  }  
  if(!conteudo){
    return res.status(422).json({msg: "Adicione um texto!"})
  }
  if(!autor){
    return res.status(422).json({msg:"Informe o Autor!"})
  }
  if(!data){
    return res.status(422).json({msg:"Informe a data do artigo"})
  }

  try{
    const novoArtigo =  new Artigo({
      titulo: titulo,
      conteudo: conteudo,
      autor: autor,
      data : data

    })

    await novoArtigo.save()

    res.status(201).json({msg:"Artigo publicado com Sucesso!"})

  } catch(error){
    console.error(error)
    res.status(500).json({msg:"Erro em publicar artigo!"})
  }
})

//Fazendo a Verificação de login
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body

    if(!username){
       return res.status(422).json({msg: "O username é obrigatorio!"})
    }

    if(!password){
        return res.status(422).json({msg:"A senha é obrigatoria"})
    }

     if (password.length < 8) {
        return res.status(422).json({ msg: 'A senha deve ter no mínimo 8 caracteres!' })
    }

    const admin = await admins.findOne({ username: username })

    if(!admin){
        return res.status(404).json({msg: 'Username não encontrado'})
    }

    const checkpassword = await admins.findOne({password:password})

    if(!checkpassword){
        return res.status(404).json({msg: 'Senha inválida'})
    } 
    
    try {
        const secret = process.env.SECRET
        const token = jwt.sign({ id: admin._id }, secret)

        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // true em produção com HTTPS
            sameSite: 'Strict',
            maxAge: 1000 * 60 * 60 * 3 // 3h
        })

        res.status(200).json({ msg: "Autenticação realizada com sucesso" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ msg: 'Erro ao logar!' })
    }
})

//Função de verificação de token 

function checkToken(req, res, next) {
    const token = req.cookies.token  

    if (!token) {
        if (req.accepts('html')) {
            return res.redirect('/login')
        } else {
            return res.status(401).json({ msg: 'Acesso Bloqueado!' })
        }
    }

    try {
        const secret = process.env.SECRET
        const decoded = jwt.verify(token, secret)
        req.adminId = decoded.id
        next()
    } catch (error) {
        if (req.accepts('html')) {
            return res.redirect('/login')
        } else {
            return res.status(400).json({ msg: "Token inválido" })
        }
    }
}

//Api de noticias
async function buscarNoticias() {
  const fontes = [
    { nome: 'STF', url: 'https://portal.stf.jus.br/rss/STF-noticias.xml' },
    { nome: 'STJ', url: 'https://www.stj.jus.br/sites/portalp/Paginas/rss.aspx' },
    { nome: 'CNJ', url: 'https://www.cnj.jus.br/feed/' },
    { nome: 'Conjur', url: 'https://www.conjur.com.br/rss.xml' },
    { nome: 'Migalhas', url: 'https://www.migalhas.com.br/rss' }

  ];

  const todasNoticias = [];

  for (const fonte of fontes) {
    try {
      const feed = await parser.parseURL(fonte.url);

      if (!feed.items || !Array.isArray(feed.items)) {
        console.warn(`Feed inválido da fonte ${fonte.nome}`);
        continue;
      }

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
  const noticias = await buscarNoticias();
  console.log("Notícias carregadas:", noticias);  // 👈 ADICIONE ISSO
  res.json(noticias);
});

//Artigos do banco
app.get('/artigos', async (req, res) => {
  try {
    const artigos = await Artigo.find().sort({ data: -1 }).limit(10); // Últimos 10
    res.json(artigos);
  } catch (error) {
    console.error('Erro ao buscar artigos:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar artigos' });
  }
});



//Conexão MongoDB

const dbUser = process.env.DB_USER
const dbPassword = process.env.DB_PASS

mongoose.connect(`mongodb+srv://${dbUser}:${dbPassword}@cluster.2e9of8p.mongodb.net/BarruecoAdmin?retryWrites=true&w=majority&appName=Cluster`)
    .then(() => {
        app.listen(3001)
        console.log("Conexão Bem sucedida, rodando na porta 3001")
    })
    .catch((err) => console.log(err))

