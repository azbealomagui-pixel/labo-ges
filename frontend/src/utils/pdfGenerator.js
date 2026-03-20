// ===========================================
// UTILITAIRE: pdfGenerator.js
// RÔLE: Générer des PDF professionnels avec logo personnalisé
// VERSION: Finale - Sans warning ESLint
// ===========================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// ===========================================
// FONCTIONS D'EXPORT (UTILITAIRES)
// ===========================================

export const ouvrirPDF = (doc) => {
  try {
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
  } catch (error) {
    console.error('❌ Erreur ouverture PDF:', error.message);
  }
};

export const telechargerPDF = (doc, nomFichier = 'document.pdf') => {
  try {
    doc.save(nomFichier);
  } catch (error) {
    console.error('❌ Erreur téléchargement PDF:', error.message);
  }
};

// ===========================================
// FONCTIONS PRIVÉES
// ===========================================

const fallbackLogo = (doc) => {
  try {
    const logoUrl = '/src/assets/images/logos/logo-lab.png';
    doc.addImage(logoUrl, 'PNG', 14, 10, 30, 15);
  } catch {
    console.log('Logo non trouvé, génération sans logo');
  }
};

const ajouterLogo = async (doc, laboratoire) => {
  try {
    const baseURL = typeof window !== 'undefined' && window.location?.hostname === 'localhost'
      ? 'http://localhost:5000'
      : 'https://labo-ges-api.onrender.com';

    if (laboratoire?.logo) {
      const logoUrl = `${baseURL}${laboratoire.logo}`;
      try {
        const response = await fetch(logoUrl);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onloadend = () => {
              try {
                doc.addImage(reader.result, 'PNG', 14, 10, 30, 15);
              } catch {
                fallbackLogo(doc);
              }
              resolve();
            };
            reader.readAsDataURL(blob);
          });
          return;
        }
      } catch {
        console.log('Logo personnalisé non accessible');
      }
    }
    fallbackLogo(doc);
  } catch {
    fallbackLogo(doc);
  }
};

const ajouterQRCode = async (doc, texte, x, y) => {
  try {
    const texteCourt = texte ? texte.substring(0, 200) : 'Données non disponibles';
    const qrDataUrl = await QRCode.toDataURL(texteCourt, {
      width: 80,
      margin: 1,
      errorCorrectionLevel: 'M'
    });
    doc.addImage(qrDataUrl, 'PNG', x, y, 30, 30);
  } catch {
    console.warn('⚠️ QR Code non généré (ignoré)');
  }
};

