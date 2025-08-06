const mongoose =  require('mongoose')

const AdminSchema = new mongoose.Schema({
  nome: String,
  username: String,
  password: String,
  ativo: Boolean
})
module.exports = mongoose.model('Admin', AdminSchema, 'admins')
