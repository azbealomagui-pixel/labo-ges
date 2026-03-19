// ===========================================
// COMPOSANT: LogoUploader
// RÔLE: Permettre à l'utilisateur d'importer son logo
// VERSION: Finale - Sans aucun warning ESLint
// ===========================================

import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const LogoUploader = ({ espace, espaceId, onLogoChange }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  // ===== GÉRER LA SÉLECTION DE FICHIER =====
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 2MB');
      return;
    }

    // Vérifier le type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG, GIF ou SVG');
      return;
    }

    // Créer une prévisualisation
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Uploader le fichier
    uploadLogo(file);
  };

  // ===== UPLOADER LE LOGO =====
  const uploadLogo = async (file) => {
    const formData = new FormData();
    formData.append('logo', file);

    setUploading(true);
    try {
      const response = await api.post(`/espaces/${espaceId}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('✅ Logo téléchargé avec succès');
        if (onLogoChange) {
          onLogoChange(response.data.logo);
        }
      }
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du téléchargement');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  // ===== SUPPRIMER LE LOGO =====
  const handleDeleteLogo = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce logo ?')) return;

    setUploading(true);
    try {
      await api.delete(`/espaces/${espaceId}/logo`);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('✅ Logo supprimé');
      if (onLogoChange) {
        onLogoChange(null);
      }
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Logo de l'entreprise</h3>
      
      <div className="flex flex-col items-center gap-4">
        
        {/* Prévisualisation */}
        {(preview || espace?.logo) && (
          <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
            <img 
              src={preview || (espace?.logo ? `${api.defaults.baseURL}${espace.logo}` : null)} 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Instructions */}
        <p className="text-sm text-gray-600 text-center">
          Taille recommandée : 200x200 pixels<br />
          Formats acceptés : JPG, PNG, GIF, SVG (max 2MB)
        </p>

        {/* Boutons */}
        <div className="flex gap-4">
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/svg+xml"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <span className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 cursor-pointer disabled:opacity-50">
              {uploading ? 'Upload...' : 'Choisir un logo'}
            </span>
          </label>

          {(preview || espace?.logo) && (
            <button
              onClick={handleDeleteLogo}
              disabled={uploading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoUploader;