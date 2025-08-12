const mongoose = require('mongoose');

const artigoSchema = new mongoose.Schema({
  titulo: String,
  conteudo: String,
  autor: String,
  data: Date,
  pdf: String // campo para armazenar o PDF
});

module.exports = mongoose.model('Artigo', artigoSchema);
