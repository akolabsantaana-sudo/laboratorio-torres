import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, Save, FileDown, Settings, User, Calendar, 
  ClipboardCheck, Calculator, AlertTriangle, Search, Plus, 
  Trash2, ShieldCheck, Sparkles, CheckSquare, Square, Check,
  Receipt, DollarSign, Wallet, MessageCircle, History, Eye,
  TrendingUp, TrendingDown, Printer
} from "lucide-react";
import { DecryptedLabRecord, DecryptedLabProfile } from "../types";
import { 
  CLINICAL_PANELS, calculateAge, calculateAgeDescription, evaluateMetric, 
  PanelValues 
} from "../utils/clinicalCalculations";
import { AVAILABLE_EXAMS, getMetricIdsForExam, getActiveExamsList } from "./PatientReceptionForm";

interface ClinicalReportFormProps {
  initialRecord?: DecryptedLabRecord | null;
  onSave: (record: DecryptedLabRecord) => Promise<void>;
  onDownloadPDF: (
    record: DecryptedLabRecord,
    targetExamId?: string,
    targetExamName?: string,
    chemistryLayout?: "compact" | "continuous" | "individual",
    action?: "download" | "print"
  ) => void;
  onCancel: () => void;
  profile: DecryptedLabProfile; // Consume full E2EE medical lab settings profile
  records?: DecryptedLabRecord[];
}

const COMBOS = [
  {
    name: "Química Básica",
    metrics: ["glucosa", "urea", "bun", "creatinina", "egfr_ckdepi"]
  },
  {
    name: "Perfil Lipídico",
    metrics: ["colesterol_total", "trigliceridos", "hdl", "ldl", "castelli", "trig_hdl_relation", "ldl_hdl_relation", "colesterol_no_hdl"]
  },
  {
    name: "Función Renal",
    metrics: ["creatinina", "egfr_ckdepi"]
  },
  {
    name: "Perfil Hepático",
    metrics: ["ast_sgot", "alt_sgpt", "de_ritis", "bilirrubina_total", "bilirrubina_directa", "bilirrubina_indirecta"]
  },
  {
    name: "Hemograma Completo",
    metrics: [
      "hem_leucocitos", "hem_neutrofilos_pct", "hem_linfocitos_pct", 
      "hem_monocitos_pct", "hem_eosinofilos_pct", "hem_basofilos_pct", 
      "glóbulos_rojos", "hemoglobina", "hematocrito", "vcm", "hcm", "chcm", 
      "hem_rdw", "hem_plaquetas", "hem_vpm"
    ]
  },
  {
    name: "Perfil Tiroideo",
    metrics: ["t3_total", "t4_total", "tsh_ultrasensible", "t3_libre", "t4_libre"]
  },
  {
    name: "Electrolitos",
    metrics: ["sodio_serico", "potasio_serico", "cloro_serico", "calcio_serico"]
  },
  {
    name: "G. de Orina Completo",
    metrics: [
      "ego_color", "ego_aspecto", "ego_densidad", "ego_ph", "ego_proteinas", 
      "ego_glucosa", "ego_cetonas", "ego_bilirrubina", "ego_urobilinogeno", 
      "ego_sangre_oculta", "ego_nitritos", "ego_esterasa_leucocitaria", 
      "ego_celulas_epiteliales", "ego_leucocitos_campo", "ego_hematies_campo", 
      "ego_bacterias", "ego_cristales", "ego_cilindros", "ego_filamento_muco",
      "ego_levaduras", "ego_tricomonas", "ego_uratos_amorfos"
    ]
  },
  {
    name: "G. de Heces Completo",
    metrics: [
      "eh_color", "eh_consistencia", "eh_moco", "eh_restos_macroscopicos", "eh_restos_microscopicos", "eh_sangre_macroscopica", 
      "eh_leucocitos", "eh_hematies", "eh_grasas_neutras", 
      "eh_quistes_protozoarios", "eh_trofozoitos", "eh_huevos_helmintos", 
      "eh_larvas", "eh_levaduras", "eh_flora_bacteriana"
    ]
  }
];

