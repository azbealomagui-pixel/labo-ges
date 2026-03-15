// ===========================================
// PAGE: GestionMembres
// RÔLE: Gérer les membres d'un espace
// AVEC: Bouton retour et corrections ESLint
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // ← AJOUTER CET IMPORT
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
  const navigate = useNavigate(); // ← AJOUTER CETTE LIGNE
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

  // ===== CHARGER LES MEMBRES =====
  const fetchMembres = useCallback(async () => {
    try {
      const response = await api.get(`/espaces/${user.espaceId}/membres`);
      setMembres(response.data.membres || []);
    } catch (error) {
      console.error('❌ Erreur chargement membres:', error);
      toast.error('Erreur chargement membres');
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
        } else {
          delete newErrors[name];
        }
        break;

      case 'email':
        if (!value.trim()) {
          newErrors.email = 'L\'email est obligatoire';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Format email invalide';
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
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    try {
      const response = await api.post(`/espaces/${user.espaceId}/membres`, formData);

      if (response.data.success) {
        toast.success('✅ Membre ajouté');
        setShowForm(false);
        setFormData({ nom: '', prenom: '', email: '', password: '', role: 'technicien', poste: '' });
        fetchMembres();
      }
    } catch (error) {
      console.error('❌ Erreur ajout membre:', error);
      toast.error(error.response?.data?.message || 'Erreur ajout membre');
    }
  };

  // ===== CHANGER LE RÔLE =====
  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/espaces/${user.espaceId}/membres/${userId}`, { role: newRole });
      toast.success('Rôle mis à jour');
      fetchMembres();
    } catch (error) {
      console.error('❌ Erreur mise à jour rôle:', error);
      toast.error('Erreur mise à jour');
    }
  };

  // ===== DÉSACTIVER/ACTIVER =====
  const handleToggleActif = async (userId, actif) => {
    try {
      await api.put(`/espaces/${user.espaceId}/membres/${userId}`, { actif: !actif });
      toast.success(`Membre ${!actif ? 'activé' : 'désactivé'}`);
      fetchMembres();
    } catch (error) {
      console.error('❌ Erreur changement statut:', error);
      toast.error('Erreur');
    }
  };

  // ===== SUPPRIMER DÉFINITIVEMENT (NON UTILISÉ POUR L'INSTANT) =====
  // const handleDelete = async (userId) => {
  //   if (!window.confirm('⚠️ Supprimer définitivement ce membre ? Cette action est irréversible.')) return;
  //   try {
  //     await api.delete(`/users/${userId}`);
  //     toast.success('Membre supprimé');
  //     fetchMembres();
  //   } catch (error) {
  //     console.error('Erreur suppression:', error);
  //     toast.error('Erreur suppression');
  //   }
  // };

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

        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des membres</h1>
            <p className="text-gray-600 mt-1">{membres.length} membre(s)</p>
          </div>
          
          <button
            onClick={() => {
              setShowForm(!showForm);
              setErrors({});
            }}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <img src={IconAdd} alt="" className="w-5 h-5" />
            Nouveau membre
          </button>
        </div>

        {/* Formulaire d'ajout */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Ajouter un membre</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      errors.nom ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.nom && <p className="text-sm text-red-600 mt-1">{errors.nom}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom *</label>
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      errors.prenom ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.prenom && <p className="text-sm text-red-600 mt-1">{errors.prenom}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mot de passe *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {ROLES.filter(r => r.value !== 'directeur').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Poste</label>
                  <input
                    type="text"
                    name="poste"
                    value={formData.poste}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ex: Biologiste senior"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
                  Créer
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des membres */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poste</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {membres.map(m => (
                <tr key={m._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{m.nom} {m.prenom}</div>
                    {m.estProprietaire && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        Propriétaire
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{m.email}</td>
                  <td className="px-6 py-4">
                    {m.estProprietaire ? (
                      <span className="text-gray-700">Directeur</span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m._id, e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        {ROLES.filter(r => r.value !== 'directeur').map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{m.poste || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      m.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {m.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      {!m.estProprietaire && (
                        <>
                          <button
                            onClick={() => handleToggleActif(m._id, m.actif)}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                            title={m.actif ? 'Désactiver' : 'Activer'}
                          >
                            {m.actif ? '🔴' : '🟢'}
                          </button>
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                            <img src={IconDelete} alt="" className="w-4 h-4" />
                          </button>
                        </>
                      )}
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

export default GestionMembres;