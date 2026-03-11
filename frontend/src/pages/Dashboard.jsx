// ===========================================
// PAGE: Dashboard
// RÔLE: Tableau de bord avec statistiques réelles
// ===========================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import ActivityChart from '../components/dashboard/ActivityChart';

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
  const [stats, setStats] = useState({
    patients: 0,
    analyses: 0,
    devis: 0,
    ca: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({
    labels: [], datasets: []});

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Compter les patients
        const patientsRes = await api.get(`/patients/labo/${user.laboratoireId}`);
        // 2. Compter les analyses
        const analysesRes = await api.get(`/analyses/labo/${user.laboratoireId}`);
        // 3. Compter les devis
        const devisRes = await api.get(`/devis/labo/${user.laboratoireId}`);
        
        // 4. Récupérer les stats rapides (si disponible)
        let caMensuel = 0;
        try {
          const quickRes = await api.get(`/stats/labo/${user.laboratoireId}/quick`);
          caMensuel = quickRes.data.quickStats?.ca || 0;
        } catch (err) {
          console.log('Stats rapides non disponibles');
          console.debug('Détail technique (ignoré):', err.message);
        }

        setStats({
          patients: patientsRes.data.count || patientsRes.data.patients?.length || 0,
          analyses: analysesRes.data.count || analysesRes.data.analyses?.length || 0,
          devis: devisRes.data.count || devisRes.data.devis?.length || 0,
          ca: caMensuel
        });

        // 5. Données pour le graphique (évolution mensuelle)
        try {
          const evoRes = await api.get(`/stats/labo/${user.laboratoireId}?period=6months`);
          if (evoRes.data.evolution && evoRes.data.evolution.length > 0) {
            setChartData({
              labels: evoRes.data.evolution.map(item => item.month || 'Mois'),
              datasets: [
                {
                  label: 'Patients',
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
        } catch (err) {
          console.error('Erreur détaillée:', err.message);
            // et si nécessaire
          toast.error('Données d\'évolution non disponibles');
        }

      } catch (err) {
        console.error('Erreur chargement données:', err);
        toast.error('Erreur chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  // Carte de statistique réutilisable
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

  if (loading) {
    return (
      console.log('Rendering dashboard, stats:', stats),
      console.log('Loading state:', loading),
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-600">LaboGest</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'manager_labo' ? 'Directeur' : 'Technicien'}
                </p>
              </div>
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

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Message de bienvenue */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-6">
            <img src={DashboardIllus} alt="Dashboard" className="h-24 w-24" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bonjour, {user?.prenom} !
              </h2>
              <p className="text-gray-600">
                Voici un résumé de l'activité de votre laboratoire.
              </p>
            </div>
          </div>
        </div>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Patients"
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
            value={`${stats.ca} €`}
            icon={IconFinance}
            bgColor="bg-yellow-100"
          />
        </div>

        {/* Graphique d'activité (affiché seulement s'il y a des données) */}
        {chartData.labels.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Évolution sur 6 mois
            </h3>
            <ActivityChart data={chartData} />
          </div>
        )}

        {/* Actions rapides */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/patients/new')}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left group"
          >
            <img src={IconAdd} alt="Ajouter" className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
              Nouveau patient
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Enregistrer un patient
            </p>
          </button>
          
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