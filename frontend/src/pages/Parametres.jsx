// ===========================================
// PAGE: Parametres
// RÔLE: Configuration de l'espace et de l'utilisateur
// VERSION: Finale avec upload de logo et feedback utilisateur
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
  const [loadingData, setLoadingData] = useState(true);
  const [espace, setEspace] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    deviseParDefaut: 'EUR',
    langueParDefaut: 'fr'
  });

  // ===== CHARGER LES INFOS DE L'ESPACE =====
  useEffect(() => {
    const fetchEspace = async () => {
      try {
        setLoadingData(true);
        const espaceId = user?.laboratoireId || user?.espaceId;
        
        if (!espaceId) {
          toast.error('Espace non identifié');
          return;
        }

        console.log('🔍 Chargement espace ID:', espaceId);
        const response = await api.get(`/espaces/${espaceId}`);
        
        if (response.data.success) {
          const espaceData = response.data.espace;
          console.log('✅ Espace chargé:', espaceData);
          
          setEspace(espaceData);
          setFormData({
            nom: espaceData.nom || '',
            email: espaceData.email || '',
            telephone: espaceData.telephone || '',
            adresse: espaceData.adresse || '',
            deviseParDefaut: espaceData.deviseParDefaut || 'EUR',
            langueParDefaut: espaceData.langueParDefaut || 'fr'
          });
        }
      } catch (error) {
        console.error('❌ Erreur chargement espace:', error);
        toast.error(error.response?.data?.message || 'Erreur chargement des paramètres');
      } finally {
        setLoadingData(false);
      }
    };
    
    if (user) {
      fetchEspace();
    }
  }, [user]);

  // ===== METTRE À JOUR =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const espaceId = user?.laboratoireId || user?.espaceId;
      
      console.log('📤 Mise à jour espace:', espaceId, formData);
      
      const response = await api.put(`/espaces/${espaceId}`, formData);
      
      if (response.data.success) {
        toast.success('✅ Paramètres mis à jour avec succès');
        // Mettre à jour l'état local avec les nouvelles données
        setEspace(response.data.espace);
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
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
    toast.success('Logo mis à jour');
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
      <div className="max-w-3xl mx-auto px-4">
        
        {/* Bouton retour */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour tableau de bord
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-6">Paramètres de l'établissement</h1>

          {/* Uploader de logo */}
          {espace && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Logo de l'entreprise</h2>
              <LogoUploader 
                espace={espace}
                espaceId={espace._id} 
                onLogoChange={handleLogoChange}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Informations espace */}
            <div>
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">
                Informations de l'établissement
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Nom de votre laboratoire / clinique"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ce nom apparaîtra dans les PDF et sur votre profil
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="contact@etablissement.com"
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
                    placeholder="+224 621 00 00 00"
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
                    placeholder="Adresse complète"
                  />
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div>
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">
                Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium mb-1">Langue par défaut</label>
                  <select
                    name="langueParDefaut"
                    value={formData.langueParDefaut}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Aperçu des modifications */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Aperçu des changements</h3>
              <p className="text-xs text-blue-600">
                • Le nom "{formData.nom}" apparaîtra dans l'en-tête des PDF<br />
                • Le logo sera affiché en haut de tous vos documents<br />
                • Les coordonnées seront utilisées dans les factures<br />
                • La devise et la langue seront utilisées par défaut
              </p>
            </div>

            {/* Boutons */}
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
  );
};

export default Parametres;