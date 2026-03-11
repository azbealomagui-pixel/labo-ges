// ===========================================
// PAGE: AnalyseForm
// RÔLE: Création/édition d'une analyse
// AVEC: Sélecteur de devise et bouton retour corrigé
// ===========================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import AnalyseCodeField from '../components/analyses/AnalyseCodeField';

// Liste des catégories et devises
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
  { code: 'XOF', symbole: 'CFA', nom: 'Franc CFA' },
  { code: 'GBP', symbole: '£', nom: 'Livre sterling' },
  { code: 'MAD', symbole: 'DH', nom: 'Dirham marocain' },
  { code: 'DZD', symbole: 'DA', nom: 'Dinar algérien' },
  { code: 'TND', symbole: 'DT', nom: 'Dinar tunisien' }
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
    uniteMesure: '-',
    typeEchantillon: 'Sang',
    delaiRendu: 24,
    instructions: ''
  });

  // État pour gérer le conflit de doublon
  const [duplicateError, setDuplicateError] = useState(null);

  // Charger les données en mode édition
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

  // Gestionnaire quand une analyse est trouvée par code
  const handleAnalyseFound = (analyse) => {
    setFormData(prev => ({
      ...prev,
      code: analyse.code || prev.code,
      nom: analyse.nom || { fr: '', en: '', es: '' },
      prix: analyse.prix || { valeur: 0, devise: 'EUR' },
      categorie: analyse.categorie || prev.categorie,
      typeEchantillon: analyse.typeEchantillon || prev.typeEchantillon,
      delaiRendu: analyse.delaiRendu || prev.delaiRendu,
      instructions: analyse.instructions || prev.instructions
    }));
    
    toast.info(`Analyse trouvée : ${analyse.nom?.fr || 'Analyse'}`);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('nom.')) {
      const lang = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        nom: { ...prev.nom, [lang]: value }
      }));
    } 
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
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Réinitialiser l'erreur de doublon quand l'utilisateur modifie
    setDuplicateError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDuplicateError(null);

    // Déclaration de dataToSend en dehors du try pour qu'il soit accessible partout
    let dataToSend;

    try {
      dataToSend = {
        ...formData,
        uniteMesure: formData.uniteMesure || '-',
        laboratoireId: user?.laboratoireId,
        createdBy: user?._id
      };

      console.log('📤 Données envoyées:', JSON.stringify(dataToSend, null, 2));

      if (id) {
        await api.put(`/analyses/${id}`, dataToSend);
        toast.success('Analyse modifiée avec succès');
        navigate('/analyses');
      } else {
        await api.post('/analyses', dataToSend);
        toast.success('Analyse créée avec succès');
        navigate('/analyses');
      }
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      
      // Gestion spéciale pour les doublons (409)
      if (err.response?.status === 409) {
        const existing = err.response.data.existingAnalyse;
        setDuplicateError({
          message: err.response.data.message,
          existing: existing
        });
        
        // Demander confirmation à l'utilisateur
        if (window.confirm(
          `⚠️ Une analyse identique existe déjà !\n\n` +
          `Code: ${existing.code}\n` +
          `Nom: ${existing.nom}\n` +
          `Créée le: ${new Date(existing.dateCreation).toLocaleDateString()}\n\n` +
          `Voulez-vous quand même créer cette analyse ?`
        )) {
          // L'utilisateur confirme, on force la création en ignorant la vérification
          try {
            await api.post('/analyses', dataToSend, {
              headers: { 'X-Ignore-Duplicate': 'true' }
            });
            toast.success('Analyse créée avec succès (malgré le doublon)');
            navigate('/analyses');
          } catch (forceError) {
            console.error('❌ Erreur création forcée:', forceError);
            toast.error('Erreur lors de la création forcée');
          }
        }
      } else {
        toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
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
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* Navigation - BOUTON RETOUR CORRIGÉ */}
          <div className="mb-6 flex items-center gap-4 border-b pb-4">
            <button 
              onClick={() => navigate('/analyses')} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour catalogue
            </button>
            <span className="text-gray-300">|</span>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-6">
            {id ? 'Modifier' : 'Nouvelle'} analyse
          </h1>

          {/* Message d'erreur de doublon */}
          {duplicateError && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-medium">⚠️ {duplicateError.message}</p>
              {duplicateError.existing && (
                <p className="text-sm text-yellow-600 mt-1">
                  Analyse existante créée le {new Date(duplicateError.existing.dateCreation).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Code avec autocomplétion */}
            <AnalyseCodeField
              value={formData.code}
              onChange={handleChange}
              onAnalyseFound={handleAnalyseFound}
              required={true}
            />

            {/* Noms multilingues */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nom (FR) <span className="text-red-500">*</span>
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
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nom (EN)
                </label>
                <input
                  type="text"
                  name="nom.en"
                  value={formData.nom.en}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-50"
                  placeholder="Nom en anglais (optionnel)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nom (ES)
                </label>
                <input
                  type="text"
                  name="nom.es"
                  value={formData.nom.es}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-50"
                  placeholder="Nom en espagnol (optionnel)"
                />
              </div>
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select
                name="categorie"
                value={formData.categorie}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Prix et Devise */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Prix <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="prix.valeur"
                  value={formData.prix.valeur}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Montant"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Devise <span className="text-red-500">*</span>
                </label>
                <select
                  name="prix.devise"
                  value={formData.prix.devise}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {CURRENCIES.map(dev => (
                    <option key={dev.code} value={dev.code}>
                      {dev.nom} ({dev.symbole})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type échantillon */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Type d'échantillon <span className="text-red-500">*</span>
              </label>
              <select
                name="typeEchantillon"
                value={formData.typeEchantillon}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="Sang">Sang</option>
                <option value="Urine">Urine</option>
                <option value="Selles">Selles</option>
                <option value="LCR">LCR</option>
                <option value="Prélèvement">Prélèvement</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            {/* Délai et Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Délai de rendu (heures)
                </label>
                <input
                  type="number"
                  name="delaiRendu"
                  value={formData.delaiRendu}
                  onChange={handleChange}
                  min="1"
                  max="720"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Unité de mesure
                </label>
                <input
                  type="text"
                  name="uniteMesure"
                  value={formData.uniteMesure}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="ex: g/L, mmol/L"
                />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Instructions
              </label>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Conditions particulières, préparation du patient..."
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'Enregistrement...' : (id ? 'Modifier' : 'Créer')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/analyses')}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
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