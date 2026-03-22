const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },
  role: {
    type: String,
    enum: {
      values: [
        'super_admin', 'admin', 'admin_delegue', 'manager_labo',
        'biologiste', 'technicien', 'secretaire', 'comptable', 'rh'
      ],
      message: 'Le rôle {VALUE} n\'est pas valide'
    },
    default: 'technicien'
  },
  espaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Espace',
    required: false
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
  permissions: {
    type: [String],
    default: [],
    enum: [
      'VIEW_USERS', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'VIEW_PATIENTS', 'CREATE_PATIENT', 'UPDATE_PATIENT', 'DELETE_PATIENT',
      'VIEW_ANALYSES', 'CREATE_ANALYSE', 'UPDATE_ANALYSE', 'DELETE_ANALYSE',
      'VIEW_DEVIS', 'CREATE_DEVIS', 'VALIDATE_DEVIS',
      'VIEW_RAPPORTS', 'VALIDATE_RAPPORT',
      'VIEW_FINANCES',
      'VIEW_SETTINGS', 'UPDATE_SETTINGS',
      'DELEGATE'
    ]
  },
  deleguePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  dateDebutDelegation: {
    type: Date,
    default: null
  },
  dateFinDelegation: {
    type: Date,
    default: null
  },
  laboratoireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Laboratoire',
    required: false
  },
  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ===== MIDDLEWARE PRE-SAVE : HASHAGE AVEC ASYNC/AWAIT =====
userSchema.pre('save', async function(next) {
  try {
    // Ne hasher que si le mot de passe a été modifié
    if (!this.isModified('password')) {
      return next();
    }

    // Vérifier que le mot de passe n'est pas déjà un hash bcrypt
    if (this.password && this.password.startsWith('$2b$')) {
      return next();
    }

    // Hashage avec async/await
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Mot de passe hashé avec succès pour:', this.email);
    next();
  } catch (error) {
    console.error('❌ Erreur lors du hashage:', error);
    next(error);
  }
});

// ===== MÉTHODE DE COMPARAISON =====
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) return false;
    const isValid = await bcrypt.compare(candidatePassword, this.password);
    return isValid;
  } catch (error) {
    console.error('❌ Erreur de comparaison:', error);
    return false;
  }
};

// ===== MÉTHODE POUR DONNÉES PUBLIQUES =====
userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);