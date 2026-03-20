// ===========================================
// PAGE: AnalyseForm
// RÔLE: Création/édition d'une analyse (catalogue)
// VERSION: Complète avec unité et valeurs de référence
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
    uniteMesure: '',
    valeursReference: {
      homme: { min: '', max: '', texte: '' },
      femme: { min: '', max: '', texte: '' },
      enfant: { min: '', max: '', texte: '' }
    },
    normesMedicales: { loinc: '', snomed: '', iso15189: '', autres: '' },
    delaiRendu: 24
  });

  // ===== CHARGEMENT EN MODE ÉDITION =====
  useEffect(() => {
    if (id) {
      const loadAnalyse = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/analyses/${id}`);

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
              uniteMesure: analyseData.uniteMesure || '',
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
              delaiRendu: analyseData.delaiRendu || 24
            });
            toast.success('✅ Analyse chargée');
          } else {
            toast.error('Analyse non trouvée');
            navigate('/analyses');
          }
        } catch (err) {
          console.error('❌ Erreur chargement:', err);
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

  // ===== GESTIONNAIRE DE CHANGEMENT =====
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
      uniteMesure: formData.uniteMesure?.trim() || '',
      valeursReference: valeursReferenceNettoyees,
      normesMedicales: normesMedicalesNettoyees,
      delaiRendu: Number(formData.delaiRendu) || 24,
      laboratoireId: user?.laboratoireId || user?.espaceId,
      createdBy: user?._id
    };
  };

  // ===== SOUMISSION =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?._id) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setLoading(true);

    try {
      const donneesNettoyees = nettoyerDonnees();
      const dataToSend = {
        ...donneesNettoyees,
        laboratoireId: user?.laboratoireId || user?.espaceId,
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
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
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
                className={`w-full px-4 py-2 border rounded-lg ${errors.code ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
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
                className={`w-full px-4 py-2 border rounded-lg ${errors['nom.fr'] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
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
                  className={`w-full px-4 py-2 border rounded-lg ${errors['prix.valeur'] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
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

            {/* Unité de mesure */}
            <div>
              <label className="block text-sm font-medium mb-2">Unité de mesure</label>
              <input
                type="text"
                name="uniteMesure"
                value={formData.uniteMesure}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Ex: mg/dL, g/L, UI/L, mmol/L"
              />
              <p className="text-xs text-gray-500 mt-1">Laissez vide si non applicable</p>
            </div>

            {/* Délai de rendu */}
            <div>
              <label className="block text-sm font-medium mb-2">Délai de rendu (heures)</label>
              <input
                type="number"
                name="delaiRendu"
                value={formData.delaiRendu}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg"
                min="1"
                max="720"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium mb-2">Instructions</label>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Instructions particulières pour cette analyse..."
              />
            </div>

            {/* ===== VALEURS DE RÉFÉRENCE ===== */}
            <div className="border-t pt-4 mt-4">
              <h2 className="text-lg font-semibold mb-4">Valeurs de référence</h2>
              <p className="text-sm text-gray-500 mb-4">Ces valeurs seront utilisées pour interpréter automatiquement les résultats.</p>

              {/* Homme */}
              <div className="border rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-3 text-blue-700">👨 Homme</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valeursReference.homme.min"
                      value={formData.valeursReference.homme.min}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valeursReference.homme.max"
                      value={formData.valeursReference.homme.max}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Texte (optionnel)</label>
                    <input
                      type="text"
                      name="valeursReference.homme.texte"
                      value={formData.valeursReference.homme.texte}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Ex: < 5.0, > 10.0"
                    />
                  </div>
                </div>
              </div>

              {/* Femme */}
              <div className="border rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-3 text-pink-600">👩 Femme</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valeursReference.femme.min"
                      value={formData.valeursReference.femme.min}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valeursReference.femme.max"
                      value={formData.valeursReference.femme.max}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Texte (optionnel)</label>
                    <input
                      type="text"
                      name="valeursReference.femme.texte"
                      value={formData.valeursReference.femme.texte}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Ex: < 5.0, > 10.0"
                    />
                  </div>
                </div>
              </div>

              {/* Enfant */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3 text-green-700">🧒 Enfant</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valeursReference.enfant.min"
                      value={formData.valeursReference.enfant.min}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valeursReference.enfant.max"
                      value={formData.valeursReference.enfant.max}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Texte (optionnel)</label>
                    <input
                      type="text"
                      name="valeursReference.enfant.texte"
                      value={formData.valeursReference.enfant.texte}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Ex: < 5.0, > 10.0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ===== NORMES MÉDICALES ===== */}
            <div className="border-t pt-4 mt-4">
              <h2 className="text-lg font-semibold mb-4">Normes médicales internationales</h2>
              <p className="text-sm text-gray-500 mb-4">Codes pour l'interopérabilité (optionnel)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">LOINC</label>
                  <input
                    type="text"
                    name="normesMedicales.loinc"
                    value={formData.normesMedicales.loinc}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: 12345-6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SNOMED CT</label>
                  <input
                    type="text"
                    name="normesMedicales.snomed"
                    value={formData.normesMedicales.snomed}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: 123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ISO 15189</label>
                  <input
                    type="text"
                    name="normesMedicales.iso15189"
                    value={formData.normesMedicales.iso15189}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: LAB-123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Autres</label>
                  <input
                    type="text"
                    name="normesMedicales.autres"
                    value={formData.normesMedicales.autres}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Autres références"
                  />
                </div>
              </div>
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