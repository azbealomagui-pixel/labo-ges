// ===========================================
// PAGE: Parametres
// RÔLE: Configuration de l'espace et de l'utilisateur
// VERSION: Finale avec upload de logo
// ===========================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import LogoUploader from '../components/LogoUploader';

const Parametres = () => {
  const navigate = useNavigate();
  const { user, espace: espaceFromAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [espace, setEspace] = useState(espaceFromAuth);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    deviseParDefaut: 'EUR',
    langueParDefaut: 'fr'
  });

  useEffect(() => {
    const fetchEspace = async () => {
      try {
        setLoadingData(true);
        const espaceId = user?.laboratoireId || user?.espaceId;
        if (!espaceId) {
          toast.error('Espace non identifié');
          return;
        }

        const response = await api.get(`/espaces/${espaceId}`);
        if (response.data.success) {
          const espaceData = response.data.espace;
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
        toast.error('Erreur chargement des paramètres');
      } finally {
        setLoadingData(false);
      }
    };

    if (user && !espaceFromAuth) {
      fetchEspace();
    } else if (espaceFromAuth) {
      setEspace(espaceFromAuth);
      setFormData({
        nom: espaceFromAuth.nom || '',
        email: espaceFromAuth.email || '',
        telephone: espaceFromAuth.telephone || '',
        adresse: espaceFromAuth.adresse || '',
        deviseParDefaut: espaceFromAuth.deviseParDefaut || 'EUR',
        langueParDefaut: espaceFromAuth.langueParDefaut || 'fr'
      });
      setLoadingData(false);
    }
  }, [user, espaceFromAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const espaceId = user?.laboratoireId || user?.espaceId;
      const response = await api.put(`/espaces/${espaceId}`, formData);
      if (response.data.success) {
        toast.success('✅ Paramètres mis à jour');
        setEspace(response.data.espace);
      }
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
    toast.success('Logo mis à jour');
  };

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
        <button onClick={() => navigate('/dashboard')} className="mb-4 text-gray-600 hover:text-gray-900">
          ← Retour tableau de bord
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-6">Paramètres de l'établissement</h1>

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
            <div>
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Informations de l'établissement</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Nom de votre laboratoire / clinique"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ce nom apparaîtra dans les PDF et sur votre profil</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Adresse</label>
                  <input
                    type="text"
                    name="adresse"
                    value={formData.adresse}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Configuration</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Devise</label>
                  <select
                    name="deviseParDefaut"
                    value={formData.deviseParDefaut}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">Dollar ($)</option>
                    <option value="GNF">Franc Guinéen (FG)</option>
                    <option value="XOF">Franc CFA (CFA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Langue</label>
                  <select
                    name="langueParDefaut"
                    value={formData.langueParDefaut}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
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

export default Parametres;