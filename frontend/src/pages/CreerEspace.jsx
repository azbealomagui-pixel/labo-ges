// ===========================================
// PAGE: CreerEspace
// RÔLE: Formulaire de création d'espace
// VERSION: Optimisée et sans bug
// ===========================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

// ===== CONFIGURATION =====
const DEVISES = [
  { code: 'EUR', nom: 'Euro', symbole: '€' },
  { code: 'USD', nom: 'Dollar', symbole: '$' },
  { code: 'GNF', nom: 'Franc Guinéen', symbole: 'FG' },
  { code: 'XOF', nom: 'Franc CFA', symbole: 'CFA' }
];

const LANGUES = [
  { code: 'fr', nom: 'Français' },
  { code: 'en', nom: 'English' },
  { code: 'es', nom: 'Español' }
];

const CreerEspace = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    telephone: '',
    email: '',
    numeroLicence: '',
    numeroFiscal: '',
    deviseParDefaut: 'EUR',
    langueParDefaut: 'fr'
  });

  // ===== VALIDATION EN TEMPS RÉEL =====
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'nom':
        if (!value.trim()) {
          newErrors.nom = 'Le nom est requis';
        } else if (value.trim().length < 3) {
          newErrors.nom = 'Minimum 3 caractères';
        } else {
          delete newErrors.nom;
        }
        break;

      case 'adresse':
        if (!value.trim()) {
          newErrors.adresse = 'L\'adresse est requise';
        } else {
          delete newErrors.adresse;
        }
        break;

      case 'telephone':
        if (!value.trim()) {
          newErrors.telephone = 'Le téléphone est requis';
        } else if (!/^[0-9+\-\s]{8,}$/.test(value)) {
          newErrors.telephone = 'Format téléphone invalide';
        } else {
          delete newErrors.telephone;
        }
        break;

      case 'email':
        if (!value.trim()) {
          newErrors.email = 'L\'email est requis';
        } else if (!/^\S+@\S+\.\S+$/.test(value)) {
          newErrors.email = 'Format email invalide';
        } else {
          delete newErrors.email;
        }
        break;

      case 'numeroLicence':
        if (!value.trim()) {
          newErrors.numeroLicence = 'Le numéro de licence est requis';
        } else {
          delete newErrors.numeroLicence;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  // ===== GESTIONNAIRE DE CHANGEMENT =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  // ===== VALIDATION DU FORMULAIRE =====
  const validateForm = () => {
    const requiredFields = ['nom', 'adresse', 'telephone', 'email', 'numeroLicence'];
    const newErrors = {};
    let isValid = true;

    requiredFields.forEach(field => {
      if (!formData[field]?.trim()) {
        newErrors[field] = 'Ce champ est requis';
        isValid = false;
      }
    });

    // Validation email
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Format email invalide';
      isValid = false;
    }

    // Validation téléphone
    if (formData.telephone && !/^[0-9+\-\s]{8,}$/.test(formData.telephone)) {
      newErrors.telephone = 'Format téléphone invalide';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // ===== SOUMISSION =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/espaces', {
        ...formData,
        createdBy: user._id
      });

      if (response.data.success) {
        toast.success('✅ Espace créé avec succès !');

        // Mettre à jour l'utilisateur avec son espaceId
        const updatedUser = { 
          ...user, 
          espaceId: response.data.espace._id 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Mettre à jour le contexte d'authentification
        // (Si votre hook useAuth a une fonction refresh)
        if (login) {
          // Optionnel : reconnecter l'utilisateur
        }

        navigate('/dashboard');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      
      if (err.response?.status === 409) {
        toast.error('Un espace avec ces informations existe déjà');
      } else {
        toast.error(err.response?.data?.message || 'Erreur création espace');
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== RENDU =====
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Créer votre espace LaboGest
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Donnez un nom à votre espace professionnel
          </p>

          {/* Messages d'erreur */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">
                Veuillez corriger les erreurs suivantes :
              </p>
              <ul className="mt-2 list-disc list-inside text-sm text-red-600">
                {Object.values(errors).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Nom de l'espace */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Nom de votre espace <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                  errors.nom ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ex: Pharmacie Centrale, Hôpital Saint Jean..."
              />
              {errors.nom && <p className="mt-1 text-sm text-red-600">{errors.nom}</p>}
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Adresse complète <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                  errors.adresse ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="123 Rue de la Santé, Paris"
              />
              {errors.adresse && <p className="mt-1 text-sm text-red-600">{errors.adresse}</p>}
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    errors.telephone ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="+224 621 00 00 00"
                />
                {errors.telephone && <p className="mt-1 text-sm text-red-600">{errors.telephone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="contact@etablissement.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>

            {/* Numéro de licence */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Numéro de licence professionnelle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="numeroLicence"
                value={formData.numeroLicence}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                  errors.numeroLicence ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="LIC-2025-001"
              />
              {errors.numeroLicence && (
                <p className="mt-1 text-sm text-red-600">{errors.numeroLicence}</p>
              )}
            </div>

            {/* Numéro fiscal (optionnel) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Numéro fiscal (optionnel)
              </label>
              <input
                type="text"
                name="numeroFiscal"
                value={formData.numeroFiscal}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: 123456789"
              />
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Devise par défaut
                </label>
                <select
                  name="deviseParDefaut"
                  value={formData.deviseParDefaut}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {DEVISES.map(d => (
                    <option key={d.code} value={d.code}>
                      {d.nom} ({d.symbole})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Langue par défaut
                </label>
                <select
                  name="langueParDefaut"
                  value={formData.langueParDefaut}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {LANGUES.map(l => (
                    <option key={l.code} value={l.code}>{l.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || Object.keys(errors).length > 0}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'Création...' : 'Créer mon espace'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreerEspace;