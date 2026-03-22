// ===========================================
// PAGE: SuperAdmin Dashboard
// RÔLE: Tableau de bord administrateur système
// VERSION: Corrigée - ESLint ok
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [espaces, setEspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ search: '', statut: '' });

  // ===== Vérifier que l'utilisateur est super admin =====
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      toast.error('Accès non autorisé');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // ===== Charger les statistiques =====
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/super-admin/stats');
      setStats(response.data.stats);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
      toast.error('Erreur chargement des statistiques');
    }
  }, []);

  // ===== Charger la liste des espaces =====
  const fetchEspaces = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        ...(filters.search && { search: filters.search }),
        ...(filters.statut && { statut: filters.statut })
      });
      const response = await api.get(`/super-admin/espaces?${params}`);
      setEspaces(response.data.espaces);
      setPagination({
        page: response.data.pagination.page,
        total: response.data.pagination.total,
        pages: response.data.pagination.pages
      });
    } catch (err) {
      console.error('Erreur chargement espaces:', err);
      toast.error('Erreur chargement des espaces');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters.search, filters.statut]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchEspaces();
  }, [fetchEspaces]);

  // ===== Suspension / activation d'un espace =====
  const handleToggleEspace = async (espaceId, actif, nom) => {
    if (!window.confirm(`Confirmez-vous la ${actif ? 'réactivation' : 'suspension'} de l'espace "${nom}" ?`)) return;
    
    try {
      await api.patch(`/super-admin/espaces/${espaceId}`, { actif });
      toast.success(`Espace ${actif ? 'réactivé' : 'suspendu'} avec succès`);
      fetchEspaces();
      fetchStats();
    } catch (err) {
      console.error('Erreur modification:', err);
      toast.error('Erreur lors de la modification');
    }
  };

  // ===== Modifier l'abonnement =====
  const handleModifierAbonnement = async (espaceId, type, statut) => {
    try {
      await api.patch(`/super-admin/espaces/${espaceId}/abonnement`, { type, statut });
      toast.success('Abonnement modifié');
      fetchEspaces();
      fetchStats();
    } catch (err) {
      console.error('Erreur modification:', err);
      toast.error('Erreur modification');
    }
  };

  const StatCard = ({ title, value, color, icon }) => (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-primary-600">LaboGes</h1>
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Super Admin</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-xs text-gray-500">Administrateur système</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Espaces totaux"
            value={stats?.totalEspaces || 0}
            color="bg-blue-100"
            icon={<span className="text-2xl">🏢</span>}
          />
          <StatCard
            title="Utilisateurs"
            value={stats?.totalUtilisateurs || 0}
            color="bg-green-100"
            icon={<span className="text-2xl">👥</span>}
          />
          <StatCard
            title="Abonnements actifs"
            value={stats?.abonnementsActifs || 0}
            color="bg-emerald-100"
            icon={<span className="text-2xl">✅</span>}
          />
          <StatCard
            title="CA mensuel"
            value={`${stats?.caMensuel || 0} €`}
            color="bg-yellow-100"
            icon={<span className="text-2xl">💰</span>}
          />
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Rechercher un espace..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={filters.statut}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Tous les statuts</option>
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
            </select>
            <button
              onClick={() => setFilters({ search: '', statut: '', page: 1 })}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Liste des espaces */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Espace</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abonnement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {espaces.map((espace) => (
                  <tr key={espace._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{espace.nom}</p>
                        <p className="text-sm text-gray-500">{espace.numeroLicence}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm">{espace.email}</p>
                        <p className="text-sm text-gray-500">{espace.telephone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          espace.abonnement?.type === 'essai' ? 'bg-blue-100 text-blue-700' :
                          espace.abonnement?.type === 'mensuel' ? 'bg-green-100 text-green-700' :
                          espace.abonnement?.type === 'annuel' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {espace.abonnement?.type || 'Aucun'}
                        </span>
                        {espace.abonnement?.joursRestants > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {espace.abonnement.joursRestants} jours restants
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        espace.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {espace.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleEspace(espace._id, !espace.actif, espace.nom)}
                          className={`px-3 py-1 text-xs rounded ${
                            espace.actif ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'
                          }`}
                        >
                          {espace.actif ? 'Suspendre' : 'Activer'}
                        </button>
                        <select
                          onChange={(e) => {
                            const [type, statut] = e.target.value.split('|');
                            handleModifierAbonnement(espace._id, type, statut);
                          }}
                          className="px-2 py-1 text-xs border rounded"
                          defaultValue=""
                        >
                          <option value="" disabled>Modifier abonnement</option>
                          <option value="essai|actif">Essai</option>
                          <option value="mensuel|actif">Mensuel</option>
                          <option value="annuel|actif">Annuel</option>
                          <option value="essai|expire">Expirer</option>
                          <option value="essai|suspendu">Suspendre</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Précédent
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} sur {pagination.pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;