// ===========================================
// PAGE: Dashboard
// RÔLE: Tableau de bord avec statistiques réelles
// VERSION: Finale avec affichage entreprise et badge non lus
// MODIFICATION: Ajout badge compteur messages non lus
// ===========================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import ActivityChart from '../components/dashboard/ActivityChart';
import Notifications from '../components/Notifications';
import { useSocket } from '../context/SocketContext';

// Imports des icônes
import {
  IconPatients,
  IconAnalyses,
  IconDevis,
  IconFinance,
  DashboardIllus,
  IconAdd
} from '../assets';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { nonLus } = useSocket();
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [stats, setStats] = useState({
    patients: 0,
    analyses: 0,
    devis: 0,
    ca: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  const [entrepriseNom, setEntrepriseNom] = useState('');

  // ===== CHARGEMENT DES DONNÉES =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const espaceId = user?.laboratoireId || user?.espaceId;
        
        // Compter les patients
        const patientsRes = await api.get(`/patients/labo/${espaceId}`);
        // Compter les analyses
        const analysesRes = await api.get(`/analyses/labo/${espaceId}`);
        // Compter les devis
        const devisRes = await api.get(`/devis/labo/${espaceId}`);
        
        // Récupérer les stats rapides (si disponible)
        let caMensuel = 0;
        try {
          const quickRes = await api.get(`/stats/labo/${espaceId}/quick`);
          caMensuel = quickRes.data.quickStats?.ca || 0;
        } catch (error) {
          console.log('Stats rapides non disponibles:', error.message);
        }

        setStats({
          patients: patientsRes.data.count || patientsRes.data.patients?.length || 0,
          analyses: analysesRes.data.count || analysesRes.data.analyses?.length || 0,
          devis: devisRes.data.count || devisRes.data.devis?.length || 0,
          ca: caMensuel
        });

        // Données pour le graphique (évolution mensuelle)
        try {
          const evoRes = await api.get(`/stats/labo/${espaceId}?period=6months`);
          if (evoRes.data.evolution && evoRes.data.evolution.length > 0) {
            setChartData({
              labels: evoRes.data.evolution.map(item => item.month || 'Mois'),
              datasets: [
                {
                  label: 'Clients',
                  data: evoRes.data.evolution.map(item => item.patients || 0),
                  backgroundColor: 'rgba(59, 130, 246, 0.5)',
                  borderColor: 'rgb(59, 130, 246)',
                  borderWidth: 1,
                },
                {
                  label: 'Analyses',
                  data: evoRes.data.evolution.map(item => item.analyses || 0),
                  backgroundColor: 'rgba(34, 197, 94, 0.5)',
                  borderColor: 'rgb(34, 197, 94)',
                  borderWidth: 1,
                },
              ],
            });
          }
        } catch (error) {
          console.error('Erreur chargement évolution:', error.message);
        }

      } catch (error) {
        console.error('Erreur chargement données:', error.message);
        toast.error('Erreur chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  // ===== CHARGEMENT DES INFOS DE L'ESPACE =====
  useEffect(() => {
    const fetchEspace = async () => {
      try {
        const espaceId = user?.laboratoireId || user?.espaceId;
        const response = await api.get(`/espaces/${espaceId}`);
        setEntrepriseNom(response.data.espace.nom);
      } catch (error) {
        console.error('Erreur chargement espace:', error);
      }
    };
    if (user) fetchEspace();
  }, [user]);

  // ===== CARTE DE STATISTIQUE RÉUTILISABLE =====
  const StatCard = ({ title, value, icon: Icon, bgColor }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`${bgColor} p-4 rounded-lg`}>
          <img src={Icon} alt={title} className="w-8 h-8" />
        </div>
      </div>
    </div>
  );

  // ===== AFFICHAGE DU LOADER =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ===== EN-TÊTE ===== */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-600">LaboGes</h1>
            
            <div className="flex items-center gap-4">
              
              {/* Notifications */}
              <Notifications />
              
              {/* ===== MENU D'ADMINISTRATION ===== */}
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Menu administration"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {showAdminMenu && (
                  <>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Administration
                        </div>
                        
                        <button
                          onClick={() => {
                            navigate('/membres');
                            setShowAdminMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <span className="text-lg">👥</span>
                          Gestion des membres
                        </button>
                        
                        <button
                          onClick={() => {
                            navigate('/abonnement');
                            setShowAdminMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <span className="text-lg">💰</span>
                          Mon abonnement
                        </button>
                        
                        <button
                          onClick={() => {
                            navigate('/messages');
                            setShowAdminMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <span className="text-lg">💬</span>
                          Messagerie
                          {nonLus > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                              {nonLus}
                            </span>
                          )}
                        </button>

                        <div className="border-t border-gray-100 my-1"></div>
                        
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Outils
                        </div>
                        
                        <button
                          onClick={() => {
                            navigate('/parametres');
                            setShowAdminMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <span className="text-lg">⚙️</span>
                          Paramètres LaboGes
                        </button>
                      </div>
                    </div>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowAdminMenu(false)}
                    />
                  </>
                )}
              </div>

              {/* Informations utilisateur avec badge messages non lus */}
              <div className="text-right relative">
                <p className="text-sm font-medium text-gray-900">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'manager_labo' ? 'Directeur' : 
                   user?.role === 'admin' ? 'Administrateur' :
                   user?.role === 'biologiste' ? 'Biologiste' :
                   user?.role === 'technicien' ? 'Technicien' :
                   user?.role === 'secretaire' ? 'Secrétaire' :
                   user?.role === 'comptable' ? 'Comptable' : user?.role}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  à {entrepriseNom || 'LaboGes'}
                </p>
                {/* Badge messages non lus */}
                {nonLus > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                    {nonLus > 9 ? '9+' : nonLus}
                  </div>
                )}
              </div>

              {/* Bouton déconnexion */}
              <button
                onClick={logout}
                className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== CONTENU PRINCIPAL ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
       {/* ===== MESSAGE DE BIENVENUE ===== */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-6">
            <img src={DashboardIllus} alt="Dashboard" className="h-24 w-24" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {(() => {
                  const heure = new Date().getHours();
                  if (heure < 12) {
                    return `Bonjour, ${user?.prenom} !`;
                  } else if (heure >= 13) {
                    return `Bonsoir, ${user?.prenom} !`;
                  } else {
                    return `Bon appétit, ${user?.prenom} !`; // Entre 12h00 et 12h59
                  }
                })()}
              </h2>
              <p className="text-gray-600">
                Voici le résumé de l'activité de votre laboratoire.
              </p>
            </div>
          </div>
        </div>

        {/* ===== CARTES STATISTIQUES ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Clients"
            value={stats.patients}
            icon={IconPatients}
            bgColor="bg-blue-100"
          />
          <StatCard
            title="Analyses"
            value={stats.analyses}
            icon={IconAnalyses}
            bgColor="bg-green-100"
          />
          <StatCard
            title="Devis"
            value={stats.devis}
            icon={IconDevis}
            bgColor="bg-purple-100"
          />
          <StatCard
            title="CA du mois"
            value={`${stats.ca} ${user?.devise || 'EUR'}`}
            icon={IconFinance}
            bgColor="bg-yellow-100"
          />
        </div>

        {/* ===== GRAPHIQUE D'ACTIVITÉ ===== */}
        {chartData.labels.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Évolution sur 6 mois
            </h3>
            <ActivityChart data={chartData} />
          </div>
        )}

        {/* ===== ACTIONS RAPIDES ===== */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Bouton Nouveau patient */}
          <button
            onClick={() => navigate('/patients/new')}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left group"
          >
            <img src={IconAdd} alt="Ajouter" className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
              Nouveau Client
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Enregistrer un Client
            </p>
          </button>
          
          {/* Bouton Nouvelle analyse */}
          <button
            onClick={() => navigate('/analyses/new')}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left group"
          >
            <img src={IconAnalyses} alt="Ajouter" className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
              Nouvelle analyse
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Ajouter au catalogue
            </p>
          </button>
          
          {/* Bouton Fiche d'analyses patient */}
          <button
            onClick={() => navigate('/fiche-analyses/new')}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left group border-2 border-primary-100 hover:border-primary-300"
          >
            <svg className="w-12 h-12 mb-4 text-primary-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
              Fiche d'analyses
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Analyses client
            </p>
          </button>
          
          {/* Bouton Nouveau devis */}
          <button
            onClick={() => navigate('/devis/new')}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left group"
          >
            <img src={IconDevis} alt="Ajouter" className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
              Nouveau devis
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Créer un devis
            </p>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;