import { jsPDF } from "jspdf";
import { DecryptedLabRecord, DecryptedLabProfile } from "../types";
import { CLINICAL_PANELS, evaluateMetric, calculateAgeDescription, calculateAge } from "./clinicalCalculations";
import { AVAILABLE_EXAMS, getExamPrice, getMetricIdsForExam, getActiveExamsList } from "../components/PatientReceptionForm";

export function generateClinicalPDF(
  recordParam: DecryptedLabRecord,
  profile: DecryptedLabProfile,
  targetExamId?: string,
  chemistryLayout?: "compact" | "continuous" | "individual"
): jsPDF {
  let record = { ...recordParam };
  let originalSelectedIds = record.selectedMetricIds ? [...record.selectedMetricIds] : [];
  let expandedSelectedIds: string[] = [];
  
  const localGetConstituentIds = (mId: string): string[] => {
    if (mId === "combo_t4_t3_tsh_tot") return ["t3_total", "t4_total", "tsh_ultrasensible"];
    if (mId === "combo_t4_t3_tsh_lib") return ["t3_libre", "t4_libre", "tsh_ultrasensible"];
    if (mId === "combo_insulina") return ["insulina_pre", "insulina_post"];
    if (mId === "combo_cortisol") return ["cortisol_am", "cortisol_pm"];
    if (mId === "combo_perfil_lipidico_full") return ["colesterol_tot", "colesterol_hdl", "colesterol_ldl", "colesterol_vldl", "trigliceridos_quim"];
    if (mId === "combo_tgo_bil_tgp") return ["tgo_ast", "bilirrubina_total", "bilirrubina_directa", "bilirrubina_indirecta", "tgp_alt"];
    if (mId === "combo_sodio_potasio") return ["sodio_serico", "potasio_serico"];
    if (mId === "combo_sodio_potasio_cloro") return ["sodio_serico", "potasio_serico", "cloro_serico"];
    if (mId === "combo_sodio_potasio_cloro_calcio") return ["sodio_serico", "potasio_serico", "cloro_serico", "calcio_serico"];
    if (mId === "combo_tp_tpt") return ["tp", "tpt"];
    if (mId === "combo_tp_tpt_fib") return ["tp", "tpt", "fibrinogeno"];
    if (mId === "combo_bilirrubinas") return ["bilirrubina_total", "bilirrubina_directa", "bilirrubina_indirecta"];
    if (mId === "tolerancia_2h") return ["tg_basal", "tg_1h", "tg_2h"];
    if (mId === "tolerancia_3h") return ["tg_basal", "tg_1h", "tg_2h", "tg_3h"];
    if (mId === "tolerancia_4h") return ["tg_basal", "tg_1h", "tg_2h", "tg_3h", "tg_4h"];
    if (mId === "tolerancia_5h") return ["tg_basal", "tg_1h", "tg_2h", "tg_3h", "tg_4h", "tg_5h"];
    
    const resolved = getMetricIdsForExam(mId);
    if (resolved.length === 1 && resolved[0] === mId) {
      return [mId];
    }
    return resolved;
  };

  originalSelectedIds.forEach(mId => {
    if (mId.startsWith("combo_") || mId.startsWith("tolerancia_")) {
      const subIds = localGetConstituentIds(mId);
      subIds.forEach(sId => {
        if (!expandedSelectedIds.includes(sId)) {
          expandedSelectedIds.push(sId);
        }
      });
    } else {
      if (!expandedSelectedIds.includes(mId)) {
        expandedSelectedIds.push(mId);
      }
    }
  });

  record.selectedMetricIds = expandedSelectedIds;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // PREMIUM DESIGN CODES - THE "CLINICAL IDENTITY" (DYNAMIC THEME COLORS)
  let primaryR = 88, primaryG = 28, primaryB = 135;
  let accentR = 124, accentG = 58, accentB = 237;
  let darkSlateR = 46, darkSlateG = 16, darkSlateB = 101;
  let panelBgR = 250, panelBgG = 245, panelBgB = 255;
  let panelTextR = 109, panelTextG = 40, panelTextB = 217;

  const theme = profile.themeColor || "blue"; // Default to blue
  if (theme === "blue") {
    primaryR = 30; primaryG = 58; primaryB = 138;       // Deep Royal Blue
    accentR = 37; accentG = 99; accentB = 235;          // Blue 600
    darkSlateR = 30; darkSlateG = 41; darkSlateB = 59;   // Slate 700
    panelBgR = 240; panelBgG = 249; panelBgB = 255;     // Sky 50
    panelTextR = 3; panelTextG = 105; panelTextB = 161;  // Sky 700
  } else if (theme === "teal") {
    primaryR = 17; primaryG = 94; primaryB = 89;        // Teal 800
    accentR = 13; accentG = 148; accentB = 136;         // Teal 600
    darkSlateR = 19; darkSlateG = 78; darkSlateB = 74;   // Teal 900
    panelBgR = 240; panelBgG = 253; panelBgB = 250;     // Teal 50
    panelTextR = 15; panelTextG = 118; panelTextB = 110; // Teal 700
  }

  // Price calculation helper maps to profile pricing catalog
  const getPanelPrice = (panelId: string): number => {
    if (record.isDoctorSV) return 0;
    if (!profile.examPrices) return 10;
    
    const mapping: Record<string, string> = {
      "hematologia": "hemograma",
      "uroanalisis_embarazo": "ego",
      "coproanalisis": "heces",
      "química_y_diabetes": "quimica_basica",
      "perfil_lipidico": "perfil_lipidico",
      "perfil_hepatico": "perfil_hepatico",
      "funcion_renal": "funcion_renal",
      "urocultivo": "urocultivo",
      "coprocultivo": "coprocultivo",
      "cultivo_faringeo": "cultivo_faringeo",
      "secreciones_varias": "secreciones_varias",
      "espermograma": "espermograma",
      "miscelaneo": "miscelaneo"
    };
    
    const priceKey = mapping[panelId] || panelId;
    return profile.examPrices[priceKey] ?? 10;
  };

  let currentY = 12;
  let pageCount = 0;

  // Formatting date and time securely with local standard fallback
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "---";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "---";
      const pad = (n: number) => n.toString().padStart(2, "0");
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      let h = d.getHours();
      const m = pad(d.getMinutes());
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12;
      h = h ? h : 12;
      return `${day}-${month}-${year} ${pad(h)}:${m} ${ampm}`;
    } catch {
      return "---";
    }
  };

  // Modern clinical grid cell renderer for clean 2-column demographics
  const drawGridCell = (
    x: number, 
    y: number, 
    w: number, 
    title: string, 
    value: string, 
    boldValue: boolean = false, 
    valueColor?: [number, number, number]
  ) => {
    // Smooth blue/violet cell header
    doc.setFillColor(primaryR, primaryG, primaryB);
    doc.rect(x, y, w, 3.8, "F");

    // Clear border line
    doc.setDrawColor(200, 205, 218);
    doc.setLineWidth(0.18);
    doc.rect(x, y, w, 9.5, "D");

    // Title label in white
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), x + 2.5, y + 2.7);

    // Dynamic computed values in bold slate
    doc.setFont("Helvetica", boldValue ? "bold" : "normal");
    doc.setFontSize(7.5);
    if (valueColor) {
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    } else {
      doc.setTextColor(15, 23, 42); // slate 900
    }
    doc.text(value, x + 2.5, y + 7.5);
  };

  // Subtle clean vector double-ring diagnostic watermark
  const drawSubtleWatermark = () => {
    const cx = pageWidth / 2;
    const cy = pageHeight / 2 + 15;
    
    doc.setDrawColor(246, 245, 251); // extremely faint violet-gray
    doc.setLineWidth(0.25);
    doc.circle(cx, cy, 38, "D"); // Outer Ring
    
    doc.setLineWidth(0.12);
    doc.circle(cx, cy, 35, "D"); // Inner Ring

    doc.setDrawColor(246, 245, 251);
    doc.setLineWidth(0.4);
    
    // Heartbeat clinical pulse line
    doc.line(cx - 30, cy, cx - 12, cy); 
    doc.line(cx - 12, cy, cx - 9, cy - 7); 
    doc.line(cx - 9, cy - 7, cx - 6, cy + 9); 
    doc.line(cx - 6, cy + 9, cx - 3, cy - 1); 
    doc.line(cx - 3, cy - 1, cx, cy); 
    doc.line(cx, cy, cx + 30, cy); 
    
    // Abstract clinical cross sign
    doc.setLineWidth(0.8);
    doc.line(cx, cy - 24, cx, cy - 16);
    doc.line(cx - 4, cy - 20, cx + 4, cy - 20);
  };

  // 1. Render Improved Letterhead (Membreado)
  const renderHeader = () => {
    // Top primary ribbon
    doc.setFillColor(primaryR, primaryG, primaryB);
    doc.rect(margin, currentY - 5, pageWidth - (margin * 2), 1.2, "F");

    let logoWidthToUse = 16;
    if (profile.customLogo && profile.customLogo.startsWith("data:image")) {
      try {
        const formatFlag = profile.customLogo.includes("/png") ? "PNG" : "JPEG";
        let logW = 16;
        let logH = 13;
        try {
          const props = (doc as any).getImageProperties(profile.customLogo);
          if (props && props.width && props.height) {
            const ratio = props.width / props.height;
            logH = logW / ratio;
            if (logH > 13) {
              logH = 13;
              logW = logH * ratio;
            }
          }
        } catch (e) {}
        logoWidthToUse = logW;
        doc.addImage(profile.customLogo, formatFlag, margin, currentY - 1, logW, logH);
      } catch (err) {
        console.warn("Custom logo info/fallback used:", err);
        doc.setFillColor(primaryR, primaryG, primaryB); 
        doc.roundedRect(margin, currentY - 1, 16, 13, 1.2, 1.2, "F");
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.85);
        doc.line(margin + 4.5, currentY + 5.5, margin + 11.5, currentY + 5.5);
        doc.line(margin + 8.0, currentY + 2.0, margin + 8.0, currentY + 9.0);
      }
    } else {
      // Elegant clinical shield monogram fallback
      doc.setFillColor(primaryR, primaryG, primaryB); 
      doc.roundedRect(margin, currentY - 1, 16, 13, 1.2, 1.2, "F");
      
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.85);
      doc.line(margin + 4.5, currentY + 5.5, margin + 11.5, currentY + 5.5);
      doc.line(margin + 8.0, currentY + 2.0, margin + 8.0, currentY + 9.0);
      
      doc.setFillColor(accentR, accentG, accentB);
      doc.circle(margin + 12.2, currentY + 10.0, 1.1, "F");
      logoWidthToUse = 16;
    }

    // Left Typographies
    const textStart = margin + logoWidthToUse + 4;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text(profile.labName ? profile.labName.toUpperCase() : "LABORATORIO CLÍNICO TORRES", textStart, currentY + 3.0);

    doc.setFont("Helvetica", "oblique");
    doc.setFontSize(7.6);
    doc.setTextColor(accentR, accentG, accentB);
    doc.text(profile.slogan || "Calidad y Precisión Diagnóstica", textStart, currentY + 6.5);

    doc.setFillColor(accentR, accentG, accentB);
    doc.roundedRect(textStart, currentY + 8.4, 32, 3.6, 0.6, 0.6, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text("INSCRIPCIÓN CSSP 3085", textStart + 16, currentY + 11.0, { align: "center" });

    // Right Parallel Aligned Panel (Address & phone right aligned)
    const rightSideX = pageWidth - margin;
    let rightY = currentY + 1.8;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.0);
    doc.setTextColor(85, 90, 100);

    if (profile.address) {
      const splitAddr = doc.splitTextToSize(profile.address, 70);
      splitAddr.forEach((line: string) => {
        doc.text(line, rightSideX, rightY, { align: "right" });
        rightY += 2.8;
      });
    }

    let contactLine = "";
    if (profile.phone) contactLine += `Tel: ${profile.phone}   `;
    if (profile.email) contactLine += `Email: ${profile.email.toLowerCase()}`;
    
    if (contactLine.trim()) {
      doc.text(contactLine, rightSideX, rightY, { align: "right" });
      rightY += 2.8;
    }

    const jvplcKey = profile.processedByReg || "J.V.P.L.C. No. 5281";
    const jvplcUser = profile.processedBy || "Lic. Herberth Josué Castellón Peña";
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text(`${jvplcUser}  •  ${jvplcKey}`, rightSideX, rightY + 1.0, { align: "right" });

    // Dual lines separator
    currentY += 15.5;
    doc.setDrawColor(primaryR, primaryG, primaryB);
    doc.setLineWidth(0.7);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    doc.setDrawColor(235, 235, 245);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + 0.4, pageWidth - margin, currentY + 0.4);
    
    currentY += 3.5;
  };

  // 2. Render Patient Demographics Card (On top of every exam page)
  const renderPatientCard = (examName: string = "REPORTE DE LABORATORIO") => {
    // Section Header 
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.0);
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text("INFORME OFICIAL DE RESULTADOS ANALÍTICOS", margin, currentY);
    currentY += 2.8;

    const boxW = (pageWidth - (margin * 2) - 3) / 2;
    const leftBoxX = margin;
    const rightBoxX = margin + boxW + 3;

    // Row definitions
    const ageStr = calculateAgeDescription(record.patientBirthdate);
    const birthdateFormatted = (() => {
      if (!record.patientBirthdate) return "No registrada";
      // Ensure we only read the YYYY-MM-DD portion (first 10 characters)
      const cleanDate = record.patientBirthdate.substring(0, 10);
      const parts = cleanDate.split(/[-/\s]+/);
      if (parts.length >= 3) {
        // If the first part is 4 digits, it's Year-Month-Day (YYYY-MM-DD)
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1]}-${parts[2]}`;
        }
        // If the third part is 4 digits, swap to Year-Month-Day (YYYY-MM-DD)
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      return cleanDate;
    })();
    const expedienteStr = record.billing?.ticketNumber || record.id.slice(0, 5).toUpperCase();
    const idCardStr = record.patientIdCard || "REGISTRO PARTICULAR";
    const sexStr = record.patientSex.toLowerCase() === "femenino" ? "Femenino" : "Masculino";
    const revisorStr = profile.processedBy || "Lic. Herberth Josué Castellón Peña";
    const statusStr = record.isPending ? "Pendiente" : "Validado";

    const receptionTimeFormatted = formatDateTime(record.receptionTime);
    const reportTimeFormatted = formatDateTime(record.reportedTime || record.updatedAt || record.createdAt);

    // Row 1
    drawGridCell(leftBoxX, currentY, boxW * 0.72, "Nombre del paciente", record.patientName.toUpperCase(), true);
    drawGridCell(leftBoxX + boxW * 0.72, currentY, boxW * 0.28, "Edad", ageStr);
    
    drawGridCell(rightBoxX, currentY, boxW, "Nombre del Médico", (record.doctorName || "SOLICITANTE PARTICULAR").toUpperCase(), true);

    // Row 2
    drawGridCell(leftBoxX, currentY + 9.5, boxW * 0.32, "Fecha de nacimiento", birthdateFormatted);
    drawGridCell(leftBoxX + boxW * 0.32, currentY + 9.5, boxW * 0.38, "Número de Identidad", idCardStr);
    drawGridCell(leftBoxX + boxW * 0.70, currentY + 9.5, boxW * 0.30, "Género", sexStr);

    drawGridCell(rightBoxX, currentY + 9.5, boxW * 0.50, "Fecha/Hora de recepción", receptionTimeFormatted);
    drawGridCell(rightBoxX + boxW * 0.50, currentY + 9.5, boxW * 0.50, "Fecha/Hora de informe", reportTimeFormatted);

    // Row 3
    drawGridCell(leftBoxX, currentY + 19.0, boxW * 0.70, "Revisado por", revisorStr);
    drawGridCell(leftBoxX + boxW * 0.70, currentY + 19.0, boxW * 0.30, "Estado", statusStr, true, record.isPending ? [194, 120, 3] : [4, 120, 87]);

    drawGridCell(rightBoxX, currentY + 19.0, boxW, "Nombre del Examen / Categoría", examName.toUpperCase(), true, [primaryR, primaryG, primaryB]);

    currentY += 28.5 + 4.5;
  };

  // Custom function to create page with letterhead and patient block
  const initNewPage = (currentExamName?: string) => {
    if (pageCount > 0) {
      doc.addPage();
    }
    pageCount++;
    currentY = 12; // Start fresh Y coordinate
    renderHeader();
    renderPatientCard(currentExamName);
    drawSubtleWatermark();
  };

  // Filter active exams having data or registered at reception
  let activeExams = getActiveExamsList(profile).filter(exam => {
    const examMetricIds = getMetricIdsForExam(exam.id);
    
    // Check if specifically selected in reception
    if (record.selectedMetricIds && record.selectedMetricIds.length > 0) {
      return examMetricIds.some(mId => record.selectedMetricIds!.includes(mId));
    }
    
    // Fallback: check if has any reported values in the panels
    const panelData = record.panels[exam.panelId];
    if (!panelData) return false;
    
    return examMetricIds.some(mId => {
      const val = panelData.values[mId];
      return val && val.trim() !== "" && val !== "-";
    });
  });

  if (targetExamId) {
    activeExams = activeExams.filter(exam => exam.id === targetExamId);
  }

  const isChemistryPanel = (panelId: string) => panelId === "quimica_sanguinea_enzimas" || panelId === "química_y_diabetes";

  // Consolidate chemistry exams in combined layout, compact layout, or when downloading a complete single PDF
  if (chemistryLayout === "compact" || chemistryLayout === "continuous" || (!targetExamId && chemistryLayout !== "individual")) {
    const chemistryExams = activeExams.filter(e => isChemistryPanel(e.panelId));
    if (chemistryExams.length > 0) {
      const unifiedChemExam = {
        id: "unified_chemistry_exam",
        name: "Química Clínica",
        panelId: "quimica_sanguinea_enzimas",
        isUnifiedChemistry: true,
        metricIds: chemistryExams.flatMap(e => getMetricIdsForExam(e.id))
      };
      activeExams = [
        ...activeExams.filter(e => !isChemistryPanel(e.panelId)),
        unifiedChemExam
      ] as any;
    }
  }

  // Helper inside to draw signature and stamp block on the current active page
  const renderSignatureAndStampBlock = (sY: number) => {
    const sigLineW = 60;
    const leftSigX = margin + 10;
    const rightSealX = pageWidth - margin - 50;

    // 1) SIGNATURE AND LABORATORIAN SEAL
    if (profile.signatureSeal && profile.signatureSeal.startsWith("data:image")) {
      try {
        const sigFormat = profile.signatureSeal.includes("/png") ? "PNG" : "JPEG";
        const sW = profile.sigWidth ?? 40; // Default to requested 4.0cm = 40mm
        let sH = profile.sigHeight ?? 18; // Default to requested 1.8cm = 18mm
        try {
          const props = (doc as any).getImageProperties(profile.signatureSeal);
          if (props && props.width && props.height) {
            const ratio = props.width / props.height;
            sH = profile.sigHeight ?? (sW / ratio);
          }
        } catch (e) {
          console.warn("Could not extract image properties for signature, using fallbacks", e);
        }
        const sX = leftSigX + 5 + (profile.sigXOffset ?? 0);
        const sYImg = sY - 5 + (profile.sigYOffset ?? 0);
        doc.addImage(profile.signatureSeal, sigFormat, sX, sYImg, sW, sH);
      } catch (err) {
        console.warn("Signature render skipped or failed in PDF generation:", err);
      }
    } else {
      // 4.0 cm wide by 1.8 cm high (40mm x 18mm) official laboratorian seal fallback
      const sX = leftSigX + 10;
      const sYImg = sY - 8;
      const sW = 40;
      const sH = 18;

      // Draw stamp border in classic stamp blue ink
      doc.setDrawColor(44, 102, 196); // Stamp blue ink
      doc.setLineWidth(0.35);
      doc.rect(sX, sYImg, sW, sH, "D");

      // Set text coloring and font for the ink print
      doc.setTextColor(44, 102, 196);
      const centerX = sX + (sW / 2);

      // Line 1: Name of laboratorian stamp content
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(6.2);
      doc.text("Lic. Herberth Josué Castellón Peña", centerX, sYImg + 4.2, { align: "center" });

      // Line 2: Degree/Specialty description
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(4.8);
      doc.text("LICENCIADO EN LABORATORIO CLINICO", centerX, sYImg + 8.5, { align: "center" });

      // Line 3: Professional Board Registration Number
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(6.2);
      doc.text("J.V.P.L.C. No. 5281", centerX, sYImg + 13.5, { align: "center" });

      // Draw an elegant vector scribble signature crossing through the stamp in deep ink blue
      doc.setDrawColor(20, 50, 125);
      doc.setLineWidth(0.42);
      
      // Authentic looking handwritten looping path representing the signature
      doc.line(sX + 6, sYImg + 14, sX + 15, sYImg + 3);
      doc.line(sX + 15, sYImg + 3, sX + 11, sYImg + 16);
      doc.line(sX + 11, sYImg + 16, sX + 20, sYImg + 2);
      doc.line(sX + 20, sYImg + 2, sX + 23, sYImg + 15);
      doc.line(sX + 23, sYImg + 15, sX + 34, sYImg + 9);
      // Sweeping accent stroke
      doc.line(sX + 8, sYImg + 11, sX + 32, sYImg + 7);
    }

    doc.setLineWidth(0.3);
    doc.setDrawColor(180, 185, 195);
    doc.line(leftSigX, sY + 12, leftSigX + sigLineW, sY + 12);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(darkSlateR, darkSlateG, darkSlateB);
    
    const signerName = profile.processedBy || record.doctorName || "Lic. Herberth Josué Castellón Peña";
    const signerTitle = profile.processedByTitle || "Licenciado en Laboratorio Clínico";
    const signerReg = profile.processedByReg || "J.V.P.L.C. No. 5281";

    doc.text(signerName.toUpperCase(), leftSigX, sY + 16);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(110, 115, 125);
    doc.text(signerTitle, leftSigX, sY + 19.2);
    doc.text(signerReg, leftSigX, sY + 22.4);

    // 2) STAMP AND CLINICAL LABORATORY SEAL
    if (profile.labSeal && profile.labSeal.startsWith("data:image")) {
      try {
        const sealFormat = profile.labSeal.includes("/png") ? "PNG" : "JPEG";
        const slW = profile.sealWidth ?? 47; // Default to requested 4.7cm = 47mm
        let slH = profile.sealHeight ?? 18; // Default to requested 1.8cm = 18mm
        try {
          const props = (doc as any).getImageProperties(profile.labSeal);
          if (props && props.width && props.height) {
            const ratio = props.width / props.height;
            slH = profile.sealHeight ?? (slW / ratio);
          }
        } catch (e) {
          console.warn("Could not extract image properties for seal, using fallbacks", e);
        }
        const slX = rightSealX + 2 + (profile.sealXOffset ?? 0);
        const slY = sY - 5 + (profile.sealYOffset ?? 0);
        doc.addImage(profile.labSeal, sealFormat, slX, slY, slW, slH);
      } catch (err) {
        console.warn("Stamp render skipped or failed in PDF generation:", err);
      }
    } else {
      // 4.7 cm wide by 1.8 cm high (47mm x 18mm) official laboratory stamp fallback
      const slX = rightSealX + 2;
      const slY = sY - 8;
      const slW = 47;
      const slH = 18;

      // Draw stamp border in rich midnight ink blue
      doc.setDrawColor(15, 30, 95);  // Midnight stamp ink
      doc.setLineWidth(0.4);
      doc.rect(slX, slY, slW, slH, "D");

      // Set text ink print color and dimensions
      doc.setTextColor(15, 30, 95);
      const centerSealX = slX + (slW / 2);

      // Line 1: República de El Salvador
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(4.3);
      doc.text("República de El Salvador", centerSealX, slY + 3.1, { align: "center" });

      // Line 2: Board authorization
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(5.0);
      doc.text("C. S. S. P.", centerSealX, slY + 5.9, { align: "center" });

      // Line 3: Lab Name
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(6.2);
      doc.text(profile.labName ? profile.labName.toUpperCase() : "LABORATORIO CLÍNICO TORRES", centerSealX, slY + 9.2, { align: "center" });

      // Line 4: Inscripción id
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(4.8);
      doc.text("Nº Inscripción 3085", centerSealX, slY + 12.0, { align: "center" });

      // Line 5: Prop. TEC. ANA RUTH ORELLANA DE MARTÍNEZ
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(3.8);
      doc.text("Prop. TEC. ANA RUTH ORELLANA DE MARTÍNEZ", centerSealX, slY + 14.5, { align: "center" });

      // Line 6: Bottom aligned location details (SANTA ANA CENTRO / SANTA ANA)
      doc.text("SANTA ANA CENTRO.", slX + 2, slY + 17.0);
      doc.text("SANTA ANA", slX + slW - 2, slY + 17.0, { align: "right" });
    }
  };

  // Helper to calculate a vertical push offset to center a single exam perfectly
  const getSingleExamCenterOffset = (examObj: any) => {
    // Aligns everything tightly at the top beneath the profile card as requested (high space efficiency)
    return 0;
  };

  // Check if we are downloading a complete/combined PDF (no targetExamId) and not explicitly asked for individual
  const isContinuous = !targetExamId && chemistryLayout !== "individual";

  if (record.isPending) {
    initNewPage();
    
    // Draw "COMPROBANTE DE ADMISIÓN Y RECIBO" header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text("DOCUMENTO DE CAJA: COMPROBANTE DE ADMISIÓN Y RECIBO DE PAGO", margin, currentY);
    currentY += 4.5;

    // Draw an elegant explanation of the document
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 90);
    doc.text(
      "Este documento confirma la recepción y registro idóneo del paciente en el sistema del Laboratorio Clínico.",
      margin,
      currentY
    );
    currentY += 6;

    // Table of selected exams
    // Header for details table
    const tableHeaderY = currentY;
    doc.setFillColor(primaryR, primaryG, primaryB);
    doc.rect(margin, tableHeaderY, pageWidth - (margin * 2), 6, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("DESCRIPCIÓN DEL EXAMEN ADMITIDO", margin + 4, tableHeaderY + 4.2);
    doc.text("TIPO", margin + 110, tableHeaderY + 4.2);
    doc.text("VALOR COBRADO", pageWidth - margin - 22, tableHeaderY + 4.2, { align: "right" });
    
    currentY = tableHeaderY + 6;

    // Retrieve active exams list for this record
    let subtotal = 0;
    
    // Iterate over active exams and render rows
    const pendingExams = getActiveExamsList(profile).filter(exam => {
      const examMetricIds = getMetricIdsForExam(exam.id);
      if (record.selectedMetricIds && record.selectedMetricIds.length > 0) {
        return examMetricIds.some(mId => record.selectedMetricIds!.includes(mId));
      }
      return false;
    });

    if (pendingExams.length === 0) {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("No se seleccionaron pruebas o exámenes específicos para la admisión.", margin + 4, currentY + 5);
      currentY += 10;
    } else {
      pendingExams.forEach((exam, index) => {
        // Draw alternate gray row background
        if (index % 2 === 1) {
          doc.setFillColor(247, 246, 251);
          doc.rect(margin, currentY, pageWidth - (margin * 2), 5.5, "F");
        }
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(40, 40, 50);
        doc.text(exam.name.toUpperCase(), margin + 4, currentY + 3.8);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(90, 90, 100);
        let category = "Química / General";
        if (exam.panelId === "hematologia") category = "Hematología";
        else if (exam.panelId === "uroanalisis_embarazo" || exam.panelId === "coproanalisis") category = "Uroanálisis / Heces";
        else if (exam.id.includes("cultivo") || exam.panelId.includes("cultivo")) category = "Microbiología / Cultivo";
        
        doc.text(category, margin + 110, currentY + 3.8);

        const examPrice = getExamPrice(exam, profile);
        subtotal += examPrice;

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 30, 30);
        doc.text(`$${examPrice.toFixed(2)}`, pageWidth - margin - 4, currentY + 3.8, { align: "right" });
        
        currentY += 5.5;
      });
    }

    currentY += 4;

    // Financial calculations box (Total summary)
    const summaryWidth = 72;
    const summaryHeight = 18;
    const summaryX = pageWidth - margin - summaryWidth;
    
    doc.setDrawColor(220, 220, 230);
    doc.setFillColor(252, 252, 254);
    doc.rect(summaryX, currentY, summaryWidth, summaryHeight, "DF");

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(80, 80, 90);
    doc.text("SUBTOTAL CAJA:", summaryX + 4, currentY + 4.5);
    doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin - 4, currentY + 4.5, { align: "right" });

    doc.text("MÉTODO DE PAGO:", summaryX + 4, currentY + 9);
    const payMethod = record.billing?.paymentMethod ? record.billing.paymentMethod.toUpperCase() : "EFECTIVO";
    doc.setFont("Helvetica", "bold");
    doc.text(payMethod, summaryX + 32, currentY + 9);

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text("TOTAL NETO PAGADO:", summaryX + 4, currentY + 14);
    doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin - 4, currentY + 14, { align: "right" });

    // Payment badge on top-left of financial box
    const isPaid = record.billing ? record.billing.isPaid : true;
    doc.setFillColor(isPaid ? 220 : 254, isPaid ? 252 : 243, isPaid ? 240 : 243);
    doc.roundedRect(summaryX - 42, currentY, 38, 8, 1, 1, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(isPaid ? 4 : 153, isPaid ? 120 : 27, isPaid ? 87 : 27);
    doc.text(isPaid ? "PAGADO / CAJA" : "PEND. DE PAGO", summaryX - 39, currentY + 5.5);

    currentY += summaryHeight + 8;

    // Disclaimer message card
    doc.setFillColor(panelBgR, panelBgG, panelBgB);
    doc.setDrawColor(240, 230, 250);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 12, "DF");
    
    doc.setFont("Helvetica", "oblique");
    doc.setFontSize(7);
    doc.setTextColor(panelTextR, panelTextG, panelTextB);
    
    const disclaimerLines = doc.splitTextToSize(
      "INFORMACIÓN PARA EL PACIENTE: Este comprobante impreso acredita que su orden de servicio ha sido debidamente ingresada al laboratorio clínico. El proceso analítico se ejecuta bajo estrictas directrices de bioseguridad y aseguramiento de calidad de análisis. Conserve este ticket con firma autorizada para retirar sus resultados.",
      pageWidth - (margin * 2) - 8
    );
    doc.text(disclaimerLines, margin + 4, currentY + 4.2);

    currentY += 20;

    // Signoffs
    const sigLineW = 50;
    const sigL = margin + 15;
    const sigR = pageWidth - margin - 15 - sigLineW;
    
    doc.setDrawColor(180, 180, 190);
    doc.setLineWidth(0.35);
    doc.line(sigL, currentY, sigL + sigLineW, currentY);
    doc.line(sigR, currentY, sigR + sigLineW, currentY);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 110);
    doc.text("FIRMA PACIENTE O TUTOR", sigL + 8, currentY + 3.5);
    doc.text("ENTREGADO / CAJERO", sigR + 10, currentY + 3.5);

    // Footer page count or date
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(`Impreso el ${new Date().toLocaleDateString("es-ES")} - Generado por Sistema de ${profile.labName || "Laboratorio Torres"}`, margin + 4, pageHeight - 8);

    return doc;
  }

  if (activeExams.length === 0) {
    initNewPage();
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text("Sin análisis clínicos reportados en este documento.", margin + 10, currentY);
  } else {
    if (isContinuous) {
      // For continuous, we initialize the first page once before the loop
      initNewPage();
      // Apply center offset if there is only 1 exam
      currentY += getSingleExamCenterOffset(activeExams[0]);
    }

    let prevExamWasIsolated = false;

    activeExams.forEach((exam, examIdx) => {
      let panelConfig = CLINICAL_PANELS.find(p => p.id === exam.panelId);
      if ((exam as any).isUnifiedChemistry) {
        const p1 = CLINICAL_PANELS.find(p => p.id === "quimica_sanguinea_enzimas");
        const p2 = CLINICAL_PANELS.find(p => p.id === "química_y_diabetes");
        panelConfig = {
          id: "quimica_sanguinea_enzimas",
          name: "Química Sanguínea",
          description: "Química Sanguínea",
          metrics: [
            ...(p1?.metrics || []),
            ...(p2?.metrics || [])
          ]
        };
      }

      let pValues = record.panels[exam.panelId]?.values || {};
      if ((exam as any).isUnifiedChemistry) {
        pValues = {
          ...(record.panels["quimica_sanguinea_enzimas"]?.values || {}),
          ...(record.panels["química_y_diabetes"]?.values || {})
        };
      }

      const examMetricIds = (exam as any).isUnifiedChemistry 
        ? ((exam as any).metricIds || []) 
        : getMetricIdsForExam(exam.id);

      // Calculate approximate height of metrics to see if they fit smoothly
      let metricsCount = 1;
      if (exam.panelId !== "miscelaneo" && panelConfig) {
        const metricsToRender = panelConfig.metrics.filter(m => {
          const isPartOfExam = examMetricIds.includes(m.id);
          if (!isPartOfExam) return false;
          if (record.selectedMetricIds && record.selectedMetricIds.length > 0) {
            return record.selectedMetricIds.includes(m.id);
          }
          return true;
        });
        metricsCount = metricsToRender.length;
      }

      // Height block check: banner (5) + table header (4.5) + metrics (row count * 4.2) + safe gap (6)
      const neededHeight = 5 + 4.5 + (metricsCount * 4.2) + 6;

      if (!isContinuous) {
        // Individual style: force clean new page
        initNewPage();
      } else if (examIdx > 0) {
        // Continuous style: break paper ONLY if the next exam will overflow the available space
        if (currentY + neededHeight > pageHeight - 44) {
          initNewPage();
        } else {
          currentY += 5.0; // tight, neat spacer between continuous tests on the same page
        }
      }

      // Section Header Banner containing EXAM NAME
      doc.setFillColor(panelBgR, panelBgG, panelBgB);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 5, "F");
      
      doc.setFillColor(primaryR, primaryG, primaryB);
      doc.rect(margin, currentY, 1.2, 5, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(primaryR, primaryG, primaryB);
      doc.text(exam.name.toUpperCase(), margin + 3, currentY + 3.6);

      currentY += 5.5;

      // Set column widths
      let colWidths = {
        name: 65,
        result: 32,
        unit: 22,
        ref: 70
      };

      const isCulturePanel = [
        "urocultivo",
        "coprocultivo",
        "cultivo_faringeo",
        "secreciones_varias"
      ].includes(exam.panelId);

      if (isCulturePanel) {
        colWidths = {
          name: 50,
          result: 75,
          unit: 22,
          ref: 42
        };
      }

      // X centers for columnar alignments
      const valX = margin + colWidths.name + (colWidths.result / 2);
      const unitX = margin + colWidths.name + colWidths.result + (colWidths.unit / 2);
      const refX = margin + colWidths.name + colWidths.result + colWidths.unit + 3;

      // Local helpers for structured table column headers and subclass partitions
      const drawTableHeader = () => {
        doc.setFillColor(primaryR, primaryG, primaryB);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 4.5, "F");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("PRUEBA / PARÁMETRO", margin + 2.5, currentY + 3.2);
        doc.text("RESULTADO", valX, currentY + 3.2, { align: "center" });
        doc.text("UNIDADES", unitX, currentY + 3.2, { align: "center" });
        doc.text("RANGOS DE REFERENCIA", refX, currentY + 3.2);

        currentY += 4.5;
      };

      const drawSectionSubheader = (title: string) => {
        if (currentY > pageHeight - 48) {
          doc.addPage();
          currentY = 15;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.2);
          doc.setTextColor(140, 140, 140);
          doc.text(`Paciente: ${record.patientName.toUpperCase()}  |-- CONTINUACIÓN REPORTE`, margin, 10);
          doc.setDrawColor(210, 215, 220);
          doc.setLineWidth(0.2);
          doc.line(margin, 12, pageWidth - margin, 12);
          
          drawTableHeader();
          drawSubtleWatermark();
        }

        // Subhead strip background
        doc.setFillColor(242, 243, 248);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 4.3, "F");

        doc.setDrawColor(200, 205, 218);
        doc.setLineWidth(0.18);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        doc.line(margin, currentY + 4.3, pageWidth - margin, currentY + 4.3);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(6.8);
        doc.setTextColor(primaryR, primaryG, primaryB);
        doc.text(title.toUpperCase(), margin + 2.5, currentY + 3.1);

        currentY += 4.3;
      };

      // Table Parameter column headers drawing
      drawTableHeader();

      const patientAgeInYears = Math.max(1, calculateAge(record.patientBirthdate, record.examDate));

      if (exam.panelId === "miscelaneo") {
        const idx = exam.id.replace("misc_value_", "");
        const name = pValues[`misc_title_${idx}`] || exam.name;
        const valStr = pValues[`misc_value_${idx}`] || "-";
        const unit = pValues[`misc_unit_${idx}`] || "";
        const refText = pValues[`misc_ref_${idx}`] || "N/A";

        // Calculate dynamic line wraps for all columns
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        const nameLines: string[] = doc.splitTextToSize(name, colWidths.name - 4);
        const valLines: string[] = doc.splitTextToSize(valStr, colWidths.result - 2);
        
        doc.setFontSize(7.2);
        const unitLines: string[] = doc.splitTextToSize(unit, colWidths.unit - 2);
        const refLines: string[] = doc.splitTextToSize(refText, colWidths.ref - 4);

        const maxLines = Math.max(nameLines.length, valLines.length, unitLines.length, refLines.length);
        const rHeight = 1.2 + (maxLines * 3.5);

        if (currentY + rHeight > pageHeight - 44) {
          doc.addPage();
          currentY = 15;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.2);
          doc.setTextColor(140, 140, 140);
          doc.text(`Paciente: ${record.patientName.toUpperCase()}  |-- CONTINUACIÓN REPORTE`, margin, 10);
          doc.setDrawColor(210, 215, 220);
          doc.setLineWidth(0.2);
          doc.line(margin, 12, pageWidth - margin, 12);
          
          drawTableHeader();
          drawSubtleWatermark();
        }

        doc.setDrawColor(230, 232, 242);
        doc.setLineWidth(0.12);
        doc.line(margin, currentY + rHeight, pageWidth - margin, currentY + rHeight);

        // Name lines
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(33, 37, 41);
        nameLines.forEach((line: string, i: number) => {
          doc.text(line, margin + 2.5, currentY + 3.1 + (i * 3.5));
        });

        // Value lines
        doc.setFont("Helvetica", "bold");
        valLines.forEach((line: string, i: number) => {
          doc.text(line, valX, currentY + 3.1 + (i * 3.5), { align: "center" });
        });

        // Unit lines
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(100, 105, 115);
        doc.setFontSize(7.2);
        unitLines.forEach((line: string, i: number) => {
          doc.text(line, unitX, currentY + 3.1 + (i * 3.5), { align: "center" });
        });

        // Ref lines
        refLines.forEach((line: string, i: number) => {
          doc.text(line, refX, currentY + 3.1 + (i * 3.5));
        });

        currentY += rHeight;
      } else if (panelConfig) {
        const metricsToRender = panelConfig.metrics.filter(m => {
          const isPartOfExam = examMetricIds.includes(m.id);
          if (!isPartOfExam) return false;
          if (record.selectedMetricIds && record.selectedMetricIds.length > 0) {
            return record.selectedMetricIds.includes(m.id);
          }
          return true;
        });

        metricsToRender.forEach((metric) => {
          let valStr = pValues[metric.id] || "";
          
          if (metric.calculated && !valStr) {
            if (metric.calculateValue) {
              valStr = metric.calculateValue(pValues, patientAgeInYears, record.patientSex);
            }
          }

          if (!valStr || valStr.trim() === "") {
            valStr = "-";
          }

          const evaluation = evaluateMetric(metric.id, valStr, patientAgeInYears, record.patientSex);

          // SPANISH PARTITIONING HEADERS FROM THE SAVED PHOTOGRAPH TEMPLATE
          if (exam.panelId === "hematologia") {
            if (metric.id === "hem_leucocitos") {
              drawSectionSubheader("MUESTRA: SANGRE COMPLETADA   •   LÍNEA BLANCA (LEUCOCITARIA)");
            } else if (metric.id === "glóbulos_rojos") {
              drawSectionSubheader("LÍNEA ROJA (SERIE ERITROCITARIA Y HEMOGLOBINA)");
            } else if (metric.id === "hem_plaquetas") {
              drawSectionSubheader("SISTEMA PLAQUETARIO (VALORACIÓN DE COAGULACIÓN)");
            }
          } else if (exam.panelId === "uroanalisis_embarazo") {
            if (metric.id === "ego_color") {
              drawSectionSubheader("EXAMEN FÍSICO Y QUÍMICO COMPLETO");
            } else if (metric.id === "ego_celulas_epiteliales") {
              drawSectionSubheader("EXAMEN MICROSCÓPICO (ANÁLISIS DE SEDIMENTO URINARIO)");
            }
          } else if (exam.panelId === "coproanalisis") {
            if (metric.id === "concentrado_heces" || metric.id === "eh_color") {
              drawSectionSubheader("EXAMEN MACROSCÓPICO / CARACTERES FÍSICOS");
            } else if (metric.id === "eh_restos_microscopicos") {
              drawSectionSubheader("EXAMEN MICROSCÓPICO / CARACTERIZACIÓN DIRECTA");
            }
          }

          // Retrieve customized customUnits and customReferences if set during entry
          const customUnit = record.panels[exam.panelId]?.customUnits?.[metric.id];
          const customRef = record.panels[exam.panelId]?.customReferences?.[metric.id];

          const unitToRender = customUnit !== undefined ? customUnit : metric.unit;
          const refToRender = customRef !== undefined ? customRef : evaluation.referenceInterval;

          // Split all columns with respective font properties to know EXACT row height beforehand
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(7.5);
          const nameLines = doc.splitTextToSize(metric.name, colWidths.name - 4);
          const valLines = doc.splitTextToSize(valStr, colWidths.result - 2);

          doc.setFontSize(7.2);
          const unitLines = doc.splitTextToSize(unitToRender, colWidths.unit - 2);
          const refLines = doc.splitTextToSize(refToRender, colWidths.ref - 4);

          const maxLines = Math.max(nameLines.length, valLines.length, unitLines.length, refLines.length);
          const rHeight = 1.2 + (maxLines * 3.5);

          // Now verify page overflow dynamically with precise row height
          if (currentY + rHeight > pageHeight - 44) {
            doc.addPage();
            currentY = 15;
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7.2);
            doc.setTextColor(140, 140, 140);
            doc.text(`Paciente: ${record.patientName.toUpperCase()}  |-- CONTINUACIÓN REPORTE`, margin, 10);
            doc.setDrawColor(210, 215, 220);
            doc.setLineWidth(0.2);
            doc.line(margin, 12, pageWidth - margin, 12);
            
            drawTableHeader();
            drawSubtleWatermark();
          }

          // Single clean lower line
          doc.setDrawColor(230, 232, 242);
          doc.setLineWidth(0.12);
          doc.line(margin, currentY + rHeight, pageWidth - margin, currentY + rHeight);

          // Draw Metric/Prueba Name lines
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(33, 37, 41);
          nameLines.forEach((line: string, i: number) => {
            doc.text(line, margin + 2.5, currentY + 3.1 + (i * 3.5));
          });

          // Draw Value lines
          const isNormal = evaluation.status === "normal" || evaluation.status === "pending";
          const isHigh = evaluation.status === "high" || evaluation.status === "critical-high";

          doc.setFont("Helvetica", isNormal ? "normal" : "bold");
          if (!isNormal) {
            if (isHigh) {
              doc.setTextColor(219, 68, 85); // Critical High red
            } else {
              doc.setTextColor(40, 100, 180); // Low blue
            }
          } else {
            doc.setTextColor(33, 37, 41);
          }

          valLines.forEach((line: string, i: number) => {
            const displayLine = (!isNormal && i === 0) ? `*${line}` : line;
            doc.text(displayLine, valX, currentY + 3.1 + (i * 3.5), { align: "center" });
          });

          // Draw Units lines
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(100, 105, 115);
          doc.setFontSize(7.2);
          unitLines.forEach((line: string, i: number) => {
            doc.text(line, unitX, currentY + 3.1 + (i * 3.5), { align: "center" });
          });

          // Draw Reference interval lines
          refLines.forEach((line: string, i: number) => {
            doc.text(line, refX, currentY + 3.1 + (i * 3.5));
          });

          currentY += rHeight;
        });
      }

      // Individual NOTES rendering (signature/sello is drawn globally on every page's footer!)
      if (!isContinuous) {
        if (record.notes && record.notes.trim()) {
          const splitNotes = doc.splitTextToSize(record.notes, pageWidth - (margin * 2) - 4);
          const notesBlockHeight = (splitNotes.length * 3.5) + 12;

          if (currentY + notesBlockHeight > pageHeight - 44) {
            doc.addPage();
            currentY = 15;
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7.2);
            doc.setTextColor(140, 140, 140);
            doc.text(`Paciente: ${record.patientName.toUpperCase()} |-- OBSERVACIONES`, margin, 10);
            doc.setDrawColor(210, 215, 220);
            doc.setLineWidth(0.2);
            doc.line(margin, 12, pageWidth - margin, 12);
          }

          let notesY = currentY + 4;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(primaryR, primaryG, primaryB);
          doc.text("OBSERVACIONES / COMENTARIOS CLÍNICOS DEL REPORTE:", margin, notesY);
          notesY += 3;

          doc.setFont("Helvetica", "normal");
          doc.setFontSize(7.2);
          doc.setTextColor(70, 75, 85);
          
          doc.setFillColor(252, 251, 254);
          doc.setDrawColor(primaryR, primaryG, primaryB);
          doc.setLineWidth(0.15);
          doc.rect(margin, notesY, pageWidth - (margin * 2), (splitNotes.length * 3.5) + 3, "DF");
          
          doc.text(splitNotes, margin + 2, notesY + 3);
          currentY = notesY + (splitNotes.length * 3.5) + 5;
        }
      }
    });

    // Render continuous NOTES at the very end of the report (signature/sello is drawn globally on every page's footer!)
    if (isContinuous) {
      if (record.notes && record.notes.trim()) {
        const splitNotes = doc.splitTextToSize(record.notes, pageWidth - (margin * 2) - 4);
        const notesBlockHeight = (splitNotes.length * 3.5) + 12;

        if (currentY + notesBlockHeight > pageHeight - 44) {
          doc.addPage();
          currentY = 15;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.2);
          doc.setTextColor(140, 140, 140);
          doc.text(`Paciente: ${record.patientName.toUpperCase()} |-- OBSERVACIONES`, margin, 10);
          doc.setDrawColor(210, 215, 220);
          doc.setLineWidth(0.2);
          doc.line(margin, 12, pageWidth - margin, 12);
        }

        let notesY = currentY + 4;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(primaryR, primaryG, primaryB);
        doc.text("OBSERVACIONES / COMENTARIOS CLÍNICOS DEL REPORTE:", margin, notesY);
        notesY += 3;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(70, 75, 85);
        
        doc.setFillColor(252, 251, 254);
        doc.setDrawColor(primaryR, primaryG, primaryB);
        doc.setLineWidth(0.15);
        doc.rect(margin, notesY, pageWidth - (margin * 2), (splitNotes.length * 3.5) + 3, "DF");
        
        doc.text(splitNotes, margin + 2, notesY + 3);
        currentY = notesY + (splitNotes.length * 3.5) + 5;
      }
    }
  }

  // GLOBAL DYNAMIC FOOTER PAGINATION STAMPING
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // RENDER THE SIGNATURE AND SEAL BLOCK GLOBALLY ON EVERY PAGE!
    renderSignatureAndStampBlock(pageHeight - 44);

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 155, 165);
    
    const defaultFooter = profile.reportFooter || "Resultados de laboratorio válidos para exclusivo análisis de su médico.";
    doc.text(defaultFooter, margin, pageHeight - 11, { maxWidth: pageWidth - (margin * 2) - 30 });

    doc.text(
      "Protección de Datos: Este reporte clínico médico está blindado por cifrado AES-256 de extremo a extremo.",
      margin,
      pageHeight - 7
    );

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text(`Pág. ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 7);
  }

  return doc;
}
