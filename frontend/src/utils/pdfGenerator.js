// ===========================================
// UTILITAIRE: pdfGenerator.js
// RÔLE: Générer des PDF professionnels pour devis
// AVEC: Code QR, multi-devise, infos complètes
// ===========================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

/**
 * Génère un code QR et l'ajoute au PDF
 */
const ajouterQRCode = async (doc, texte, x, y) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(texte, {
      width: 80,
      margin: 1
    });
    doc.addImage(qrDataUrl, 'PNG', x, y, 40, 40);
  } catch (error) {
    console.error('Erreur génération QR code:', error);
  }
};

/**
 * Génère un PDF de devis professionnel
 */
export const genererPDFDevis = async (devis, laboratoire, utilisateur) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // ===== EN-TÊTE AVEC LOGO =====
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text('LABOGEST', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text('Application de gestion de laboratoire', 14, 28);
    
    // ===== INFOS LABORATOIRE =====
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Laboratoire :', 14, 40);
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(laboratoire?.nom || 'Non spécifié', 14, 47);
    doc.text(laboratoire?.adresse || '', 14, 54);
    doc.text(`Tél: ${laboratoire?.telephone || ''}`, 14, 61);
    doc.text(`Email: ${laboratoire?.email || ''}`, 14, 68);
    
    // ===== NUMÉRO DE DEVIS =====
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text(`DEVIS N° ${devis.numero || 'N/A'}`, pageWidth - 14, 40, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`Date: ${new Date(devis.dateEmission).toLocaleDateString('fr-FR')}`, pageWidth - 14, 50, { align: 'right' });
    doc.text(`Valable jusqu'au: ${new Date(devis.dateValidite).toLocaleDateString('fr-FR')}`, pageWidth - 14, 58, { align: 'right' });
    
    // ===== INFOS PATIENT =====
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text('PATIENT', 14, 85);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const patientNom = devis.patientId?.nom || '';
    const patientPrenom = devis.patientId?.prenom || '';
    doc.text(`${patientNom} ${patientPrenom}`.trim() || 'Patient non spécifié', 14, 93);
    
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`Tél: ${devis.patientId?.telephone || 'Non renseigné'}`, 14, 101);
    doc.text(`Email: ${devis.patientId?.email || 'Non renseigné'}`, 14, 109);
    
    // ===== TABLEAU DES ANALYSES =====
    const tableData = (devis.lignes || []).map(ligne => {
      const analyse = ligne.analyseId || {};
      return [
        analyse.code || ligne.code || '',
        ligne.nom || analyse.nom?.fr || '',
        analyse.categorie || ligne.categorie || '',
        ligne.quantite || 1,
        `${(ligne.prixUnitaire || 0).toFixed(2)} ${ligne.devise || devis.devise || 'EUR'}`,
        `${(ligne.prixTotal || 0).toFixed(2)} ${ligne.devise || devis.devise || 'EUR'}`
      ];
    });
    
    if (tableData.length === 0) {
      tableData.push(['-', 'Aucune analyse', '-', '0', '0', '0']);
    }
    
    autoTable(doc, {
      startY: 120,
      head: [['Code', 'Analyse', 'Catégorie', 'Qté', 'Prix unitaire', 'Total']],
      body: tableData,
      foot: [[
        '', '', '', '', 'SOUS-TOTAL',
        `${(devis.sousTotal?.valeur || 0).toFixed(2)} ${devis.devise || 'EUR'}`
      ]],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      footStyles: { fillColor: [243, 244, 246], textColor: [0,0,0], fontStyle: 'bold' }
    });
    
    // ===== TOTAUX =====
    const finalY = doc.lastAutoTable.finalY + 10;
    
    if (devis.remiseGlobale > 0) {
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text(`Remise: ${devis.remiseGlobale}%`, pageWidth - 14, finalY, { align: 'right' });
    }
    
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.setFont(undefined, 'bold');
    const totalValeur = devis.total?.valeur || 0;
    const totalDevise = devis.devise || 'EUR';
    doc.text(
      `TOTAL: ${totalValeur.toFixed(2)} ${totalDevise}`,
      pageWidth - 14,
      finalY + 10,
      { align: 'right' }
    );
    
    // ===== CODE QR =====
    const qrData = `Devis: ${devis.numero}\nPatient: ${patientNom} ${patientPrenom}\nCréé par: ${utilisateur?.prenom || ''} ${utilisateur?.nom || ''}\nLaboratoire: ${laboratoire?.nom || ''}`;
    await ajouterQRCode(doc, qrData, 14, finalY + 30);
    
    // ===== NOTES =====
    if (devis.notes) {
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text('Notes:', 60, finalY + 40);
      const splitNotes = doc.splitTextToSize(devis.notes, pageWidth - 80);
      doc.text(splitNotes, 60, finalY + 48);
    }
    
    // ===== PIED DE PAGE =====
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document généré par ${utilisateur?.prenom || ''} ${utilisateur?.nom || ''} - ${new Date().toLocaleString()}`,
      pageWidth / 2,
      280,
      { align: 'center' }
    );
    
    return doc;
    
  } catch (error) {
    console.error('❌ Erreur génération PDF:', error);
    alert('Erreur lors de la génération du PDF');
    return null;
  }
};