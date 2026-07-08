import React, { useState, useMemo } from "react";
import { 
  X, 
  Printer, 
  Check, 
  QrCode, 
  Info, 
  Sliders, 
  Clock, 
  Tag, 
  Layers, 
  ExternalLink 
} from "lucide-react";
import { DecryptedLabRecord } from "../types";

// Classify tests into matching laboratory sample collection containers
export interface VignetteTube {
  id: string;
  name: string; // e.g. "Tubo Lila (EDTA)"
  color: string; // Tailwind hex or class color
  borderColor: string;
  badgeBg: string; // Tailwind bg color
  textColor: string; // Tailwind text color
  sampleType: string; // e.g. "Sangre Total", "Suero", "Orina", etc.
  exams: string[]; // List of exam names in this tube
  notes: string;
}

// Helper to classify an individual exam name into its tube/container properties
export function getTubePropertiesForExam(examName: string) {
  const nameLower = examName.toLowerCase();
  
  if (/hemograma|hematocrito|hemoglobina|plaqueta|frotis|coombs|gota gruesa|leucocitos|vsg|sedimentacion|eritro/i.test(nameLower)) {
    return {
      id: "tube-purple",
      name: "Tubo Lila (EDTA)",
      color: "#a855f7",
      borderColor: "border-purple-300",
      badgeBg: "bg-purple-100",
      textColor: "text-purple-700",
      sampleType: "Sangre Total EDTA",
      notes: "Homogeneizar inmediatamente por inversión de 5-8 veces."
    };
  }
  
  if (/coagulación|tiempo|tp|tpt|fibrinógeno/i.test(nameLower)) {
    return {
      id: "tube-blue",
      name: "Tubo Celeste (Citrato)",
      color: "#06b6d4",
      borderColor: "border-cyan-300",
      badgeBg: "bg-cyan-100",
      textColor: "text-cyan-700",
      sampleType: "Plasma Citratado",
      notes: "Llenar estrictamente hasta la marca de aforo. Evitar microcoágulos."
    };
  }
  
  if (/orina|ego|embarazo en orina|urocultivo/i.test(nameLower)) {
    return {
      id: "urine-cup",
      name: "Frasco de Orina (EGO)",
      color: "#3b82f6",
      borderColor: "border-blue-300",
      badgeBg: "bg-blue-100",
      textColor: "text-blue-700",
      sampleType: "Orina Parcial o 24h",
      notes: "Muestra de chorro medio preferiblemente matutina."
    };
  }
  
  if (/heces|copro|parásitos|rotavirus|coprocultivo|pylori/i.test(nameLower)) {
    return {
      id: "stool-cup",
      name: "Frasco de Heces (Copro)",
      color: "#854d0e",
      borderColor: "border-yellow-300",
      badgeBg: "bg-yellow-100/80",
      textColor: "text-yellow-900",
      sampleType: "Muestra Fecal",
      notes: "Recolectar en frasco limpio y seco."
    };
  }
  
  if (/faringeo|exudado|secreción|espermograma|cultivo/i.test(nameLower)) {
    return {
      id: "swab-label",
      name: "Hisopo / Placa de Cultivo",
      color: "#ec4899",
      borderColor: "border-pink-300",
      badgeBg: "bg-pink-100",
      textColor: "text-pink-700",
      sampleType: "Secreciones / Fluidos",
      notes: "Conservar a temperatura ambiente. Procesar inmediatamente."
    };
  }
  
  // Default to yellow (Chemistry / Serology / Hormones)
  return {
    id: "tube-yellow",
    name: "Tubo Amarillo/Rojo (Suero)",
    color: "#eab308",
    borderColor: "border-amber-300",
    badgeBg: "bg-amber-100",
    textColor: "text-amber-800",
    sampleType: "Suero Sanguíneo",
    notes: "Dejar coagular 15 min antes de centrifugar a 3000 RPM."
  };
}

interface VignetteGeneratorProps {
  record: DecryptedLabRecord | null;
  onClose: () => void;
}

