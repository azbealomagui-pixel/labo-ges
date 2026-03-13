// ===========================================
// UTILITAIRE: excelGenerator.js
// RÔLE: Générer des fichiers Excel (.xlsx)
// ===========================================

import * as XLSX from 'xlsx';

/**
 * Exporte des données au format Excel
 * @param {Array} data - Tableau d'objets à exporter
 * @param {string} filename - Nom du fichier (sans extension)
 * @param {Object} headers - Mapping des champs vers les en-têtes
 */
export const exportToExcel = (data, filename = 'export', headers = null) => {
  try {
    // Préparer les données
    let exportData = data;

    // Si des headers sont fournis, mapper les données
    if (headers) {
      exportData = data.map(item => {
        const row = {};
        Object.entries(headers).forEach(([key, label]) => {
          // Gestion des chemins imbriqués (ex: 'patientId.nom')
          const value = key.split('.').reduce((obj, k) => obj?.[k], item) || '';
          row[label] = value;
        });
        return row;
      });
    }

    // Créer une feuille de calcul
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Ajuster la largeur des colonnes
    const maxWidth = 50;
    worksheet['!cols'] = Object.keys(exportData[0] || {}).map(() => ({ wch: maxWidth }));

    // Créer un classeur
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Générer le fichier
    XLSX.writeFile(workbook, `${filename}.xlsx`, { compression: true });

  } catch (error) {
    console.error('❌ Erreur export Excel:', error);
    throw error;
  }
};

/**
 * Exporte plusieurs feuilles dans un même fichier Excel
 * @param {Object} sheets - { nomFeuille1: data1, nomFeuille2: data2 }
 * @param {string} filename - Nom du fichier
 */
export const exportMultipleSheets = (sheets, filename = 'export') => {
  try {
    const workbook = XLSX.utils.book_new();

    Object.entries(sheets).forEach(([sheetName, data]) => {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `${filename}.xlsx`);

  } catch (error) {
    console.error('❌ Erreur export multiple:', error);
    throw error;
  }
};