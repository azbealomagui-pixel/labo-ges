// ===========================================
// PAGE: PatientForm
// RÔLE: Formulaire de création/édition de patient
// AVEC: Validation en temps réel, messages d'erreur
// ===========================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

const PatientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Si id présent, mode édition
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({}); // État pour les erreurs de validation
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    dateNaissance: '',
    sexe: 'M',
    telephone: '',
    email: '',
    adresse: '',
    numeroSecuriteSociale: '',
    groupeSanguin: 'Inconnu',
    allergies: [],
    observations: ''
  });

  // ===== VALIDATION EN TEMPS RÉEL =====
  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'nom':
      case 'prenom':
        if (!value.trim()) {
          newErrors[name] = 'Ce champ est obligatoire';
        } else if (value.trim().length < 2) {
          newErrors[name] = 'Minimum 2 caractères';
        } else {
          delete newErrors[name];
        }
        break;
        
      case 'telephone':
        if (!value.trim()) {
          newErrors.telephone = 'Le téléphone est obligatoire';
        } else if (!/^[0-9+\-\s]{8,}$/.test(value)) {
          newErrors.telephone = 'Format téléphone invalide';
        } else {
          delete newErrors.telephone;
        }
        break;
        
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Format email invalide';
        } else {
          delete newErrors.email;
        }
        break;
        
      case 'adresse':
        if (!value.trim()) {
          newErrors.adresse = 'L\'adresse est obligatoire';
        } else {
          delete newErrors.adresse;
        }
        break;
        
      case 'dateNaissance':
        if (!value) {
          newErrors.dateNaissance = 'La date de naissance est obligatoire';
        } else {
          delete newErrors.dateNaissance;
        }
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
  };

  // ===== CHARGEMENT EN MODE ÉDITION =====
  useEffect(() => {
    const loadPatient = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/patients/${id}`);
        setFormData(response.data.patient);
      } catch (err) {
        console.error('Erreur chargement client:', err);
        toast.error('Impossible de charger les données du client');
        navigate('/patients');
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [id, navigate]);

  // ===== GESTIONNAIRE DE CHANGEMENT =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Gestion spéciale pour les allergies
    if (name === 'allergies') {
      setFormData(prev => ({
        ...prev,
        allergies: value.split(',').map(a => a.trim()).filter(a => a)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Valider le champ modifié
    validateField(name, value);
  };

  // ===== VALIDATION DU FORMULAIRE COMPLET =====
  const validateForm = () => {
    const requiredFields = ['nom', 'prenom', 'dateNaissance', 'telephone', 'adresse'];
    const newErrors = {};
    let isValid = true;

    requiredFields.forEach(field => {
      if (!formData[field] || !formData[field].toString().trim()) {
        newErrors[field] = 'Ce champ est obligatoire';
        isValid = false;
      }
    });

    // Validation email si présent
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email invalide';
      isValid = false;
    }

    // Validation téléphone
    if (!/^[0-9+\-\s]{8,}$/.test(formData.telephone)) {
      newErrors.telephone = 'Format téléphone invalide';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // ===== SOUMISSION DU FORMULAIRE =====
    const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Veuillez corriger dûment remplir le formulaire');
      return;
    }

    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        laboratoireId: user.laboratoireId || user.espaceId,
        createdBy: user._id
      };
      
      // IMPORTANT : Ne pas envoyer espaceId si le modèle ne l'attend pas
      delete dataToSend.espaceId;

      if (id) {
        await api.put(`/patients/${id}`, dataToSend);
        toast.success('Client modifié avec succès');
      } else {
        await api.post('/patients', dataToSend);
        toast.success('Clients créé avec succès');
      }
      
      navigate('/patients');
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      console.error('📤 Données envoyées:', err.config?.data);
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // ===== RENDU DU CHAMP AVEC ERREUR =====
  const renderField = (label, name, type = 'text', required = false, options = null) => {
    const hasError = errors[name];
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        
        {options ? (
          <select
            name={name}
            value={formData[name]}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            name={name}
            value={formData[name]}
            onChange={handleChange}
            rows="4"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />
        )}
        
        {hasError && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {errors[name]}
          </p>
        )}
      </div>
    );
  };

  if (loading && id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8">

          {/* Navigation */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate('/patients')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour à la liste
            </button>
            
            <span className="text-gray-300">|</span>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Tableau de bord
            </button>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {id ? 'Modifier le patient' : 'Nouveau patient'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Identité */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField('Nom', 'nom', 'text', true)}
              {renderField('Prénom', 'prenom', 'text', true)}
            </div>

            {/* Date naissance et sexe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField('Date de naissance', 'dateNaissance', 'date', true)}
              {renderField('Sexe', 'sexe', 'select', true, [
                { value: 'M', label: 'Masculin' },
                { value: 'F', label: 'Féminin' },
                { value: 'Autre', label: 'Autre' }
              ])}
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField('Téléphone', 'telephone', 'tel', true)}
              {renderField('Email', 'email', 'email', false)}
            </div>

            {/* Adresse */}
            {renderField('Adresse', 'adresse', 'text', true)}

            {/* N° Sécurité Sociale */}
            {renderField('Numéro de sécurité sociale', 'numeroSecuriteSociale', 'text', false)}

            {/* Groupe sanguin */}
            {renderField('Groupe sanguin', 'groupeSanguin', 'select', false, [
              { value: 'Inconnu', label: 'Inconnu' },
              { value: 'A+', label: 'A+' },
              { value: 'A-', label: 'A-' },
              { value: 'B+', label: 'B+' },
              { value: 'B-', label: 'B-' },
              { value: 'AB+', label: 'AB+' },
              { value: 'AB-', label: 'AB-' },
              { value: 'O+', label: 'O+' },
              { value: 'O-', label: 'O-' }
            ])}

            {/* Allergies */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Besoin d'analyse
              </label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies.join(', ')}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    allergies: value.split(',').map(a => a.trim()).filter(a => a)
                  });
                }}
                placeholder="ex: Conductivité électrique, Carbone organique total (COT)"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            {/* Observations */}
            {renderField('Observations', 'observations', 'textarea', false)}

            {/* Boutons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || Object.keys(errors).length > 0}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Enregistrement...' : (id ? 'Modifier' : 'Créer')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>

            {/* Résumé des erreurs */}
            {Object.keys(errors).length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 font-medium">
                  Veuillez corriger les {Object.keys(errors).length} erreur(s) avant de soumettre
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientForm;