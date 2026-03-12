// ===========================================
// PAGE: AnalyseForm
// RÔLE: Création/édition d'une analyse (catalogue)
// VERSION: Finale professionnelle
// ===========================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

// ===== DONNÉES DE CONFIGURATION =====
const CATEGORIES = [
  'Hématologie',
  'Biochimie',
  'Hormonologie',
  'Sérologie',
  'Bactériologie',
  'Parasitologie',
  'Virologie',
  'Immunologie',
  'Autre'
];

const CURRENCIES = [
  { code: 'EUR', symbole: '€', nom: 'Euro' },
  { code: 'USD', symbole: '$', nom: 'Dollar américain' },
  { code: 'GNF', symbole: 'FG', nom: 'Franc guinéen' },
  { code: 'XOF', symbole: 'CFA', nom: 'Franc CFA' }
];

const ECHANTILLONS = [
  'Sang',
  'Urine',
  'Selles',
  'LCR',
  'Prélèvement',
  'Autre'
];

const AnalyseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    nom: { fr: '', en: '', es: '' },
    categorie: 'Hématologie',
    prix: { valeur: 0, devise: 'EUR' },
    typeEchantillon: 'Sang',
    instructions: '',
    normes: {
      homme: { min: '', max: '', texte: '' },
      femme: { min: '', max: '', texte: '' },
      enfant: { min: '', max: '', texte: '' }
    },
    delaiRendu: 24,
    uniteMesure: ''
  });

  // ===== CHARGEMENT EN MODE ÉDITION =====
  useEffect(() => {
    if (id) {
      const loadAnalyse = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/analyses/${id}`);
          setFormData(response.data.analyse);
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

  // ===== GESTIONNAIRES D'ÉVÉNEMENTS =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Gestion des champs nom (fr, en, es)
    if (name.startsWith('nom.')) {
      const lang = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        nom: { ...prev.nom, [lang]: value }
      }));
    } 
    // Gestion du prix
    else if (name === 'prix.valeur') {
      setFormData(prev => ({
        ...prev,
        prix: { ...prev.prix, valeur: parseFloat(value) || 0 }
      }));
    }
    else if (name === 'prix.devise') {
      setFormData(prev => ({
        ...prev,
        prix: { ...prev.prix, devise: value }
      }));
    }
    // Gestion des normes
    else if (name.startsWith('normes.')) {
      const [_, categorie, champ] = name.split('.');
      setFormData(prev => ({
        ...prev,
        normes: {
          ...prev.normes,
          [categorie]: {
            ...prev.normes[categorie],
            [champ]: value
          }
        }
      }));
    }
    // Autres champs
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // ===== SOUMISSION =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation rapide
      if (!formData.code || !formData.nom.fr || !formData.categorie || !formData.prix.valeur || !formData.typeEchantillon) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        setLoading(false);
        return;
      }

      const dataToSend = {
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
        normes: formData.normes,
        delaiRendu: Number(formData.delaiRendu) || 24,
        uniteMesure: formData.uniteMesure?.trim() || '-',
        laboratoireId: user?.laboratoireId,
        createdBy: user?._id
      };

      console.log('📤 Envoi:', JSON.stringify(dataToSend, null, 2));

      if (id) {
        await api.put(`/analyses/${id}`, dataToSend);
        toast.success('Analyse modifiée avec succès');
      } else {
        await api.post('/analyses', dataToSend);
        toast.success('Analyse créée avec succès');
      }
      
      navigate('/analyses');
    } catch (err) {
      console.error('❌ Erreur:', err);
      
      if (err.response?.status === 409) {
        toast.error('Ce code existe déjà');
      } else if (err.response?.status === 400) {
        toast.error(err.response.data.message || 'Données invalides');
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
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
            <button 
              onClick={() => navigate('/analyses')} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              ← Retour catalogue
            </button>
            <span className="text-gray-300">|</span>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              🏠 Dashboard
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-6">
            {id ? 'Modifier' : 'Nouvelle'} analyse
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECTION 1 : IDENTIFICATION */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-4 text-primary-600">Identification</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Ex: GLY001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nom.fr"
                    value={formData.nom.fr}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Nom en français"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom (EN)</label>
                  <input
                    type="text"
                    name="nom.en"
                    value={formData.nom.en}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Optionnel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nom (ES)</label>
                  <input
                    type="text"
                    name="nom.es"
                    value={formData.nom.es}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Optionnel"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2 : CARACTÉRISTIQUES */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-4 text-primary-600">Caractéristiques</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="categorie"
                    value={formData.categorie}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type échantillon <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="typeEchantillon"
                    value={formData.typeEchantillon}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {ECHANTILLONS.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3 : TARIFICATION */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-4 text-primary-600">Tarification</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Prix unitaire <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="prix.valeur"
                    value={formData.prix.valeur}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Devise</label>
                  <select
                    name="prix.devise"
                    value={formData.prix.devise}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.nom} ({c.symbole})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 4 : NORMES (OPTIONNEL) */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-4 text-primary-600">Normes (optionnel)</h2>
              
              <div className="space-y-4">
                {/* Homme */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Homme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      name="normes.homme.min"
                      value={formData.normes.homme.min}
                      onChange={handleChange}
                      placeholder="Min"
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      name="normes.homme.max"
                      value={formData.normes.homme.max}
                      onChange={handleChange}
                      placeholder="Max"
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      name="normes.homme.texte"
                      value={formData.normes.homme.texte}
                      onChange={handleChange}
                      placeholder="Texte"
                      className="px-3 py-2 border rounded"
                    />
                  </div>
                </div>

                {/* Femme */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Femme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      name="normes.femme.min"
                      value={formData.normes.femme.min}
                      onChange={handleChange}
                      placeholder="Min"
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      name="normes.femme.max"
                      value={formData.normes.femme.max}
                      onChange={handleChange}
                      placeholder="Max"
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      name="normes.femme.texte"
                      value={formData.normes.femme.texte}
                      onChange={handleChange}
                      placeholder="Texte"
                      className="px-3 py-2 border rounded"
                    />
                  </div>
                </div>

                {/* Enfant */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Enfant</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      name="normes.enfant.min"
                      value={formData.normes.enfant.min}
                      onChange={handleChange}
                      placeholder="Min"
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      name="normes.enfant.max"
                      value={formData.normes.enfant.max}
                      onChange={handleChange}
                      placeholder="Max"
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      name="normes.enfant.texte"
                      value={formData.normes.enfant.texte}
                      onChange={handleChange}
                      placeholder="Texte"
                      className="px-3 py-2 border rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 5 : INFORMATIONS COMPLÉMENTAIRES */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-primary-600">Informations complémentaires</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Délai (heures)</label>
                  <input
                    type="number"
                    name="delaiRendu"
                    value={formData.delaiRendu}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Unité de mesure</label>
                  <input
                    type="text"
                    name="uniteMesure"
                    value={formData.uniteMesure}
                    onChange={handleChange}
                    placeholder="ex: g/L, mmol/L"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Instructions</label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Conditions particulières, préparation du patient..."
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Enregistrement...' : (id ? 'Modifier' : 'Créer')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/analyses')}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
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