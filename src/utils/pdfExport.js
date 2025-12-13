/**
 * PDF Export Module for Growth Plan Builder
 * 
 * Generates a downloadable PDF of the user's growth plan
 * using jsPDF library.
 * 
 * Usage:
 *   import { generateGrowthPlanPDF } from '../utils/pdfExport';
 *   await generateGrowthPlanPDF(planData, userData);
 */

import { jsPDF } from 'jspdf';
import { DIMENSIONS, DIMENSION_ORDER } from './dimensionData';

// Letter-spacing value (negative = tighter kerning)
// Using a small value to avoid rendering issues
const LETTER_SPACING = -0.01;

/**
 * Load an image and convert to base64 for PDF embedding
 * @param {string} url - Image URL
 * @returns {Promise<string>} - Base64 encoded image data
 */
async function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      try {
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Generate PDF of user's Growth Plan
 * 
 * @param {Object} planData - The plan data
 * @param {number} planData.year - Plan year (e.g., 2026)
 * @param {Object} planData.goals - Goals grouped by dimension
 * @param {Object} userData - User information
 * @param {string} userData.firstName - User's first name
 */
export async function generateGrowthPlanPDF(planData, userData) {
  // Debug logging
  console.log('=== PDF EXPORT START ===');
  console.log('Plan data:', planData);
  console.log('User data:', userData);
  console.log('Goals object:', planData.goals);
  console.log('Goals keys:', Object.keys(planData.goals || {}));
  
  // Create PDF document (8.5" x 11" = 215.9mm x 279.4mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter' // 8.5 x 11 inches
  });

  // Page dimensions
  const pageWidth = 8.5;
  const pageHeight = 11;
  const margin = 0.75;
  const contentWidth = pageWidth - (margin * 2);
  const centerX = pageWidth / 2;
  
  let yPosition = margin;

  // ============================================
  // 1. ADD LOGO AT TOP CENTER
  // ============================================
  try {
    const logoUrl = '/assets/logos/growth-plan-dark.png';
    const logoBase64 = await loadImageAsBase64(logoUrl);
    
    // Logo dimensions with correct 5.72:1 aspect ratio
    const logoWidth = 4.0;
    const logoAspectRatio = 5.72;
    const logoHeight = logoWidth / logoAspectRatio;
    const logoX = (pageWidth - logoWidth) / 2;
    
    doc.addImage(logoBase64, 'PNG', logoX, yPosition, logoWidth, logoHeight);
    yPosition += logoHeight + 0.15;
    console.log('Logo added successfully');
  } catch (error) {
    console.warn('Could not load logo, using text fallback:', error);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('Growth Plan', centerX, yPosition + 0.3, { align: 'center' });
    yPosition += 0.5;
  }

  // ============================================
  // 2. ADD SUBTITLE: "{Name}'s Plan for {Year}"
  // ============================================
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setCharSpace(LETTER_SPACING);
  const subtitle = `${userData.firstName}'s Plan for ${planData.year}`;
  // Use align: 'center' for proper centering
  doc.text(subtitle, centerX, yPosition, { align: 'center' });
  yPosition += 0.45;
  console.log('Subtitle added:', subtitle);

  // ============================================
  // 3. ADD DIMENSIONS & GOALS
  // ============================================
  
  let goalsFound = false;
  
  for (const dimensionKey of DIMENSION_ORDER) {
    const dimensionData = DIMENSIONS[dimensionKey];
    const dimensionGoals = planData.goals[dimensionKey] || [];
    
    console.log(`Processing ${dimensionKey}:`, dimensionGoals.length, 'goals');
    
    // Skip dimensions with no goals
    if (!dimensionGoals || dimensionGoals.length === 0) continue;
    
    goalsFound = true;

    // Check if we need a new page
    if (yPosition > pageHeight - margin - 1.5) {
      doc.addPage();
      yPosition = margin;
    }

    // --- Dimension Header ---
    let iconLoaded = false;
    try {
      const iconUrl = `/assets/logos/${dimensionData.name}-standard.png`;
      const iconBase64 = await loadImageAsBase64(iconUrl);
      const iconSize = 0.35;
      doc.addImage(iconBase64, 'PNG', margin, yPosition, iconSize, iconSize);
      iconLoaded = true;
    } catch (error) {
      console.warn(`Could not load icon for ${dimensionData.name}`);
    }
    
    // Dimension title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setCharSpace(LETTER_SPACING);
    const titleX = iconLoaded ? margin + 0.45 : margin;
    doc.text(`${dimensionData.name} Goals:`, titleX, yPosition + 0.25);
    
    yPosition += 0.75;

    // --- Goals for this dimension ---
    for (const goal of dimensionGoals) {
      const goalName = goal.goal_name || goal.name || 'Unnamed Goal';
      const goalText = goal.goal_text || goal.text || '';
      
      console.log(`  Goal: ${goalName}`);

      // Check page space
      if (yPosition > pageHeight - margin - 0.8) {
        doc.addPage();
        yPosition = margin;
      }

      // Goal name (bold)
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setCharSpace(LETTER_SPACING);
      doc.text(`Goal: ${goalName}`, margin, yPosition);
      yPosition += 0.25;

      // Goal text (normal)
      if (goalText) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setCharSpace(LETTER_SPACING);
        
        // Split text to fit within content width
        const maxWidth = contentWidth * 72; // Convert to points
        const textLines = doc.splitTextToSize(goalText, maxWidth);
        
        for (const line of textLines) {
          if (yPosition > pageHeight - margin - 0.3) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += 0.2;
        }
      }
      
      yPosition += 0.15;
    }

    yPosition += 0.3;
  }
  
  // If no goals were found, add a message
  if (!goalsFound) {
    console.log('No goals found in any dimension');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('No goals have been added to this plan yet.', centerX, yPosition, { align: 'center' });
  }

  // ============================================
  // 4. SAVE PDF
  // ============================================
  const filename = `Growth-Plan-${planData.year}.pdf`;
  doc.save(filename);
  
  console.log('=== PDF EXPORT COMPLETE ===');
  console.log('Filename:', filename);

  return filename;
}

/**
 * Alternative: Open PDF in new tab with print dialog
 */
export async function printGrowthPlanPDF(planData, userData) {
  const doc = await generateGrowthPlanPDFDocument(planData, userData);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}
