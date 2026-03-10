// ===========================================
// PAGE: AnalyseForm
// RÔLE: Création/édition d'une analyse
// ===========================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';


// ===========================================
// CONSTANTES (à placer après les imports)
// ===========================================

// Liste des catégories d'analyses (extensible facilement)
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
    uniteMesure: '',
    typeEchantillon: 'Sang',
    delaiRendu: 24,
    instructions: ''
  });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('nom.')) {
      const lang = name.split('.')[1];
      setFormData({
        ...formData,
        nom: { ...formData.nom, [lang]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        laboratoireId: user.laboratoireId,
        createdBy: user._id
      };

      if (id) {
        await api.put(`/analyses/${id}`, dataToSend);
        toast.success('Analyse modifiée');
      } else {
        await api.post('/analyses', dataToSend);
        toast.success('Analyse créée');
      }
      navigate('/analyses');
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      toast.error(err.response?.data?.message || 'Erreur sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* Boutons retour */}
          <div className="mb-6 flex items-center gap-4 border-b pb-4">
            <button onClick={() => navigate('/analyses')} className="text-gray-600 hover:text-gray-900">
              ← Retour catalogue
            </button>
            <span>|</span>
            <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
              🏠 Dashboard
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-6">
            {id ? 'Modifier' : 'Nouvelle'} analyse
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium mb-2">Code *</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="ex: NFS001"
              />
            </div>

            {/* Nom multilingue */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nom (FR) *</label>
                <input
                  type="text"
                  name="nom.fr"
                  value={formData.nom.fr}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nom (EN)</label>
                <input
                  type="text"
                  name="nom.en"
                  value={formData.nom.en}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
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
                />
              </div>
            </div>

            {/* Catégorie et prix */}
            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Catégorie *</label>
              <select
                name="categorie"
                value={formData.categorie}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500">
                <option value="">Sélectionnez une catégorie</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prix (€) *</label>
                <input
                  type="number"
                  name="prix.valeur"
                  value={formData.prix.valeur}
                  onChange={(e) => setFormData({
                    ...formData,
                    prix: { ...formData.prix, valeur: parseFloat(e.target.value) }
                  })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Type échantillon et délai */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type échantillon *</label>
                <select
                  name="typeEchantillon"
                  value={formData.typeEchantillon}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option>Sang</option>
                  <option>Urine</option>
                  <option>Selles</option>
                  <option>LCR</option>
                  <option>Prélèvement</option>
                </select>
              </div>
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
                placeholder="Conditions particulières, préparation du patient..."
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
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