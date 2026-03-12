const mongoose = require('mongoose');

const analyseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Le code est obligatoire'],
    unique: true,
    uppercase: true,
    trim: true
  },
  nom: {
    fr: { type: String, required: [true, 'Le nom est obligatoire'] },
    en: { type: String, default: '' },
    es: { type: String, default: '' }
  },
  categorie: {
    type: String,
    required: [true, 'La catégorie est obligatoire'],
    enum: ['Hématologie', 'Biochimie', 'Hormonologie', 'Sérologie', 
           'Bactériologie', 'Parasitologie', 'Virologie', 'Immunologie', 'Autre']
  },
  prix: {
    valeur: { type: Number, required: true, min: 0 },
    devise: { type: String, default: 'EUR', enum: ['EUR', 'USD', 'GNF', 'XOF'] }
  },
  typeEchantillon: {
    type: String,
    required: true,
    enum: ['Sang', 'Urine', 'Selles', 'LCR', 'Prélèvement', 'Autre']
  },
  instructions: { type: String, default: '' },
  normes: {
    homme: { min: Number, max: Number, texte: String },
    femme: { min: Number, max: Number, texte: String },
    enfant: { min: Number, max: Number, texte: String }
  },
  delaiRendu: { type: Number, default: 24 },
  uniteMesure: { type: String, default: '-' },
  laboratoireId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Laboratoire', 
    required: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  actif: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Analyse', analyseSchema);