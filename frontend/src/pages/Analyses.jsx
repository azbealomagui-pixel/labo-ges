// ===========================================
// PAGE: Analyses
// RÔLE: Liste du catalogue d'analyses
// ===========================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconAdd, IconEdit, IconDelete, IconSearch } from '../assets';

const Analyses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await api.get(`/analyses/labo/${user.laboratoireId}`);
      setAnalyses(response.data.analyses || []);
    } catch (err) {
      console.error('Erreur chargement:', err);
      toast.error('Erreur chargement catalogue');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette analyse ?')) return;
    try {
      await api.delete(`/analyses/${id}`);
      toast.success('Analyse supprimée');
      fetchAnalyses();
    } catch (err) {
      console.error('Erreur suppression:', err);
      toast.error('Erreur suppression');
    }
  };

  const filteredAnalyses = analyses.filter(a =>
    a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.nom?.fr?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Bouton retour */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Retour tableau de bord
          </button>
        </div>

        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Catalogue d'analyses</h1>
          <button
            onClick={() => navigate('/analyses/new')}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <img src={IconAdd} alt="" className="w-5 h-5" />
            Nouvelle analyse
          </button>
        </div>

        {/* Recherche */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
              <img src={IconSearch} alt="" className="w-5 h-5 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Code</th>
                <th className="px-6 py-3 text-left">Nom</th>
                <th className="px-6 py-3 text-left">Catégorie</th>
                <th className="px-6 py-3 text-right">Prix</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnalyses.map(a => (
                <tr key={a._id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">{a.code}</td>
                  <td className="px-6 py-4">{a.nom?.fr || a.nom}</td>
                  <td className="px-6 py-4">{a.categorie}</td>
                  <td className="px-6 py-4 text-right">
                    {a.prix?.valeur} {a.prix?.devise || 'EUR'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => navigate(`/analyses/${a._id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <img src={IconEdit} alt="Modifier" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(a._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <img src={IconDelete} alt="Supprimer" className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analyses;