// ===========================================
// PDF DEVIS
// ===========================================
export const genererPDFDevis = async (devis, laboratoire, utilisateur) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    await ajouterLogo(doc, laboratoire);

    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text(laboratoire?.nom || 'LABOGES', 50, 20);
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(laboratoire?.adresse || 'Application de gestion de laboratoire', 50, 28);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Laboratoire :', 14, 45);
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(laboratoire?.nom || 'Laboratoire', 14, 52);
    doc.text(laboratoire?.adresse || '', 14, 59);
    doc.text(`Tél: ${laboratoire?.telephone || ''}`, 14, 66);
    doc.text(`Email: ${laboratoire?.email || ''}`, 14, 73);

    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text(`DEVIS N° ${devis.numero || 'N/A'}`, pageWidth - 14, 45, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`Date: ${new Date(devis.dateEmission).toLocaleDateString('fr-FR')}`, pageWidth - 14, 55, { align: 'right' });
    doc.text(`Valable jusqu'au: ${new Date(devis.dateValidite).toLocaleDateString('fr-FR')}`, pageWidth - 14, 63, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text('PATIENT', 14, 90);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const patientNom = devis.patientId?.nom || '';
    const patientPrenom = devis.patientId?.prenom || '';
    doc.text(`${patientNom} ${patientPrenom}`.trim() || 'Patient non spécifié', 14, 98);
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`Tél: ${devis.patientId?.telephone || 'Non renseigné'}`, 14, 106);
    doc.text(`Email: ${devis.patientId?.email || 'Non renseigné'}`, 14, 114);

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

    if (tableData.length === 0) tableData.push(['-', 'Aucune analyse', '-', '0', '0', '0']);

    autoTable(doc, {
      startY: 125,
      head: [['Code', 'Analyse', 'Catégorie', 'Qté', 'Prix unitaire', 'Total']],
      body: tableData,
      foot: [['', '', '', '', 'SOUS-TOTAL', `${(devis.sousTotal?.valeur || 0).toFixed(2)} ${devis.devise || 'EUR'}`]],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

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
    doc.text(`TOTAL: ${totalValeur.toFixed(2)} ${totalDevise}`, pageWidth - 14, finalY + 10, { align: 'right' });

    const qrData = `Devis: ${devis.numero}\nPatient: ${patientNom} ${patientPrenom}\nCréé par: ${utilisateur?.prenom || ''} ${utilisateur?.nom || ''}\nLaboratoire: ${laboratoire?.nom || ''}`;
    await ajouterQRCode(doc, qrData, 14, finalY + 20);

    if (devis.notes) {
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text('Notes:', 60, finalY + 30);
      const splitNotes = doc.splitTextToSize(devis.notes, pageWidth - 80);
      doc.text(splitNotes, 60, finalY + 38);
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document LaboGes : ${utilisateur?.prenom || ''} ${utilisateur?.nom || ''} - ${new Date().toLocaleString()}`,
      pageWidth / 2, 280, { align: 'center' }
    );

    return doc;
  } catch (error) {
    console.error('❌ Erreur génération PDF devis:', error.message);
    return null;
  }
};

// ===========================================
// PDF PATIENT (structure similaire avec logo)
// ===========================================
export const genererPDFPatient = async (patient, laboratoire, utilisateur) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    await ajouterLogo(doc, laboratoire);

    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text(laboratoire?.nom || 'LABOGES', 50, 20);
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text('Fiche patient', 50, 28);

    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(laboratoire?.nom || 'Laboratoire', 14, 45);

    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text('FICHE PATIENT', 14, 60);

    let yPos = 75;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Nom complet : ${patient.nom} ${patient.prenom}`, 14, yPos); yPos += 8;
    doc.text(`Date naissance : ${new Date(patient.dateNaissance).toLocaleDateString('fr-FR')}`, 14, yPos); yPos += 8;
    doc.text(`Sexe : ${patient.sexe === 'M' ? 'Masculin' : patient.sexe === 'F' ? 'Féminin' : patient.sexe}`, 14, yPos); yPos += 8;
    doc.text(`Téléphone : ${patient.telephone}`, 14, yPos); yPos += 8;
    if (patient.email) { doc.text(`Email : ${patient.email}`, 14, yPos); yPos += 8; }
    doc.text(`Adresse : ${patient.adresse}`, 14, yPos); yPos += 8;
    if (patient.numeroSecuriteSociale) { doc.text(`N° Sécurité sociale : ${patient.numeroSecuriteSociale}`, 14, yPos); yPos += 8; }
    if (patient.groupeSanguin && patient.groupeSanguin !== 'Inconnu') { doc.text(`Groupe sanguin : ${patient.groupeSanguin}`, 14, yPos); yPos += 8; }
    if (patient.allergies?.length > 0) { doc.text(`Allergies : ${patient.allergies.join(', ')}`, 14, yPos); yPos += 8; }
    if (patient.observations) {
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text('Observations :', 14, yPos); yPos += 6;
      doc.setFontSize(9);
      const splitObs = doc.splitTextToSize(patient.observations, pageWidth - 30);
      doc.text(splitObs, 14, yPos);
    }

    const qrData = `Patient: ${patient.nom} ${patient.prenom}\nNé(e): ${new Date(patient.dateNaissance).toLocaleDateString()}\nTél: ${patient.telephone}\nID: ${patient._id}`;
    await ajouterQRCode(doc, qrData, pageWidth - 50, 140);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document LaboGes : ${utilisateur?.prenom || ''} ${utilisateur?.nom || ''} - ${new Date().toLocaleString()}`,
      pageWidth / 2, 280, { align: 'center' }
    );

    return doc;
  } catch (error) {
    console.error('❌ Erreur génération PDF patient:', error.message);
    return null;
  }
};

// ===========================================
// PDF ANALYSE (structure similaire avec logo)
// ===========================================
export const genererPDFAnalyse = async (analyse, laboratoire, utilisateur) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    await ajouterLogo(doc, laboratoire);

    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text(laboratoire?.nom || 'LABOGES', 50, 20);
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text('Fiche d\'analyse', 50, 28);

    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(laboratoire?.nom || 'Laboratoire', 14, 45);

    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text('FICHE ANALYSE', 14, 60);

    let yPos = 75;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Code : ${analyse.code}`, 14, yPos); yPos += 8;
    doc.text(`Nom : ${analyse.nom?.fr || analyse.nom}`, 14, yPos); yPos += 8;
    if (analyse.nom?.en) { doc.text(`Nom (EN) : ${analyse.nom.en}`, 14, yPos); yPos += 6; }
    doc.text(`Catégorie : ${analyse.categorie}`, 14, yPos); yPos += 8;
    doc.text(`Prix : ${analyse.prix?.valeur} ${analyse.prix?.devise || 'EUR'}`, 14, yPos); yPos += 8;
    doc.text(`Type échantillon : ${analyse.typeEchantillon}`, 14, yPos); yPos += 8;
    doc.text(`Délai : ${analyse.delaiRendu || 24} heures`, 14, yPos); yPos += 8;
    if (analyse.uniteMesure && analyse.uniteMesure !== '-') { doc.text(`Unité de mesure : ${analyse.uniteMesure}`, 14, yPos); yPos += 8; }

    const qrData = `Analyse: ${analyse.code}\nNom: ${analyse.nom?.fr || analyse.nom}\nPrix: ${analyse.prix?.valeur} ${analyse.prix?.devise || 'EUR'}`;
    await ajouterQRCode(doc, qrData, pageWidth - 50, 140);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document LaboGes : ${utilisateur?.prenom || ''} ${utilisateur?.nom || ''} - ${new Date().toLocaleString()}`,
      pageWidth / 2, 280, { align: 'center' }
    );

    return doc;
  } catch (error) {
    console.error('❌ Erreur génération PDF analyse:', error.message);
    return null;
  }
};

// ===========================================
// PDF RAPPORT (PV D'ANALYSES)
// ===========================================
export const genererPDFRapport = async (rapport, utilisateur, laboratoire) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    await ajouterLogo(doc, laboratoire);

    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text(laboratoire?.nom || 'LABOGES', 50, 20);
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text('Rapport d\'analyses médicales', 50, 28);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Rapport N°: ${rapport._id.slice(-8).toUpperCase()}`, pageWidth - 14, 30, { align: 'right' });

    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text('PATIENT', 14, 50);

    if (rapport.patientId) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`${rapport.patientId.nom} ${rapport.patientId.prenom}`, 14, 60);
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text(`Né(e) le: ${new Date(rapport.patientId.dateNaissance).toLocaleDateString('fr-FR')}`, 14, 68);
      doc.text(`Tél: ${rapport.patientId.telephone}`, 14, 76);
    }

    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, 60, { align: 'right' });
    doc.text(`Validé par: ${utilisateur?.prenom} ${utilisateur?.nom}`, pageWidth - 14, 68, { align: 'right' });

    const tableData = (rapport.resultats || []).map((r, index) => [
      (index + 1).toString(),
      r.code || '',
      r.nom || '',
      r.valeur?.toString() || '-',
      r.unite || '',
      `${r.valeurReference?.min || '-'} - ${r.valeurReference?.max || '-'}`,
      r.interpretation || ''
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['#', 'Code', 'Analyse', 'Résultat', 'Unité', 'Norme', 'Interprétation']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      columnStyles: { 0: { cellWidth: 10 }, 6: { cellWidth: 30, halign: 'center' } },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.cell.raw) {
          const interpretation = data.cell.raw;
          if (interpretation === 'normal') data.cell.styles.textColor = [34, 197, 94];
          else if (interpretation === 'elevé') data.cell.styles.textColor = [249, 115, 22];
          else if (interpretation === 'bas') data.cell.styles.textColor = [59, 130, 246];
          else if (interpretation === 'critique') {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    if (rapport.qrCode) {
      try {
        const qrDataUrl = await QRCode.toDataURL(rapport.qrCode, { width: 80 });
        doc.addImage(qrDataUrl, 'PNG', pageWidth - 50, finalY, 30, 30);
      } catch { console.warn('⚠️ QR Code non généré'); }
    }

    if (rapport.signature) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Signature:', 14, finalY);
      doc.text(rapport.signature, 40, finalY);
    }

    if (rapport.cachet) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Cachet officiel', 14, finalY + 10);
    }

    if (rapport.notes) {
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text('Notes:', 14, finalY + 30);
      const splitNotes = doc.splitTextToSize(rapport.notes, pageWidth - 30);
      doc.text(splitNotes, 14, finalY + 38);
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document LaboGes : ${utilisateur?.prenom || ''} ${utilisateur?.nom || ''} - ${new Date().toLocaleString()}`,
      pageWidth / 2, 280, { align: 'center' }
    );

    return doc;
  } catch (error) {
    console.error('❌ Erreur génération PDF rapport:', error.message);
    return null;
  }
};