const getConstituentMetricIds = (mId: string): string[] => {
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

const DEFAULT_NORMAL_VALUES: Record<string, string> = {
  hem_leucocitos: "7.0",
  hem_neutrofilos_pct: "60.0",
  hem_linfocitos_pct: "30.0",
  hem_monocitos_pct: "6.0",
  hem_eosinofilos_pct: "3.0",
  hem_basofilos_pct: "1.0",
  glóbulos_rojos: "4.50",
  hemoglobina: "14.5",
  hematocrito: "42.0",
  vcm: "90.0",
  hcm: "30.0",
  chcm: "33.5",
  hem_rdw: "13.0",
  hem_plaquetas: "280",
  hem_vpm: "9.2",
  vsg_eritrosedimentacion: "10",

  ego_color: "Amarillo",
  ego_aspecto: "Limpio",
  ego_densidad: "1.020",
  ego_ph: "6.0",
  ego_proteinas: "Negativo",
  ego_glucosa: "Negativo",
  ego_cetonas: "Negativo",
  ego_bilirrubina: "Negativo",
  ego_urobilinogeno: "Normal",
  ego_sangre_oculta: "Negativo",
  ego_nitritos: "Negativo",
  ego_esterasa_leucocitaria: "Negativo",
  ego_celulas_epiteliales: "Escasas",
  ego_leucocitos_campo: "0-2",
  ego_hematies_campo: "0-1",
  ego_bacterias: "Escasas",
  ego_cristales: "No se observan",
  ego_cilindros: "No se observan",
  ego_filamento_muco: "Escaso",
  ego_levaduras: "No se observan",
  ego_tricomonas: "No se observan",
  ego_uratos_amorfos: "No se observan",

  eh_color: "Café",
  eh_consistencia: "Blanda",
  eh_moco: "Negativo",
  eh_restos_macroscopicos: "Escasos",
  eh_sangre_macroscopica: "Negativo",
  eh_leucocitos: "No se observan",
  eh_hematies: "No se observan",
  eh_restos_microscopicos: "Escasos",
  eh_quistes_protozoarios: "No se observan",
  eh_trofozoitos: "No se observan",
  eh_huevos_helmintos: "No se observan",
  eh_larvas: "No se observan",
  eh_levaduras: "No se observan",
  eh_grasas_neutras: "No se observan",
  eh_flora_bacteriana: "Normal / Moderada",

  // Urocultivo
  uro_aspecto: "Limpio",
  uro_directo_gram: "No se observan bacterias",
  uro_recuento_colonias: "Negativo (sin desarrollo bacteriano)",
  uro_germen_aislado: "Sin desarrollo bacteriano a las 48 horas de incubación",
  uro_anti_sensible: "N/A",
  uro_anti_intermedio: "N/A",
  uro_anti_resistente: "N/A",

  // Coprocultivo
  copro_aspecto: "Café",
  copro_consistencia: "Blanda",
  copro_leucocitos: "No se observan",
  copro_directo_gram: "Flora bacteriana normal",
  copro_germen_aislado: "No se aislaron enteropatógenos comunes (Salmonella, Shigella)",
  copro_anti_sensible: "N/A",
  copro_anti_intermedio: "N/A",
  copro_anti_resistente: "N/A",

  // Cultivo Faríngeo
  faringeo_aspecto: "Correctamente recolectada",
  faringeo_directo_gram: "Flora bacteriana mixta normal",
  faringeo_germen_aislado: "No se aisló Streptococcus pyogenes (Streptococcus beta-hemolítico del Grupo A)",
  faringeo_anti_sensible: "N/A",
  faringeo_anti_intermedio: "N/A",
  faringeo_anti_resistente: "N/A",

  // Secreciones Varias
  sec_origen: "Secreción vaginal",
  sec_aspecto: "Correctamente recolectada",
  sec_directo_gram: "Se observan escasos bacilos Gram negativos / Flora normal",
  sec_germen_aislado: "Sin desarrollo de bacterias patógenas a las 48 horas",
  sec_anti_sensible: "N/A",
  sec_anti_intermedio: "N/A",
  sec_anti_resistente: "N/A",

  // Espermograma
  esp_volumen: "2.0",
  esp_color: "Blanco opalescente",
  esp_ph: "7.6",
  esp_licuefaccion: "Completa a los 30 min",
  esp_viscosidad: "Normal",
  esp_concentracion: "45.0",
  esp_total_eyaculado: "90.0",
  esp_movilidad_total: "65",
  esp_movilidad_progresiva: "50",
  esp_vitalidad: "80",
  esp_morfologia_normal: "15",
  esp_leucocitos: "0.2"
};

const SUGGESTED_CHOICES: Record<string, string[]> = {
  // Urocultivo sugerido
  uro_recuento_colonias: ["Negativo (sin desarrollo bacteriano)", "Negativo ( < 10,000 UFC/mL)", "> 100,000 UFC/mL", "50,000 UFC/mL", "10,000 UFC/mL"],
  uro_germen_aislado: [
    "Sin desarrollo bacteriano a las 48 horas de incubación",
    "Escherichia coli",
    "Klebsiella pneumoniae",
    "Klebsiella oxytoca",
    "Proteus mirabilis",
    "Proteus vulgaris",
    "Pseudomonas aeruginosa",
    "Enterococcus faecalis",
    "Staphylococcus saprophyticus",
    "Staphylococcus aureus",
    "Streptococcus agalactiae (Grupo B)",
    "Enterobacter cloacae",
    "Morganella morganii",
    "Citrobacter freundii",
    "Serratia marcescens",
    "Acinetobacter baumannii",
    "Providentia stuartii",
    "Candida albicans"
  ],
  uro_anti_sensible: ["Amikacina, Gentamicina, Ciprofloxacina", "Nitrofurantoína, Fosfomicina, Ceftriaxona", "N/A"],
  uro_anti_intermedio: ["Ciprofloxacina, Levofloxacina", "Ampicilina", "N/A"],
  uro_anti_resistente: ["Ampicilina, Trimetoprim/Sulfametoxazol", "Penicilina", "N/A"],

  // Coprocultivo sugerido
  copro_germen_aislado: [
    "No se aislaron enteropatógenos comunes (Salmonella, Shigella)",
    "Shigella flexneri",
    "Salmonella enteritidis",
    "Salmonella typhi",
    "Escherichia coli enteropatógena (ECEP)",
    "Vibrio cholerae",
    "Campylobacter jejuni",
    "Sin desarrollo bacteriano patógeno"
  ],
  copro_anti_sensible: ["Ciprofloxacina, Azitromicina, Trimethoprim/Sulfamethoxazole", "Ceftriaxona", "N/A"],
  copro_anti_intermedio: ["N/A"],
  copro_anti_resistente: ["Ampicilina, Amoxicilina", "N/A"],

  // Secreciones Varias sugeridos
  sec_origen: [
    "Secreción vaginal",
    "Secreción uretral",
    "Secreción ótica",
    "Secreción de herida",
    "Secreción ocular",
    "Secreción nasofaringea",
    "Secreción balanoprepucial",
    "Secreción rectal"
  ],
  sec_aspecto: ["Correctamente recolectada", "Abundante", "Moderada", "Escasa", "Purulenta", "Mucopurulenta"],
  sec_directo_gram: [
    "Se observan abundantes cocos Gram positivos",
    "Se observan bacilos Gram negativos",
    "Presencia de diplococos Gram negativos intracelulares",
    "Levaduras y pseudohifas abundantes",
    "Se observan escasos bacilos Gram negativos / Flora normal",
    "Flora mixta normal"
  ],
  sec_germen_aislado: [
    "Sin desarrollo de bacterias patógenas a las 48 horas",
    "Staphylococcus aureus",
    "Pseudomonas aeruginosa",
    "Escherichia coli",
    "Neisseria gonorrhoeae",
    "Streptococcus agalactiae (Grupo B)",
    "Klebsiella pneumoniae",
    "Candida albicans"
  ],
  sec_anti_sensible: ["Oxacilina, Ciprofloxacina, Clindamicina", "Ceftriaxona, Azitromicina, Doxiciclina", "Amikacina, Gentamicina", "N/A"],
  sec_anti_intermedio: ["Eritromicina, Clindamicina", "N/A"],
  sec_anti_resistente: ["Penicilina, Ampicilina", "Ciprofloxacina", "N/A"],

  // Espermograma sugeridos
  esp_color: ["Blanco opalescente", "Grisáceo", "Amarillento", "Blanco amarillento", "Sanguinolento (hemospermia)"],
  esp_viscosidad: ["Normal", "Aumentada", "Disminuida"],
  esp_licuefaccion: ["Completa a los 30 min", "Completa a los 45 min", "Incompleta a los 60 min", "Prolongada (>60 min)"],

  ego_color: ["Amarillo", "Pajizo", "Ámbar", "Rojizo", "Anaranjado", "Incoloro"],
  ego_aspecto: ["Limpio", "Lig. Turbio", "Turbio", "Ligeramente Turbio"],
  ego_densidad: ["1.005", "1.010", "1.015", "1.020", "1.025", "1.030"],
  ego_ph: ["5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0"],
  ego_proteinas: ["Negativo", "Trazas", "Positivo (+)", "Positivo (++)", "Positivo (+++)", "Positivo (++++)"],
  ego_glucosa: ["Negativo", "Trazas", "0.1% (100 mg/dL)", "0.25% (250 mg/dL)", "0.5% (500 mg/dL)", "1.0% (1000 mg/dL)", "2.0% o más (2000+ mg/dL)"],
  ego_cetonas: ["Negativo", "Trazas", "Positivo (+)", "Positivo (++)", "Positivo (+++)"],
  ego_bilirrubina: ["Negativo", "Trazas", "Positivo (+)", "Positivo (++)"],
  ego_urobilinogeno: ["Normal", "Aumentado", "Negativo"],
  ego_sangre_oculta: ["Negativo", "Trazas", "Positivo (+)", "Positivo (++)", "Positivo (+++)"],
  ego_nitritos: ["Negativo", "Positivo"],
  ego_esterasa_leucocitaria: ["Negativo", "Trazas (15 leu/µL)", "75 leu/µL (+)", "125 leu/µL (++)", "500 leu/µL (+++)", "10%", "25%", "50%", "75%", "100%"],
  ego_celulas_epiteliales: ["Escasas", "Moderadas", "Abundantes", "No se observan"],
  ego_leucocitos_campo: ["0-2 x campo", "3-5 x campo", "8-10 x campo", "18-20 x campo", "Abundantes", "No se observan"],
  ego_hematies_campo: ["0-1 x campo", "1-2 x campo", "3-5 x campo", "10-12 x campo", "Abundantes", "No se observan"],
  ego_bacterias: ["Escasas", "Moderadas", "Abundantes", "No se observan"],
  ego_cristales: ["No se observan", "Oxalato de calcio", "Uratos amorfos", "Fosfatos amorfos", "Ácido úrico", "Fosfatos triple"],
  ego_cilindros: ["No se observan", "Hialinos (0-1)", "Granulosos", "Leucocitarios", "Hemáticos"],
  ego_filamento_muco: ["Escaso", "Moderado", "Abundante", "No se observan"],
  ego_levaduras: ["No se observan", "Escasas", "Moderadas", "Abundantes"],
  ego_tricomonas: ["No se observan", "Se observan (Escasas)", "Se observan (Abundantes)"],
  ego_uratos_amorfos: ["No se observan", "Escasos", "Moderados", "Abundantes"],

  eh_color: ["Café", "Pardo", "Amarillo", "Verde", "Rojizo", "Acólico (Blanco)", "Melena (Negro)"],
  eh_consistencia: ["Blanda", "Formada", "Pastosa", "Líquida", "Semilíquida"],
  eh_moco: ["Negativo", "Escaso", "Moderado", "Abundante"],
  eh_restos_macroscopicos: ["Escasos", "Moderados", "Abundantes", "No se observan"],
  eh_sangre_macroscopica: ["Negativo", "Positivo"],
  eh_leucocitos: ["No se observan", "0-2 x campo", "4-6 x campo", "25-30 x campo (Reacción inflamatoria)", "Abundantes"],
  eh_hematies: ["No se observan", "0-1 x campo", "3-5 x campo", "15-20 x campo", "Abundantes"],
  eh_restos_microscopicos: ["Escasos", "Moderados", "Abundantes", "No se observan"],
  eh_quistes_protozoarios: ["No se observan", "Entamoeba coli (Quistes)", "Giardia lamblia (Quistes)", "Endolimax nana (Quistes)", "Blastocystis hominis (Quistes)", "Iodamoeba bütschlii (Quistes)"],
  eh_trofozoitos: ["No se observan", "Giardia lamblia (Trofozoítos)", "Entamoeba histolytica (Trofozoítos)", "Balantidium coli (Trofozoítos)"],
  eh_huevos_helmintos: ["No se observan", "Ascaris lumbricoides (Huevos)", "Trichuris trichiura (Huevos)", "Uncinaria (Huevos)", "Hymenolepis nana (Huevos)", "Taenia sp. (Huevos)"],
  eh_larvas: ["No se observan", "Strongyloides stercoralis (Larvas)"],
  eh_levaduras: ["No se observan", "Escasas", "Moderadas", "Abundantes"],
  eh_flora_bacteriana: ["Normal / Moderada", "Aumentada", "Disminuida", "Muy Aumentada"],
  eh_grasas_neutras: ["No se observan", "Escasas", "Moderadas", "Abundantes"],

  faringeo_aspecto: ["Correctamente recolectada", "Muestra de calidad óptima", "Mucosa / Congestiva"],
  faringeo_directo_gram: ["Flora bacteriana mixta normal", "Presencia de cocos Gram positivos", "Levaduras escasas"],
  faringeo_germen_aislado: ["No se aisló Streptococcus pyogenes (Streptococcus beta-hemolítico del Grupo A)", "Desarrollo de Streptococcus pyogenes (Grupo A)", "Desarrollo de Staphylococcus aureus", "Sin desarrollo bacteriano patógeno"],
  faringeo_anti_sensible: ["Penicilina, Amoxicilina, Ceftriaxona", "Eritromicina, Azitromicina, Clindamicina", "N/A"],
  faringeo_anti_intermedio: ["Eritromicina", "Clindamicina", "N/A"],
  faringeo_anti_resistente: ["Penicilina", "Tetraciclina", "Eritromicina", "N/A"]
};

// Helper function to validate if a custom/miscellaneous value falls outside its manually entered reference range
export const isCustomValueOutOfRange = (result: string, refRange: string): boolean => {
  if (!result || !refRange) return false;
  const trimmedRes = result.trim();
  const trimmedRef = refRange.trim();
  if (trimmedRes === "" || trimmedRef === "") return false;

  const numRes = parseFloat(trimmedRes);
  if (isNaN(numRes)) {
    const upperRes = trimmedRes.toUpperCase();
    const upperRef = trimmedRef.toUpperCase();

    // Check if the reference range indicates standard normal states (Negative/Normal) and the result indicates a positive pathological state
    const refIsNegative = upperRef.includes("NEGATIVO") || upperRef.includes("NORMAL");
    const resIsPositive = upperRes.includes("POSITIVO") || upperRes.includes("REACCIONA") || upperRes.includes("+");
    if (refIsNegative && resIsPositive) return true;
    return false;
  }

  try {
    // Check '< max' or '<= max'
    if (trimmedRef.startsWith("<")) {
      const match = trimmedRef.match(/<=?\s*([0-9.]+)/);
      if (match) {
        const maxVal = parseFloat(match[1]);
        if (!isNaN(maxVal)) {
          return numRes > maxVal;
        }
      }
    }
    // Check '> min' or '>= min'
    if (trimmedRef.startsWith(">")) {
      const match = trimmedRef.match(/>=?\s*([0-9.]+)/);
      if (match) {
        const minVal = parseFloat(match[1]);
        if (!isNaN(minVal)) {
          return numRes < minVal;
        }
      }
    }
    // Check 'min - max' or 'min-max' or 'min a max'
    const hyphenMatch = trimmedRef.match(/^([0-9.]+)\s*(?:-|\ba\b)\s*([0-9.]+)$/i);
    if (hyphenMatch) {
      const minVal = parseFloat(hyphenMatch[1]);
      const maxVal = parseFloat(hyphenMatch[2]);
      if (!isNaN(minVal) && !isNaN(maxVal)) {
        return numRes < minVal || numRes > maxVal;
      }
    }
  } catch (e) {
    // ignore parsing errors
  }

  return false;
};

export default function ClinicalReportForm({ 
  initialRecord, onSave, onDownloadPDF, onCancel, profile, records = []
}: ClinicalReportFormProps) {
  
  // Patient Details
  const [patientName, setPatientName] = useState("");
  const [pendingPDFRecord, setPendingPDFRecord] = useState<DecryptedLabRecord | null>(null);
  const [pdfAction, setPdfAction] = useState<"download" | "print">("download");
  const [patientIdCard, setPatientIdCard] = useState("");
  const [patientBirthdate, setPatientBirthdate] = useState("1990-01-01");
  const [patientSex, setPatientSex] = useState<"Masculino" | "Femenino">("Masculino");
  const [patientPhone, setPatientPhone] = useState(""); // WhatsApp phone contact
  const [examDate, setExamDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [doctorName, setDoctorName] = useState("");
  const [notes, setNotes] = useState("");
  const [labName, setLabName] = useState(profile.labName || "");
  const [isDoctorSV, setIsDoctorSV] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  // Patient History comparison states & memos
  const [selectedHistoricalRecord, setSelectedHistoricalRecord] = useState<DecryptedLabRecord | null>(null);

  // Find other records matching current patient's name (case-insensitive and accent-insensitive)
  const patientHistory = useMemo(() => {
    if (!patientName.trim()) return [];

    const normalize = (val: string) => {
      return val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const normalizedCurrent = normalize(patientName);

    return records
      .filter(rec => {
        // Exclude the current record itself if we are editing
        if (initialRecord && rec.id === initialRecord.id) return false;
        return normalize(rec.patientName) === normalizedCurrent;
      })
      .sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime()); // Sort newest first
  }, [records, patientName, initialRecord]);

  // Map metric values by metricId across all historical records for easy lookup
  const metricHistoryMap = useMemo(() => {
    const map: Record<string, Array<{ value: string; date: string; doc: string; recordId: string }>> = {};

    patientHistory.forEach(rec => {
      if (!rec.panels) return;

      Object.entries(rec.panels).forEach(([panelId, metricVals]) => {
        if (!metricVals) return;

        Object.entries(metricVals).forEach(([metricId, val]) => {
          if (val !== undefined && val !== null && val.toString().trim() !== "") {
            if (!map[metricId]) {
              map[metricId] = [];
            }
            map[metricId].push({
              value: val.toString(),
              date: rec.examDate,
              doc: rec.doctorName || "Solicitante Particular",
              recordId: rec.id
            });
          }
        });
      });
    });

    return map;
  }, [patientHistory]);

  // Billing & Thermal Ticket States
  const [isPaid, setIsPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta" | "Transferencia">("Efectivo");
  const [ticketNumber, setTicketNumber] = useState("");
  const [ticketCustomPrices, setTicketCustomPrices] = useState<Record<string, number>>({});

  // Active prices mapped from core catalog or defaults
  const activePrices = useMemo(() => {
    return profile.examPrices || {
      hemograma: 8,
      ego: 2,
      heces: 2,
      quimica_basica: 3,
      perfil_lipidico: 3,
      perfil_hepatico: 4,
      funcion_renal: 3,
      miscelaneo: 6
    };
  }, [profile.examPrices]);

  // Selected clinical metrics to include in report
  const [selectedMetrics, setSelectedMetrics] = useState<Record<string, boolean>>({});
  
  // Expanded selected metrics resolving any combo selections
  const expandedSelectedMetrics = useMemo(() => {
    const next: Record<string, boolean> = {};
    Object.entries(selectedMetrics).forEach(([mId, isSel]) => {
      if (isSel) {
        if (mId.startsWith("combo_") || mId.startsWith("tolerancia_")) {
          const subIds = getConstituentMetricIds(mId);
          subIds.forEach(subId => {
            next[subId] = true;
          });
        } else {
          next[mId] = true;
        }
      }
    });
    return next;
  }, [selectedMetrics]);
  
  // Dynamic custom test rows (Misceláneos)
  const [miscRows, setMiscRows] = useState<{ id: string; name: string; result: string; unit: string; refRange: string }[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [onlyShowRequested, setOnlyShowRequested] = useState(() => {
    return !!(initialRecord && initialRecord.selectedMetricIds && initialRecord.selectedMetricIds.length > 0);
  });
  const [showAllCatalog, setShowAllCatalog] = useState(() => {
    return !(initialRecord && initialRecord.selectedMetricIds && initialRecord.selectedMetricIds.length > 0);
  });

  // Flat values store for entered metrics (e.g. { "glucosa": "95", "creatinina": "1.1" })
  const [metricValues, setMetricValues] = useState<PanelValues>({});

  // Customizable unit overrides per metric ID
  const [customUnits, setCustomUnits] = useState<Record<string, string>>({});

  // Customizable reference range overrides per metric ID
  const [customReferences, setCustomReferences] = useState<Record<string, string>>({});

  // Error/Success state flags
  const [errorText, setErrorText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load record or initialize empty
  useEffect(() => {
    if (initialRecord) {
      setPatientName(initialRecord.patientName);
      setPatientIdCard(initialRecord.patientIdCard || "");
      setPatientBirthdate(initialRecord.patientBirthdate);
      setPatientSex(initialRecord.patientSex);
      setPatientPhone(initialRecord.patientPhone || "");
      setExamDate(initialRecord.examDate);
      setDoctorName(initialRecord.doctorName || "");
      setNotes(initialRecord.notes || "");
      setLabName(initialRecord.labName || profile.labName || "");
      setIsDoctorSV(!!initialRecord.isDoctorSV);
      setIsUrgent(!!initialRecord.isUrgent);

      // Load billing ticket info if exists, otherwise generate
      if (initialRecord.billing) {
        setIsPaid(initialRecord.billing.isPaid);
        setPaymentMethod(initialRecord.billing.paymentMethod);
        setTicketNumber(initialRecord.billing.ticketNumber);
        
        const custom: Record<string, number> = {};
        initialRecord.billing.items.forEach(itm => {
          custom[itm.name] = itm.price;
        });
        setTicketCustomPrices(custom);
      } else {
        setIsPaid(true);
        setPaymentMethod("Efectivo");
        setTicketNumber("TK-" + initialRecord.examDate.replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900));
        setTicketCustomPrices({});
      }

      const preppedSelected: Record<string, boolean> = {};
      const preppedValues: PanelValues = {};

      const hasSelectedMetricIds = initialRecord.selectedMetricIds && initialRecord.selectedMetricIds.length > 0;

      if (hasSelectedMetricIds) {
        // Pre-select ONLY the metrics explicitly checked/ordered at reception
        initialRecord.selectedMetricIds!.forEach(mId => {
          if (mId.startsWith("combo_") || mId.startsWith("tolerancia_")) {
            const subIds = getConstituentMetricIds(mId);
            subIds.forEach(subId => {
              preppedSelected[subId] = true;
            });
          } else {
            preppedSelected[mId] = true;
          }
        });

        // Copy values from the record’s panels if they exist (to not lose any pre-saved findings)
        CLINICAL_PANELS.forEach(panel => {
          if (initialRecord.panels[panel.id]) {
            Object.entries(initialRecord.panels[panel.id].values).forEach(([mId, val]) => {
              if (mId.startsWith("misc_")) return; // skip miscelaneo here
              if (mId.startsWith("combo_") || mId.startsWith("tolerancia_")) {
                const subIds = getConstituentMetricIds(mId);
                subIds.forEach(subId => {
                  // Skip copying parent value
                });
              } else {
                preppedValues[mId] = val;
              }
            });
          }
        });
      } else {
        // Intelligent fallback: only select metrics that actually have values or are explicitly requested
        CLINICAL_PANELS.forEach(panel => {
          if (initialRecord.panels[panel.id]) {
            const panelVals = initialRecord.panels[panel.id].values;
            const hasEntries = Object.keys(panelVals).length > 0;
            let checkedAny = false;
            
            Object.entries(panelVals).forEach(([mId, val]) => {
              if (mId.startsWith("misc_")) return;
              if (val !== undefined && val !== null && val.trim() !== "") {
                if (mId.startsWith("combo_") || mId.startsWith("tolerancia_")) {
                  const subIds = getConstituentMetricIds(mId);
                  subIds.forEach(subId => {
                    preppedSelected[subId] = true;
                  });
                } else {
                  preppedSelected[mId] = true;
                  preppedValues[mId] = val;
                }
                checkedAny = true;
              }
            });

            // If it is pending and has no metrics filled, only select the first metric or avoid auto-checking everything
            if (!checkedAny && (initialRecord.isPending || !hasEntries)) {
              // Be conservative: do not auto-check the entire panel metrics list to avoid cluttering unrequested exams!
              // Instead, we keep them unchecked unless they were requested.
            }
          }
        });
      }
      setSelectedMetrics(preppedSelected);

      // Load Miscelaneos
      let loadedRows: any[] = [];
      if (initialRecord.panels["miscelaneo"]) {
        const miscVals = initialRecord.panels["miscelaneo"].values;
        const indexes = [...new Set(Object.keys(miscVals)
          .map(k => k.match(/^misc_value_(\d+)$/)?.[1])
          .filter(Boolean))] as string[];

        // Sort they numerically
        indexes.sort((a, b) => parseInt(a) - parseInt(b));

        loadedRows = indexes.map(idx => ({
          id: idx,
          name: miscVals[`misc_title_${idx}`] || "",
          result: miscVals[`misc_value_${idx}`] || "",
          unit: miscVals[`misc_unit_${idx}`] || "",
          refRange: miscVals[`misc_ref_${idx}`] || ""
        }));
      }

      // Automatically sync selected custom/special exams from reception into miscRows if they aren't already there!
      if (hasSelectedMetricIds) {
        const allCustomExams = getActiveExamsList(profile).filter(e => e.id.startsWith("custom_"));
        initialRecord.selectedMetricIds!.forEach(mId => {
          if (mId.startsWith("custom_")) {
            const customExam = allCustomExams.find(e => e.id === mId);
            const examName = customExam ? customExam.name : mId.replace("custom_", "").replace(/_/g, " ");
            
            // Check if already in loadedRows
            const alreadyLoaded = loadedRows.some(r => r.name.toLowerCase().trim() === examName.toLowerCase().trim());
            if (!alreadyLoaded) {
              loadedRows.push({
                id: "custom_init_" + mId + "_" + Math.floor(Math.random() * 100),
                name: examName,
                result: "",
                unit: "",
                refRange: "Negativo"
              });
            }
          }
        });
      }

      setMiscRows(loadedRows);

      // Populate empty values for other metrics, fallback to clinical defaults
      CLINICAL_PANELS.forEach(panel => {
        panel.metrics.forEach(metric => {
          if (preppedValues[metric.id] === undefined) {
            preppedValues[metric.id] = DEFAULT_NORMAL_VALUES[metric.id] || "";
          }
        });
      });

      // Extract custom units and custom reference ranges
      const loadedCustomUnits: Record<string, string> = {};
      const loadedCustomReferences: Record<string, string> = {};

      CLINICAL_PANELS.forEach(panel => {
        if (initialRecord.panels[panel.id]) {
          const pData = initialRecord.panels[panel.id];
          if (pData.customUnits) {
            Object.entries(pData.customUnits).forEach(([mId, uVal]) => {
              loadedCustomUnits[mId] = uVal;
            });
          }
          if (pData.customReferences) {
            Object.entries(pData.customReferences).forEach(([mId, rVal]) => {
              loadedCustomReferences[mId] = rVal;
            });
          }
        }
      });
      setCustomUnits(loadedCustomUnits);
      setCustomReferences(loadedCustomReferences);

      setMetricValues(preppedValues);
    } else {
      // Empty values for new record, with default normal values loaded as baseline
      const emptyValues: PanelValues = {};
      CLINICAL_PANELS.forEach(panel => {
        panel.metrics.forEach(metric => {
          emptyValues[metric.id] = DEFAULT_NORMAL_VALUES[metric.id] || "";
        });
      });
      setMetricValues(emptyValues);
      setCustomUnits({});
      setCustomReferences({});

      // Completely clean slate by default as requested: no exams pre-asserted, user selects exactly what is needed
      const defaultSelected: Record<string, boolean> = {};
      setSelectedMetrics(defaultSelected);
      setMiscRows([]);

      // Setup default ticket variables for new record
      setPatientPhone("");
      setIsPaid(true);
      setPaymentMethod("Efectivo");
      const todayString = new Date().toISOString().split("T")[0].replace(/-/g, "");
      setTicketNumber("TK-" + todayString + "-" + Math.floor(100 + Math.random() * 900));
      setTicketCustomPrices({});
    }
  }, [initialRecord]);

  // Handle single metric value change
  const handleMetricChange = (metricId: string, value: string) => {
    const sanitized = value.replace(",", ".");
    
    setMetricValues(prev => {
      const updated = { ...prev, [metricId]: sanitized };
      const patientAgeInYears = Math.max(1, calculateAge(patientBirthdate, examDate));

      CLINICAL_PANELS.forEach(p => {
        p.metrics.forEach(m => {
          if (m.calculated && m.calculateValue) {
            const derived = m.calculateValue(updated, patientAgeInYears, patientSex);
            updated[m.id] = derived;
          }
        });
      });

      return updated;
    });
  };

  // Re-run clinical formula calculations when DOB or Sex changes
  useEffect(() => {
    const patientAgeInYears = Math.max(1, calculateAge(patientBirthdate, examDate));
    setMetricValues(prev => {
      const copy = { ...prev };
      CLINICAL_PANELS.forEach(p => {
        p.metrics.forEach(m => {
          if (m.calculated && m.calculateValue) {
            copy[m.id] = m.calculateValue(copy, patientAgeInYears, patientSex);
          }
        });
      });
      return copy;
    });
  }, [patientBirthdate, patientSex, examDate]);

  // Dynamic reactive active panels listing depending on selecctions
  const activePanels = useMemo(() => {
    const active: Record<string, boolean> = {};
    CLINICAL_PANELS.forEach(panel => {
      const hasSelectedMetric = panel.metrics.some(m => expandedSelectedMetrics[m.id]);
      const isMiscActive = panel.id === "miscelaneo" && miscRows.length > 0;
      active[panel.id] = hasSelectedMetric || isMiscActive;
    });
    return active;
  }, [expandedSelectedMetrics, miscRows]);

  // Toggle single exam selection
  const toggleMetric = (metricId: string) => {
    if (metricId.startsWith("combo_") || metricId.startsWith("tolerancia_")) {
      const subIds = getConstituentMetricIds(metricId);
      setSelectedMetrics(prev => {
        const allChecked = subIds.every(subId => !!prev[subId]);
        const next = { ...prev };
        subIds.forEach(subId => {
          next[subId] = !allChecked;
          if (!allChecked && (!metricValues[subId] || metricValues[subId].trim() === "")) {
            const defaultVal = DEFAULT_NORMAL_VALUES[subId];
            if (defaultVal) {
              setMetricValues(v => ({ ...v, [subId]: defaultVal }));
            }
          }
        });
        return next;
      });
      return;
    }

    setSelectedMetrics(prev => {
      const nextCheck = !prev[metricId];
      // If checked and currently empty, prefill default normal
      if (nextCheck && (!metricValues[metricId] || metricValues[metricId].trim() === "")) {
        const defaultVal = DEFAULT_NORMAL_VALUES[metricId];
        if (defaultVal) {
          setMetricValues(v => ({ ...v, [metricId]: defaultVal }));
        }
      }
      return {
        ...prev,
        [metricId]: nextCheck
      };
    });
  };

  // Preset quick functions
  const applyPreset = (presetMetrics: string[]) => {
    const expanded: string[] = [];
    presetMetrics.forEach(mId => {
      if (mId.startsWith("combo_") || mId.startsWith("tolerancia_")) {
        const subIds = getConstituentMetricIds(mId);
        subIds.forEach(subId => {
          if (!expanded.includes(subId)) expanded.push(subId);
        });
      } else {
        if (!expanded.includes(mId)) expanded.push(mId);
      }
    });

    setSelectedMetrics(prev => {
      const next = { ...prev };
      expanded.forEach(mId => {
        next[mId] = true;
      });
      return next;
    });

    // Populate default normal values for those that are newly selected and empty
    setMetricValues(prev => {
      const copy = { ...prev };
      expanded.forEach(mId => {
        if (!copy[mId] || copy[mId].trim() === "") {
          const defaultVal = DEFAULT_NORMAL_VALUES[mId];
          if (defaultVal) {
            copy[mId] = defaultVal;
          }
        }
      });
      return copy;
    });
  };

  const forcePresetNormalValues = (presetName: string, presetMetrics: string[]) => {
    const expanded: string[] = [];
    presetMetrics.forEach(mId => {
      if (mId.startsWith("combo_") || mId.startsWith("tolerancia_")) {
        const subIds = getConstituentMetricIds(mId);
        subIds.forEach(subId => {
          if (!expanded.includes(subId)) expanded.push(subId);
        });
      } else {
        if (!expanded.includes(mId)) expanded.push(mId);
      }
    });

    // 1. Activate all metrics in the preset
    setSelectedMetrics(prev => {
      const next = { ...prev };
      expanded.forEach(mId => {
        next[mId] = true;
      });
      return next;
    });

    // 2. Force overwrite existing values with perfect normal defaults
    setMetricValues(prev => {
      const copy = { ...prev };
      expanded.forEach(mId => {
        const defaultVal = DEFAULT_NORMAL_VALUES[mId];
        if (defaultVal) {
          copy[mId] = defaultVal;
        }
      });
      return copy;
    });
  };

  const clearAllSelections = () => {
    setSelectedMetrics({});
    setMiscRows([]);
  };

  const selectAllPredefined = () => {
    const next: Record<string, boolean> = {};
    CLINICAL_PANELS.forEach(p => {
      if (p.id !== "miscelaneo") {
        p.metrics.forEach(m => {
          if (m.id.startsWith("combo_") || m.id.startsWith("tolerancia_")) {
            const subIds = getConstituentMetricIds(m.id);
            subIds.forEach(subId => {
              next[subId] = true;
            });
          } else {
            next[m.id] = true;
          }
        });
      }
    });
    setSelectedMetrics(next);

    // Populate all empty values with defaults if available
    setMetricValues(prev => {
      const copy = { ...prev };
      Object.keys(next).forEach(mId => {
        if (!copy[mId] || copy[mId].trim() === "") {
          const defaultVal = DEFAULT_NORMAL_VALUES[mId];
          if (defaultVal) {
            copy[mId] = defaultVal;
          }
        }
      });
      return copy;
    });
  };

  // Dynamic miscelaneos rows actions
  const addMiscRow = () => {
    setMiscRows(prev => [
      ...prev,
      {
        id: (prev.length + 1).toString() + "-" + Math.floor(Math.random() * 1000),
        name: "",
        result: "",
        unit: "",
        refRange: ""
      }
    ]);
  };

  const removeMiscRow = (id: string) => {
    setMiscRows(prev => prev.filter(r => r.id !== id));
  };

  const updateMiscRow = (id: string, field: "name" | "result" | "unit" | "refRange", value: string) => {
    setMiscRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Search filter exams
  const filteredPanels = useMemo(() => {
    let universe = CLINICAL_PANELS;
    
    // If showAllCatalog is false, strictly only show currently selected metric items!
    if (!showAllCatalog) {
      universe = CLINICAL_PANELS.map(p => {
        const matchingMetrics = p.metrics.filter(m => {
          if (m.id.startsWith("combo_") || m.id.startsWith("tolerancia_")) {
            return getConstituentMetricIds(m.id).every(subId => !!selectedMetrics[subId]);
          }
          return !!selectedMetrics[m.id];
        });
        if (matchingMetrics.length > 0) {
          return {
            ...p,
            metrics: matchingMetrics
          };
        }
        return null;
      }).filter(Boolean) as typeof CLINICAL_PANELS;
    } else if (onlyShowRequested && initialRecord?.selectedMetricIds && initialRecord.selectedMetricIds.length > 0) {
      universe = CLINICAL_PANELS.map(p => {
        const matchingMetrics = p.metrics.filter(m => initialRecord.selectedMetricIds!.includes(m.id));
        if (matchingMetrics.length > 0) {
          return {
            ...p,
            metrics: matchingMetrics
          };
        }
        return null;
      }).filter(Boolean) as typeof CLINICAL_PANELS;
    }

    if (!searchTerm.trim()) {
      return universe.filter(p => p.id !== "miscelaneo");
    }
    const lower = searchTerm.toLowerCase();
    return universe.map(p => {
      if (p.id === "miscelaneo") return null;
      const matchesName = p.name.toLowerCase().includes(lower);
      const matchingMetrics = p.metrics.filter(m => m.name.toLowerCase().includes(lower));
      if (matchesName || matchingMetrics.length > 0) {
        return {
          ...p,
          metrics: matchesName ? p.metrics : matchingMetrics
        };
      }
      return null;
    }).filter(Boolean) as typeof CLINICAL_PANELS;
  }, [searchTerm, onlyShowRequested, initialRecord, showAllCatalog, selectedMetrics]);

  const totalSelectedCount = useMemo(() => {
    const count = Object.keys(expandedSelectedMetrics).filter(mId => {
      if (mId.startsWith("combo_") || mId.startsWith("tolerancia_")) {
        return false;
      }
      return expandedSelectedMetrics[mId];
    }).length;
    return count + miscRows.length;
  }, [expandedSelectedMetrics, miscRows]);

  // Reactive Calculation of Ticket Items and Total Costs
  const ticketSummary = useMemo(() => {
    const items: { name: string; price: number }[] = [];
    
    CLINICAL_PANELS.forEach(panel => {
      if (activePanels[panel.id]) {
        const defaultPrice = activePrices[panel.id] ?? 10;
        // Check if user has overridden/customized the cost of this item on this ticket, or if SV doctor makes it $0
        const price = isDoctorSV ? 0 : (ticketCustomPrices[panel.name] !== undefined ? ticketCustomPrices[panel.name] : defaultPrice);
        items.push({
          name: panel.name,
          price
        });
      }
    });

    const total = items.reduce((sum, item) => sum + item.price, 0);
    return { items, total };
  }, [activePanels, activePrices, ticketCustomPrices, isDoctorSV]);

  // Compile to match DecryptedLabRecord structure
  const compileRecord = (): DecryptedLabRecord => {
    const finalPanels: DecryptedLabRecord["panels"] = {};

    CLINICAL_PANELS.forEach(panel => {
      if (activePanels[panel.id]) {
        const vals: Record<string, string> = {};
        
        if (panel.id === "miscelaneo") {
          miscRows.forEach(row => {
            if (row.name.trim() || row.result.trim()) {
              vals[`misc_title_${row.id}`] = row.name.trim();
              vals[`misc_value_${row.id}`] = row.result.trim();
              vals[`misc_unit_${row.id}`] = row.unit.trim();
              vals[`misc_ref_${row.id}`] = row.refRange.trim();
            }
          });
        } else {
          const customUnitsForPanel: Record<string, string> = {};
          const customReferencesForPanel: Record<string, string> = {};

          panel.metrics.forEach(m => {
            if (m.id.startsWith("combo_") || m.id.startsWith("tolerancia_")) {
              return;
            }
            if (expandedSelectedMetrics[m.id]) {
              vals[m.id] = metricValues[m.id] || "";
              
              if (customUnits[m.id] !== undefined) {
                customUnitsForPanel[m.id] = customUnits[m.id];
              }
              if (customReferences[m.id] !== undefined) {
                customReferencesForPanel[m.id] = customReferences[m.id];
              }
            }
          });

          finalPanels[panel.id] = { 
            values: vals,
            ...(Object.keys(customUnitsForPanel).length > 0 ? { customUnits: customUnitsForPanel } : {}),
            ...(Object.keys(customReferencesForPanel).length > 0 ? { customReferences: customReferencesForPanel } : {})
          };
        }
      }
    });

    return {
      id: initialRecord?.id || "REC-" + Date.now().toString() + "-" + Math.floor(Math.random() * 1000),
      patientName: patientName.trim(),
      patientIdCard: patientIdCard.trim(),
      patientBirthdate: patientBirthdate,
      patientSex: patientSex,
      patientPhone: patientPhone.trim(),
      examDate: examDate,
      doctorName: doctorName.trim() || "SOLICITANTE PARTICULAR",
      isPending: false, // Turn off receptionist pending flag once saved by lab specialist
      isDoctorSV: isDoctorSV,
      isUrgent: isUrgent,
      receptionTime: initialRecord?.receptionTime || new Date().toISOString(),
      reportedTime: new Date().toISOString(),
      panels: finalPanels,
      selectedMetricIds: Object.keys(expandedSelectedMetrics).filter(mId => expandedSelectedMetrics[mId]),
      notes: notes.trim(),
      labName: labName || profile.labName || "CENTRO DE DIAGNÓSTICO",
      billing: {
        total: ticketSummary.total,
        isPaid,
        paymentMethod,
        ticketNumber,
        items: ticketSummary.items
      }
    };
  };

  const handleFormSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!patientName.trim()) {
      setErrorText("El nombre completo del paciente es obligatorio.");
      return;
    }
    if (!patientBirthdate) {
      setErrorText("La fecha de nacimiento del paciente es obligatoria para estimar intervalos de referencia.");
      return;
    }
    if (!examDate) {
      setErrorText("La fecha del examen de laboratorio es obligatoria.");
      return;
    }

    if (totalSelectedCount === 0) {
      setErrorText("Debe elegir al menos un examen o cargar un reporte misceláneo para reportar resultados del paciente.");
      return;
    }

    setIsSaving(true);
    try {
      const record = compileRecord();
      await onSave(record);
    } catch (err: any) {
      setErrorText(err.message || "Fallo al guardar el reporte.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePDFTrigger = () => {
    if (!patientName.trim() || !patientBirthdate) {
      setErrorText("Debe ingresar el nombre del paciente y su fecha de nacimiento antes de generar una boleta.");
      return;
    }
    if (totalSelectedCount === 0) {
      setErrorText("Debe elegir e ingresar resultados para al menos un examen para poder imprimir la boleta.");
      return;
    }
    const record = compileRecord();
    setPendingPDFRecord(record);
  };

  const patientAgeInYears = Math.max(1, calculateAge(patientBirthdate, examDate));
  const ageDescription = calculateAgeDescription(patientBirthdate);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4" id="clinical-report-form-container">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-slate-200 gap-4">
        <button
          onClick={onCancel}
          className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors gap-2 cursor-pointer focus:outline-none"
          id="report-form-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Cancelar y Volver
        </button>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePDFTrigger}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm focus:outline-none"
            id="report-form-pdf-btn"
          >
            <FileDown className="w-4 h-4 text-slate-500" /> Descargar Boleta PDF
          </button>
          <button
            type="button"
            onClick={() => {
              const record = compileRecord();
              try {
                onDownloadPDF(record);
              } catch (e) {
                console.warn("Could not auto-download PDF on WhatsApp share", e);
              }
              const patientPhoneSanitized = record.patientPhone ? record.patientPhone.replace(/[^0-9]/g, "") : "";
              const greeting = `Hola, *${record.patientName}*! ✨ Esperamos que se encuentre muy bien.
Le escribimos de *${(profile?.labName || "LABORATORIO CLÍNICO TORRES").toUpperCase()}* para informarle que sus resultados ya están listos y validados por nuestro equipo especialista. 🩺📋
Adjunto a este mensaje encontrará su reporte en formato PDF (se ha descargado automáticamente en su dispositivo, listo para ser adjuntado). Para su tranquilidad y correcto seguimiento, recuerde compartir este archivo con su médico de cabecera.
¡Muchas gracias por elegirnos para cuidar de su salud! Si necesita algo más, solo responda a este chat. Que tenga un feliz día. 👍`;
              const encodedText = encodeURIComponent(greeting);
              const waUrl = patientPhoneSanitized 
                ? `https://wa.me/${patientPhoneSanitized}?text=${encodedText}` 
                : `https://wa.me/?text=${encodedText}`;
              window.open(waUrl, "_blank");
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-emerald-250 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm focus:outline-none"
            id="report-form-whatsapp-btn"
            title="Compartir por WhatsApp"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" /> Compartir WhatsApp
          </button>
          <button
            onClick={handleFormSave}
            disabled={isSaving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-600/10 transition-all cursor-pointer disabled:opacity-50 focus:outline-none"
            id="report-form-save-btn"
          >
            {isSaving ? "Guardando..." : <><Save className="w-4 h-4" /> Guardar Reporte</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Patient Metadata & Exam Choose Drawer (Spans 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Patient Card panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4.5 h-4.5 text-teal-600" /> Paciente y Orden Médica
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nombre Completo del Paciente
              </label>
              <input
                type="text"
                required
                placeholder="ej. María Alejandra Gómez"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                 Nral. Celular (WhatsApp del Paciente)
              </label>
              <input
                type="text"
                placeholder="ej. +503 7000-0000"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  DNI / Cédula Identif.
                </label>
                <input
                  type="text"
                  placeholder="ej. 01020304"
                  value={patientIdCard}
                  onChange={(e) => setPatientIdCard(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Sexo Biológico
                </label>
                <select
                  value={patientSex}
                  onChange={(e) => setPatientSex(e.target.value as "Masculino" | "Femenino")}
                  className="block w-full px-2 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs transition-all bg-white font-medium"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                required
                value={patientBirthdate}
                onChange={(e) => setPatientBirthdate(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs transition-all font-mono"
              />
              
              {patientBirthdate && (
                <div className="mt-2 text-xs bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-slate-700 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 text-[11px]">Edad Estimada:</span>
                  <span className="font-bold text-slate-900 text-[11px]">{ageDescription}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Fecha del Análisis
                </label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="block w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Médico Solicitante</span>
                  {isDoctorSV && <span className="bg-purple-100 text-purple-800 text-[8px] font-black px-1.5 py-0.2 rounded">CONVENIO 🇸🇻</span>}
                </label>
                <input
                  type="text"
                  placeholder="ej. Dra. Rivas"
                  value={doctorName}
                  disabled={isDoctorSV}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="block w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs transition-colors disabled:bg-slate-50 disabled:text-slate-550"
                />
              </div>
            </div>

            {/* Doctor SV Toggle inside ClinicalReportForm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <label className={`flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all ${isDoctorSV ? "border-purple-400 bg-purple-50/50" : "border-slate-150 hover:bg-slate-50"}`}>
                <input
                  type="checkbox"
                  checked={isDoctorSV}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsDoctorSV(checked);
                    if (checked) {
                      setDoctorName("DOCTOR SV");
                    } else if (doctorName === "DOCTOR SV") {
                      setDoctorName("");
                    }
                  }}
                  className="h-3.5 w-3.5 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                />
                <div className="leading-tight">
                  <span className="text-[10px] font-bold text-purple-900 block">Convenio Especial: Doctor SV 🇸🇻</span>
                  <span className="text-[8.5px] text-purple-700 font-medium block">
                    Exime de cobro total ($0.00).
                  </span>
                </div>
              </label>

              <label className={`flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all ${isUrgent ? "border-orange-400 bg-orange-50/60" : "border-slate-150 hover:bg-slate-50"}`}>
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="h-3.5 w-3.5 text-orange-600 border-slate-300 rounded focus:ring-orange-500 cursor-pointer"
                />
                <div className="leading-tight">
                  <span className="text-[10px] font-bold text-orange-950 block flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-600 animate-pulse" /> Marcado como Urgente ⚠️
                  </span>
                  <span className="text-[8.5px] text-orange-800 font-medium block">
                    Prioriza e ilumina la tarjeta en color naranja.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* PATIENT HISTORICAL CLINICAL COMPARISON CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-orange-600" /> Historial y Comparativa Clínica
              </span>
              {patientHistory.length > 0 && (
                <span className="bg-orange-100 text-orange-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {patientHistory.length} antecedente{patientHistory.length > 1 ? "s" : ""}
                </span>
              )}
            </h3>

            {!patientName.trim() ? (
              <p className="text-xs text-slate-400 italic text-center py-2">
                Ingrese el nombre del paciente para buscar su historial clínico.
              </p>
            ) : patientHistory.length === 0 ? (
              <div className="text-center py-3 px-2 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <p className="text-xs font-bold text-slate-600">Sin historial registrado</p>
                <p className="text-[10px] text-slate-400">Es el primer reporte para "{patientName}" en este laboratorio.</p>
              </div>
            ) : (
              <div className="space-y-4 font-sans">
                {/* Timeline of past visits */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Visitas Anteriores</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {patientHistory.map(hist => (
                      <div 
                        key={hist.id} 
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                      >
                        <div className="leading-tight">
                          <span className="text-xs font-bold text-slate-800 block">
                            {hist.examDate.split("-").reverse().join("/")}
                          </span>
                          <span className="text-[9.5px] text-slate-500 block">
                            Médico: {hist.doctorName || "Particular"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedHistoricalRecord(hist)}
                          className="px-2 py-1 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-teal-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Ver Reporte
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct evolution comparison of active metrics */}
                {(() => {
                  // Find if there are active metrics with history
                  const activeMetricsWithHistory = CLINICAL_PANELS.flatMap(p => p.metrics)
                    .filter(m => activePanels[m.id] && expandedSelectedMetrics[m.id] && metricHistoryMap[m.id]);

                  if (activeMetricsWithHistory.length === 0) return null;

                  return (
                    <div className="pt-3 border-t border-slate-150">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-teal-600" /> Comparación de Valores Activos
                      </span>
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        <div className="grid grid-cols-12 gap-1 px-2.5 py-1.5 bg-slate-100 text-[9.5px] font-bold text-slate-500 uppercase">
                          <div className="col-span-5">Examen</div>
                          <div className="col-span-3 text-center">Hoy</div>
                          <div className="col-span-4 text-right">Anterior</div>
                        </div>
                        <div className="divide-y divide-slate-150 max-h-52 overflow-y-auto">
                          {activeMetricsWithHistory.map(m => {
                            const currentVal = metricValues[m.id] || "--";
                            const historyList = metricHistoryMap[m.id];
                            const prevValObj = historyList && historyList[0];
                            
                            if (!prevValObj) return null;

                            // Calculate direction arrow if numerical
                            const currentNum = parseFloat(currentVal);
                            const prevNum = parseFloat(prevValObj.value);
                            let arrow = null;
                            if (!isNaN(currentNum) && !isNaN(prevNum)) {
                              if (currentNum > prevNum) {
                                arrow = <TrendingUp className="w-3 h-3 text-red-500 shrink-0" title="Subió respecto al anterior" />;
                              } else if (currentNum < prevNum) {
                                arrow = <TrendingDown className="w-3 h-3 text-teal-500 shrink-0" title="Bajó respecto al anterior" />;
                              }
                            }

                            return (
                              <div key={m.id} className="grid grid-cols-12 gap-1 p-2 bg-white text-[11px] items-center">
                                <div className="col-span-5 font-medium text-slate-700 truncate" title={m.name}>
                                  {m.name}
                                </div>
                                <div className="col-span-3 font-mono font-bold text-slate-900 text-center flex items-center justify-center gap-1">
                                  <span>{currentVal}</span>
                                  {arrow}
                                </div>
                                <div className="col-span-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleMetricChange(m.id, prevValObj.value)}
                                    className="font-mono text-[10.5px] font-bold text-orange-900 hover:text-orange-950 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-1 py-0.2 rounded transition-colors inline-block cursor-pointer"
                                    title="Haga clic para copiar el valor anterior"
                                  >
                                    {prevValObj.value}
                                  </button>
                                  <span className="block text-[8px] text-slate-400">{prevValObj.date.split("-").reverse().join("/")}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* VIRTUAL TICKET SECTION (Boleto de Caja Electrónico) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 relative overflow-hidden" id="virtual-ticket-panel">
            {/* Elegant watermarked ticket pattern style */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-teal-500" />
            
            <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-2">
                <Receipt className="w-4.5 h-4.5 text-indigo-600 animate-pulse" /> Ticket de Taquilla Virtual
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                {ticketNumber || "N/A"}
              </span>
            </h3>

            {ticketSummary.items.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-slate-200 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-400 font-semibold">
                  No hay exámenes seleccionados para cobrar en este ticket.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Thermal Ticket simulation list */}
                <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 font-mono text-xs text-slate-700 space-y-2">
                  <div className="text-center text-[10px] font-bold text-slate-400 border-b border-dashed border-slate-200 pb-2 uppercase tracking-wide">
                    ** RECIBO DE LABORATORIO **
                  </div>
                  
                  <div className="space-y-1.5 pt-1">
                    {ticketSummary.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-[11px]">
                        <span className="truncate max-w-[160px]">{item.name}</span>
                        <div className="flex items-center gap-1 font-semibold text-slate-900">
                          <span>$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              setTicketCustomPrices(prev => ({ ...prev, [item.name]: v }));
                            }}
                            className="w-12 text-right border-b border-slate-200 bg-transparent focus:outline-none focus:border-indigo-500 font-mono text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-slate-200 my-2 pt-2 flex justify-between items-center text-xs font-black text-slate-900">
                    <span>Monto Total Cobrado:</span>
                    <span className="text-sm text-indigo-600 font-bold font-mono">
                      ${ticketSummary.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Ticket Controls */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Método de Pago
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs bg-white font-medium cursor-pointer"
                    >
                      <option value="Efectivo">Efectivo 💵</option>
                      <option value="Tarjeta">Tarjeta 💳</option>
                      <option value="Transferencia">Transferencia 📲</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Estado de Pago
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsPaid(!isPaid)}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-black border transition-all flex items-center justify-center gap-1 cursor-pointer focus:outline-none ${isPaid ? "bg-emerald-50 border-emerald-350 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"}`}
                    >
                      {isPaid ? "✓ PAGADO" : "✗ PENDIENTE"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CHOOSE EXAMS PANEL */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-4.5 h-4.5 text-teal-600" /> Exámenes de la Orden
              </h3>
              <span className="text-[10px] px-2 py-0.5 font-extrabold text-teal-850 bg-teal-50 border border-teal-200 rounded-full">
                {totalSelectedCount} Solicitados
              </span>
            </div>

            {!showAllCatalog ? (
              <div className="space-y-4">
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-150 p-2.5 rounded-lg leading-normal">
                  📌 <strong>Vista Simplificada:</strong> Se muestran únicamente las pruebas requeridas para esta orden de consulta médica. No hay distractores o perfiles irrelevantes activos.
                </p>

                {/* Plain, clean list of Active Selected Exams */}
                <div className="space-y-3 font-sans bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                    Análisis en esta Orden:
                  </span>
                  {filteredPanels.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic">Ningún examen activo de forma permanente</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredPanels.map(panel => (
                        <div key={panel.id} className="text-xs bg-white border border-slate-100 rounded-lg p-2.5 shadow-xs">
                          <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide block">
                            {panel.name}
                          </span>
                          <ul className="list-disc pl-4 mt-1 space-y-1.5 text-[10.5px] text-slate-500 font-semibold">
                            {panel.metrics.map(metric => (
                              <li key={metric.id}>
                                {metric.name} <span className="text-[9px] text-slate-400 font-normal">({metric.unit || "s/u"})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Button to open catalog */}
                <button
                  type="button"
                  onClick={() => setShowAllCatalog(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-teal-50/70 border border-teal-200 text-teal-700 hover:bg-teal-100 font-extrabold text-xs rounded-xl cursor-pointer shadow-xs transition-all"
                >
                  ➕ Activar / Modificar Otros Exámenes de Laboratorio
                </button>
              </div>
            ) : (
              // If showAllCatalog is true, show the full catalog view!
              <>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Escriba para filtrar entre todos los análisis. Active solo lo requerido para entregar un reporte limpio de una página.
                </p>

                {/* QUICK OVERALL PACKAGES ACCORDION / BOX */}
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/60 rounded-xl p-3.5 space-y-2.5">
                  <span className="block text-[9.5px] font-bold text-teal-850 uppercase tracking-wider">Carga Rápida Completa (Valores Normales)</span>
                  <p className="text-[10px] text-teal-700/90 leading-normal">
                    Active el examen y cargue todos sus parámetros pre-llenados con valores normales con un solo clic:
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        title: "Hemograma Completo",
                        metricsList: [
                          "hem_leucocitos", "hem_neutrofilos_pct", "hem_linfocitos_pct", 
                          "hem_monocitos_pct", "hem_eosinofilos_pct", "hem_basofilos_pct", 
                          "glóbulos_rojos", "hemoglobina", "hematocrito", "vcm", "hcm", "chcm", 
                          "hem_rdw", "hem_plaquetas", "hem_vpm"
                        ],
                        color: "from-amber-500/5 to-amber-600/5 text-amber-900 border-amber-200/50 hover:bg-amber-100/30"
                      },
                      {
                        title: "Orina Completa (EGO)",
                        metricsList: [
                          "ego_color", "ego_aspecto", "ego_densidad", "ego_ph", "ego_proteinas", 
                          "ego_glucosa", "ego_cetonas", "ego_bilirrubina", "ego_urobilinogeno",  
                          "ego_sangre_oculta", "ego_nitritos", "ego_esterasa_leucocitaria", 
                          "ego_celulas_epiteliales", "ego_leucocitos_campo", "ego_hematies_campo", 
                          "ego_bacterias", "ego_cristales", "ego_cilindros", "ego_filamento_muco",
                          "ego_levaduras", "ego_tricomonas", "ego_uratos_amorfos"
                        ],
                        color: "from-blue-500/5 to-blue-600/5 text-blue-900 border-blue-200/50 hover:bg-blue-100/30"
                      },
                      {
                        title: "Heces Completa (Copro)",
                        metricsList: [
                          "eh_color", "eh_consistencia", "eh_moco", "eh_restos_macroscopicos", "eh_restos_microscopicos", "eh_sangre_macroscopica", 
                          "eh_leucocitos", "eh_hematies", "eh_grasas_neutras", 
                          "eh_quistes_protozoarios", "eh_trofozoitos", "eh_huevos_helmintos", 
                          "eh_larvas", "eh_levaduras", "eh_flora_bacteriana"
                        ],
                        color: "from-emerald-500/5 to-emerald-600/5 text-emerald-950 border-emerald-200/50 hover:bg-emerald-100/30"
                      }
                    ].map((pkg) => (
                      <button
                        key={pkg.title}
                        type="button"
                        onClick={() => forcePresetNormalValues(pkg.title, pkg.metricsList)}
                        className={`w-full py-2 px-3 bg-gradient-to-tr border rounded-xl font-bold text-[10.5px] cursor-pointer transition-all flex items-center justify-between shadow-xs ${pkg.color}`}
                      >
                        <span>{pkg.title}</span>
                        <span className="text-[9px] bg-white/90 px-2 py-0.5 rounded font-extrabold uppercase border border-slate-200 shadow-[0_1px_1px_rgba(0,0,0,0.02)]">Cargar Normal</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* PRESET COMBOS CHIPS */}
                <div className="space-y-1.5 bg-slate-50/55 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Perfiles pre-establecidos:</span>
                  <div className="flex flex-wrap gap-1">
                    {COMBOS.map(combo => (
                      <button
                        key={combo.name}
                        type="button"
                        onClick={() => applyPreset(combo.metrics)}
                        className="text-[10px] px-2.5 py-1 bg-white hover:bg-teal-50 hover:text-teal-980 hover:border-teal-250 border border-slate-200 rounded-lg text-slate-600 font-semibold cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.02)] transition-all"
                      >
                        + {combo.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-slate-100 mt-2">
                    <button
                      type="button"
                      onClick={selectAllPredefined}
                      className="text-[9px] font-bold text-teal-600 hover:underline cursor-pointer"
                    >
                      Seleccionar Todo
                    </button>
                    <button
                      type="button"
                      onClick={clearAllSelections}
                      className="text-[9px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Limpiar Selección
                    </button>
                  </div>
                </div>

                {initialRecord && initialRecord.selectedMetricIds && initialRecord.selectedMetricIds.length > 0 && (
                  <label className="flex items-center justify-between p-3 rounded-xl border border-teal-200/50 bg-teal-50/40 select-none cursor-pointer hover:bg-teal-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-teal-980">Solo exámenes solicitados</span>
                      <span className="text-[10px] text-teal-700/80">Ocultar pruebas no indicadas en consulta</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={onlyShowRequested}
                      onChange={(e) => setOnlyShowRequested(e.target.checked)}
                      className="h-4.5 w-4.5 text-teal-600 border-teal-300 rounded focus:ring-teal-500 cursor-pointer"
                    />
                  </label>
                )}

                {/* SEARCH BOX */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar examen... (ej. VSC, TSH, PCR)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* FILTERED EXAMS TREE */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {filteredPanels.map(panel => (
                    <div key={panel.id} className="space-y-1">
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-0.5">
                        {panel.name}
                      </span>
                      <div className="space-y-0.5 pl-1">
                        {panel.metrics.map(metric => {
                          const isChecked = metric.id.startsWith("combo_") || metric.id.startsWith("tolerancia_")
                            ? getConstituentMetricIds(metric.id).every(subId => !!selectedMetrics[subId])
                            : !!selectedMetrics[metric.id];
                          return (
                            <label
                              key={metric.id}
                              className={`flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-55 cursor-pointer text-[11px] font-semibold text-slate-700 transition-colors ${
                                isChecked ? "bg-teal-50/30 text-teal-900 font-bold" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleMetric(metric.id)}
                                className="mt-0.5 h-3.5 w-3.5 text-teal-600 border-slate-300 rounded text-teal-650 focus:ring-teal-500 cursor-pointer"
                              />
                              <div className="leading-tight">
                                <span>{metric.name}</span>
                                <span className="block text-[9px] text-slate-400 font-normal">{metric.unit}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {initialRecord && initialRecord.selectedMetricIds && initialRecord.selectedMetricIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCatalog(false)}
                    className="w-full py-1.5 text-slate-500 hover:text-slate-700 text-[10.5px] font-bold text-center hover:underline cursor-pointer"
                  >
                    ← Volver a Vista de la Orden
                  </button>
                )}
              </>
            )}

            <hr className="border-slate-100" />

            {/* ACTION DIRECT FOR MISCELANEOS IN DRAWER */}
            <button
              type="button"
              onClick={addMiscRow}
              className="w-full flex items-center justify-center gap-2 p-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl hover:bg-slate-100 hover:border-slate-400 transition-all text-xs font-bold text-slate-700 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-500" /> + Examen Misceláneo / Libre
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Dynamic Panels Result Inputs (Spans 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {errorText && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> {errorText}
            </div>
          )}

          {/* If no exams are checked and no miscelaneos, prompt select */}
          {totalSelectedCount === 0 && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-4">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="max-w-md mx-auto space-y-1">
                <p className="text-sm font-bold text-slate-700">Ningún examen clínico cargado</p>
                <p className="text-xs">
                  Por favor use el buscador de la izquierda o los perfiles rápidos para activar los exámenes solicitados por el paciente.
                </p>
              </div>
            </div>
          )}

          {/* Render inputs for each ACTIVE clinical panel */}
          {CLINICAL_PANELS.map(panel => {
            if (panel.id === "miscelaneo") return null;
            if (!activePanels[panel.id]) return null;

            // Gather only metrics of this panel that are selected, resolving any combo selections
            const activeMetrics = panel.metrics.filter(m => {
              if (m.id.startsWith("combo_") || m.id.startsWith("tolerancia_")) {
                return false;
              }
              return expandedSelectedMetrics[m.id];
            });
            if (activeMetrics.length === 0) return null;

            return (
              <div 
                key={panel.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                id={`panel-${panel.id}-container`}
              >
                {/* Panel title banner */}
                <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{panel.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{panel.description}</p>
                  </div>
                  
                  {/* Quick filling tools */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Fill all currently selected metrics of this panel with normal values
                        setMetricValues(prev => {
                          const copy = { ...prev };
                          panel.metrics.forEach(m => {
                            if (expandedSelectedMetrics[m.id]) {
                              const defaultValue = DEFAULT_NORMAL_VALUES[m.id];
                              if (defaultValue) {
                                copy[m.id] = defaultValue;
                              }
                            }
                          });
                          return copy;
                        });
                      }}
                      className="text-[9.5px] px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-bold cursor-pointer transition-colors"
                      title="Llena los exámenes activos de este panel con valores de referencia por defecto"
                    >
                      Llenar Normales
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Clear active values of this panel only
                        setMetricValues(prev => {
                          const copy = { ...prev };
                          panel.metrics.forEach(m => {
                            if (expandedSelectedMetrics[m.id]) {
                              copy[m.id] = "";
                            }
                          });
                          return copy;
                        });
                      }}
                      className="text-[9.5px] px-2 py-1 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200 rounded-lg text-slate-500 font-bold cursor-pointer transition-colors"
                      title="Limpia los valores digitados de este panel"
                    >
                      Limpiar Panel
                    </button>
                  </div>
                </div>

                <div className="p-5 divide-y divide-slate-100 space-y-4">
                  {/* Table header for desktop screens */}
                  <div className="hidden md:grid grid-cols-12 gap-3 pb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-4">Examen / Análisis</div>
                    <div className="col-span-3">Resultado</div>
                    <div className="col-span-2">Unidad (Editable)</div>
                    <div className="col-span-3">Valor de Referencia (Editable)</div>
                  </div>

                  {activeMetrics.map(metric => {
                    const enteredValue = metricValues[metric.id] || "";
                    const evaluation = evaluateMetric(metric.id, enteredValue, patientAgeInYears, patientSex);
                    const historyForMetric = metricHistoryMap[metric.id];
                    const lastResult = historyForMetric && historyForMetric[0];

                    // Custom styling for flag alerts
                    const isNormal = evaluation.status === "normal" || evaluation.status === "pending";
                    const isHigh = evaluation.status === "high" || evaluation.status === "critical-high";
                    const isLow = evaluation.status === "low" || evaluation.status === "critical-low";

                    let alertBadgeColor = "bg-slate-100 text-slate-500 border-slate-200";
                    let alertLabel = "";
                    
                    if (isHigh) {
                      alertBadgeColor = "bg-red-50 text-red-700 border-red-200";
                      alertLabel = "ALTO";
                    } else if (isLow) {
                      alertBadgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                      alertLabel = "BAJO";
                    } else if (evaluation.status === "normal") {
                      alertBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      alertLabel = "NORMAL";
                    }

                    return (
                      <div key={metric.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-4 first:pt-0 items-center">
                        
                        {/* Name Column */}
                        <div className="md:col-span-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1 bg-teal-50 px-1.5 py-0.5 rounded text-teal-800">
                              {metric.name}
                            </span>
                            {metric.calculated && (
                              <Calculator className="w-3.5 h-3.5 text-indigo-500" title="Cálculo Automático por la plataforma" />
                            )}
                          </div>
                        </div>

                        {/* Input Value Column */}
                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider md:hidden">Resultado</label>
                          {metric.calculated ? (
                            // Disabled Input for calculated formulas or customized badge
                            <div className="relative rounded-xl shadow-sm">
                              <input
                                type="text"
                                disabled
                                value={enteredValue}
                                placeholder="Auto calculado"
                                className={`block w-full px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none transition-all ${
                                  enteredValue && (isHigh || isLow)
                                    ? "bg-red-50 text-red-900 border border-red-400"
                                    : "bg-slate-50 border border-slate-200 text-slate-900"
                                }`}
                              />
                            </div>
                          ) : (
                            // Normal interactive input textbox
                            <div className="relative rounded-xl">
                              <input
                                type="text"
                                value={enteredValue}
                                onChange={(e) => handleMetricChange(metric.id, e.target.value)}
                                placeholder="Ingresar valor"
                                className={`block w-full px-3 py-1.5 border rounded-xl text-xs font-semibold focus:outline-none transition-all font-mono ${
                                  enteredValue && (isHigh || isLow)
                                    ? "bg-red-50 text-red-900 border-red-500 focus:ring-1 focus:ring-red-500 focus:border-transparent shadow-xs"
                                    : "bg-white border-slate-300 text-slate-900 focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                                }`}
                              />
                              {SUGGESTED_CHOICES[metric.id] && (
                                <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                                  {SUGGESTED_CHOICES[metric.id].map(choice => (
                                    <button
                                      key={choice}
                                      type="button"
                                      onClick={() => handleMetricChange(metric.id, choice)}
                                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-all cursor-pointer font-sans ${
                                        enteredValue === choice
                                          ? "bg-teal-600 text-white border-teal-600 font-bold shadow-xs"
                                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {choice}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Historical Result Auto-Fill Badge */}
                          {lastResult && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleMetricChange(metric.id, lastResult.value)}
                                className="inline-flex items-center gap-1 text-[9px] bg-slate-50 hover:bg-orange-50 hover:text-orange-950 hover:border-orange-300 text-slate-700 px-1.5 py-0.5 rounded-lg border border-slate-200 transition-all font-sans font-bold cursor-pointer"
                                title={`Haga clic para copiar el valor anterior de la última consulta (${lastResult.value}) obtenido el ${lastResult.date.split("-").reverse().join("/")} - Médico: ${lastResult.doc}`}
                              >
                                <History className="w-2.5 h-2.5 text-orange-500" />
                                <span>Ant:</span> 
                                <span className="font-mono text-slate-900 underline decoration-slate-400 decoration-dotted">{lastResult.value}</span>
                                <span className="text-[8px] text-slate-400 font-normal">({lastResult.date.split("-").reverse().join("/")})</span>
                              </button>
                              {historyForMetric.length > 1 && (
                                <span className="text-[8px] text-slate-400 font-semibold" title={`Existe un total de ${historyForMetric.length} resultados anteriores de este examen`}>
                                  ({historyForMetric.length}x)
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Editable Unit Column */}
                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider md:hidden">Unidad</label>
                          <input
                            type="text"
                            value={customUnits[metric.id] !== undefined ? customUnits[metric.id] : metric.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomUnits(prev => ({
                                ...prev,
                                [metric.id]: val
                              }));
                            }}
                            placeholder={metric.unit || "s/u"}
                            className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 text-[11px] font-medium focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all font-mono placeholder:text-slate-300"
                            title="Haz clic para modificar la unidad para este examen"
                          />
                        </div>

                        {/* Editable Reference Values Column + Alert Badge */}
                        <div className="md:col-span-3 flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider md:hidden">Valor de Referencia</label>
                            <input
                              type="text"
                              value={customReferences[metric.id] !== undefined ? customReferences[metric.id] : metric.getDefaultReference(patientAgeInYears, patientSex).text}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomReferences(prev => ({
                                  ...prev,
                                  [metric.id]: val
                                }));
                              }}
                              placeholder={metric.getDefaultReference(patientAgeInYears, patientSex).text}
                              className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 text-[10.5px] font-medium leading-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all placeholder:text-slate-300"
                              title="Haz clic para modificar el intervalo de referencia para este examen"
                            />
                          </div>
                          
                          {enteredValue && (
                            <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border ${alertBadgeColor} shrink-0`}>
                              {alertLabel}
                            </span>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* rendering MISCELANEOS dynamic custom options */}
          {miscRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="panel-miscelaneo-container">
              {/* Header banner */}
              <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Exámenes Personalizados / Misceláneos</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Reporte pruebas libres ingresando manualmente nombre, unidades y valores normales.</p>
                </div>
                <button
                  type="button"
                  onClick={addMiscRow}
                  className="flex items-center gap-1 px-3 py-1 bg-teal-50 border border-teal-200 rounded-lg text-teal-850 hover:bg-teal-100 transition-all font-bold text-[10px] cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Agregar Examen
                </button>
              </div>

              {/* Table list of manually added parameters */}
              <div className="p-5 space-y-3.5">
                <div className="hidden md:grid grid-cols-12 gap-3 pb-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <div className="col-span-4">Nombre del Examen</div>
                  <div className="col-span-2">Resultado</div>
                  <div className="col-span-2">Unidad</div>
                  <div className="col-span-3">Rango de Referencia</div>
                  <div className="col-span-1 text-center">Remover</div>
                </div>

                <div className="space-y-3">
                  {miscRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50/30 p-3 md:p-0 border md:border-none rounded-xl border-slate-200">
                      <div className="col-span-12 md:col-span-4 space-y-1 md:space-y-0">
                        <span className="block md:hidden text-[9px] font-bold text-slate-400 uppercase">Nombre del Examen</span>
                        <input
                          type="text"
                          required
                          placeholder="ej. Coproantígeno Helicobacter"
                          value={row.name}
                          onChange={(e) => updateMiscRow(row.id, "name", e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                        />
                      </div>
                      <div className="col-span-12 md:col-span-2 space-y-1 md:space-y-0">
                        <span className="block md:hidden text-[9px] font-bold text-slate-400 uppercase">Resultado</span>
                        <input
                          type="text"
                          required
                          placeholder="ej. Negativo"
                          value={row.result}
                          onChange={(e) => updateMiscRow(row.id, "result", e.target.value)}
                          className={`block w-full px-3 py-2 border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 transition-all ${
                            isCustomValueOutOfRange(row.result, row.refRange)
                              ? "bg-red-50 text-red-900 border-red-500 focus:ring-red-500 focus:border-transparent"
                              : "border-slate-300 focus:ring-teal-500 focus:border-transparent"
                          }`}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-2 space-y-1 md:space-y-0">
                        <span className="block md:hidden text-[9px] font-bold text-slate-400 uppercase">Unidad</span>
                        <input
                          type="text"
                          placeholder="ej. UI/mL o s/u"
                          value={row.unit}
                          onChange={(e) => updateMiscRow(row.id, "unit", e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div className="col-span-12 md:col-span-3 space-y-1 md:space-y-0">
                        <span className="block md:hidden text-[9px] font-bold text-slate-400 uppercase">Rango de Referencia</span>
                        <input
                          type="text"
                          placeholder="ej. Negativo"
                          value={row.refRange}
                          onChange={(e) => updateMiscRow(row.id, "refRange", e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div className="col-span-12 md:col-span-1 flex justify-center pt-2 md:pt-0">
                        <button
                          type="button"
                          onClick={() => removeMiscRow(row.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Observations Frame */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
               Comentarios Clínicos y / u Observaciones
            </h3>
            
            <textarea
              placeholder="Escriba hallazgos relevantes o observaciones generales que aparecerán al final impresas..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full p-4 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs transition-all leading-relaxed"
            />
          </div>

          {/* Bottom Save Action Panel */}
          <div className="flex justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-all"
              id="report-cancel-bottom-btn"
            >
              Cancelar
            </button>
            <button
              onClick={handleFormSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-tr from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-650 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-500/10 cursor-pointer transition-all disabled:opacity-50"
              id="report-save-bottom-btn"
            >
              {isSaving ? "Guardando..." : <><Save className="w-4 h-4" /> Guardar Reporte</>}
            </button>
          </div>

        </div>

      </div>

      {/* SELECTION MODAL TO SPECIFY INDIVIDUAL OR COMPLETE EXAMINATION PDF DOWNLOADS */}
      {pendingPDFRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="editor-pdf-download-picker">
          <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-md w-full overflow-hidden transform scale-95 transition-all duration-300">
            <div className="bg-gradient-to-tr from-teal-800 to-indigo-800 p-6 text-white text-center relative">
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={() => setPendingPDFRecord(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white font-extrabold cursor-pointer border-0"
                >
                  ✕
                </button>
              </div>
              <Printer className="w-10 h-10 text-teal-200 mx-auto mb-3" />
              <h3 className="font-bold text-base tracking-tight">Opciones del Reporte</h3>
              <p className="text-teal-100 text-[11px] mt-1 uppercase tracking-wider font-extrabold">
                Paciente: {pendingPDFRecord.patientName}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* ACCION DE PDF: DESCARGAR O IMPRIMIR */}
              <div className="space-y-2">
                <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">Acción de Destino</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPdfAction("download")}
                    className={`py-2 px-3 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 border-0 ${
                      pdfAction === "download"
                        ? "bg-teal-650 text-white shadow-xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900 bg-transparent"
                    }`}
                  >
                    <FileDown className="w-3.5 h-3.5" /> Descargar PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfAction("print")}
                    className={`py-2 px-3 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 border-0 ${
                      pdfAction === "print"
                        ? "bg-teal-650 text-white shadow-xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900 bg-transparent"
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir / Ver
                  </button>
                </div>
              </div>

              {(() => {
                const hasActiveChemistry = getActiveExamsList(profile).filter(e => e.panelId === "quimica_sanguinea_enzimas" || e.panelId === "química_y_diabetes").some(exam => {
                  const examMetricIds = getMetricIdsForExam(exam.id);
                  if (pendingPDFRecord.selectedMetricIds && pendingPDFRecord.selectedMetricIds.length > 0) {
                    return examMetricIds.some(mId => pendingPDFRecord.selectedMetricIds!.includes(mId));
                  }
                  const panelData = pendingPDFRecord.panels[exam.panelId];
                  if (!panelData) return false;
                  return examMetricIds.some(mId => {
                    const val = panelData.values[mId];
                    return val && val.trim() !== "" && val !== "-";
                  });
                });

                if (!hasActiveChemistry) return null;

                return (
                  <div className="space-y-2.5 p-4.5 bg-teal-50/50 rounded-2xl border border-teal-150">
                    <span className="block text-[9.5px] font-black text-teal-850 uppercase tracking-widest font-sans flex items-center gap-1">
                      🧪 Opciones de Química Analítica
                    </span>
                    <p className="text-[10px] text-teal-900 leading-normal font-medium">
                      Gestione cómo se darán los resultados para los exámenes de Química:
                    </p>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const chemistryExams = getActiveExamsList(profile).filter(e => e.panelId === "quimica_sanguinea_enzimas" || e.panelId === "química_y_diabetes").filter(exam => {
                            const examMetricIds = getMetricIdsForExam(exam.id);
                            if (pendingPDFRecord.selectedMetricIds && pendingPDFRecord.selectedMetricIds.length > 0) {
                              return examMetricIds.some(mId => pendingPDFRecord.selectedMetricIds!.includes(mId));
                            }
                            const panelData = pendingPDFRecord.panels[exam.panelId];
                            if (!panelData) return false;
                            return examMetricIds.some(mId => {
                              const val = panelData.values[mId];
                              return val && val.trim() !== "" && val !== "-";
                            });
                          });
                          chemistryExams.forEach(exam => {
                            onDownloadPDF(pendingPDFRecord, exam.id, exam.name, "individual", pdfAction);
                          });
                          setPendingPDFRecord(null);
                        }}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-bold shadow-xs border-0"
                      >
                        <span className="flex items-center gap-1.5">
                          {pdfAction === "download" ? <FileDown className="w-4 h-4 text-slate-500" /> : <Printer className="w-4 h-4 text-slate-500" />}
                          1. Química Individuales
                        </span>
                        <span className="text-[8px] text-slate-500 bg-slate-100 py-0.5 px-1.5 rounded uppercase font-black font-mono">1 por Prueba</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDownloadPDF(pendingPDFRecord, undefined, undefined, "continuous", pdfAction);
                          setPendingPDFRecord(null);
                        }}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-bold shadow-xs border-0"
                      >
                        <span className="flex items-center gap-1.5">
                          {pdfAction === "download" ? <FileDown className="w-4 h-4 text-teal-600" /> : <Printer className="w-4 h-4 text-teal-600" />}
                          2. Química Juntos por Prueba
                        </span>
                        <span className="text-[8px] text-teal-850 bg-teal-100 py-0.5 px-1.5 rounded uppercase font-black font-mono">Tabla Combinada</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDownloadPDF(pendingPDFRecord, undefined, undefined, "compact", pdfAction);
                          setPendingPDFRecord(null);
                        }}
                        className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white border border-teal-700 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-bold shadow-md shadow-teal-600/10 border-0"
                      >
                        <span className="flex items-center gap-1.5">
                          {pdfAction === "download" ? <FileDown className="w-4 h-4 text-white" /> : <Printer className="w-4 h-4 text-white" />}
                          3. Compacto (Una Sola Página)
                        </span>
                        <span className="text-[8px] text-teal-100 bg-teal-850 py-0.5 px-1.5 rounded uppercase font-black font-mono">Impresión</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Documento Completo</span>
                <button
                  type="button"
                  onClick={() => {
                    onDownloadPDF(pendingPDFRecord, undefined, undefined, undefined, pdfAction);
                    setPendingPDFRecord(null);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-tr from-teal-600 to-indigo-700 hover:from-teal-700 hover:to-indigo-800 text-white font-bold text-xs rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md border-0"
                >
                  {pdfAction === "download" ? <FileDown className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                  {pdfAction === "download" ? "Descargar Reporte Completo (Un Solo PDF)" : "Imprimir / Ver Reporte Completo (Un Solo PDF)"}
                </button>
              </div>

              <div className="space-y-2">
                <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">Exámenes Individuales</span>
                <p className="text-[11px] text-slate-500 leading-normal font-medium">
                  {pdfAction === "download"
                    ? "Genere y descargue un archivo PDF por separado para cada examen clínico con su respectivo membrete, firmas y sellos:"
                    : "Abra e imprima directamente un archivo PDF por separado para cada examen clínico con su respectivo membrete, firmas y sellos:"
                  }
                </p>

                <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                  {getActiveExamsList(profile).filter(exam => {
                    const examMetricIds = getMetricIdsForExam(exam.id);
                    if (pendingPDFRecord.selectedMetricIds && pendingPDFRecord.selectedMetricIds.length > 0) {
                      return examMetricIds.some(mId => pendingPDFRecord.selectedMetricIds!.includes(mId));
                    }
                    const panelData = pendingPDFRecord.panels[exam.panelId];
                    if (!panelData) return false;
                    return examMetricIds.some(mId => {
                      const val = panelData.values[mId];
                      return val && val.trim() !== "" && val !== "-";
                    });
                  }).map(exam => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => {
                        onDownloadPDF(pendingPDFRecord, exam.id, exam.name, undefined, pdfAction);
                      }}
                      className="w-full p-2.5 bg-slate-50 hover:bg-teal-50/55 border border-slate-200 hover:border-teal-200 text-slate-755 font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-between text-left group"
                    >
                      <span className="truncate group-hover:text-teal-850">{exam.name}</span>
                      <span className="text-[9px] text-teal-750 bg-white group-hover:bg-teal-100 hover:shadow-xs px-2.2 py-0.8 rounded-md border border-slate-200 font-extrabold flex items-center gap-1 shrink-0 transition-all">
                        {pdfAction === "download" ? <FileDown className="w-3.5 h-3.5 shrink-0" /> : <Printer className="w-3.5 h-3.5 shrink-0" />}
                        {pdfAction === "download" ? "PDF Individual" : "Imprimir / Ver"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingPDFRecord(null)}
                className="py-2 px-4 bg-slate-200 hover:bg-slate-250 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border-0"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORICAL CLINICAL RECORD DISPLAY MODAL */}
      {selectedHistoricalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="historical-record-viewer-modal">
          <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-2xl w-full overflow-hidden transform scale-95 transition-all duration-300">
            {/* Header banner */}
            <div className="bg-gradient-to-tr from-slate-800 to-slate-950 p-6 text-white relative">
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={() => setSelectedHistoricalRecord(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white font-extrabold cursor-pointer border-0"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                <History className="w-10 h-10 text-orange-400" />
                <div>
                  <h3 className="font-bold text-base tracking-tight">Reporte Clínico Histórico</h3>
                  <p className="text-[11px] text-slate-300">
                    Fecha del Análisis: <span className="font-bold text-white">{selectedHistoricalRecord.examDate.split("-").reverse().join("/")}</span> | Médico: <span className="font-bold text-white">{selectedHistoricalRecord.doctorName || "Particular"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="space-y-0.5">
                  <span className="block text-[9.5px] font-bold text-slate-400 uppercase">Paciente</span>
                  <span className="text-sm font-bold text-slate-900 block capitalize">{selectedHistoricalRecord.patientName}</span>
                </div>
                <div className="flex gap-4 text-xs font-medium text-slate-600">
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Sexo</span>
                    <span className="font-bold text-slate-800">{selectedHistoricalRecord.patientSex}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Edad al momento</span>
                    <span className="font-bold text-slate-800">{calculateAgeDescription(selectedHistoricalRecord.patientBirthdate)}</span>
                  </div>
                </div>
              </div>

              {/* Display clinical panel results */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Resultados Obtenidos</h4>
                
                {(() => {
                  let renderedPanelsCount = 0;
                  
                  return (
                    <div className="space-y-4">
                      {CLINICAL_PANELS.map(panel => {
                        // Gather only metrics that have non-empty values in this historical record
                        const recordPanelValues = selectedHistoricalRecord.panels[panel.id];
                        if (!recordPanelValues) return null;

                        const metricsWithValues = panel.metrics.filter(m => {
                          const val = recordPanelValues[m.id];
                          return val !== undefined && val !== null && val.toString().trim() !== "";
                        });

                        if (metricsWithValues.length === 0) return null;
                        renderedPanelsCount++;

                        return (
                          <div key={panel.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                            <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">{panel.name}</span>
                              <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                {metricsWithValues.length} examen{metricsWithValues.length > 1 ? "es" : ""}
                              </span>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {metricsWithValues.map(m => {
                                const val = recordPanelValues[m.id];
                                return (
                                  <div key={m.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs items-center">
                                    <div className="col-span-6 font-medium text-slate-700">{m.name}</div>
                                    <div className="col-span-3 font-mono font-bold text-slate-900">{val}</div>
                                    <div className="col-span-3 text-[10px] text-slate-400">{m.unit}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Render miscelaneo/custom rows if any */}
                      {selectedHistoricalRecord.panels.miscelaneo && Array.isArray(selectedHistoricalRecord.panels.miscelaneo) && selectedHistoricalRecord.panels.miscelaneo.length > 0 && (
                        (() => {
                          renderedPanelsCount++;
                          return (
                            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                              <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">Pruebas Especiales / Misceláneas</span>
                                <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                  {selectedHistoricalRecord.panels.miscelaneo.length} fila(s)
                                </span>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {selectedHistoricalRecord.panels.miscelaneo.map((row: any) => (
                                  <div key={row.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs items-center">
                                    <div className="col-span-6 font-medium text-slate-700">{row.name}</div>
                                    <div className="col-span-3 font-mono font-bold text-slate-900">{row.result}</div>
                                    <div className="col-span-3 text-[10px] text-slate-400">{row.unit}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Observations */}
                      {selectedHistoricalRecord.notes && selectedHistoricalRecord.notes.trim() !== "" && (
                        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl">
                          <span className="block text-[9px] font-bold text-amber-800 uppercase mb-1">Comentarios / Notas Clínicas</span>
                          <p className="text-xs text-amber-955 whitespace-pre-line leading-relaxed font-medium">
                            {selectedHistoricalRecord.notes}
                          </p>
                        </div>
                      )}

                      {renderedPanelsCount === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-4">No se encontraron resultados reportados en este documento.</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer with actions */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  // Direct helper to restore/fill all values of that historical record into current form!
                  if (confirm("¿Está seguro de querer restaurar todos los resultados de este reporte histórico en el formulario actual? Esto sobreescribirá los valores coincidentes.")) {
                    const copyOfVals = { ...metricValues };
                    const newSelectedMetrics = { ...selectedMetrics };
                    
                    CLINICAL_PANELS.forEach(panel => {
                      const recordPanelValues = selectedHistoricalRecord.panels[panel.id];
                      if (recordPanelValues) {
                        panel.metrics.forEach(m => {
                          const val = recordPanelValues[m.id];
                          if (val !== undefined && val !== null && val.toString().trim() !== "") {
                            copyOfVals[m.id] = val.toString();
                            newSelectedMetrics[m.id] = true;
                          }
                        });
                      }
                    });

                    // Set observations and other details if any
                    if (selectedHistoricalRecord.notes) {
                      setNotes(selectedHistoricalRecord.notes);
                    }

                    // Set miscelaneo custom rows
                    if (selectedHistoricalRecord.panels.miscelaneo && Array.isArray(selectedHistoricalRecord.panels.miscelaneo)) {
                      setMiscRows(selectedHistoricalRecord.panels.miscelaneo);
                    }

                    setSelectedMetrics(newSelectedMetrics);
                    setMetricValues(copyOfVals);
                    setSelectedHistoricalRecord(null);
                  }
                }}
                className="py-2 px-4 bg-orange-100 hover:bg-orange-200 text-orange-950 font-bold text-xs rounded-xl transition-all cursor-pointer border border-orange-200 flex items-center gap-1.5"
                title="Copia todos los valores clínicos de este reporte anterior en el formulario activo con un solo clic."
              >
                <ClipboardCheck className="w-4 h-4 text-orange-700" /> Copiar Todo al Formulario ⚡
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedHistoricalRecord(null)}
                className="py-2 px-4 bg-slate-200 hover:bg-slate-250 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border-0"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
