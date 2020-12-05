const mongoose = require('mongoose')

const schema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 5
  },
  phone: {
    type: String,
    minlength: 5
  },
  city: {
    type: String,
    required: true,
    minlength: 3
  },
  street: {
    type: String,
    required: true,
    minlength: 3
  }
})

module.exports = mongoose.model('Person', schema)