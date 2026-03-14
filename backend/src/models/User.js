// ===========================================
// FICHIER: src/models/User.js
// RÔLE: Modèle Mongoose pour les utilisateurs
// VERSION: Finale avec multi-espaces et inscription
// ===========================================

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Schéma de l'utilisateur
 * Définit la structure d'un utilisateur dans MongoDB
 */
const userSchema = new mongoose.Schema({
  // ===== INFORMATIONS PERSONNELLES =====
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est obligatoire'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est obligatoire'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez fournir un email valide'
    ]
  },
  
  // ===== MOT DE PASSE =====
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },

  // ===== RÔLE ET PERMISSIONS =====
  role: {
    type: String,
    enum: {
      values: [
        'super_admin',     // Administrateur général
        'admin_delegue',   // Administrateur délégué
        'manager_labo',    // Directeur de laboratoire
        'biologiste',      // Biologiste (valide les résultats)
        'technicien',      // Technicien de laboratoire
        'secretaire',      // Secrétaire (accueil, facturation)
        'comptable',       // Comptable
        'rh'               // Ressources humaines
      ],
      message: 'Le rôle {VALUE} n\'est pas valide'
    },
    default: 'technicien'
  },

  // ===== CHAMPS POUR MULTI-ESPACES =====
  espaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Espace',
    // ✅ OPTIONNEL pour permettre l'inscription sans espace
    required: false,
    // Note : sera requis après création d'espace
  },

  estProprietaire: {
    type: Boolean,
    default: false
  },

  poste: {
    type: String,
    default: '',
    trim: true
  },

  // ===== ANCIEN SYSTÈME (POUR COMPATIBILITÉ) =====
  laboratoireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Laboratoire',
    required: false, // Rendu optionnel pour migration
  },

  // ===== STATUT DU COMPTE =====
  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Ajoute createdAt et updatedAt automatiquement
});

// ===========================================
// INDEX POUR OPTIMISER LES RECHERCHES
// ===========================================
userSchema.index({ email: 1 });           // Recherche par email
userSchema.index({ espaceId: 1 });        // Filtre par espace
userSchema.index({ role: 1 });            // Filtre par rôle
userSchema.index({ actif: 1 });           // Filtre par statut

// ===========================================
// MIDDLEWARE PRE-SAVE : Hachage automatique du mot de passe
// ===========================================
userSchema.pre('save', async function(next) {
  // Ne pas re-hacher si le mot de passe n'a pas changé
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Vérifier que le mot de passe est présent
    if (!this.password) {
      throw new Error('Le mot de passe ne peut pas être vide');
    }

    // Générer un salt (facteur de complexité = 10)
    const salt = await bcrypt.genSalt(10);
    
    // Hacher le mot de passe
    this.password = await bcrypt.hash(this.password, salt);
    
    next();
  } catch (error) {
    next(error);
  }
});

// ===========================================
// MIDDLEWARE PRE-VALIDATE : Nettoyage des données
// ===========================================
userSchema.pre('validate', function(next) {
  // Nettoyer les champs texte
  if (this.nom) this.nom = this.nom.trim();
  if (this.prenom) this.prenom = this.prenom.trim();
  if (this.email) this.email = this.email.toLowerCase().trim();
  
  next();
});

// ===========================================
// MÉTHODE : Comparaison des mots de passe
// ===========================================
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!candidatePassword) {
      throw new Error('Mot de passe requis pour la comparaison');
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Erreur lors de la comparaison des mots de passe');
  }
};

// ===========================================
// MÉTHODE : Obtenir les informations publiques
// ===========================================
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

// ===========================================
// STATIC : Vérifier si l'email est disponible
// ===========================================
userSchema.statics.isEmailAvailable = async function(email) {
  const user = await this.findOne({ email });
  return !user;
};

// ===========================================
// EXPORT DU MODÈLE
// ===========================================
module.exports = mongoose.model('User', userSchema);