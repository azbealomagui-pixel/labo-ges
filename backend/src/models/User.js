const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { 
    type: String, 
    enum: ['super_admin', 'admin', 'manager_labo', 'biologiste', 'technicien', 'secretaire', 'comptable'], 
    default: 'technicien' 
  },
  espaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Espace' },
  estProprietaire: { type: Boolean, default: false },
  poste: { type: String, default: '' },
  permissions: { type: [String], default: [] },
  deleguePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dateDebutDelegation: { type: Date, default: null },
  dateFinDelegation: { type: Date, default: null },
  laboratoireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratoire' },
  actif: { type: Boolean, default: true }
}, { timestamps: true });

// ===== FONCTION DE HASHAGE SÉPARÉE =====
async function hashPassword(user) {
  if (!user.isModified('password')) return;
  if (user.password && user.password.startsWith('$2b$')) return;
  
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  console.log('✅ Mot de passe hashé pour:', user.email);
}

// ===== MIDDLEWARE PRE-SAVE SANS next =====
userSchema.pre('save', function() {
  // Appeler la fonction de hashage et retourner une promesse
  return hashPassword(this);
});

// ===== MÉTHODE DE COMPARAISON =====
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// ===== MÉTHODE POUR DONNÉES PUBLIQUES =====
userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);