// ===========================================
// PAGE: Devis
// RÔLE: Liste et gestion des devis/factures
// VERSION: Corrigée avec espaceId et recherche fonctionnelle
// ===========================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { 
  IconAdd, 
  IconEdit, 
  IconDelete, 
  IconSearch, 
  IconPrinter, 
  IconSend,
  IconCheck,
  IconX,
  IconCreditCard,
  IconBan
} from '../assets';
import { genererPDFDevis, ouvrirPDF, telechargerPDF } from '../utils/pdfGenerator';
import { formatDate } from '../utils/formatters';
import { exportToExcel } from '../utils/excelGenerator';

const STATUS_CONFIG = {
  brouillon: {
    label: 'Brouillon',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    description: 'Devis en cours de création',
    actions: ['envoyer', 'annuler']
  },
  envoye: {
    label: 'Envoyé',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    description: 'Devis transmis au client',
    actions: ['accepter', 'refuser', 'annuler']
  },
  accepte: {
    label: 'Accepté',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200',
    description: 'Accepté par le client',
    actions: ['payer', 'annuler']
  },
  refuse: {
    label: 'Refusé',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    description: 'Refusé par le client',
    actions: []
  },
  paye: {
    label: 'Payé',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-800',
    borderColor: 'border-teal-200',
    description: 'Devis réglé',
    actions: []
  },
  annule: {
    label: 'Annulé',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    description: 'Devis annulé',
    actions: []
  }
};

const formaterMontant = (montant, devise = 'EUR') => {
  if (montant === undefined || montant === null) return '0,00 €';
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: devise,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant);
  } catch {
    return `${montant.toFixed(2)} ${devise}`;
  }
};

