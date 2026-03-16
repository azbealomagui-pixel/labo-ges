// ===========================================
// PAGE: AnalyseForm
// RÔLE: Création/édition d'une analyse (catalogue)
// AVEC: Correction du bouton Modifier
// ===========================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

const CATEGORIES = [
  'Hématologie', 'Biochimie', 'Hormonologie', 'Sérologie',
  'Bactériologie', 'Parasitologie', 'Virologie', 'Immunologie', 'Autre'
];

const CURRENCIES = [
  { code: 'EUR', symbole: '€', nom: 'Euro' },
  { code: 'USD', symbole: '$', nom: 'Dollar américain' },
  { code: 'GNF', symbole: 'FG', nom: 'Franc guinéen' },
  { code: 'XOF', symbole: 'CFA', nom: 'Franc CFA' }
];

const ECHANTILLONS = ['Sang', 'Urine', 'Selles', 'LCR', 'Prélèvement', 'Autre'];

const AnalyseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    code: '',
    nom: { fr: '', en: '', es: '' },
    categorie: 'Hématologie',
    prix: { valeur: 0, devise: 'EUR' },
    typeEchantillon: 'Sang',
    instructions: '',
    valeursReference: {
      homme: { min: '', max: '', texte: '' },
      femme: { min: '', max: '', texte: '' },
      enfant: { min: '', max: '', texte: '' }
    },
    normesMedicales: { loinc: '', snomed: '', iso15189: '', autres: '' },
    delaiRendu: 24,
    uniteMesure: ''
  });

  // ===== CHARGEMENT EN MODE ÉDITION (CORRIGÉ) =====
  useEffect(() => {
    if (id) {
      const loadAnalyse = async () => {
        try {
          setLoading(true);
          console.log('Chargement analyse ID:', id);
          
          const response = await api.get(`/analyses/${id}`);
          console.log('Réponse API:', response.data);

          if (response.data.success) {
            const analyseData = response.data.analyse;
            setFormData({
              code: analyseData.code || '',
              nom: {
                fr: analyseData.nom?.fr || '',
                en: analyseData.nom?.en || '',
                es: analyseData.nom?.es || ''
              },
              categorie: analyseData.categorie || 'Hématologie',
              prix: {
                valeur: analyseData.prix?.valeur || 0,
                devise: analyseData.prix?.devise || 'EUR'
              },
              typeEchantillon: analyseData.typeEchantillon || 'Sang',
              instructions: analyseData.instructions || '',
              valeursReference: {
                homme: {
                  min: analyseData.valeursReference?.homme?.min || '',
                  max: analyseData.valeursReference?.homme?.max || '',
                  texte: analyseData.valeursReference?.homme?.texte || ''
                },
                femme: {
                  min: analyseData.valeursReference?.femme?.min || '',
                  max: analyseData.valeursReference?.femme?.max || '',
                  texte: analyseData.valeursReference?.femme?.texte || ''
                },
                enfant: {
                  min: analyseData.valeursReference?.enfant?.min || '',
                  max: analyseData.valeursReference?.enfant?.max || '',
                  texte: analyseData.valeursReference?.enfant?.texte || ''
                }
              },
              normesMedicales: {
                loinc: analyseData.normesMedicales?.loinc || '',
                snomed: analyseData.normesMedicales?.snomed || '',
                iso15189: analyseData.normesMedicales?.iso15189 || '',
                autres: analyseData.normesMedicales?.autres || ''
              },
              delaiRendu: analyseData.delaiRendu || 24,
              uniteMesure: analyseData.uniteMesure || ''
            });
            
            toast.success('Analyse chargée avec succès');
          } else {
            toast.error('Analyse non trouvée');
            navigate('/analyses');
          }
        } catch (err) {
          console.error('Erreur chargement:', err);
          toast.error('Impossible de charger l\'analyse');
          navigate('/analyses');
        } finally {
          setLoading(false);
        }
      };
      loadAnalyse();
    }
  }, [id, navigate]);

  // ===== VALIDATION EN TEMPS RÉEL =====
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    if (name === 'code' && !value.trim()) {
      newErrors.code = 'Le code est obligatoire';
    } else if (name === 'code') {
      delete newErrors.code;
    }

    if (name === 'nom.fr' && !value.trim()) {
      newErrors['nom.fr'] = 'Le nom est obligatoire';
    } else if (name === 'nom.fr') {
      delete newErrors['nom.fr'];
    }

    if (name === 'prix.valeur' && (parseFloat(value) <= 0 || isNaN(parseFloat(value)))) {
      newErrors['prix.valeur'] = 'Le prix doit être supérieur à 0';
    } else if (name === 'prix.valeur') {
      delete newErrors['prix.valeur'];
    }

    setErrors(newErrors);
  };

  // ===== GESTIONNAIRES =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('nom.')) {
      const lang = name.split('.')[1];
      setFormData(prev => ({ ...prev, nom: { ...prev.nom, [lang]: value } }));
      if (lang === 'fr') validateField(name, value);
    } 
    else if (name === 'prix.valeur') {
      setFormData(prev => ({ ...prev, prix: { ...prev.prix, valeur: parseFloat(value) || 0 } }));
      validateField(name, value);
    }
    else if (name === 'prix.devise') {
      setFormData(prev => ({ ...prev, prix: { ...prev.prix, devise: value } }));
    }
    else if (name.startsWith('valeursReference.')) {
      const [_, categorie, champ] = name.split('.');
      setFormData(prev => ({
        ...prev,
        valeursReference: {
          ...prev.valeursReference,
          [categorie]: { ...prev.valeursReference[categorie], [champ]: value }
        }
      }));
    }
    else if (name.startsWith('normesMedicales.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        normesMedicales: { ...prev.normesMedicales, [field]: value }
      }));
    }
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
      validateField(name, value);
    }
  };

  // ===== VALIDATION FORMULAIRE =====
  const validateForm = () => {
    const newErrors = {};
    if (!formData.code?.trim()) newErrors.code = 'Le code est obligatoire';
    if (!formData.nom.fr?.trim()) newErrors['nom.fr'] = 'Le nom est obligatoire';
    if (!formData.prix.valeur || formData.prix.valeur <= 0) {
      newErrors['prix.valeur'] = 'Le prix doit être supérieur à 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== NETTOYAGE DES DONNÉES =====
  const nettoyerDonnees = () => {
    const valeursReferenceNettoyees = {};
    ['homme', 'femme', 'enfant'].forEach(categorie => {
      const vals = formData.valeursReference[categorie];
      if (vals.min || vals.max || vals.texte) {
        valeursReferenceNettoyees[categorie] = {
          ...(vals.min && { min: Number(vals.min) }),
          ...(vals.max && { max: Number(vals.max) }),
          ...(vals.texte && { texte: vals.texte.trim() })
        };
      }
    });

    const normesMedicalesNettoyees = {};
    Object.entries(formData.normesMedicales).forEach(([key, value]) => {
      if (value?.trim()) normesMedicalesNettoyees[key] = value.trim();
    });

    return {
      code: formData.code.toUpperCase().trim(),
      nom: {
        fr: formData.nom.fr.trim(),
        en: formData.nom.en?.trim() || '',
        es: formData.nom.es?.trim() || ''
      },
      categorie: formData.categorie,
      prix: {
        valeur: Number(formData.prix.valeur),
        devise: formData.prix.devise
      },
      typeEchantillon: formData.typeEchantillon,
      instructions: formData.instructions?.trim() || '',
      valeursReference: valeursReferenceNettoyees,
      normesMedicales: normesMedicalesNettoyees,
      delaiRendu: Number(formData.delaiRendu) || 24,
      uniteMesure: formData.uniteMesure?.trim() || '-',
      laboratoireId: user?.laboratoireId,
      createdBy: user?._id
    };
  };

    // ===== SOUMISSION =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Vérification que l'utilisateur est authentifié
    if (!user?._id) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    // Utilisation de validateForm
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setLoading(true);

    try {
      // Nettoyer les données
      const donneesNettoyees = nettoyerDonnees();
      
      // Ajouter les informations d'authentification
      const dataToSend = {
        ...donneesNettoyees,
        laboratoireId: user.laboratoireId || user.espaceId,
        createdBy: user._id
      };

      console.log('📦 Données envoyées:', dataToSend);

      if (id) {
        await api.put(`/analyses/${id}`, dataToSend);
        toast.success('✅ Analyse modifiée avec succès');
      } else {
        await api.post('/analyses', dataToSend);
        toast.success('✅ Analyse créée avec succès');
      }
      
      navigate('/analyses');
    } catch (err) {
      console.error('❌ Erreur:', err);
      
      const errorMessage = err.response?.data?.message || 'Erreur lors de la sauvegarde';
      toast.error(errorMessage);
      
      if (err.response?.data?.errors) {
        console.error('Détails validation:', err.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== RENDU =====
  if (loading && id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* Navigation */}
          <div className="mb-6 flex items-center gap-4 border-b pb-4">
            <button onClick={() => navigate('/analyses')} className="text-gray-600 hover:text-gray-900">
              ← Retour catalogue
            </button>
            <span>|</span>
            <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
              Dashboard
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-6">
            {id ? 'Modifier' : 'Nouvelle'} analyse
          </h1>

          {Object.keys(errors).length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">
                {Object.keys(errors).length} erreur(s) à corriger
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Code */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg ${
                  errors.code ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ex: GLY001"
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
            </div>

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nom.fr"
                value={formData.nom.fr}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg ${
                  errors['nom.fr'] ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Nom en français"
              />
              {errors['nom.fr'] && <p className="mt-1 text-sm text-red-600">{errors['nom.fr']}</p>}
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium mb-2">Catégorie *</label>
              <select
                name="categorie"
                value={formData.categorie}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg"
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* Prix et devise */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Prix *</label>
                <input
                  type="number"
                  name="prix.valeur"
                  value={formData.prix.valeur}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    errors['prix.valeur'] ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors['prix.valeur'] && <p className="mt-1 text-sm text-red-600">{errors['prix.valeur']}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Devise</label>
                <select
                  name="prix.devise"
                  value={formData.prix.devise}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.nom}</option>)}
                </select>
              </div>
            </div>

            {/* Type échantillon */}
            <div>
              <label className="block text-sm font-medium mb-2">Type échantillon *</label>
              <select
                name="typeEchantillon"
                value={formData.typeEchantillon}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg"
              >
                {ECHANTILLONS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {/* Boutons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || Object.keys(errors).length > 0}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : (id ? 'Modifier' : 'Créer')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/analyses')}
                className="flex-1 bg-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300"
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

export default AnalyseForm;