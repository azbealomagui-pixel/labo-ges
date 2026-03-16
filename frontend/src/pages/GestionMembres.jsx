// ===========================================
// PAGE: GestionMembres
// RÔLE: Gérer les membres d'un espace
// VERSION: UX améliorée avec modale et messages explicites
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconAdd, IconEdit, IconDelete } from '../assets';

const ROLES = [
  { value: 'directeur', label: 'Directeur', level: 1 },
  { value: 'admin', label: 'Administrateur', level: 2 },
  { value: 'biologiste', label: 'Biologiste', level: 3 },
  { value: 'technicien', label: 'Technicien', level: 4 },
  { value: 'comptable', label: 'Comptable', level: 4 },
  { value: 'secretaire', label: 'Secrétaire', level: 4 }
];

const GestionMembres = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [membres, setMembres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'technicien',
    poste: ''
  });
  const [errors, setErrors] = useState({});

  // ===== ÉTAT POUR LA MODALE DE SUPPRESSION =====
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    membreId: null,
    membreNom: ''
  });

  // ===== CHARGER LES MEMBRES =====
  const fetchMembres = useCallback(async () => {
    try {
      const response = await api.get(`/espaces/${user.espaceId}/membres`);
      setMembres(response.data.membres || []);
    } catch (error) {
      console.error('❌ Erreur chargement membres:', error);
      toast.error('Impossible de charger la liste des membres. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [user.espaceId]);

  useEffect(() => {
    fetchMembres();
  }, [fetchMembres]);

  // ===== VALIDATION =====
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'nom':
      case 'prenom':
        if (!value.trim()) {
          newErrors[name] = 'Ce champ est obligatoire';
        } else if (value.trim().length < 2) {
          newErrors[name] = 'Minimum 2 caractères';
        } else if (!/^[a-zA-ZÀ-ÿ\s-]+$/.test(value)) {
          newErrors[name] = 'Caractères non autorisés (lettres uniquement)';
        } else {
          delete newErrors[name];
        }
        break;

      case 'email':
        if (!value.trim()) {
          newErrors.email = 'L\'email est obligatoire';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Format email invalide (ex: nom@domaine.com)';
        } else {
          delete newErrors.email;
        }
        break;

      case 'password':
        if (!value && !formData._id) {
          newErrors.password = 'Le mot de passe est requis';
        } else if (value && value.length < 6) {
          newErrors.password = 'Minimum 6 caractères';
        } else {
          delete newErrors.password;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  // ===== CRÉER UN MEMBRE =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (Object.keys(errors).length > 0) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      const response = await api.post(`/espaces/${user.espaceId}/membres`, formData);

      if (response.data.success) {
        toast.success(`✅ ${formData.prenom} ${formData.nom} a été ajouté comme ${ROLES.find(r => r.value === formData.role)?.label}`);
        setShowForm(false);
        setFormData({ nom: '', prenom: '', email: '', password: '', role: 'technicien', poste: '' });
        fetchMembres();
      }
    } catch (error) {
      console.error('❌ Erreur ajout membre:', error);
      
      if (error.response?.status === 409) {
        toast.error('Cet email est déjà utilisé par un autre compte');
      } else {
        toast.error(error.response?.data?.message || 'Erreur lors de l\'ajout du membre');
      }
    }
  };

  // ===== CHANGER LE RÔLE =====
  const handleRoleChange = async (userId, newRole, nom, prenom) => {
    try {
      await api.put(`/espaces/${user.espaceId}/membres/${userId}`, { role: newRole });
      toast.success(`✅ Le rôle de ${prenom} ${nom} a été mis à jour (${ROLES.find(r => r.value === newRole)?.label})`);
      fetchMembres();
    } catch (error) {
      console.error('❌ Erreur mise à jour rôle:', error);
      toast.error('Impossible de modifier le rôle. Veuillez réessayer.');
    }
  };

  // ===== DÉSACTIVER/ACTIVER =====
  const handleToggleActif = async (userId, actif, nom, prenom) => {
    try {
      await api.put(`/espaces/${user.espaceId}/membres/${userId}`, { actif: !actif });
      toast.success(`${prenom} ${nom} est maintenant ${!actif ? 'actif' : 'inactif'}`);
      fetchMembres();
    } catch (error) {
      console.error('❌ Erreur changement statut:', error);
      toast.error('Erreur lors du changement de statut');
    }
  };

  // ===== OUVRIR LA MODALE DE SUPPRESSION =====
  const openDeleteModal = (id, nom, prenom) => {
    setDeleteModal({
      isOpen: true,
      membreId: id,
      membreNom: `${prenom} ${nom}`
    });
  };

  // ===== SUPPRIMER DÉFINITIVEMENT =====
  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/users/${deleteModal.membreId}`);
      toast.success(`🗑️ ${deleteModal.membreNom} a été supprimé définitivement`);
      setDeleteModal({ isOpen: false, membreId: null, membreNom: '' });
      fetchMembres();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error('❌ Échec de la suppression. Veuillez réessayer.');
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des membres</h1>
            <p className="text-gray-600 mt-1">{membres.length} membre{membres.length > 1 ? 's' : ''}</p>
          </div>
          
          <button
            onClick={() => {
              setShowForm(!showForm);
              setErrors({});
            }}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <img src={IconAdd} alt="" className="w-5 h-5" />
            Nouveau membre
          </button>
        </div>

        {/* ===== FORMULAIRE D'AJOUT ===== */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-primary-100">
            <h2 className="text-lg font-semibold mb-4">Ajouter un nouveau membre</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.nom ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Dupont"
                  />
                  {errors.nom && <p className="text-sm text-red-600 mt-1">{errors.nom}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.prenom ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Jean"
                  />
                  {errors.prenom && <p className="text-sm text-red-600 mt-1">{errors.prenom}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="jean.dupont@email.com"
                />
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mot de passe <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Rôle</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {ROLES.filter(r => r.value !== 'directeur').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Poste (optionnel)</label>
                  <input
                    type="text"
                    name="poste"
                    value={formData.poste}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Ex: Biologiste senior"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="submit" 
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Créer le membre
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===== LISTE DES MEMBRES ===== */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poste</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {membres.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Aucun membre dans cet espace pour le moment.
                  </td>
                </tr>
              ) : (
                membres.map(m => (
                  <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{m.nom} {m.prenom}</div>
                      {m.estProprietaire && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          👑 Propriétaire
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{m.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {m.estProprietaire ? (
                        <span className="text-sm font-medium text-gray-900">Directeur</span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m._id, e.target.value, m.prenom, m.nom)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          {ROLES.filter(r => r.value !== 'directeur').map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{m.poste || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        m.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {m.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex justify-center gap-2">
                        {!m.estProprietaire && (
                          <>
                            <button
                              onClick={() => handleToggleActif(m._id, m.actif, m.prenom, m.nom)}
                              className={`p-2 rounded-lg transition-colors ${
                                m.actif 
                                  ? 'text-orange-600 hover:bg-orange-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={m.actif ? 'Désactiver' : 'Activer'}
                            >
                              {m.actif ? '🔴' : '🟢'}
                            </button>
                            <button
                              onClick={() => openDeleteModal(m._id, m.nom, m.prenom)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer définitivement"
                            >
                              <img src={IconDelete} alt="Supprimer" className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ===== MODALE DE CONFIRMATION DE SUPPRESSION ===== */}
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
                Êtes-vous sûr de vouloir supprimer <span className="font-semibold">{deleteModal.membreNom}</span> ?
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
                  onClick={() => setDeleteModal({ isOpen: false, membreId: null, membreNom: '' })}
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

export default GestionMembres;