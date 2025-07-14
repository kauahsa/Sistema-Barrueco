require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const path = require('path')

const Admin = require('./models/admins')

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(express.static(path.join(__dirname, '..', 'public')))

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
        return res.status(404).json({msg: 'username não encontrado'})
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


//Conexão MongoDB

const dbUser = process.env.DB_USER
const dbPassword = process.env.DB_PASS

mongoose.connect(`mongodb+srv://${dbUser}:${dbPassword}@cluster.2e9of8p.mongodb.net/BarruecoAdmin?retryWrites=true&w=majority&appName=Cluster`)
    .then(() => {
        app.listen(3001)
        console.log("Conexão Bem sucedida, rodando na porta 3001")
    })
    .catch((err) => console.log(err))