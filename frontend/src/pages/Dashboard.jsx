// ===========================================
// PAGE: Dashboard (VERSION STABLE)
// ===========================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
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
  const [stats, setStats] = useState({ patients: 0, analyses: 0, devis: 0, ca: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Patients
        const patientsRes = await api.get(`/patients/labo/${user.laboratoireId}`);
        // Analyses
        const analysesRes = await api.get(`/analyses/labo/${user.laboratoireId}`);
        // Devis
        const devisRes = await api.get(`/devis/labo/${user.laboratoireId}`);
        
        setStats({
          patients: patientsRes.data.count || patientsRes.data.patients?.length || 0,
          analyses: analysesRes.data.count || analysesRes.data.analyses?.length || 0,
          devis: devisRes.data.count || devisRes.data.devis?.length || 0,
          ca: 0
        });
      } catch (err) {
        console.error('Erreur chargement stats:', err);
        toast.error('Erreur chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchStats();
  }, [user]);

  const StatCard = ({ title, value, icon: Icon, bgColor }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all">
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">LaboGest</h1>
          <div className="flex items-center gap-4">
            <span>{user?.prenom} {user?.nom}</span>
            <button onClick={logout} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Message de bienvenue */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-2">Bonjour, {user?.prenom} !</h2>
          <p className="text-gray-600">Résumé de l'activité</p>
        </div>

        {/* TABLEAU DE STATISTIQUES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Patients" value={stats.patients} icon={IconPatients} bgColor="bg-blue-100" />
          <StatCard title="Analyses" value={stats.analyses} icon={IconAnalyses} bgColor="bg-green-100" />
          <StatCard title="Devis" value={stats.devis} icon={IconDevis} bgColor="bg-purple-100" />
          <StatCard title="CA du mois" value={`${stats.ca} €`} icon={IconFinance} bgColor="bg-yellow-100" />
        </div>

        {/* Actions rapides */}
        <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={() => navigate('/patients/new')} className="bg-white p-6 rounded-xl shadow-lg">
            <img src={IconAdd} alt="" className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-semibold">Nouveau patient</h3>
          </button>
          <button onClick={() => navigate('/analyses/new')} className="bg-white p-6 rounded-xl shadow-lg">
            <img src={IconAnalyses} alt="" className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-semibold">Nouvelle analyse</h3>
          </button>
          <button onClick={() => navigate('/devis/new')} className="bg-white p-6 rounded-xl shadow-lg">
            <img src={IconDevis} alt="" className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-semibold">Nouveau devis</h3>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;