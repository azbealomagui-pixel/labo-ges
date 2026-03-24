// ===========================================
// PAGE: AnalyseForm
// RÔLE: Création / modification d'une analyse
// VERSION: Environnementale avec conversion code majuscules
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

const AnalyseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(id ? true : false);
  const [formData, setFormData] = useState({
    code: '',
    nom: { fr: '', en: '', es: '' },
    categorie: 'Microbiologie',
    prix: { valeur: '', devise: 'EUR' },
    typeEchantillon: 'Eau',
    delaiRendu: 24,
    uniteMesure: '',
    valeursReference: {
      eau: { min: '', max: '', texte: '' },
      sol: { min: '', max: '', texte: '' },
      sediment: { min: '', max: '', texte: '' },
      aliment: { min: '', max: '', texte: '' }
    },
    normeISO: '',
    instructions: ''
  });

  // Options pour les listes déroulantes
  const categories = [
    { value: 'Microbiologie', label: 'Microbiologie' },
    { value: 'Physico-chimique', label: 'Physico-chimique' },
    { value: 'Chimie', label: 'Chimie' }
  ];

  const typeEchantillons = [
    { value: 'Eau', label: 'Eau' },
    { value: 'Sol', label: 'Sol' },
    { value: 'Sédiment', label: 'Sédiment' },
    { value: 'Aliment', label: 'Aliment' }
  ];

  const typesReference = [
    { key: 'eau', label: 'Eau' },
    { key: 'sol', label: 'Sol' },
    { key: 'sediment', label: 'Sédiment' },
    { key: 'aliment', label: 'Aliment' }
  ];

  // ===== FONCTION DE CHARGEMENT =====
  const fetchAnalyse = useCallback(async () => {
    if (!id) return;
    
    try {
      const response = await api.get(`/analyses/${id}`);
      const data = response.data.analyse;
      setFormData({
        code: data.code || '',
        nom: data.nom || { fr: '', en: '', es: '' },
        categorie: data.categorie || 'Microbiologie',
        prix: {
          valeur: data.prix?.valeur || '',
          devise: data.prix?.devise || 'EUR'
        },
        typeEchantillon: data.typeEchantillon || 'Eau',
        delaiRendu: data.delaiRendu || 24,
        uniteMesure: data.uniteMesure || '',
        valeursReference: {
          eau: data.valeursReference?.eau || { min: '', max: '', texte: '' },
          sol: data.valeursReference?.sol || { min: '', max: '', texte: '' },
          sediment: data.valeursReference?.sediment || { min: '', max: '', texte: '' },
          aliment: data.valeursReference?.aliment || { min: '', max: '', texte: '' }
        },
        normeISO: data.normeISO || '',
        instructions: data.instructions || ''
      });
    } catch (error) {
      console.error('Erreur chargement analyse:', error);
      toast.error('Erreur chargement de l\'analyse');
      navigate('/analyses');
    } finally {
      setLoadingData(false);
    }
  }, [id, navigate]);

  // ===== USEFFECT =====
  useEffect(() => {
    if (id) {
      fetchAnalyse();
    } else {
      setLoadingData(false);
    }
  }, [id, fetchAnalyse]);

  // ===== GESTIONNAIRE DE CHANGEMENT GÉNÉRIQUE =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // ===== GESTIONNAIRE SPÉCIFIQUE POUR LE CODE (CONVERSION MAJUSCULES IMMÉDIATE) =====
  const handleCodeChange = (e) => {
    const rawValue = e.target.value;
    const upperValue = rawValue.toUpperCase();
    setFormData(prev => ({ ...prev, code: upperValue }));
  };

  // ===== GESTIONNAIRE POUR LES VALEURS DE RÉFÉRENCE =====
  const handleReferenceChange = (type, field, value) => {
    setFormData(prev => ({
      ...prev,
      valeursReference: {
        ...prev.valeursReference,
        [type]: {
          ...prev.valeursReference[type],
          [field]: value
        }
      }
    }));
  };

  // ===== VALIDATION DU FORMULAIRE =====
  const validateForm = () => {
    if (!formData.code) {
      toast.error('Le code est obligatoire');
      return false;
    }
    if (formData.code.length < 2) {
      toast.error('Le code doit contenir au moins 2 caractères');
      return false;
    }
    if (!/[A-Z]/.test(formData.code)) {
      toast.error('Le code doit contenir au moins une lettre');
      return false;
    }
    if (!formData.nom.fr) {
      toast.error('Le nom en français est obligatoire');
      return false;
    }
    if (!formData.prix.valeur || formData.prix.valeur <= 0) {
      toast.error('Le prix doit être supérieur à 0');
      return false;
    }
    return true;
  };

  // ===== SOUMISSION DU FORMULAIRE =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        code: formData.code.toUpperCase().trim(), // Sécurité supplémentaire
        prix: {
          valeur: parseFloat(formData.prix.valeur),
          devise: formData.prix.devise
        },
        laboratoireId: user?.laboratoireId || user?.espaceId,
        createdBy: user?._id
      };

      let response;
      if (id) {
        response = await api.put(`/analyses/${id}`, dataToSend);
      } else {
        response = await api.post('/analyses', dataToSend);
      }

      if (response.data.success) {
        toast.success(id ? 'Analyse modifiée avec succès' : 'Analyse créée avec succès');
        navigate('/analyses');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // ===== AFFICHAGE DU LOADER =====
  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Bouton Dashboard */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors"
              title="Tableau de bord"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
            
            <button
              onClick={() => navigate('/analyses')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>

            <h1 className="text-2xl font-bold text-gray-900">
              {id ? 'Modifier l\'analyse' : 'Nouvelle analyse'}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          
          {/* ===== SECTION IDENTIFICATION ===== */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Identification</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleCodeChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: pH-E, Pb-s, Cl"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 2 caractères
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Sous paramètre (français) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nom.fr"
                  value={formData.nom.fr}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: E.coli, pH eau, ..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sous paramètre (anglais)</label>
                <input
                  type="text"
                  name="nom.en"
                  value={formData.nom.en}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="E.coli, pH eau, ..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sous paramètre (espagnol)</label>
                <input
                  type="text"
                  name="nom.es"
                  value={formData.nom.es}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="E.coli, pH eau, ..."
                />
              </div>
            </div>
          </div>

          {/* ===== SECTION PARAMÈTRES ===== */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Paramètres</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Catégorie</label>
                <select
                  name="categorie"
                  value={formData.categorie}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type d'échantillon</label>
                <select
                  name="typeEchantillon"
                  value={formData.typeEchantillon}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {typeEchantillons.map(te => (
                    <option key={te.value} value={te.value}>{te.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prix <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="prix.valeur"
                    value={formData.prix.valeur}
                    onChange={handleChange}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  <select
                    name="prix.devise"
                    value={formData.prix.devise}
                    onChange={handleChange}
                    className="w-24 px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="EUR">€</option>
                    <option value="USD">$</option>
                    <option value="GNF">FG</option>
                    <option value="XOF">CFA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Délai de rendu (heures)</label>
                <input
                  type="number"
                  name="delaiRendu"
                  value={formData.delaiRendu}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="1"
                  max="720"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unité de mesure</label>
                <input
                  type="text"
                  name="uniteMesure"
                  value={formData.uniteMesure}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ex: mg/L, µS/cm, ..."
                />
              </div>
            </div>
          </div>

          {/* ===== SECTION VALEURS DE RÉFÉRENCE ===== */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Valeurs de référence par type d'échantillon</h2>
            <div className="space-y-6">
              {typesReference.map(type => (
                <div key={type.key} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-800 mb-3">{type.label}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Minimum</label>
                      <input
                        type="number"
                        value={formData.valeursReference[type.key]?.min || ''}
                        onChange={(e) => handleReferenceChange(type.key, 'min', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Min"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Maximum</label>
                      <input
                        type="number"
                        value={formData.valeursReference[type.key]?.max || ''}
                        onChange={(e) => handleReferenceChange(type.key, 'max', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Max"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Texte descriptif</label>
                      <input
                        type="text"
                        value={formData.valeursReference[type.key]?.texte || ''}
                        onChange={(e) => handleReferenceChange(type.key, 'texte', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Ex: < 0.5 mg/L"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== SECTION NORME ISO ===== */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Norme ISO</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Norme ISO</label>
              <input
                type="text"
                value={formData.normeISO}
                onChange={(e) => setFormData(prev => ({ ...prev, normeISO: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: ISO 17025, ISO 5667-1, ISO 9308-1"
              />
              <p className="text-xs text-gray-500 mt-1">Norme de référence utilisée pour cette analyse</p>
            </div>
          </div>

          {/* ===== SECTION INSTRUCTIONS ===== */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Instructions</h2>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Instructions particulières pour cette analyse..."
            />
          </div>

          {/* ===== BOUTONS ===== */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enregistrement...' : (id ? 'Modifier' : 'Créer')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/analyses')}
              className="flex-1 bg-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnalyseForm;