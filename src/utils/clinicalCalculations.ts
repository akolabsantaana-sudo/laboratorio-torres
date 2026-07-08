export interface PatientInfo {
  name: string;
  idCard: string; // Cédula o DNI
  birthdate: string; // YYYY-MM-DD
  sex: "Masculino" | "Femenino";
}

export interface MetricResult {
  id: string;
  name: string;
  value: string; // entered value
  unit: string;
  calculated: boolean;
  referenceInterval: string;
  isCustomInterval?: boolean;
  status: "normal" | "low" | "high" | "critical-low" | "critical-high" | "pending";
}

export interface PanelValues {
  [metricId: string]: string;
}

// Age calculation helper returning age in years
export function calculateAge(birthdateStr: string, referenceDateStr?: string): number {
  if (!birthdateStr) return 30; // default safe fallback fallback age
  const birthDate = new Date(birthdateStr);
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  
  if (isNaN(birthDate.getTime())) return 30;
  
  let age = refDate.getFullYear() - birthDate.getFullYear();
  const m = refDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

export function calculateAgeDescription(birthdateStr: string): string {
  if (!birthdateStr) return "";
  const age = calculateAge(birthdateStr);
  if (age === 0) {
    const birthDate = new Date(birthdateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birthDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} día${diffDays > 1 ? "s" : ""}`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} mes${diffMonths > 1 ? "es" : ""}`;
  }
  return `${age} año${age > 1 ? "s" : ""}`;
}

// 2021 CKD-EPI Creatinine Equation for eGFR calculation
export function calculateCKDEPI(creatinine: number, age: number, sex: "Masculino" | "Femenino"): number {
  if (isNaN(creatinine) || creatinine <= 0) return 0;
  const isFemale = sex === "Femenino";
  const k = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const femaleMultiplier = isFemale ? 1.012 : 1.0;
  
  const crK = creatinine / k;
  const termMin = Math.pow(Math.min(crK, 1), alpha);
  const termMax = Math.pow(Math.max(crK, 1), -1.200);
  
  const eGFR = 142 * termMin * termMax * Math.pow(0.9938, age) * femaleMultiplier;
  return Math.round(eGFR * 10) / 10;
}

export interface MetricConfig {
  id: string;
  name: string;
  unit: string;
  calculated: boolean;
  getDefaultReference: (age: number, sex: "Masculino" | "Femenino") => { min?: number; max?: number; text: string };
  calculateValue?: (inputs: PanelValues, age: number, sex: "Masculino" | "Femenino") => string;
}

export interface PanelConfig {
  id: string;
  name: string;
  description: string;
  metrics: MetricConfig[];
}

export const CLINICAL_PANELS: PanelConfig[] = [
  {
    id: "química_y_diabetes",
    name: "Química Sanguínea Básica y Diabetes",
    description: "Evaluación de glucosa, función de metabolismo y urea.",
    metrics: [
      {
        id: "glucosa",
        name: "Glucosa en Ayunas",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 70, max: 100, text: "70 - 100 mg/dL" })
      },
      {
        id: "hba1c",
        name: "Hemoglobina Glicosilada (HbA1c)",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 4.0, max: 5.6, text: "Normal < 5.7%, Prediabetes: 5.7 - 6.4%, Diabetes: >= 6.5%" })
      },
      {
        id: "eag",
        name: "Glucosa Promedio Estimada (eAG)",
        unit: "mg/dL",
        calculated: true,
        getDefaultReference: () => ({ min: 70, max: 114, text: "Normal: < 115 mg/dL, Riesgo: >= 115 mg/dL" }),
        calculateValue: (inputs) => {
          const hba1c = parseFloat(inputs["hba1c"]);
          if (!hba1c || isNaN(hba1c)) return "";
          const eag = (28.7 * hba1c) - 46.7;
          return Math.round(eag).toString();
        }
      },
      {
        id: "urea",
        name: "Urea Sérica",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 15, max: 45, text: "15 - 45 mg/dL" })
      },
      {
        id: "bun",
        name: "Nitrógeno de Urea (BUN)",
        unit: "mg/dL",
        calculated: true,
        getDefaultReference: () => ({ min: 7, max: 20, text: "7 - 20 mg/dL" }),
        calculateValue: (inputs) => {
          const urea = parseFloat(inputs["urea"]);
          if (!urea || isNaN(urea)) return "";
          return (Math.round((urea / 2.14) * 10) / 10).toString();
        }
      },
      {
        id: "tg_basal",
        name: "Glucosa Basal (Ayunas)",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 70, max: 100, text: "70 - 100 mg/dL" })
      },
      {
        id: "tg_1h",
        name: "Glucosa a la 1 Hora",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 70, max: 180, text: "< 180 mg/dL" })
      },
      {
        id: "tg_2h",
        name: "Glucosa a las 2 Horas",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 70, max: 140, text: "< 140 mg/dL" })
      },
      {
        id: "tg_3h",
        name: "Glucosa a las 3 Horas",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 70, max: 140, text: "< 140 mg/dL" })
      },
      {
        id: "tg_4h",
        name: "Glucosa a las 4 Horas",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 70, max: 140, text: "< 140 mg/dL" })
      },
      {
        id: "tg_5h",
        name: "Glucosa a las 5 Horas",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 70, max: 140, text: "< 140 mg/dL" })
      }
    ]
  },
  {
    id: "perfil_lipidico",
    name: "Perfil Lipídico (Cardiovascular)",
    description: "Evaluación del riesgo cardiovascular mediante colesterol y triglicéridos.",
    metrics: [
      {
        id: "colesterol_total",
        name: "Colesterol Total",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 100, max: 200, text: "Deseable < 200 mg/dL, Límite: 200 - 239 mg/dL, Alto >= 240 mg/dL" })
      },
      {
        id: "trigliceridos",
        name: "Triglicéridos",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 30, max: 150, text: "Normal < 150 mg/dL, Límite: 150 - 199 mg/dL, Alto >= 200 mg/dL" })
      },
      {
        id: "hdl",
        name: "Colesterol HDL",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: (age, sex) => {
          if (sex === "Femenino") {
            return { min: 50, max: 90, text: "Deseable: > 50 mg/dL (Factor protector)" };
          }
          return { min: 40, max: 90, text: "Deseable: > 40 mg/dL (Factor protector)" };
        }
      },
      {
        id: "ldl",
        name: "Colesterol LDL",
        unit: "mg/dL",
        calculated: true,
        getDefaultReference: () => ({ min: 50, max: 100, text: "Óptimo < 100 mg/dL, Límite: 130 - 159 mg/dL, Alto >= 160 mg/dL" }),
        calculateValue: (inputs) => {
          const total = parseFloat(inputs["colesterol_total"]);
          const hdl = parseFloat(inputs["hdl"]);
          const trig = parseFloat(inputs["trigliceridos"]);
          if (isNaN(total) || isNaN(hdl) || isNaN(trig)) return "";
          if (trig >= 400) return "Req. Medición Directa (Triglicéridos >= 400)";
          const ldl = total - hdl - (trig / 5);
          return Math.round(ldl).toString();
        }
      },
      {
        id: "castelli",
        name: "Índice de Castelli (Col. Total / HDL)",
        unit: "cociente",
        calculated: true,
        getDefaultReference: (age, sex) => {
          const limit = sex === "Femenino" ? 4.5 : 5.0;
          return { min: 0.1, max: limit, text: `Bajo Riesgo: < ${limit}` };
        },
        calculateValue: (inputs) => {
          const total = parseFloat(inputs["colesterol_total"]);
          const hdl = parseFloat(inputs["hdl"]);
          if (isNaN(total) || isNaN(hdl) || hdl === 0) return "";
          return (Math.round((total / hdl) * 100) / 100).toString();
        }
      },
      {
        id: "trig_hdl_relation",
        name: "Relación Triglicéridos / HDL",
        unit: "cociente",
        calculated: true,
        getDefaultReference: () => ({ min: 0.1, max: 3.0, text: "Normal < 3.0 (Indicador de Resistencia Insulínica)" }),
        calculateValue: (inputs) => {
          const trig = parseFloat(inputs["trigliceridos"]);
          const hdl = parseFloat(inputs["hdl"]);
          if (isNaN(trig) || isNaN(hdl) || hdl === 0) return "";
          return (Math.round((trig / hdl) * 100) / 100).toString();
        }
      },
      {
        id: "ldl_hdl_relation",
        name: "Relación Colesterol LDL / HDL",
        unit: "cociente",
        calculated: true,
        getDefaultReference: () => ({ min: 0.1, max: 3.0, text: "Deseable < 3.0 (Riesgo Coronario)" }),
        calculateValue: (inputs) => {
          const hdl = parseFloat(inputs["hdl"]);
          if (isNaN(hdl) || hdl === 0) return "";
          let ldlVal = parseFloat(inputs["ldl"]);
          if (isNaN(ldlVal)) {
            const total = parseFloat(inputs["colesterol_total"]);
            const trig = parseFloat(inputs["trigliceridos"]);
            if (!isNaN(total) && !isNaN(trig)) {
              ldlVal = total - hdl - (trig / 5);
            }
          }
          if (isNaN(ldlVal)) return "";
          return (Math.round((ldlVal / hdl) * 100) / 100).toString();
        }
      },
      {
        id: "colesterol_no_hdl",
        name: "Colesterol No-HDL",
        unit: "mg/dL",
        calculated: true,
        getDefaultReference: () => ({ min: 50, max: 130, text: "Óptimo < 130 mg/dL" }),
        calculateValue: (inputs) => {
          const total = parseFloat(inputs["colesterol_total"]);
          const hdl = parseFloat(inputs["hdl"]);
          if (isNaN(total) || isNaN(hdl)) return "";
          return Math.round(total - hdl).toString();
        }
      }
    ]
  },
  {
    id: "funcion_renal",
    name: "Perfil de Función Renal",
    description: "Evaluación de filtración de riñones y depuración metabólica.",
    metrics: [
      {
        id: "creatinina",
        name: "Creatinina Sérica",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: (age, sex) => {
          if (age < 12) {
            return { min: 0.3, max: 0.7, text: "Pediátrico (<12 años): 0.30 - 0.70 mg/dL" };
          } else if (age < 18) {
            return { min: 0.5, max: 1.0, text: "Adolescente (12-17 años): 0.50 - 1.00 mg/dL" };
          } else {
            if (sex === "Femenino") {
              return { min: 0.6, max: 1.1, text: "Mujer Adulta: 0.60 - 1.10 mg/dL" };
            }
            return { min: 0.7, max: 1.3, text: "Varón Adulto: 0.70 - 1.30 mg/dL" };
          }
        }
      },
      {
        id: "egfr_ckdepi",
        name: "Filtración Glomerular Estimada (eGFR CKD-EPI)",
        unit: "mL/min/1.73m²",
        calculated: true,
        getDefaultReference: () => ({ min: 90, text: "Normal: >= 90. Insuficiencia: < 60 mL/min/1.73m²" }),
        calculateValue: (inputs, age, sex) => {
          const creatinina = parseFloat(inputs["creatinina"]);
          if (isNaN(creatinina) || creatinina <= 0) return "";
          return calculateCKDEPI(creatinina, age, sex).toString();
        }
      }
    ]
  },
  {
    id: "perfil_hepatico",
    name: "Perfil Hepático Básico",
    description: "Pruebas de transaminasas, bilirrubinas e índice de daño hepático.",
    metrics: [
      {
        id: "ast_sgot",
        name: "AST / SGOT",
        unit: "U/L",
        calculated: false,
        getDefaultReference: (age, sex) => {
          const maxVal = sex === "Femenino" ? 32 : 40;
          return { min: 5, max: maxVal, text: `Normal: 5 - ${maxVal} U/L` };
        }
      },
      {
        id: "alt_sgpt",
        name: "ALT / SGPT",
        unit: "U/L",
        calculated: false,
        getDefaultReference: (age, sex) => {
          const maxVal = sex === "Femenino" ? 33 : 41;
          return { min: 5, max: maxVal, text: `Normal: 5 - ${maxVal} U/L` };
        }
      },
      {
        id: "de_ritis",
        name: "Cociente AST/ALT (De Ritis)",
        unit: "cociente",
        calculated: true,
        getDefaultReference: () => ({ min: 0.8, max: 1.3, text: "Normal: 0.8 - 1.3 (>2.0 sugiere sospecha alcohólica o grave)" }),
        calculateValue: (inputs) => {
          const ast = parseFloat(inputs["ast_sgot"]);
          const alt = parseFloat(inputs["alt_sgpt"]);
          if (isNaN(ast) || isNaN(alt) || alt === 0) return "";
          return (Math.round((ast / alt) * 100) / 100).toString();
        }
      },
      {
        id: "bilirrubina_total",
        name: "Bilirrubina Total",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 0.2, max: 1.2, text: "0.2 - 1.2 mg/dL" })
      },
      {
        id: "bilirrubina_directa",
        name: "Bilirrubina Directa",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 0.0, max: 0.3, text: "0.0 - 0.3 mg/dL" })
      },
      {
        id: "bilirrubina_indirecta",
        name: "Bilirrubina Indirecta",
        unit: "mg/dL",
        calculated: true,
        getDefaultReference: () => ({ min: 0.1, max: 0.9, text: "0.1 - 0.9 mg/dL" }),
        calculateValue: (inputs) => {
          const total = parseFloat(inputs["bilirrubina_total"]);
          const directa = parseFloat(inputs["bilirrubina_directa"]);
          if (isNaN(total) || isNaN(directa)) return "";
          const indirect = total - directa;
          return (Math.round(indirect * 100) / 100).toString();
        }
      }
    ]
  },
  {
    id: "hematologia",
    name: "Hemograma Completo e Índices de Wintrobe",
    description: "Evaluación celular completa de glóbulos blancos, fórmula roja diferencial, plaquetas e índices de Wintrobe.",
    metrics: [
      {
        id: "hem_leucocitos",
        name: "Glóbulos Blancos (WBC)",
        unit: "10³/µL",
        calculated: false,
        getDefaultReference: () => ({ min: 4.5, max: 11.0, text: "4.5 - 11.0 10³/µL" })
      },
      {
        id: "hem_neutrofilos_pct",
        name: "Neutrófilos / Segmentados",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 40.0, max: 70.0, text: "40.0 - 70.0 %" })
      },
      {
        id: "hem_linfocitos_pct",
        name: "Linfocitos",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 20.0, max: 45.0, text: "20.0 - 45.0 %" })
      },
      {
        id: "hem_monocitos_pct",
        name: "Monocitos",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 2.0, max: 10.0, text: "2.0 - 10.0 %" })
      },
      {
        id: "hem_eosinofilos_pct",
        name: "Eosinófilos",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 1.0, max: 6.0, text: "1.0 - 6.0 %" })
      },
      {
        id: "hem_basofilos_pct",
        name: "Basófilos",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 0.0, max: 2.0, text: "0.0 - 2.0 %" })
      },
      {
        id: "glóbulos_rojos",
        name: "Glóbulos Rojos (RBC)",
        unit: "M/µL",
        calculated: false,
        getDefaultReference: (age, sex) => {
          if (sex === "Femenino") return { min: 3.5, max: 5.0, text: "Mujer Adulta: 3.50 - 5.00 M/µL" };
          return { min: 4.3, max: 5.9, text: "Varón Adulto: 4.30 - 5.90 M/µL" };
        }
      },
      {
        id: "hemoglobina",
        name: "Hemoglobina",
        unit: "g/dL",
        calculated: false,
        getDefaultReference: (age, sex) => {
          if (age < 2) return { min: 11.0, max: 13.0, text: "Infantil (1-23m): 11.0 - 13.0 g/dL" };
          if (age < 12) return { min: 11.5, max: 13.5, text: "Pediátrico (2-11a): 11.5 - 13.5 g/dL" };
          if (sex === "Femenino") return { min: 12.1, max: 15.1, text: "Mujer Adulta: 12.1 - 15.1 g/dL" };
          return { min: 13.8, max: 17.2, text: "Varón Adulto: 13.8 - 17.2 g/dL" };
        }
      },
      {
        id: "hematocrito",
        name: "Hematocrito",
        unit: "%",
        calculated: false,
        getDefaultReference: (age, sex) => {
          if (age < 12) return { min: 34, max: 40, text: "Infantil/Pediátrico: 34% - 40%" };
          if (sex === "Femenino") return { min: 36.1, max: 44.3, text: "Mujer Adulta: 36.1% - 44.3%" };
          return { min: 40.7, max: 50.3, text: "Varón Adulto: 40.7% - 50.3%" };
        }
      },
      {
        id: "vcm",
        name: "Volumen Corpuscular Medio (VCM)",
        unit: "fL",
        calculated: true,
        getDefaultReference: () => ({ min: 80, max: 100, text: "80 - 100 fL" }),
        calculateValue: (inputs) => {
          const hto = parseFloat(inputs["hematocrito"]);
          const rbc = parseFloat(inputs["glóbulos_rojos"]);
          if (isNaN(hto) || isNaN(rbc) || rbc === 0) return "";
          return (Math.round((hto * 10) / rbc * 10) / 10).toString();
        }
      },
      {
        id: "hcm",
        name: "Hemoglobina Corpuscular Media (HCM)",
        unit: "pg",
        calculated: true,
        getDefaultReference: () => ({ min: 27, max: 33, text: "27 - 33 pg" }),
        calculateValue: (inputs) => {
          const hb = parseFloat(inputs["hemoglobina"]);
          const rbc = parseFloat(inputs["glóbulos_rojos"]);
          if (isNaN(hb) || isNaN(rbc) || rbc === 0) return "";
          return (Math.round((hb * 10) / rbc * 10) / 10).toString();
        }
      },
      {
        id: "chcm",
        name: "Conc. Hto Corpuscular Media (CHCM)",
        unit: "g/dL",
        calculated: true,
        getDefaultReference: () => ({ min: 32, max: 36, text: "32 - 36 g/dL" }),
        calculateValue: (inputs) => {
          const hb = parseFloat(inputs["hemoglobina"]);
          const hto = parseFloat(inputs["hematocrito"]);
          if (isNaN(hb) || isNaN(hto) || hto === 0) return "";
          return (Math.round((hb * 100) / hto * 10) / 10).toString();
        }
      },
      {
        id: "hem_rdw",
        name: "RDW-CV (Distribución G. Rojos)",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 11.5, max: 14.5, text: "11.5 - 14.5 %" })
      },
      {
        id: "hem_plaquetas",
        name: "Recuento de Plaquetas",
        unit: "10³/µL",
        calculated: false,
        getDefaultReference: () => ({ min: 150, max: 450, text: "150 - 450 10³/µL" })
      },
      {
        id: "hem_vpm",
        name: "Volumen Plaquetario Medio (VPM)",
        unit: "fL",
        calculated: false,
        getDefaultReference: () => ({ min: 7.4, max: 10.4, text: "7.4 - 10.4 fL" })
      }
    ]
  },
  {
    id: "coagulacion_pruebas",
    name: "Coagulación y Tiempos de Sangrado",
    description: "Evaluación del estado hemostático, fibrinógeno y vías de coagulación.",
    metrics: [
      {
        id: "fibrinogeno",
        name: "Fibrinógeno",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 200, max: 400, text: "200 - 400 mg/dL" })
      },
      {
        id: "tp",
        name: "Tiempo de Protrombina (TP)",
        unit: "segundos",
        calculated: false,
        getDefaultReference: () => ({ min: 11.0, max: 13.5, text: "11.0 - 13.5 segundos" })
      },
      {
        id: "tpt",
        name: "Tiempo de Tromboplastina Parcial (TPT)",
        unit: "segundos",
        calculated: false,
        getDefaultReference: () => ({ min: 25.0, max: 35.0, text: "25.0 - 35.0 segundos" })
      },
      {
        id: "combo_tp_tpt",
        name: "Combo TP + TPT",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "TP: 11.0-13.5s | TPT: 25.0-35.0s" })
      },
      {
        id: "combo_tp_tpt_fib",
        name: "Combo TP + TPT + Fibrinógeno",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "TP, TPT y Fibrinógeno dentro de límites normales" })
      }
    ]
  },
  {
    id: "hematologia_especial",
    name: "Hematología Especial y Frotis Cellular",
    description: "Análisis extendidos de sangre periférica, inmunología celular y parásitos sanguíneos.",
    metrics: [
      {
        id: "gota_gruesa",
        name: "Gota Gruesa",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan hemoparásitos (Negativo)" })
      },
      {
        id: "coombs_directo",
        name: "Coombs Directo",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "coombs_indirecto",
        name: "Coombs Indirecto",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "frotis_sangre",
        name: "Frotis de Sangre Periférica",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "Normocítico Normocrómico. Serie blanca y plaquetaria sin anomalías." })
      },
      {
        id: "conteo_plaquetas",
        name: "Conteo de Plaquetas",
        unit: "x10³/µL",
        calculated: false,
        getDefaultReference: () => ({ min: 150, max: 450, text: "150 - 450 x10³/µL" })
      },
      {
        id: "hemato_hemoglo",
        name: "Hematocrito - Hemoglobina",
        unit: "% - g/dL",
        calculated: false,
        getDefaultReference: (age, sex) => {
          const hMin = sex === "Femenino" ? 36 : 40;
          const hMax = sex === "Femenino" ? 45 : 50;
          const hbMin = sex === "Femenino" ? 11.5 : 13.5;
          const hbMax = sex === "Femenino" ? 15.0 : 17.5;
          return { text: `Hto: ${hMin}-${hMax}% | Hb: ${hbMin}-${hbMax} g/dL` };
        }
      },
      {
        id: "hemograma_completo",
        name: "Hemograma Completo",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "Ver recuento leucocitario, eritrocitario y plaquetario completo." })
      },
      {
        id: "factor_du",
        name: "Factor Du",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "vsg_eritrosedimentacion",
        name: "Eritrosedimentación (V.S.G.)",
        unit: "mm/h",
        calculated: false,
        getDefaultReference: (age, sex) => {
          const maxVal = sex === "Femenino" ? 20 : 15;
          return { min: 0, max: maxVal, text: sex === "Femenino" ? "0 - 20 mm/h" : "0 - 15 mm/h" };
        }
      }
    ]
  },
  {
    id: "uroanalisis_embarazo",
    name: "Uroanálisis, Serología e Inmunología Básica",
    description: "Evaluación inmunológica sistémica, orina general y pruebas de gestación sérica/orina.",
    metrics: [
      {
        id: "ego_color",
        name: "Orina - Color",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Amarillo, Pajizo, Ámbar claro" })
      },
      {
        id: "ego_aspecto",
        name: "Orina - Aspecto",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Limpio o Ligeramente Turbio" })
      },
      {
        id: "ego_densidad",
        name: "Orina - Densidad",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ min: 1.005, max: 1.030, text: "1.015 - 1.025" })
      },
      {
        id: "ego_ph",
        name: "Orina - pH",
        unit: "Químico",
        calculated: false,
        getDefaultReference: () => ({ min: 5.0, max: 8.0, text: "5.0 - 7.5 (Neutro/Ácido)" })
      },
      {
        id: "ego_proteinas",
        name: "Orina - Proteínas",
        unit: "Químico",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo [o < 15 mg/dL]" })
      },
      {
        id: "ego_glucosa",
        name: "Orina - Glucosa",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "ego_cetonas",
        name: "Orina - Cetonas",
        unit: "Químico",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "ego_bilirrubina",
        name: "Orina - Bilirrubina",
        unit: "Químico",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "ego_urobilinogeno",
        name: "Orina - Urobilinógeno",
        unit: "Químico",
        calculated: false,
        getDefaultReference: () => ({ text: "Normal (< 1.0 mg/dL)" })
      },
      {
        id: "ego_sangre_oculta",
        name: "Orina - Sangre Oculta / Hb",
        unit: "Químico",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "ego_nitritos",
        name: "Orina - Nitritos",
        unit: "Químico",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "ego_esterasa_leucocitaria",
        name: "Orina - Esterasa Leucocitaria",
        unit: "No. / %",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "ego_celulas_epiteliales",
        name: "Orina - Células Epiteliales",
        unit: "Sedimento",
        calculated: false,
        getDefaultReference: () => ({ text: "Escasas o No se observan" })
      },
      {
        id: "ego_leucocitos_campo",
        name: "Orina - Leucocitos por Campo",
        unit: "Sedimento",
        calculated: false,
        getDefaultReference: () => ({ text: "0 - 5 por campo" })
      },
      {
        id: "ego_hematies_campo",
        name: "Orina - Hematíes por Campo",
        unit: "Sedimento",
        calculated: false,
        getDefaultReference: () => ({ text: "0 - 2 por campo" })
      },
      {
        id: "ego_bacterias",
        name: "Orina - Bacterias",
        unit: "Sedimento",
        calculated: false,
        getDefaultReference: () => ({ text: "Escasas o No se observan" })
      },
      {
        id: "ego_cristales",
        name: "Orina - Cristales",
        unit: "Sedimento",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "ego_cilindros",
        name: "Orina - Cilindros",
        unit: "Sedimento",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "ego_filamento_muco",
        name: "Orina - Filamento de Moco",
        unit: "Sedimento",
        calculated: false,
        getDefaultReference: () => ({ text: "Escaso o No se observan" })
      },
      {
        id: "ego_levaduras",
        name: "Orina - Levaduras",
        unit: "Sedimento",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "ego_tricomonas",
        name: "Orina - Trichomonas vaginalis",
        unit: "Sedimento",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "ego_uratos_amorfos",
        name: "Orina - Uratos/Fosfatos Amorfos",
        unit: "Sedimento",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "embarazo_orina",
        name: "Prueba de Embarazo en Orina",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "NEGATIVO (No embarazada) | POSITIVO (Gestación)" })
      },
      {
        id: "microalbuminuria",
        name: "Microalbuminuria",
        unit: "mg/L",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 20, text: "< 20 mg/L" })
      },
      {
        id: "factor_reumatoideo",
        name: "Factor Reumatoideo",
        unit: "UI/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 14, text: "< 14 UI/mL" })
      },
      {
        id: "pcr_cuantitativa",
        name: "PCR Cuantitativa",
        unit: "mg/L",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 5, text: "< 5.0 mg/L" })
      },
      {
        id: "embarazo_serica_cual",
        name: "Prueba de Embarazo Cualitativa (Sérica)",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "NEGATIVO (No embarazada) | POSITIVO (Gestación)" })
      },
      {
        id: "hcg_cuantitativa",
        name: "HCG Cuantitativa",
        unit: "mIU/mL",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo: < 5.0 mIU/mL | Positivo (Gestación): >= 25.0 mIU/mL" })
      },
      {
        id: "sifilis_rpr",
        name: "Sífilis (RPR)",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "No Reactivo" })
      }
    ]
  },
  {
    id: "hormonas_tiroideas_marcadores",
    name: "Hormonas, Marcadores Tumorales y Vitaminas",
    description: "Evaluación endocrina, tamizaje oncológico, vitaminas e insulina.",
    metrics: [
      {
        id: "t3_total",
        name: "T3 Total",
        unit: "ng/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 80, max: 200, text: "80 - 200 ng/dL" })
      },
      {
        id: "t4_total",
        name: "T4 Total",
        unit: "µg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 4.5, max: 12.0, text: "4.5 - 12.0 µg/dL" })
      },
      {
        id: "tsh_ultrasensible",
        name: "TSH Ultrasensible",
        unit: "µIU/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 0.45, max: 4.5, text: "0.45 - 4.50 µIU/mL" })
      },
      {
        id: "t3_libre",
        name: "T3 Libre",
        unit: "pg/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 2.3, max: 4.2, text: "2.3 - 4.2 pg/mL" })
      },
      {
        id: "t4_libre",
        name: "T4 Libre",
        unit: "ng/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 0.8, max: 1.8, text: "0.8 - 1.8 ng/dL" })
      },
      {
        id: "combo_t4_t3_tsh_tot",
        name: "Combo T4 + T3 Totales + TSH",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "Resultados del Perfil Tiroideo Total" })
      },
      {
        id: "combo_t4_t3_tsh_lib",
        name: "Combo T4 + T3 Libres + TSH",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "Resultados del Perfil Tiroideo Libre" })
      },
      {
        id: "psa_total",
        name: "PSA Total",
        unit: "ng/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 4, text: "< 4.0 ng/mL" })
      },
      {
        id: "psa_libre",
        name: "PSA Libre",
        unit: "ng/mL",
        calculated: false,
        getDefaultReference: () => ({ text: "Índice libre/total > 25% (si T-PSA está entre 4 y 10 ng/mL)" })
      },
      {
        id: "ca125",
        name: "CA125 (CA de Ovario)",
        unit: "U/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 35, text: "< 35 U/mL" })
      },
      {
        id: "ca19_9",
        name: "CA19-9 (CA Páncreas, Gastrointestinal)",
        unit: "U/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 37, text: "< 37 U/mL" })
      },
      {
        id: "ca15_3",
        name: "CA 15-3 (CA de Mama)",
        unit: "U/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 31, text: "< 31 U/mL" })
      },
      {
        id: "insulina",
        name: "Insulina (Prepandrial o Postpandrial)",
        unit: "µIU/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 2.6, max: 24.9, text: "Prepandrial: 2.6 - 24.9 µIU/mL" })
      },
      {
        id: "insulina_pre",
        name: "Insulina Pre-Prandial (Ayunas)",
        unit: "µIU/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 2.6, max: 24.9, text: "2.6 - 24.9 µIU/mL" })
      },
      {
        id: "insulina_post",
        name: "Insulina Post-Prandial (2 Horas)",
        unit: "µIU/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 2.0, max: 79.0, text: "< 79.0 µIU/mL" })
      },
      {
        id: "combo_insulina",
        name: "Combo Insulina Prepandrial y Postpandrial",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "Ayunas: < 25 | 2h Post: < 79 µIU/mL" })
      },
      {
        id: "cea",
        name: "CEA",
        unit: "ng/mL",
        calculated: false,
        getDefaultReference: () => ({ text: "No Fumadores: < 3.0 | Fumadores: < 5.0 ng/mL" })
      },
      {
        id: "cortisol_am",
        name: "Cortisol AM",
        unit: "µg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 6.2, max: 19.4, text: "6.2 - 19.4 µg/dL (toma 08:00 AM)" })
      },
      {
        id: "cortisol_pm",
        name: "Cortisol PM",
        unit: "µg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 2.3, max: 11.9, text: "2.3 - 11.9 µg/dL (toma 04:00 PM)" })
      },
      {
        id: "combo_cortisol",
        name: "Combo Cortisol AM + PM",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "AM: 6.2-19.4 | PM: 2.3-11.9 µg/dL" })
      },
      {
        id: "alfafetoproteina",
        name: "Alfafetoproteína",
        unit: "ng/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 8.5, text: "< 8.5 ng/mL" })
      },
      {
        id: "testosterona",
        name: "Testosterona",
        unit: "ng/dL",
        calculated: false,
        getDefaultReference: (age, sex) => {
          if (sex === "Femenino") return { min: 8, max: 60, text: "Mujer: 8 - 60 ng/dL" };
          return { min: 240, max: 950, text: "Varón: 240 - 950 ng/dL" };
        }
      },
      {
        id: "vitamina_d",
        name: "Vitamina D",
        unit: "ng/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 30, max: 100, text: "Suficiencia: 30.0 - 100.0 ng/mL" })
      }
    ]
  },
  {
    id: "coproanalisis",
    name: "Coproanálisis (Exámenes de Heces)",
    description: "Tamizaje gastrointestinal, parásitos fecales, antígenos y rotavirus.",
    metrics: [
      {
        id: "concentrado_heces",
        name: "Concentrado de Heces",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan huevos, larvas ni quistes de parásitos" })
      },
      {
        id: "eh_color",
        name: "Color",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Café / Pardo" })
      },
      {
        id: "eh_consistencia",
        name: "Consistencia",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Blanda o Formada" })
      },
      {
        id: "eh_moco",
        name: "Moco fecal",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "eh_restos_macroscopicos",
        name: "Restos Macroscópicos",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Escasos" })
      },
      {
        id: "eh_restos_microscopicos",
        name: "Restos Microscópicos",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "Escasos" })
      },
      {
        id: "eh_sangre_macroscopica",
        name: "Sangre Macroscópica",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "eh_leucocitos",
        name: "Leucocitos",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "eh_hematies",
        name: "Hematíes",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "eh_quistes_protozoarios",
        name: "Quistes de Protozoarios",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "eh_trofozoitos",
        name: "Trofozoítos",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "eh_huevos_helmintos",
        name: "Huevos de Helmintos",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "eh_larvas",
        name: "Larvas",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "eh_levaduras",
        name: "Levaduras",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "eh_grasas_neutras",
        name: "Grasas Neutras",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan" })
      },
      {
        id: "eh_flora_bacteriana",
        name: "Flora Bacteriana",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "Normal / Moderada" })
      },
      {
        id: "pam",
        name: "Prueba de Azul de Metileno (PAM)",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo de leucocitos fecales" })
      },
      {
        id: "sangre_oculta_heces",
        name: "Sangre Oculta en Heces",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "rotavirus",
        name: "Rotavirus",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      },
      {
        id: "helicobacter_pylori",
        name: "Helicobacter Pylori en Heces",
        unit: "Resultado",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo" })
      }
    ]
  },
  {
    id: "electrolitos_perfil",
    name: "Perfil de Electrolitos (Séricos y Urinarios)",
    description: "Estudios iónicos de sodio, potasio, cloro, calcio, magnesio y fósforo.",
    metrics: [
      {
        id: "sodio_serico",
        name: "Sodio Sérico",
        unit: "mEq/L",
        calculated: false,
        getDefaultReference: () => ({ min: 135, max: 145, text: "135 - 145 mEq/L" })
      },
      {
        id: "sodio_orina",
        name: "Sodio en Orina",
        unit: "mEq/L",
        calculated: false,
        getDefaultReference: () => ({ min: 40, max: 220, text: "40 - 220 mEq/L" })
      },
      {
        id: "sodio_orina_24h",
        name: "Sodio en Orina de 24 Horas",
        unit: "mEq/24h",
        calculated: false,
        getDefaultReference: () => ({ min: 40, max: 220, text: "40 - 220 mEq/24h" })
      },
      {
        id: "potasio_serico",
        name: "Potasio Sérico",
        unit: "mEq/L",
        calculated: false,
        getDefaultReference: () => ({ min: 3.5, max: 5.1, text: "3.5 - 5.1 mEq/L" })
      },
      {
        id: "potasio_orina",
        name: "Potasio en Orina",
        unit: "mEq/L",
        calculated: false,
        getDefaultReference: () => ({ min: 25, max: 125, text: "25 - 125 mEq/L" })
      },
      {
        id: "potasio_orina_24h",
        name: "Potasio en Orina de 24 Horas",
        unit: "mEq/24h",
        calculated: false,
        getDefaultReference: () => ({ min: 25, max: 125, text: "25 - 125 mEq/24h" })
      },
      {
        id: "cloro_serico",
        name: "Cloro Sérico",
        unit: "mEq/L",
        calculated: false,
        getDefaultReference: () => ({ min: 98, max: 107, text: "98 - 107 mEq/L" })
      },
      {
        id: "cloro_orina",
        name: "Cloro en Orina",
        unit: "mEq/L",
        calculated: false,
        getDefaultReference: () => ({ min: 110, max: 250, text: "110 - 250 mEq/L" })
      },
      {
        id: "cloro_orina_24h",
        name: "Cloro en Orina de 24 Horas",
        unit: "mEq/24h",
        calculated: false,
        getDefaultReference: () => ({ min: 110, max: 250, text: "110 - 250 mEq/24h" })
      },
      {
        id: "calcio_serico",
        name: "Calcio Sérico",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 8.5, max: 10.2, text: "8.5 - 10.2 mg/dL" })
      },
      {
        id: "calcio_orina",
        name: "Calcio en Orina",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 50, max: 300, text: "50 - 300 mg/dL" })
      },
      {
        id: "calcio_orina_24h",
        name: "Calcio en Orina 24 Horas",
        unit: "mg/24h",
        calculated: false,
        getDefaultReference: () => ({ min: 100, max: 300, text: "100 - 300 mg/24h" })
      },
      {
        id: "magnesio_serico",
        name: "Magnesio Sérico",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 1.7, max: 2.2, text: "1.7 - 2.2 mg/dL" })
      },
      {
        id: "magnesio_orina",
        name: "Magnesio en Orina",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 73, max: 122, text: "73 - 122 mg/dL" })
      },
      {
        id: "fosforo_serico",
        name: "Fósforo Sérico",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 2.5, max: 4.5, text: "2.5 - 4.5 mg/dL" })
      },
      {
        id: "fosforo_orina",
        name: "Fósforo en Orina",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ text: "0.4 - 1.3 g/24h" })
      },
      {
        id: "combo_sodio_potasio",
        name: "Combo Sodio + Potasio",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "Sodio: 135-145 | Potasio: 3.5-5.1 mEq/L" })
      },
      {
        id: "combo_sodio_potasio_cloro",
        name: "Combo Sodio + Potasio + Cloro",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "Sodio, Potasio y Cloro normales" })
      },
      {
        id: "combo_sodio_potasio_cloro_calcio",
        name: "Combo Sodio + Potasio + Cloro + Calcio",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "Sodio, Potasio, Cloro y Calcio normales" })
      }
    ]
  },
  {
    id: "quimica_sanguinea_enzimas",
    name: "Química Clínica Ampliada y Enzimas",
    description: "Evaluación bioquímica comprehensiva de órganos, enzimas y sustratos metabólicos.",
    metrics: [
      {
        id: "glucosa_serica",
        name: "Glucosa Sérica",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 70, max: 100, text: "70 - 100 mg/dL" })
      },
      {
        id: "hba1c_quim_av",
        name: "Hemoglobina Glicosilada HbA1c",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 4.0, max: 5.6, text: "Normal < 5.7%, Prediabetes: 5.7 - 6.4%, Diabetes: >= 6.5%" })
      },
      {
        id: "eag_quim_av",
        name: "Glucosa Promedio Estimada (eAG)",
        unit: "mg/dL",
        calculated: true,
        getDefaultReference: () => ({ min: 70, max: 114, text: "Normal: < 115 mg/dL (Rango estimado de glucosa en los últimos 3 meses)" }),
        calculateValue: (inputs) => {
          const hba1c = parseFloat(inputs["hba1c_quim_av"]);
          if (!hba1c || isNaN(hba1c)) return "";
          const eag = (28.7 * hba1c) - 46.7;
          return Math.round(eag).toString();
        }
      },
      {
        id: "acido_rico",
        name: "Ácido Úrico Sérico",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: (age, sex) => {
          if (sex === "Femenino") return { min: 2.4, max: 5.7, text: "Mujer: 2.4 - 5.7 mg/dL" };
          return { min: 3.4, max: 7.0, text: "Varón: 3.4 - 7.0 mg/dL" };
        }
      },
      {
        id: "albumina_serica",
        name: "Albúmina Sérica",
        unit: "g/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 3.5, max: 5.2, text: "3.5 - 5.2 g/dL" })
      },
      {
        id: "amilasa_serica",
        name: "Amilasa Sérica",
        unit: "U/L",
        calculated: false,
        getDefaultReference: () => ({ min: 28, max: 100, text: "28 - 100 U/L" })
      },
      {
        id: "lipasa_serica",
        name: "Lipasa Sérica",
        unit: "U/L",
        calculated: false,
        getDefaultReference: () => ({ min: 10, max: 140, text: "10 - 140 U/L" })
      },
      {
        id: "combo_bilirrubinas",
        name: "Bilirrubinas (Total, Directa e Indirecta)",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "T: 0.2-1.2 | D: 0.0-0.3 | I: 0.1-0.9 mg/dL" })
      },
      {
        id: "colesterol_tot",
        name: "Colesterol Total",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 100, max: 200, text: "< 200 mg/dL" })
      },
      {
        id: "colesterol_hdl",
        name: "Colesterol HDL",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: (age, sex) => {
          if (sex === "Femenino") return { min: 50, max: 90, text: "Mujer: > 50 mg/dL (Deseable)" };
          return { min: 40, max: 90, text: "Varón: > 40 mg/dL (Deseable)" };
        }
      },
      {
        id: "colesterol_ldl",
        name: "Colesterol LDL",
        unit: "mg/dL",
        calculated: true,
        getDefaultReference: () => ({ min: 50, max: 100, text: "Óptimo: < 100 mg/dL" }),
        calculateValue: (inputs) => {
          const total = parseFloat(inputs["colesterol_tot"]);
          const hdl = parseFloat(inputs["colesterol_hdl"]);
          const trig = parseFloat(inputs["trigliceridos_quim"]);
          if (isNaN(total) || isNaN(hdl) || isNaN(trig)) return "";
          if (trig >= 400) return "Req. Medición Directa (Triglicéridos >= 400)";
          const ldl = total - hdl - (trig / 5);
          return Math.round(ldl).toString();
        }
      },
      {
        id: "colesterol_vldl",
        name: "Colesterol VLDL",
        unit: "mg/dL",
        calculated: true,
        getDefaultReference: () => ({ min: 5, max: 30, text: "5 - 30 mg/dL" }),
        calculateValue: (inputs) => {
          const trig = parseFloat(inputs["trigliceridos_quim"]);
          if (isNaN(trig)) return "";
          return Math.round(trig / 5).toString();
        }
      },
      {
        id: "trigliceridos_quim",
        name: "Triglicéridos",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 30, max: 150, text: "Deseable: < 150 mg/dL" })
      },
      {
        id: "castelli_quim",
        name: "Índice de Castelli (Col. Total / HDL)",
        unit: "cociente",
        calculated: true,
        getDefaultReference: (age, sex) => {
          const limit = sex === "Femenino" ? 4.5 : 5.0;
          return { min: 0.1, max: limit, text: `Bajo Riesgo: < ${limit}` };
        },
        calculateValue: (inputs) => {
          const total = parseFloat(inputs["colesterol_tot"]);
          const hdl = parseFloat(inputs["colesterol_hdl"]);
          if (isNaN(total) || isNaN(hdl) || hdl === 0) return "";
          return (Math.round((total / hdl) * 100) / 100).toString();
        }
      },
      {
        id: "trig_hdl_relation_quim",
        name: "Relación Triglicéridos / HDL",
        unit: "cociente",
        calculated: true,
        getDefaultReference: () => ({ min: 0.1, max: 3.0, text: "Normal < 3.0 (Indicador de Resistencia Insulínica)" }),
        calculateValue: (inputs) => {
          const trig = parseFloat(inputs["trigliceridos_quim"]);
          const hdl = parseFloat(inputs["colesterol_hdl"]);
          if (isNaN(trig) || isNaN(hdl) || hdl === 0) return "";
          return (Math.round((trig / hdl) * 100) / 100).toString();
        }
      },
      {
        id: "ldl_hdl_relation_quim",
        name: "Relación Colesterol LDL / HDL",
        unit: "cociente",
        calculated: true,
        getDefaultReference: () => ({ min: 0.1, max: 3.0, text: "Deseable < 3.0 (Riesgo Coronario)" }),
        calculateValue: (inputs) => {
          const hdl = parseFloat(inputs["colesterol_hdl"]);
          if (isNaN(hdl) || hdl === 0) return "";
          let ldlVal = parseFloat(inputs["colesterol_ldl"]);
          if (isNaN(ldlVal)) {
            const total = parseFloat(inputs["colesterol_tot"]);
            const trig = parseFloat(inputs["trigliceridos_quim"]);
            if (!isNaN(total) && !isNaN(trig)) {
              ldlVal = total - hdl - (trig / 5);
            }
          }
          if (isNaN(ldlVal)) return "";
          return (Math.round((ldlVal / hdl) * 100) / 100).toString();
        }
      },
      {
        id: "colesterol_no_hdl_quim",
        name: "Colesterol No-HDL",
        unit: "mg/dL",
        calculated: true,
        getDefaultReference: () => ({ min: 50, max: 130, text: "Óptimo < 130 mg/dL" }),
        calculateValue: (inputs) => {
          const total = parseFloat(inputs["colesterol_tot"]);
          const hdl = parseFloat(inputs["colesterol_hdl"]);
          if (isNaN(total) || isNaN(hdl)) return "";
          return Math.round(total - hdl).toString();
        }
      },
      {
        id: "cpk_mb",
        name: "CPK-MB",
        unit: "U/L",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 25, text: "< 25 U/L" })
      },
      {
        id: "cpk_total",
        name: "CPK Total",
        unit: "U/L",
        calculated: false,
        getDefaultReference: (age, sex) => {
          if (sex === "Femenino") return { min: 26, max: 192, text: "Mujer: 26 - 192 U/L" };
          return { min: 39, max: 308, text: "Varón: 39 - 308 U/L" };
        }
      },
      {
        id: "creatinina_serica",
        name: "Creatinina Sérica (en sangre)",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: (age, sex) => {
          if (sex === "Femenino") return { min: 0.6, max: 1.1, text: "Mujer: 0.6 - 1.1 mg/dL" };
          return { min: 0.7, max: 1.3, text: "Varón: 0.7 - 1.3 mg/dL" };
        }
      },
      {
        id: "depuracion_volumen",
        name: "Volumen de Orina 24 Horas",
        unit: "mL",
        calculated: false,
        getDefaultReference: () => ({ min: 600, max: 2000, text: "600 - 2000 mL" })
      },
      {
        id: "depuracion_creatinina_orina",
        name: "Creatinina en Orina (24h)",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 60, max: 150, text: "60 - 150 mg/dL" })
      },
      {
        id: "depuracion_creatinina_24h",
        name: "Depuración de Creatinina en Orina 24 Horas",
        unit: "mL/min",
        calculated: true,
        getDefaultReference: (age, sex) => {
          if (sex === "Femenino") return { min: 88, max: 128, text: "Mujer: 88 - 128 mL/min" };
          return { min: 97, max: 137, text: "Varón: 97 - 137 mL/min" };
        },
        calculateValue: (inputs) => {
          const volumen = parseFloat(inputs["depuracion_volumen"]);
          const urineCr = parseFloat(inputs["depuracion_creatinina_orina"]);
          const bloodCr = parseFloat(inputs["creatinina_serica"]);
          if (!volumen || !urineCr || !bloodCr || isNaN(volumen) || isNaN(urineCr) || isNaN(bloodCr)) return "";
          const cl = (urineCr * volumen) / (bloodCr * 1440);
          return Math.round(cl).toString();
        }
      },
      {
        id: "ldh",
        name: "Deshidrogenasa Láctica (LDH)",
        unit: "U/L",
        calculated: false,
        getDefaultReference: () => ({ min: 105, max: 230, text: "105 - 230 U/L" })
      },
      {
        id: "ggt",
        name: "Gamma Glutamil Transpeptidasa (GGT)",
        unit: "U/L",
        calculated: false,
        getDefaultReference: () => ({ min: 8, max: 61, text: "8 - 61 U/L" })
      },
      {
        id: "fosfatasa_alcalina",
        name: "Fosfatasa Alcalina",
        unit: "U/L",
        calculated: false,
        getDefaultReference: () => ({ min: 40, max: 129, text: "40 - 129 U/L" })
      },
      {
        id: "hierro_serico",
        name: "Hierro Sérico",
        unit: "µg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 50, max: 175, text: "50 - 175 µg/dL" })
      },
      {
        id: "lipidos_totales",
        name: "Lípidos Totales",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 400, max: 800, text: "400 - 800 mg/dL" })
      },
      {
        id: "bun_serico",
        name: "Nitrógeno Ureico Sérico",
        unit: "mg/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 7, max: 20, text: "7 - 20 mg/dL" })
      },
      {
        id: "bun_orina",
        name: "Nitrógeno Ureico en Orina",
        unit: "g/24h",
        calculated: false,
        getDefaultReference: () => ({ min: 12, max: 20, text: "12 - 20 g/24h" })
      },
      {
        id: "proteinas_totales",
        name: "Proteínas Totales Sérica",
        unit: "g/dL",
        calculated: false,
        getDefaultReference: () => ({ min: 6.4, max: 8.3, text: "6.4 - 8.3 g/dL" })
      },
      {
        id: "relacion_alb_glob",
        name: "Relación Albúmina/Globulina",
        unit: "cociente",
        calculated: false,
        getDefaultReference: () => ({ min: 1.1, max: 2.2, text: "1.1 - 2.2" })
      },
      {
        id: "tgo_ast",
        name: "TGO/GOT/AST",
        unit: "U/L",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 40, text: "< 40 U/L" })
      },
      {
        id: "tgp_alt",
        name: "TGP/GPT/ALT",
        unit: "U/L",
        calculated: false,
        getDefaultReference: () => ({ min: 0, max: 41, text: "< 41 U/L" })
      },
      {
        id: "combo_tgo_bil_tgp",
        name: "Combo TGO + Bilirrubinas +TGP",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "Transaminasas y Bilirrubinas Normales" })
      },
      {
        id: "combo_perfil_lipidico_full",
        name: "Combo Colesterol Total + HDL + LDL + Triglicéridos",
        unit: "Reporte",
        calculated: false,
        getDefaultReference: () => ({ text: "Colesterol total, HDL, LDL y Triglicéridos normales" })
      }
    ]
  },
  {
    id: "urocultivo",
    name: "Urocultivo (Cultivo de Orina)",
    description: "Cultivo microbiológico para identificación de infecciones bacterianas de las vías urinarias y antibiograma.",
    metrics: [
      {
        id: "uro_recuento_colonias",
        name: "Recuento de Colonias",
        unit: "UFC/mL",
        calculated: false,
        getDefaultReference: () => ({ text: "Negativo ( < 10,000 UFC/mL)" })
      },
      {
        id: "uro_germen_aislado",
        name: "Microorganismo Aislado",
        unit: "Microbiología",
        calculated: false,
        getDefaultReference: () => ({ text: "Sin desarrollo bacteriano a las 48 horas" })
      },
      {
        id: "uro_anti_sensible",
        name: "Antibiograma - Sensibles",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      },
      {
        id: "uro_anti_intermedio",
        name: "Antibiograma - Intermedios",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      },
      {
        id: "uro_anti_resistente",
        name: "Antibiograma - Resistentes",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      }
    ]
  },
  {
    id: "coprocultivo",
    name: "Coprocultivo (Cultivo de Heces)",
    description: "Aislamiento e identificación de bacterias enteropatógenas comunes en muestras fecales y antibiograma.",
    metrics: [
      {
        id: "copro_aspecto",
        name: "Aspecto Físico",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Café / Pardo" })
      },
      {
        id: "copro_consistencia",
        name: "Consistencia de Heces",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Blanda o Formada" })
      },
      {
        id: "copro_leucocitos",
        name: "Presencia de Leucocitos",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "No se observan leucocitos fecales" })
      },
      {
        id: "copro_directo_gram",
        name: "Examen Directo (Gram)",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "Flora bacteriana normal" })
      },
      {
        id: "copro_germen_aislado",
        name: "Microorganismo Aislado",
        unit: "Microbiología",
        calculated: false,
        getDefaultReference: () => ({ text: "No se aislaron enteropatógenos comunes (Salmonella spp., Shigella spp., Vibrio, etc)" })
      },
      {
        id: "copro_anti_sensible",
        name: "Antibiograma - Sensibles",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      },
      {
        id: "copro_anti_intermedio",
        name: "Antibiograma - Intermedios",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      },
      {
        id: "copro_anti_resistente",
        name: "Antibiograma - Resistentes",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      }
    ]
  },
  {
    id: "cultivo_faringeo",
    name: "Cultivo Faríngeo (Exudado)",
    description: "Diagnóstico microbiológico de faringoamigdalitis purulenta o portadores de patógenos en orofaringe y antibiograma.",
    metrics: [
      {
        id: "faringeo_aspecto",
        name: "Aspecto / Muestra",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Correctamente recolectada" })
      },
      {
        id: "faringeo_directo_gram",
        name: "Examen Directo (Gram)",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "Abundantes cocos Gram positivos / Flora mixta normal" })
      },
      {
        id: "faringeo_germen_aislado",
        name: "Microorganismo Aislado",
        unit: "Microbiología",
        calculated: false,
        getDefaultReference: () => ({ text: "No se aislaron bacterias patógenas (Streptococcus pyogenes - Grupo A)" })
      },
      {
        id: "faringeo_anti_sensible",
        name: "Antibiograma - Sensibles",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      },
      {
        id: "faringeo_anti_intermedio",
        name: "Antibiograma - Intermedios",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      },
      {
        id: "faringeo_anti_resistente",
        name: "Antibiograma - Resistentes",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      }
    ]
  },
  {
    id: "secreciones_varias",
    name: "Cultivo de Secreciones Varias",
    description: "Cultivo microbiológico e identificación de bacterias patógenas en muestras de secreciones diversas (vaginal, uretral, ocular, ótica, etc.) y antibiograma.",
    metrics: [
      {
        id: "sec_origen",
        name: "Origen / Tipo de Secreción",
        unit: "Muestra",
        calculated: false,
        getDefaultReference: () => ({ text: "Especificado por el paciente / clínico" })
      },
      {
        id: "sec_aspecto",
        name: "Aspecto Físico de Muestra",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Correctamente recolectada" })
      },
      {
        id: "sec_directo_gram",
        name: "Examen Directo (Gram)",
        unit: "Microscópico",
        calculated: false,
        getDefaultReference: () => ({ text: "Presencia o ausencia de flora bacteriana patógena" })
      },
      {
        id: "sec_germen_aislado",
        name: "Microorganismo Aislado",
        unit: "Microbiología",
        calculated: false,
        getDefaultReference: () => ({ text: "Sin desarrollo de bacterias patógenas a las 48 horas" })
      },
      {
        id: "sec_anti_sensible",
        name: "Antibiograma - Sensibles",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      },
      {
        id: "sec_anti_intermedio",
        name: "Antibiograma - Intermedios",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      },
      {
        id: "sec_anti_resistente",
        name: "Antibiograma - Resistentes",
        unit: "Antibiograma",
        calculated: false,
        getDefaultReference: () => ({ text: "N/A" })
      }
    ]
  },
  {
    id: "espermograma",
    name: "Espermograma Completo",
    description: "Evaluación físico-química y microscópica del semen para analizar la fertilidad y características de los espermatozoides.",
    metrics: [
      {
        id: "esp_volumen",
        name: "Volumen",
        unit: "mL",
        calculated: false,
        getDefaultReference: () => ({ min: 1.5, text: ">= 1.5 mL" })
      },
      {
        id: "esp_color",
        name: "Color",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Blanco opalescente / Grisáceo" })
      },
      {
        id: "esp_ph",
        name: "pH de la Muestra",
        unit: "pH",
        calculated: false,
        getDefaultReference: () => ({ min: 7.2, max: 8.0, text: "7.2 - 8.0" })
      },
      {
        id: "esp_licuefaccion",
        name: "Tiempo de Licuefacción",
        unit: "Minutos",
        calculated: false,
        getDefaultReference: () => ({ text: "Completa a los 30 min" })
      },
      {
        id: "esp_viscosidad",
        name: "Viscosidad",
        unit: "Físico",
        calculated: false,
        getDefaultReference: () => ({ text: "Normal" })
      },
      {
        id: "esp_concentracion",
        name: "Concentración por mL",
        unit: "Millones/mL",
        calculated: false,
        getDefaultReference: () => ({ min: 15.0, text: ">= 15.0 Millones/mL" })
      },
      {
        id: "esp_total_eyaculado",
        name: "Espermatozoides Totales",
        unit: "Millones/Eya",
        calculated: false,
        getDefaultReference: () => ({ min: 39.0, text: ">= 39.0 Millones / Eyaculado" })
      },
      {
        id: "esp_movilidad_total",
        name: "Movilidad Total (PR + NP)",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 40.0, text: ">= 40%" })
      },
      {
        id: "esp_movilidad_progresiva",
        name: "Movilidad Progresiva (PR)",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 32.0, text: ">= 32%" })
      },
      {
        id: "esp_vitalidad",
        name: "Vitalidad (Vivos)",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 58.0, text: ">= 58%" })
      },
      {
        id: "esp_morfologia_normal",
        name: "Morfología Normal (Kruger)",
        unit: "%",
        calculated: false,
        getDefaultReference: () => ({ min: 4.0, text: ">= 4% Normales" })
      },
      {
        id: "esp_leucocitos",
        name: "Leucocitos en Semen",
        unit: "Millones/mL",
        calculated: false,
        getDefaultReference: () => ({ max: 1.0, text: "< 1.0 Millones/mL" })
      }
    ]
  },
  {
    id: "miscelaneo",
    name: "Exámenes Misceláneos / Otros",
    description: "Espacio para ingresar pruebas y parámetros de laboratorio personalizados.",
    metrics: []
  }
];

