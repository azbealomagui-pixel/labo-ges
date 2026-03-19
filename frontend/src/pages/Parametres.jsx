// ===========================================
// PAGE: Parametres
// RÔLE: Configuration de l'espace et upload de logo
// VERSION: Corrigée avec passage correct des props
// ===========================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import LogoUploader from '../components/LogoUploader';

const Parametres = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [espace, setEspace] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    deviseParDefaut: 'EUR'
  });

  // ===== CHARGER LES INFOS DE L'ESPACE =====
  useEffect(() => {
    const fetchEspace = async () => {
      try {
        const espaceId = user?.laboratoireId || user?.espaceId;
        const response = await api.get(`/espaces/${espaceId}`);
        setEspace(response.data.espace);
        setFormData({
          nom: response.data.espace.nom || '',
          email: response.data.espace.email || '',
          telephone: response.data.espace.telephone || '',
          adresse: response.data.espace.adresse || '',
          deviseParDefaut: response.data.espace.deviseParDefaut || 'EUR'
        });
      } catch (error) {
        console.error('❌ Erreur chargement espace:', error);
        toast.error('Erreur chargement des paramètres');
      }
    };
    fetchEspace();
  }, [user]);

  // ===== METTRE À JOUR =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const espaceId = user?.laboratoireId || user?.espaceId;
      await api.put(`/espaces/${espaceId}`, formData);
      toast.success('✅ Paramètres mis à jour');
    } catch (error) {
      console.error('❌ Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (logoUrl) => {
    setEspace(prev => ({ ...prev, logo: logoUrl }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        
        {/* Bouton retour */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour tableau de bord
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Uploader de logo */}
          {espace && (
            <LogoUploader 
              espace={espace}
              espaceId={espace._id} 
              onLogoChange={handleLogoChange}
            />
          )}

          {/* Formulaire paramètres */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <h2 className="text-lg font-semibold mb-4">Informations de l'espace</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom</label>
                    <input
                      type="text"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone</label>
                    <input
                      type="tel"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Adresse</label>
                    <input
                      type="text"
                      name="adresse"
                      value={formData.adresse}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Configuration</h2>
                <div>
                  <label className="block text-sm font-medium mb-1">Devise par défaut</label>
                  <select
                    name="deviseParDefaut"
                    value={formData.deviseParDefaut}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">Dollar ($)</option>
                    <option value="GNF">Franc Guinéen (FG)</option>
                    <option value="XOF">Franc CFA (CFA)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Parametres;