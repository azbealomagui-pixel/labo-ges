// ===================
// PAGE: Devis 
// ===================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconAdd, IconEdit, IconDelete, IconSearch, IconPrinter } from '../assets';
import { genererPDFDevis } from '../utils/pdfGenerator';
import { formatDate } from '../utils/formatters';

const Devis = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');
  const [laboratoire, setLaboratoire] = useState(null);

  // Effet pour charger les devis (corrigé)
  useEffect(() => {
    const fetchDevis = async () => {
      try {
        const response = await api.get(`/devis/labo/${user.laboratoireId}`);
        setDevis(response.data.devis || []);
      } catch (err) {
        console.error('Erreur chargement devis:', err);
        toast.error('Erreur chargement des devis');
      } finally {
        setLoading(false);
      }
    };

    fetchDevis();
  }, [user?.laboratoireId]); // ← Notez le "?" pour éviter l'erreur si user est null

  // Effet pour charger les infos du laboratoire
  useEffect(() => {
    const fetchLabo = async () => {
      try {
        const response = await api.get(`/laboratoires/${user.laboratoireId}`);
        setLaboratoire(response.data.laboratoire);
      } catch (err) {
        console.error('Erreur chargement labo:', err);
      }
    };
    
    if (user?.laboratoireId) {
      fetchLabo();
    }
  }, [user?.laboratoireId]); // Dépendance correcte

  // Supprimer un devis
const handleDelete = async (id) => {
  if (!window.confirm('Voulez-vous vraiment supprimer ce devis ?')) return;
  
  try {
    await api.delete(`/devis/${id}`);
    toast.success('Devis supprimé');
    // Recharger la liste
    const response = await api.get(`/devis/labo/${user.laboratoireId}`);
    setDevis(response.data.devis || []);
    } catch (err) {
    console.error('Erreur suppression devis:', err);
    toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (statut) => {
    const styles = {
      brouillon: 'bg-gray-100 text-gray-800',
      envoye: 'bg-blue-100 text-blue-800',
      accepte: 'bg-green-100 text-green-800',
      paye: 'bg-purple-100 text-purple-800',
      annule: 'bg-red-100 text-red-800'
    };
    return styles[statut] || styles.brouillon;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Bouton retour */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            ← Retour tableau de bord
          </button>
        </div>

        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Devis & Factures</h1>
          <button
            onClick={() => navigate('/devis/new')}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
            <img src={IconAdd} alt="" className="w-5 h-5" />
            Nouveau devis
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg">
              <option value="tous">Tous les statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="envoye">Envoyé</option>
              <option value="accepte">Accepté</option>
              <option value="paye">Payé</option>
            </select>
          </div>
        </div>

        {/* Liste des devis */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">N° Devis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devis.filter(d => filter === 'tous' || d.statut === filter).map((d) => (
                <tr key={d._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">{d.numero}</td>
                  <td className="px-6 py-4">
                    {d.patientId?.nom} {d.patientId?.prenom}
                  </td>
                  <td className="px-6 py-4">
                    {formatDate(d.dateEmission)}  {/* ← NOUVELLE LIGNE */}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {d.totalFormatte || `${d.total?.valeur || 0} €`}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(d.statut)}`}>
                      {d.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {/* Bouton modifier */}
                      <button
                        onClick={() => navigate(`/devis/${d._id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Voir/Modifier le devis">
                        <img src={IconEdit} alt="Modifier" className="w-5 h-5" />
                      </button>
                      {/* Bouton PDF */}
                      <button
                        onClick={() => genererPDFDevis(d, laboratoire)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Télécharger PDF">
                        <img src={IconPrinter} alt="PDF" className="w-5 h-5" />
                      </button>
                       {/* Bouton supprimer */}
                      <button
                        onClick={() => handleDelete(d._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Supprimer le devis">
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

export default Devis;