const mongoose = require('mongoose');

const artigoSchema = new mongoose.Schema({
  titulo: String,
  conteudo: String,
  autor: String,
  html:String,
  data: Date
});

module.exports = mongoose.model('Artigo', artigoSchema);