// Helper to determine status and reference interval based on exact metrics configurations
export function evaluateMetric(metricId: string, valueStr: string, age: number, sex: "Masculino" | "Femenino"): {
  referenceInterval: string;
  status: MetricResult["status"];
} {
  if (!valueStr || valueStr.trim() === "") {
    return { referenceInterval: "", status: "pending" };
  }

  let matchingMetric: MetricConfig | undefined;

  for (const p of CLINICAL_PANELS) {
    const found = p.metrics.find(m => m.id === metricId);
    if (found) {
      matchingMetric = found;
      break;
    }
  }

  if (!matchingMetric) {
    return { referenceInterval: "N/A", status: "normal" };
  }

  const ref = matchingMetric.getDefaultReference(age, sex);

  if (isNaN(parseFloat(valueStr))) {
    // qualitative / text values evaluation
    const upperVal = valueStr.toUpperCase();
    let status: MetricResult["status"] = "normal";
    
    // We should only flag pathological qualitative values as "high/alto"
    const isAlwaysAbnormalMetric = [
      "ego_proteinas", "ego_glucosa", "ego_cetonas", "ego_bilirrubina", "ego_sangre_oculta", "ego_nitritos", 
      "ego_esterasa_leucocitaria", "ego_levaduras", "ego_tricomonas", "eh_moco", "eh_sangre_macroscopica", 
      "eh_leucocitos", "eh_hematies", "eh_quistes_protozoarios", "eh_trofozoitos", 
      "eh_huevos_helmintos", "eh_larvas"
    ].includes(metricId);

    // If it's a known non-abnormal text, keep it normal
    const isNormalText = 
      upperVal.includes("NEGATIVO") || 
      upperVal.includes("NORMAL") || 
      upperVal.includes("NO SE OBSERVAN") || 
      upperVal.includes("NO SE OBSERVA") || 
      upperVal.includes("ESCASO") || 
      upperVal.includes("ESCASAS") || 
      upperVal.includes("SUIP") || // "sui generis"
      upperVal.includes("SUI G") || 
      upperVal.includes("LIMPIO") || 
      upperVal.includes("AMARILLO") || 
      upperVal === "NO" || 
      upperVal === "0" || 
      upperVal === "N/A" || 
      upperVal === "-";

    if (!isNormalText) {
      if (isAlwaysAbnormalMetric) {
        // Any positive indications (like +, ++, or non-zero numbers/percentages, or text like Positive, trazas, high values)
        const hasPositiveIndicator = 
          upperVal.includes("POSITIVO") || 
          upperVal.includes("REACTIV") || 
          upperVal.includes("ABUNDANTE") || 
          upperVal.includes("MODERAD") || 
          upperVal.includes("PRESENC") || 
          upperVal.includes("TRAZAS") ||
          upperVal.includes("+") || 
          /\b[1-9]\d*(\.\d+)?%/.test(upperVal) || 
          /\b0\.[1-9]\d*%/.test(upperVal) ||     
          (upperVal.match(/\b\d+\b/) && !upperVal.includes("0 %") && !upperVal.startsWith("0 "));
          
        if (hasPositiveIndicator) {
          status = "high";
        }
      } else {
        // For other sediment components (bacterias, cristales, cilindros, etc.)
        if (
          (metricId === "ego_bacterias" || metricId === "ego_cristales" || metricId === "ego_cilindros" || metricId === "ego_uratos_amorfos") &&
          (upperVal.includes("ABUNDANTE") || upperVal.includes("MODERADO") || upperVal.includes("MODERADAS") || upperVal.includes("PRESENC") || upperVal.includes("POSITIVO") || upperVal.includes("+"))
        ) {
          status = "high";
        }
      }
    }
    
    return { referenceInterval: ref.text, status };
  }

  const val = parseFloat(valueStr);
  
  if (ref.min !== undefined && ref.max !== undefined) {
    if (val < ref.min) {
      // Check if critical
      const thresholdLowPercent = ref.min * 0.7; // say 30% lower than min is critical
      return { 
        referenceInterval: ref.text, 
        status: val <= thresholdLowPercent ? "critical-low" : "low" 
      };
    }
    if (val > ref.max) {
      const thresholdHighPercent = ref.max * 1.30; // 30% higher than max is critical
      return { 
        referenceInterval: ref.text, 
        status: val >= thresholdHighPercent ? "critical-high" : "high" 
      };
    }
    return { referenceInterval: ref.text, status: "normal" };
  } else if (ref.min !== undefined) {
    if (val < ref.min) {
      return { referenceInterval: ref.text, status: "low" };
    }
    return { referenceInterval: ref.text, status: "normal" };
  } else if (ref.max !== undefined) {
    if (val > ref.max) {
      return { referenceInterval: ref.text, status: "high" };
    }
    return { referenceInterval: ref.text, status: "normal" };
  }

  // Complex multi-value text reference like HbA1c
  if (metricId === "hba1c") {
    if (val >= 6.5) return { referenceInterval: ref.text, status: "high" };
    if (val >= 5.7) return { referenceInterval: ref.text, status: "high" }; // high warning for prediabetes
    if (val < 4.0) return { referenceInterval: ref.text, status: "low" }; // extremely low
    return { referenceInterval: ref.text, status: "normal" };
  }

  return { referenceInterval: ref.text, status: "normal" };
}
