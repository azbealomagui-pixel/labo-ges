// ===========================================
// MODÈLE: Devis.js
// RÔLE: Modèle pour les devis
// VERSION: Corrigée avec gestion d'erreurs
// ===========================================

const mongoose = require('mongoose');

const devisSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  type: { type: String, enum: ['proforma', 'devis', 'facture', 'avoir'], default: 'devis' },
  laboratoireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratoire', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  devise: { type: String, default: 'EUR', enum: ['EUR', 'USD', 'GNF', 'XOF'] },
  
  lignes: [{
    analyseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analyse' },
    code: String,
    nom: String,
    categorie: String,
    prixUnitaire: Number,
    devise: { type: String, default: 'EUR' },
    quantite: { type: Number, default: 1, min: 1 },
    prixTotal: Number,
    observations: String
  }],
  
  sousTotal: { 
    valeur: { type: Number, default: 0 }, 
    devise: { type: String, default: 'EUR' } 
  },
  total: { 
    valeur: { type: Number, default: 0 }, 
    devise: { type: String, default: 'EUR' } 
  },
  remiseGlobale: { type: Number, default: 0, min: 0, max: 100 },
  dateEmission: { type: Date, default: Date.now },
  dateValidite: { type: Date, default: () => new Date(+new Date() + 30*24*60*60*1000) },
  datePaiement: Date,
  statut: { 
    type: String, 
    enum: ['brouillon', 'envoye', 'accepte', 'refuse', 'paye', 'annule', 'expire'], 
    default: 'brouillon' 
  },
  notes: String,
  historique: [{
    action: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }],
  actif: { type: Boolean, default: true }
}, { timestamps: true });

// ===== MIDDLEWARE PRE-SAVE CORRIGÉ =====
devisSchema.pre('save', function(next) {
  try {
    if (!this.lignes || this.lignes.length === 0) {
      return next();
    }

    let sousTotalCalc = 0;
    this.lignes.forEach(ligne => {
      const prixU = ligne.prixUnitaire || 0;
      const qte = ligne.quantite || 1;
      const totalLigne = prixU * qte;
      
      ligne.prixTotal = totalLigne;
      sousTotalCalc += totalLigne;
    });

    const remise = this.remiseGlobale || 0;
    const totalCalc = sousTotalCalc * (1 - remise / 100);

    this.sousTotal = {
      valeur: Number(sousTotalCalc.toFixed(2)),
      devise: this.devise || 'EUR'
    };
    
    this.total = {
      valeur: Number(totalCalc.toFixed(2)),
      devise: this.devise || 'EUR'
    };

    return next();
    
  } catch (error) {
    console.error('❌ Erreur dans pre-save:', error);
    return next(error);
  }
});

module.exports = mongoose.model('Devis', devisSchema);