// ===========================================
// PAGE: FichesAnalyses
// RÔLE: Lister toutes les fiches d'analyses créées
// AVEC: Accès direct au PV final et suppression
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconSearch } from '../assets';

const FichesAnalyses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fiches, setFiches] = useState([]);
  const [filteredFiches, setFilteredFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    brouillon: 0,
    valide: 0
  });

  // ===== ÉTAT POUR LA MODALE DE SUPPRESSION =====
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    ficheId: null,
    patientNom: ''
  });

  // ===== CHARGEMENT DES FICHES =====
  const fetchFiches = useCallback(async () => {
    try {
      setLoading(true);
      const espaceId = user?.laboratoireId || user?.espaceId;
      
      if (!espaceId) {
        toast.error('Configuration espace invalide');
        return;
      }

      const response = await api.get(`/fiches-analyses/labo/${espaceId}`);
      const fichesData = response.data.fiches || [];
      
      setFiches(fichesData);
      setFilteredFiches(fichesData);
      
      setStats({
        total: fichesData.length,
        brouillon: fichesData.filter(f => f.statut === 'brouillon').length,
        valide: fichesData.filter(f => f.statut === 'valide').length
      });
      
    } catch (error) {
      console.error('❌ Erreur chargement fiches:', error);
      toast.error('Impossible de charger la liste des fiches');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFiches();
  }, [fetchFiches]);

  // ===== RECHERCHE INSTANTANÉE =====
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        const filtered = fiches.filter(f => 
          f.patientId?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.patientId?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f._id.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredFiches(filtered);
      } else {
        setFilteredFiches(fiches);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, fiches]);

  // ===== FORMATER LA DATE =====
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ===== OUVRIR LA MODALE =====
  const openDeleteModal = (id, nom, prenom) => {
    setDeleteModal({
      isOpen: true,
      ficheId: id,
      patientNom: `${prenom} ${nom}`
    });
  };

  // ===== CONFIRMER LA SUPPRESSION =====
  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/fiches-analyses/${deleteModal.ficheId}`);
      toast.success(`🗑️ Fiche de ${deleteModal.patientNom} supprimée`);
      setDeleteModal({ isOpen: false, ficheId: null, patientNom: '' });
      fetchFiches(); // Recharger la liste
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // ===== AFFICHAGE DU LOADER =====
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
        
        {/* ===== BOUTON RETOUR ===== */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour au tableau de bord
          </button>
        </div>

        {/* ===== EN-TÊTE ===== */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Fiches d'analyses
          </h1>
          
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Brouillons</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.brouillon}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Validés</p>
              <p className="text-2xl font-bold text-green-600">{stats.valide}</p>
            </div>
          </div>
        </div>

        {/* ===== BARRE DE RECHERCHE ===== */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Rechercher par patient ou ID de fiche..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <img src={IconSearch} alt="" className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" />
          </div>
          {searchTerm.length >= 2 && (
            <p className="text-sm text-gray-500 mt-2">
              {filteredFiches.length} résultat(s)
            </p>
          )}
        </div>

        {/* ===== LISTE DES FICHES ===== */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredFiches.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune fiche d'analyse
              </h3>
              <p className="text-gray-500 mb-6">
                Commencez par créer une fiche depuis la page patients.
              </p>
              <button
                onClick={() => navigate('/patients')}
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
              >
                Voir les patients
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date création</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Analyses</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiches.map((fiche) => (
                    <tr key={fiche._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {fiche.patientId?.nom} {fiche.patientId?.prenom}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {fiche._id.slice(-6)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(fiche.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {fiche.lignes?.length || 0} analyse(s)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {fiche.totalGeneral?.toLocaleString()} {fiche.devise || 'EUR'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          fiche.statut === 'valide' 
                            ? 'bg-green-100 text-green-800'
                            : fiche.statut === 'brouillon'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {fiche.statut === 'valide' ? 'Validé' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          {fiche.statut !== 'valide' && (
                            <button
                              onClick={() => navigate(`/rapport/${fiche._id}`)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Compléter le PV"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/rapport/${fiche._id}?view=pdf`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Voir le PV"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </button>
                          
                          {/* BOUTON SUPPRIMER */}
                          <button
                            onClick={() => openDeleteModal(fiche._id, fiche.patientId?.nom, fiche.patientId?.prenom)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer la fiche"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== MODALE DE CONFIRMATION (EN DEHORS DU TABLEAU) ===== */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <h2 className="text-xl font-bold text-gray-900">Confirmation</h2>
              </div>
              
              <p className="text-gray-700 mb-6">
                Êtes-vous sûr de vouloir supprimer la fiche de <span className="font-semibold">{deleteModal.patientNom}</span> ?
                <br />
                <span className="text-sm text-red-500 mt-2 inline-block">⚠️ Cette action est irréversible.</span>
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Oui, supprimer
                </button>
                <button
                  onClick={() => setDeleteModal({ isOpen: false, ficheId: null, patientNom: '' })}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FichesAnalyses;