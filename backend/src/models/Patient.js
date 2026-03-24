// ===========================================
// FICHIER: src/models/Patient.js
// RÔLE: Définir la structure d'un patient
// ===========================================

const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  // Informations personnelles
  nom: {
    type: String,
    required: [true, 'Le nom du client est obligatoire'],
    trim: true
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom du client est obligatoire'],
    trim: true
  },
  dateNaissance: {
    type: Date,
    required: [true, 'La date de naissance est obligatoire']
  },
  sexe: {
    type: String,
    enum: ['M', 'F', 'Autre'],
    required: true
  },
  
  // Contact
  telephone: {
    type: String,
    required: [true, 'Le téléphone est obligatoire']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  adresse: {
    type: String,
    required: true
  },
  
  // Informations médicales
  numeroSecuriteSociale: {
    type: String,
    unique: true,
    sparse: true // Permet null/undefined
  },
  groupeSanguin: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Inconnu'],
    default: 'Inconnu'
  },
  allergies: [{
    type: String
  }],
  observations: String,
  
  // Liens
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
  
  // Statut
  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour la recherche rapide
patientSchema.index({ nom: 1, prenom: 1 });
patientSchema.index({ telephone: 1 });
//patientSchema.index({ numeroSecuriteSociale: 1 });

module.exports = mongoose.model('Patient', patientSchema);