const Devis = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [devis, setDevis] = useState([]);
  const [filteredDevis, setFilteredDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [laboratoire, setLaboratoire] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // ===== CHARGEMENT DES DEVIS =====
  useEffect(() => {
    const fetchDevis = async () => {
      try {
        const espaceId = user?.laboratoireId || user?.espaceId;
        if (!espaceId) {
          toast.error('Configuration espace invalide');
          return;
        }

        const response = await api.get(`/devis/labo/${espaceId}`);
        const data = response.data.devis || [];
        setDevis(data);
        setFilteredDevis(data);
      } catch (err) {
        console.error('Erreur chargement devis:', err);
        toast.error('Erreur chargement des devis');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDevis();
    }
  }, [user]);

  // ===== CHARGEMENT DES INFOS LABORATOIRE =====
  useEffect(() => {
    const fetchLabo = async () => {
      try {
        const espaceId = user?.laboratoireId || user?.espaceId;
        if (!espaceId) return;
        
        const response = await api.get(`/espaces/${espaceId}`);
        setLaboratoire(response.data.espace);
      } catch (err) {
        console.error('Erreur chargement espace:', err);
      }
    };
    
    if (user) {
      fetchLabo();
    }
  }, [user]);

  // ===== RECHERCHE INSTANTANÉE =====
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = devis;
      
      if (filter !== 'tous') {
        filtered = filtered.filter(d => d.statut === filter);
      }
      
      if (searchTerm.length >= 2) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(d => 
          d.numero?.toLowerCase().includes(term) ||
          `${d.patientId?.nom || ''} ${d.patientId?.prenom || ''}`.toLowerCase().includes(term) ||
          (d.total?.valeur && d.total.valeur.toString().includes(term))
        );
      }
      setFilteredDevis(filtered);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, filter, devis]);

  // ===== SUPPRESSION D'UN DEVIS =====
  const handleDelete = async (id, numero) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le devis ${numero} ?`)) {
      return;
    }

    setActionLoading(id);
    try {
      await api.delete(`/devis/${id}`);
      toast.success(`Devis ${numero} supprimé`);
      
      const updatedDevis = devis.filter(d => d._id !== id);
      setDevis(updatedDevis);
      
      let filtered = updatedDevis;
      if (filter !== 'tous') {
        filtered = filtered.filter(d => d.statut === filter);
      }
      if (searchTerm.length >= 2) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(d => 
          d.numero?.toLowerCase().includes(term) ||
          `${d.patientId?.nom || ''} ${d.patientId?.prenom || ''}`.toLowerCase().includes(term)
        );
      }
      setFilteredDevis(filtered);
      
    } catch (err) {
      console.error('Erreur suppression:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  // ===== EXPORT EXCEL =====
  const exportAllToExcel = () => {
    try {
      const devisAExporter = filteredDevis.map(d => ({
        numero: d.numero,
        patient: `${d.patientId?.nom || ''} ${d.patientId?.prenom || ''}`.trim(),
        date: formatDate(d.dateEmission),
        montant: d.total?.valeur || 0,
        devise: d.devise || 'EUR',
        statut: d.statut,
        remise: d.remiseGlobale || 0
      }));

      exportToExcel(devisAExporter, `devis-${new Date().toISOString().split('T')[0]}`, {
        numero: 'N° Devis',
        patient: 'Client',
        date: 'Date',
        montant: 'Montant',
        devise: 'Devise',
        statut: 'Statut',
        remise: 'Remise %'
      });
      
      toast.success(`${devisAExporter.length} devis exportés`);
    } catch (err) {
      console.error('Erreur export Excel:', err);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  // ===== CHANGEMENT DE STATUT =====
  const updateStatut = async (id, nouveauStatut, action) => {
    const confirmMessages = {
      envoyer: 'Voulez-vous envoyer ce devis au client ?',
      accepter: 'Voulez-vous accepter ce devis ?',
      refuser: 'Voulez-vous refuser ce devis ?',
      payer: 'Voulez-vous marquer ce devis comme payé ?',
      annuler: 'Voulez-vous vraiment annuler ce devis ?'
    };

    if (!window.confirm(confirmMessages[action])) {
      return;
    }

    setActionLoading(id);
    try {
      const response = await api.patch(`/devis/${id}/statut`, { 
        statut: nouveauStatut
      });
      
      if (response.data.success) {
        const updatedDevis = devis.map(d => 
          d._id === id ? { ...d, statut: nouveauStatut } : d
        );
        setDevis(updatedDevis);
        
        let filtered = updatedDevis;
        if (filter !== 'tous') {
          filtered = filtered.filter(d => d.statut === filter);
        }
        if (searchTerm.length >= 2) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(d => 
            d.numero?.toLowerCase().includes(term) ||
            `${d.patientId?.nom || ''} ${d.patientId?.prenom || ''}`.toLowerCase().includes(term)
          );
        }
        setFilteredDevis(filtered);
        
        const messages = {
          envoye: 'Devis envoyé',
          accepte: 'Devis accepté',
          refuse: 'Devis refusé',
          paye: 'Devis payé',
          annule: 'Devis annulé'
        };
        toast.success(messages[nouveauStatut]);
      }
    } catch (err) {
      console.error('Erreur changement statut:', err);
      toast.error(err.response?.data?.message || 'Erreur lors du changement de statut');
    } finally {
      setActionLoading(null);
    }
  };

  // ===== COMPOSANTS =====
  const StatusBadge = ({ statut }) => {
    const config = STATUS_CONFIG[statut] || STATUS_CONFIG.brouillon;
    return (
      <span 
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
        title={config.description}
      >
        {config.label}
      </span>
    );
  };

  const StatusActions = ({ devisItem }) => {
    const config = STATUS_CONFIG[devisItem.statut] || STATUS_CONFIG.brouillon;
    
    if (config.actions.length === 0) return null;

    return (
      <div className="flex gap-1 ml-2">
        {config.actions.includes('envoyer') && (
          <button
            onClick={() => updateStatut(devisItem._id, 'envoye', 'envoyer')}
            disabled={actionLoading === devisItem._id}
            className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
            title="Envoyer au client"
          >
            <img src={IconSend} alt="Envoyer" className="w-4 h-4" />
          </button>
        )}
        
        {config.actions.includes('accepter') && (
          <button
            onClick={() => updateStatut(devisItem._id, 'accepte', 'accepter')}
            disabled={actionLoading === devisItem._id}
            className="p-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 transition-colors"
            title="Accepter le devis"
          >
            <img src={IconCheck} alt="Accepter" className="w-4 h-4" />
          </button>
        )}
        
        {config.actions.includes('refuser') && (
          <button
            onClick={() => updateStatut(devisItem._id, 'refuse', 'refuser')}
            disabled={actionLoading === devisItem._id}
            className="p-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 transition-colors"
            title="Refuser le devis"
          >
            <img src={IconX} alt="Refuser" className="w-4 h-4" />
          </button>
        )}
        
        {config.actions.includes('payer') && (
          <button
            onClick={() => updateStatut(devisItem._id, 'paye', 'payer')}
            disabled={actionLoading === devisItem._id}
            className="p-1 bg-teal-100 text-teal-700 rounded hover:bg-teal-200 disabled:opacity-50 transition-colors"
            title="Marquer comme payé"
          >
            <img src={IconCreditCard} alt="Payer" className="w-4 h-4" />
          </button>
        )}
        
        {config.actions.includes('annuler') && (
          <button
            onClick={() => updateStatut(devisItem._id, 'annule', 'annuler')}
            disabled={actionLoading === devisItem._id}
            className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
            title="Annuler le devis"
          >
            <img src={IconBan} alt="Annuler" className="w-4 h-4" />
          </button>
        )}
      </div>
    );
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
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Retour tableau de bord
          </button>
        </div>

        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Devis & Factures</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredDevis.length} devis affiché(s) sur {devis.length}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={exportAllToExcel}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              title="Exporter tous les devis en Excel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </button>
            
            <button
              onClick={() => navigate('/devis/new')}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <img src={IconAdd} alt="" className="w-5 h-5" />
              Nouveau devis
            </button>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="tous">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Recherche instantanée (n° devis, patient, montant)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <img src={IconSearch} alt="" className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>
          {searchTerm.length >= 2 && (
            <p className="text-sm text-gray-500 mt-2">
              {filteredDevis.length} résultat(s) pour "{searchTerm}"
            </p>
          )}
        </div>

        {/* Liste des devis */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {filteredDevis.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucun devis'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? `Aucun devis ne correspond à "${searchTerm}"`
                  : 'Commencez par créer votre premier devis.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/devis/new')}
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
                >
                  <img src={IconAdd} alt="" className="w-5 h-5" />
                  Nouveau devis
                </button>
              )}
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Devis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDevis.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm">{d.numero}</td>
                    <td className="px-6 py-4">
                      {d.patientId?.nom} {d.patientId?.prenom}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(d.dateEmission)}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formaterMontant(d.total?.valeur || 0, d.devise || 'EUR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <StatusBadge statut={d.statut} />
                        <StatusActions devisItem={d} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/devis/${d._id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir le devis"
                        >
                          <img src={IconEdit} alt="Voir" className="w-5 h-5" />
                        </button>
                        
                        <button
                          onClick={async () => {
                            const doc = await genererPDFDevis(d, laboratoire, user);
                            if (doc) ouvrirPDF(doc);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Ouvrir le PDF"
                        >
                          <img src={IconPrinter} alt="PDF" className="w-5 h-5" />
                        </button>
                        
                        <button
                          onClick={async () => {
                            const doc = await genererPDFDevis(d, laboratoire, user);
                            if (doc) telechargerPDF(doc, `devis-${d.numero}.pdf`);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Télécharger le PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleDelete(d._id, d.numero)}
                          disabled={actionLoading === d._id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer le devis"
                        >
                          <img src={IconDelete} alt="Supprimer" className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Devis;