export default function VignetteGenerator({ record, onClose }: VignetteGeneratorProps) {
  const [selectedLabels, setSelectedLabels] = useState<Record<string, boolean>>({});
  const [labelSize, setLabelSize] = useState<"standard" | "small">("standard");
  const [groupMode, setGroupMode] = useState<"tube" | "individual">("tube");
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [customSubtitle, setCustomSubtitle] = useState("");

  const [customPatientName, setCustomPatientName] = useState(record?.patientName || "");
  const [customPatientSex, setCustomPatientSex] = useState(record?.patientSex || "M");
  
  // Custom patient age description
  const initialAgeStr = useMemo(() => {
    if (!record?.patientBirthdate) return "N/A";
    try {
      const birth = new Date(record.patientBirthdate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age > 0 ? `${age} años` : "Menor de 1 año";
    } catch {
      return "N/A";
    }
  }, [record?.patientBirthdate]);

  const [customPatientAge, setCustomPatientAge] = useState(initialAgeStr);

  // Track user edits mapping tubeId -> { name, exams, notes }
  const [vignetteEdits, setVignetteEdits] = useState<Record<string, { name: string; exams: string; notes: string }>>({});

  // Determine age based on birthdate
  const patientAge = useMemo(() => {
    if (!record?.patientBirthdate) return "N/A";
    try {
      const birth = new Date(record.patientBirthdate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age > 0 ? `${age} años` : "Bebé / Menor de 1 año";
    } catch {
      return "N/A";
    }
  }, [record?.patientBirthdate]);

  // Generate list of tubes logically grouped based on active exams in the record
  const tubes = useMemo<VignetteTube[]>(() => {
    if (!record) return [];

    // Extract all exams registered in billing or generated panels
    const examNames: string[] = [];
    if (record.billing?.items && record.billing.items.length > 0) {
      record.billing.items.forEach(it => examNames.push(it.name));
    } else {
      // Fallback fallback from panels
      const mappingColors: Record<string, string> = {
        "hematologia": "Hemograma Completo",
        "hematologia_especial": "Examen Hematológico Especial",
        "coagulacion_pruebas": "Prueba de Coagulación",
        "uroanalisis_embarazo": "General de Orina / Inmunología",
        "hormonas_tiroideas_marcadores": "Prueba de Hormonas / Marcador",
        "coproanalisis": "General de Heces / Copro",
        "electrolitos_perfil": "Electrolitos",
        "quimica_sanguinea_enzimas": "Química Clínica",
        "química_y_diabetes": "Prueba de Glucosa",
        "urocultivo": "Urocultivo",
        "coprocultivo": "Coprocultivo",
        "cultivo_faringeo": "Cultivo Faríngeo",
        "secreciones_varias": "Cultivo de Secreciones",
        "espermograma": "Espermograma Completo"
      };
      Object.keys(record.panels).forEach(pId => {
        examNames.push(mappingColors[pId] || pId.toUpperCase());
      });
    }

    if (examNames.length === 0) {
      examNames.push("Examen General");
    }

    // 1. If individual exam labels are requested
    if (groupMode === "individual") {
      return examNames.map((examName, idx) => {
        const props = getTubePropertiesForExam(examName);
        return {
          id: `ind-${idx}-${examName.replace(/[^a-zA-Z0-9]/g, "-")}`,
          name: props.name,
          color: props.color,
          borderColor: props.borderColor,
          badgeBg: props.badgeBg,
          textColor: props.textColor,
          sampleType: props.sampleType,
          exams: [examName],
          notes: props.notes
        };
      });
    }

    // 2. Otherwise group by container type (default)
    const tubeList: VignetteTube[] = [];

    // 1. Purple/Lila Tube: Hematology
    const hematologyExams = examNames.filter(name => 
      /hemograma|hematocrito|hemoglobina|plaqueta|frotis|coombs|gota gruesa|leucocitos|vsg|sedimentacion|eritro/i.test(name)
    );
    if (hematologyExams.length > 0) {
      tubeList.push({
        id: "tube-purple",
        name: "Tubo Lila (EDTA)",
        color: "#a855f7",
        borderColor: "border-purple-300",
        badgeBg: "bg-purple-100",
        textColor: "text-purple-700",
        sampleType: "Sangre Total EDTA",
        exams: hematologyExams,
        notes: "Homogeneizar inmediatamente por inversión de 5-8 veces."
      });
    }

    // 2. Light Blue / Celeste Tube: Coagulation
    const coagulationExams = examNames.filter(name => 
      /coagulación|tiempo|tp|tpt|fibrinógeno/i.test(name)
    );
    if (coagulationExams.length > 0) {
      tubeList.push({
        id: "tube-blue",
        name: "Tubo Celeste (Citrato)",
        color: "#06b6d4",
        borderColor: "border-cyan-300",
        badgeBg: "bg-cyan-100",
        textColor: "text-cyan-700",
        sampleType: "Plasma Citratado",
        exams: coagulationExams,
        notes: "Llenar estrictamente hasta la marca de aforo. Evitar microcoágulos."
      });
    }

    // 3. Red or Yellow gel Tube: Chemistries / Serology / Hormones / Lipids / Liver / Kidney / Enzymes
    const chemistryExams = examNames.filter(name => 
      !/hemograma|hematocrito|hemoglobina|plaqueta|frotis|coombs|gota gruesa|coagulación|tiempo|tp|tpt|fibrinógeno|orina|ego|embarazo en orina|heces|copro|parasito|urocultivo|coprocultivo|cultivo|leucocitos|vsg|sedimentacion|eritro/i.test(name)
    );
    if (chemistryExams.length > 0) {
      tubeList.push({
        id: "tube-yellow",
        name: "Tubo Amarillo / Rojo (Suero)",
        color: "#eab308",
        borderColor: "border-amber-300",
        badgeBg: "bg-amber-100",
        textColor: "text-amber-800",
        sampleType: "Suero Sanguíneo",
        exams: chemistryExams,
        notes: "Dejar coagular 15 min antes de centrifugar a 3000 RPM."
      });
    }

    // 4. Urine Sterile Cap
    const urineExams = examNames.filter(name => 
      /orina|ego|embarazo en orina|urocultivo/i.test(name)
    );
    if (urineExams.length > 0) {
      tubeList.push({
        id: "urine-cup",
        name: "Frasco de Orina (EGO)",
        color: "#3b82f6",
        borderColor: "border-blue-300",
        badgeBg: "bg-blue-100",
        textColor: "text-blue-700",
        sampleType: "Orina Parcial o 24h",
        exams: urineExams,
        notes: "Muestra de chorro medio preferiblemente matutina."
      });
    }

    // 5. Stool Sterile Cap / Cultures
    const stoolExams = examNames.filter(name => 
      /heces|copro|parásitos|rotavirus|coprocultivo|pylori/i.test(name)
    );
    if (stoolExams.length > 0) {
      tubeList.push({
        id: "stool-cup",
        name: "Frasco de Heces (Copro)",
        color: "#854d0e",
        borderColor: "border-yellow-300",
        badgeBg: "bg-yellow-100/80",
        textColor: "text-yellow-900",
        sampleType: "Muestra Fecal",
        exams: stoolExams,
        notes: "Recolectar en frasco limpio y seco, volumen equivalente a una nuez o 5mL."
      });
    }

    // 6. Swab / Hisopados or general microbiological cultures
    const microbioExams = examNames.filter(name => 
      /faringeo|exudado|secreción|espermograma|cultivo/i.test(name) && 
      !/urocultivo|coprocultivo/i.test(name)
    );
    if (microbioExams.length > 0) {
      tubeList.push({
        id: "swab-label",
        name: "Hisopo / Placa de Cultivo",
        color: "#ec4899",
        borderColor: "border-pink-300",
        badgeBg: "bg-pink-100",
        textColor: "text-pink-700",
        sampleType: "Secreciones / Fluidos",
        exams: microbioExams,
        notes: "Conservar a temperatura ambiente. Procesar inmediatamente."
      });
    }

    // If no tubes matched (rare fall-through), create one generic label
    if (tubeList.length === 0) {
      tubeList.push({
        id: "generic-label",
        name: "Muestra Clínica (General)",
        color: "#6b7280",
        borderColor: "border-slate-300",
        badgeBg: "bg-slate-100",
        textColor: "text-slate-700",
        sampleType: "Muestra Biológica",
        exams: examNames,
        notes: "Identificación de muestra para auditoría interna."
      });
    }

    return tubeList;
  }, [record, groupMode]);

  // Handle auto-selection of all tubes initially
  React.useEffect(() => {
    if (tubes.length > 0) {
      const initialMap: Record<string, boolean> = {};
      tubes.forEach(t => {
        initialMap[t.id] = true;
      });
      setSelectedLabels(initialMap);
    }
  }, [tubes]);

  const handleUpdateVignette = (tubeId: string, field: "name" | "exams" | "notes", value: string) => {
    setVignetteEdits(prev => {
      const current = prev[tubeId] || {
        name: tubes.find(t => t.id === tubeId)?.name || "",
        exams: tubes.find(t => t.id === tubeId)?.exams.join(", ") || "",
        notes: tubes.find(t => t.id === tubeId)?.notes || ""
      };
      return {
        ...prev,
        [tubeId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  if (!record) return null;

  const handlePrint = () => {
    // Generate isolated container and print using window.print() style.
    // We will build a temporary print page container that displays exclusively the checked stickers.
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("No se pudo abrir la ventana de impresión. Por favor, permita los popups en su navegador.");
      return;
    }

    const selectedTubes = tubes.filter(t => selectedLabels[t.id]);
    if (selectedTubes.length === 0) {
      alert("Seleccione al menos una etiqueta de viñeta para imprimir.");
      return;
    }

    const stickerWidth = labelSize === "standard" ? "50mm" : "40mm";
    const stickerHeight = labelSize === "standard" ? "30mm" : "25mm";
    const titleSize = labelSize === "standard" ? "10pt" : "8pt";
    const bodySize = labelSize === "standard" ? "7.5pt" : "6.5pt";

    let stickersHtml = "";
    selectedTubes.forEach((tube, idx) => {
      const resolvedName = vignetteEdits[tube.id]?.name ?? tube.name;
      const resolvedExams = vignetteEdits[tube.id]?.exams ?? tube.exams.join(", ");
      const resolvedNotes = vignetteEdits[tube.id]?.notes ?? tube.notes;

      // Build pure CSS pseudo-barcode lines
      const codeLines = Array.from({ length: 24 }).map((_, i) => {
        const height = "20px";
        const width = [1, 2, 3, 1, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2][i % 18] || 1;
        const color = i % 3 === 0 ? "white" : "black";
        return `<span style="display:inline-block; width:${width}px; height:${height}; background-color:${color};"></span>`;
      }).join("");

      stickersHtml += `
        <div class="sticker">
          <!-- Top Colored Color Bar Indicator -->
          <div class="color-indicator" style="background-color: ${tube.color};"></div>
          
          <div class="sticker-content">
            <div class="header">
              <span class="brand">AKOLAB ● CLINICO</span>
              <span class="ticket">${record.billing?.ticketNumber || 'N/A'}</span>
            </div>
            
            <div class="patient-name">${customPatientName.toUpperCase()}</div>
            
            <div class="patient-meta">
              <span>${customPatientSex[0]} / ${customPatientAge}</span>
              <span style="float: right;">F. Rec: ${record.examDate}</span>
            </div>

            <div class="tube-spec font-mono">
              <strong>${resolvedName.toUpperCase()}</strong>
            </div>

            <div class="exams-list">
              Pruebas: ${resolvedExams}
            </div>

            ${includeBarcode ? `
              <div class="barcode-area">
                <div class="barcode-lines">
                  ${codeLines}
                </div>
                <div class="barcode-text font-mono">${record.billing?.ticketNumber || 'LAB-STICKER'}</div>
              </div>
            ` : ""}
            
            ${customSubtitle ? `
              <div class="custom-sub">${customSubtitle}</div>
            ` : ""}
          </div>
        </div>
        ${idx < selectedTubes.length - 1 ? '<div class="page-break"></div>' : ""}
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Viñetas de Muestras - ${customPatientName}</title>
          <style>
            @page {
              size: ${stickerWidth} ${stickerHeight};
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            .sticker {
              width: ${stickerWidth};
              height: ${stickerHeight};
              overflow: hidden;
              box-sizing: border-box;
              border: 1px dashed #ccc;
              position: relative;
              background-color: white;
              display: flex;
              flex-direction: column;
            }
            .color-indicator {
              height: 4.5px;
              width: 100%;
            }
            .sticker-content {
              padding: 2.2px 3.5px;
              display: flex;
              flex-direction: column;
              flex-grow: 1;
              justify-content: space-between;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 6pt;
              font-weight: bold;
              color: #475569;
              border-bottom: 0.5px solid #e2e8f0;
              padding-bottom: 1px;
            }
            .brand {
              letter-spacing: 0.5px;
            }
            .ticket {
              font-family: monospace;
              letter-spacing: -0.2px;
              font-weight: 800;
              color: #0f172a;
            }
            .patient-name {
              font-size: ${titleSize};
              font-weight: 900;
              color: #000;
              white-space: normal;
              word-break: break-word;
              line-height: 1.1;
              margin-top: 2px;
              margin-bottom: 2px;
            }
            .patient-meta {
              font-size: ${bodySize};
              font-weight: 600;
              color: #1e293b;
              margin-top: -1px;
              line-height: normal;
            }
            .tube-spec {
              font-size: 7.2pt;
              color: #1e293b;
              font-weight: 800;
              border-top: 0.5px dotted #cbd5e1;
              padding-top: 2.2px;
              margin-top: 2.2px;
            }
            .exams-list {
              font-size: 7.2pt;
              color: #000;
              font-weight: 900;
              white-space: normal;
              word-break: break-word;
              background-color: #f1f5f9;
              padding: 2px 4.5px;
              border-radius: 3px;
              line-height: 1.25;
              margin-top: 3px;
              border: 0.5px solid #cbd5e1;
            }
            .barcode-area {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin-top: 1px;
            }
            .barcode-lines {
              display: flex;
              justify-content: center;
              align-items: flex-end;
              background-color: white;
              padding: 1px 0;
            }
            .barcode-text {
              font-size: 5pt;
              margin-top: 0.5px;
              letter-spacing: 1px;
            }
            .custom-sub {
              font-size: 5pt;
              text-align: center;
              font-style: italic;
              color: #64748b;
            }
            @media print {
              .sticker {
                border: none;
              }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${stickersHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Top Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="bg-purple-500/20 p-2.5 rounded-2xl border border-purple-400/20">
              <Tag className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Generador de Viñetas de Muestras</h2>
              <p className="text-[10.5px] text-purple-200 font-medium">Imprima etiquetas adhesivas para tubos de ensayo y frascos de laboratorio de AKOLAB</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Double Layout Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          
          {/* Left panel: Custom label and printer preferences configuration */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
              <span className="text-[10.5px] font-black uppercase text-purple-900 tracking-wider flex items-center gap-1.5 border-b pb-2">
                <Sliders className="w-4 h-4 text-purple-650" /> Ajustes de Impresión
              </span>

              {/* Patient Basic Context Editable Info */}
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="text-[10px] text-purple-900 font-extrabold uppercase tracking-wider">Identificación del Paciente (Editable)</div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    value={customPatientName}
                    onChange={(e) => setCustomPatientName(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-350 rounded-lg focus:ring-1 focus:ring-purple-500 bg-white font-extrabold text-slate-800"
                    placeholder="Nombre del Paciente"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Edad</label>
                    <input
                      type="text"
                      value={customPatientAge}
                      onChange={(e) => setCustomPatientAge(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-350 rounded-lg focus:ring-1 focus:ring-purple-500 bg-white font-semibold text-slate-800"
                      placeholder="Ej: 45 años"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Género</label>
                    <select
                      value={customPatientSex}
                      onChange={(e) => setCustomPatientSex(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-350 rounded-lg focus:ring-1 focus:ring-purple-500 bg-white font-semibold text-slate-800"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Label size selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">Tamaño de Etiqueta Térmica</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLabelSize("standard")}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                      labelSize === "standard" 
                        ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs" 
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Estándar (50x30 mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabelSize("small")}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                      labelSize === "small" 
                        ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs" 
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Pequeño (40x25 mm)
                  </button>
                </div>
              </div>

              {/* Distribution mode selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">Distribución de Viñetas</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupMode("tube")}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                      groupMode === "tube" 
                        ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs" 
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Por Contenedor (Viales)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupMode("individual")}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                      groupMode === "individual" 
                        ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs" 
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Por Examen Individual
                  </button>
                </div>
              </div>

              {/* Checkbox include barcode simulation */}
              <label className="flex items-center gap-2.5 p-2 rounded-xl border border-dotted border-slate-200 hover:bg-slate-50/50 cursor-pointer select-none transition-colors">
                <input 
                  type="checkbox"
                  checked={includeBarcode}
                  onChange={(e) => setIncludeBarcode(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer h-4 w-4"
                />
                <div className="text-xs">
                  <span className="block font-bold text-slate-750">Incluir Código de Barras</span>
                  <span className="block text-[9px] text-slate-500">Muestra la simulación del código en el adhesivo</span>
                </div>
              </label>

              {/* Custom subtitle input box */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">Información Adicional (Sufijo Adhesivo)</label>
                <input
                  type="text"
                  placeholder="Ej: AYUNO REQUERIDO, PRIORITARIO, etc."
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Educational info card */}
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100 flex gap-2 text-[10px] text-indigo-900 leading-normal">
                <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                <div>
                  <strong className="block mb-0.5">Agrupación Automática de Tubos:</strong>
                  El sistema distribuye inteligentemente los análisis elegidos en los viales oficiales requeridos (lila para hematología, celeste para coagulación, amarillo para químicas). Esto optimiza consumos de reactivos e insumos.
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Live stickers layout visualizer and active selector list */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <span className="text-[10.5px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
              <span>Etiquetas de Muestras Requeridas ({tubes.length})</span>
              <span className="text-[9px] text-slate-400 font-mono">Seleccione las que desea imprimir</span>
            </span>

            <div className="space-y-4 flex-1">
              {tubes.map((tube) => {
                const isChecked = !!selectedLabels[tube.id];
                const resolvedName = vignetteEdits[tube.id]?.name ?? tube.name;
                const resolvedExams = vignetteEdits[tube.id]?.exams ?? tube.exams.join(", ");
                const resolvedNotes = vignetteEdits[tube.id]?.notes ?? tube.notes;

                return (
                  <div 
                    key={tube.id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      isChecked ? "border-slate-300 shadow-sm" : "border-slate-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    
                    {/* Upper row header */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedLabels(prev => ({
                              ...prev,
                              [tube.id]: !prev[tube.id]
                            }));
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer h-4 w-4"
                        />
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="w-3.5 h-3.5 rounded-full inline-block border shadow-2xs shrink-0"
                            style={{ backgroundColor: tube.color }}
                          />
                          <span className="text-xs font-extrabold text-slate-800">{resolvedName}</span>
                          <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${tube.badgeBg} ${tube.textColor}`}>
                            {tube.sampleType}
                          </span>
                        </div>
                      </div>
                      
                      <span className="text-[10px] text-slate-400 font-bold font-mono">
                        {tube.exams.length} {tube.exams.length === 1 ? "examen" : "exámenes"}
                      </span>
                    </div>

                    {/* Lower content: Live review sticker layout simulation with inline editing fields */}
                    <div className="p-4 flex flex-col md:flex-row gap-4 items-start justify-between bg-slate-100/10">
                      <div className="flex-1 w-full space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Nombre Contenedor</label>
                            <input
                              type="text"
                              value={resolvedName}
                              onChange={(e) => handleUpdateVignette(tube.id, "name", e.target.value)}
                              className="w-full mt-1 px-2.5 py-1.5 border border-slate-350 rounded-lg focus:ring-1 focus:ring-purple-500 bg-white"
                              placeholder="Ej: Frasco de Orina"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Instrucciones</label>
                            <input
                              type="text"
                              value={resolvedNotes}
                              onChange={(e) => handleUpdateVignette(tube.id, "notes", e.target.value)}
                              className="w-full mt-1 px-2.5 py-1.5 border border-slate-350 rounded-lg focus:ring-1 focus:ring-purple-500 bg-white"
                              placeholder="Ej: Ayuno, Chorro medio"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase">Análisis / Pruebas a Imprimir (Editar si es incorrecto)</label>
                          <textarea
                            value={resolvedExams}
                            onChange={(e) => handleUpdateVignette(tube.id, "exams", e.target.value)}
                            rows={2}
                            className="w-full mt-1 px-2.5 py-1.5 border border-slate-350 rounded-lg focus:ring-1 focus:ring-purple-500 bg-white font-semibold"
                            placeholder="Análisis"
                          />
                        </div>
                      </div>

                      {/* Rightmost thermal sticker live preview box */}
                      {isChecked && (
                        <div 
                          className="w-56 shrink-0 bg-white border border-slate-350 rounded-xl p-3 shadow-md select-none relative font-sans text-left overflow-hidden flex flex-col justify-between"
                          style={{ height: "140px" }}
                        >
                          <div className="absolute top-0 inset-x-0 h-1.5" style={{ backgroundColor: tube.color }} />
                          
                          <div className="flex items-center justify-between text-[7px] font-bold text-slate-500">
                            <span>AKOLAB S.A.</span>
                            <span className="font-mono text-slate-900">{record.billing?.ticketNumber || 'TK-DEMO'}</span>
                          </div>

                          <div className="font-black text-xs text-slate-950 leading-tight mt-1 whitespace-normal break-words">
                            {customPatientName.toUpperCase()}
                          </div>

                          <div className="text-[8px] text-slate-800 font-bold flex justify-between mt-0.5 border-b pb-1 border-slate-200">
                            <span>{customPatientSex[0]} / {customPatientAge}</span>
                            <span>F.R: {record.examDate}</span>
                          </div>

                          <div className="text-[9px] text-slate-900 font-extrabold mt-1.5 leading-tight whitespace-normal break-words bg-slate-50 p-1.2 rounded-sm border border-slate-100">
                            <span className="text-slate-500 font-normal">{resolvedName}:</span> <span className="text-purple-800 font-black">{resolvedExams}</span>
                          </div>

                          {includeBarcode && (
                            <div className="mt-2 flex flex-col items-center justify-center">
                              <div className="flex h-3.5 items-end bg-slate-100/30 px-1 rounded-sm gap-px">
                                {Array.from({ length: 18 }).map((_, i) => (
                                  <div 
                                    key={i} 
                                    style={{ 
                                      width: [1, 2, 1, 3, 1, 2, 4, 1, 1, 2][i % 10] + "px",
                                      height: "100%",
                                      backgroundColor: i % 3 === 0 ? "transparent" : "black"
                                    }} 
                                  />
                                ))}
                              </div>
                              <span className="text-[6px] text-slate-500 font-mono tracking-widest mt-0.5">
                                {record.billing?.ticketNumber || 'TK-BARCODE'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>

        {/* Modal Bottom Print Actions bar */}
        <div className="p-4.5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-slate-500 text-[10.5px] text-center sm:text-left">
            <span>Para una impresión óptima, elija un rodillo térmico tamaño 50x30mm en sus ajustes de impresora.</span>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 border border-slate-300 bg-white text-slate-700 font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-50 transition-colors text-center"
            >
              Cerrar Generador
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md shadow-purple-900/10 transition-all text-center"
            >
              <Printer className="w-4 h-4" />
              Imprimir Viñetas Clínicas
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
