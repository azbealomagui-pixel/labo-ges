// ===========================================
// COMPOSANT: PermissionModal
// RÔLE: Afficher et modifier les permissions d'un membre
// ===========================================

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const PERMISSION_GROUPS = [
  {
    name: 'Utilisateurs',
    permissions: [
      { key: 'VIEW_USERS', label: 'Voir les utilisateurs' },
      { key: 'CREATE_USER', label: 'Créer des utilisateurs' },
      { key: 'UPDATE_USER', label: 'Modifier des utilisateurs' },
      { key: 'DELETE_USER', label: 'Supprimer des utilisateurs' }
    ]
  },
  {
    name: 'Patients',
    permissions: [
      { key: 'VIEW_PATIENTS', label: 'Voir les patients' },
      { key: 'CREATE_PATIENT', label: 'Créer des patients' },
      { key: 'UPDATE_PATIENT', label: 'Modifier des patients' },
      { key: 'DELETE_PATIENT', label: 'Supprimer des patients' }
    ]
  },
  {
    name: 'Analyses',
    permissions: [
      { key: 'VIEW_ANALYSES', label: 'Voir les analyses' },
      { key: 'CREATE_ANALYSE', label: 'Créer des analyses' },
      { key: 'UPDATE_ANALYSE', label: 'Modifier des analyses' },
      { key: 'DELETE_ANALYSE', label: 'Supprimer des analyses' }
    ]
  },
  {
    name: 'Devis & Rapports',
    permissions: [
      { key: 'VIEW_DEVIS', label: 'Voir les devis' },
      { key: 'CREATE_DEVIS', label: 'Créer des devis' },
      { key: 'VALIDATE_DEVIS', label: 'Valider des devis' },
      { key: 'VIEW_RAPPORTS', label: 'Voir les rapports' },
      { key: 'VALIDATE_RAPPORT', label: 'Valider des rapports' }
    ]
  },
  {
    name: 'Finances & Paramètres',
    permissions: [
      { key: 'VIEW_FINANCES', label: 'Voir les finances' },
      { key: 'VIEW_SETTINGS', label: 'Voir les paramètres' },
      { key: 'UPDATE_SETTINGS', label: 'Modifier les paramètres' }
    ]
  }
];

const PermissionModal = ({ isOpen, onClose, membre, espaceId, onUpdate }) => {
  const [selectedPermissions, setSelectedPermissions] = useState(membre.permissions || []);
  const [loading, setLoading] = useState(false);
  const [delegation, setDelegation] = useState({
    enabled: !!membre.deleguePar,
    dateFin: membre.dateFinDelegation ? new Date(membre.dateFinDelegation).toISOString().split('T')[0] : ''
  });

  if (!isOpen) return null;

  const togglePermission = (perm) => {
    setSelectedPermissions(prev =>
      prev.includes(perm)
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = {
        permissions: selectedPermissions,
        deleguePar: delegation.enabled ? membre.deleguePar || 'moi' : null,
        dateFinDelegation: delegation.enabled ? delegation.dateFin : null
      };

      await api.put(`/espaces/${espaceId}/membres/${membre._id}`, updates);
      
      toast.success(`✅ Permissions mises à jour pour ${membre.prenom} ${membre.nom}`);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('❌ Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        
        {/* En-tête */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            Permissions : {membre.prenom} {membre.nom}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corps */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Cochez les permissions à accorder à ce membre.
          </p>

          {PERMISSION_GROUPS.map(group => (
            <div key={group.name} className="mb-6">
              <h3 className="text-md font-semibold text-gray-800 mb-3">{group.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.permissions.map(perm => (
                  <label
                    key={perm.key}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(perm.key)}
                      onChange={() => togglePermission(perm.key)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Section Délégation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-md font-semibold text-gray-800 mb-3">Délégation temporaire</h3>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={delegation.enabled}
                  onChange={(e) => setDelegation({ ...delegation, enabled: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Activer la délégation</span>
              </label>

              {delegation.enabled && (
                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={delegation.dateFin}
                    onChange={(e) => setDelegation({ ...delegation, dateFin: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Après cette date, les permissions reviendront à leur état initial.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pied */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionModal;