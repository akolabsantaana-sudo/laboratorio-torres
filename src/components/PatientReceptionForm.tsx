import React, { useState, useMemo } from "react";
import { 
  User, CreditCard, Calendar, Phone, Activity, FileText, 
  CheckCircle, PlusCircle, Sparkles, DollarSign, ArrowLeft, Clipboard, Search, Tag, AlertTriangle
} from "lucide-react";
import { DecryptedLabRecord, DecryptedLabProfile } from "../types";
import { CLINICAL_PANELS } from "../utils/clinicalCalculations";
import VignetteGenerator from "./VignetteGenerator";

export interface SelectableExam {
  id: string;
  name: string;
  panelId: string;
  priceKey: string;
  defaultPrice: number;
}

export const AVAILABLE_EXAMS: SelectableExam[] = [
  // Hematología Especial y Básica
  { id: "hemograma_completo", name: "Hemograma Completo", panelId: "hematologia", priceKey: "hemograma", defaultPrice: 6 },
  { id: "hemograma_sin_plaquetas", name: "Hemograma sin Plaquetas", panelId: "hematologia", priceKey: "hemograma", defaultPrice: 5 },
  { id: "leucograma", name: "Leucograma", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "tipeo_sanguineo_rh", name: "Tipeo Sanguíneo y RH", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "gota_gruesa", name: "Gota Gruesa", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "coombs_directo", name: "Coombs Directo", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "coombs_indirecto", name: "Coombs Indirecto", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "frotis_sangre", name: "Frotis de Sangre Periférica", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 20 },
  { id: "conteo_plaquetas", name: "Conteo de Plaquetas", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "hemato_hemoglo", name: "Hematocrito - Hemoglobina", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "factor_du", name: "Factor Du", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "vsg_eritrosedimentacion", name: "Eritrosedimentación (V.S.G.)", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "reticulocitos", name: "Reticulocitos", panelId: "hematologia_especial", priceKey: "miscelaneo", defaultPrice: 10 },

  // Coagulación
  { id: "fibrinogeno", name: "Fibrinógeno", panelId: "coagulacion_pruebas", priceKey: "miscelaneo", defaultPrice: 12 },
  { id: "tp", name: "Tiempo de Protrombina (TP)", panelId: "coagulacion_pruebas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "tpt", name: "Tiempo de Tromboplastina Parcial (TPT)", panelId: "coagulacion_pruebas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "tiempo_coagulacion", name: "Tiempo de Coagulación", panelId: "coagulacion_pruebas", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "tiempo_sangramiento", name: "Tiempo de Sangramiento", panelId: "coagulacion_pruebas", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "antitrombina", name: "Antitrombina", panelId: "coagulacion_pruebas", priceKey: "miscelaneo", defaultPrice: 45 },
  { id: "anticuagulante_lupico", name: "Anticoagulante Lúpico", panelId: "coagulacion_pruebas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "combo_tp_tpt", name: "Combo TP + TPT", panelId: "coagulacion_pruebas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "combo_tp_tpt_fib", name: "Combo TP + TPT + Fibrinógeno", panelId: "coagulacion_pruebas", priceKey: "miscelaneo", defaultPrice: 20 },

  // Uroanálisis e Inmunología Básica
  { id: "general_orina", name: "General de Orina (EGO)", panelId: "uroanalisis_embarazo", priceKey: "ego", defaultPrice: 4 },
  { id: "embarazo_orina", name: "Prueba de Embarazo en Orina", panelId: "uroanalisis_embarazo", priceKey: "ego", defaultPrice: 6 },
  { id: "embarazo_serica_cual", name: "Prueba de Embarazo en Sangre (HCG Cualitativa)", panelId: "uroanalisis_embarazo", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "microalbuminuria", name: "Microalbuminuria", panelId: "uroanalisis_embarazo", priceKey: "miscelaneo", defaultPrice: 20 },
  { id: "factor_reumatoideo", name: "Factor Reumatoideo (Látex RF)", panelId: "uroanalisis_embarazo", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "factor_reumatoideo_cuantificado", name: "Factor Reumatoideo Cuantificado", panelId: "uroanalisis_embarazo", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "pcr_cuantitativa", name: "Proteína C Reactiva (PCR) Cuantitativa", panelId: "uroanalisis_embarazo", priceKey: "miscelaneo", defaultPrice: 12 },
  { id: "pcr_ultrasensible", name: "PCR Ultrasensible Cardiaca", panelId: "uroanalisis_embarazo", priceKey: "miscelaneo", defaultPrice: 40 },
  { id: "hcg_cuantitativa", name: "HCG Cuantitativa", panelId: "uroanalisis_embarazo", priceKey: "miscelaneo", defaultPrice: 20 },
  { id: "sifilis_rpr", name: "Sífilis (VDRL/RPR)", panelId: "uroanalisis_embarazo", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "proteinas_azar_orina", name: "Proteínas al azar en Orina", panelId: "uroanalisis_embarazo", priceKey: "miscelaneo", defaultPrice: 5 },
  { id: "prueba_latex", name: "Prueba de Látex", panelId: "uroanalisis_embarazo", priceKey: "miscelaneo", defaultPrice: 15 },

  // Hormonas y Marcadores Tumorales
  { id: "t3_total", name: "Total T3", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "t4_total", name: "Total T4", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "tsh_ultrasensible", name: "TSH Ultrasensible", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "t3_libre", name: "T3 Libre", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 12.5 },
  { id: "t4_libre", name: "T4 Libre", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 12.5 },
  { id: "psa_total", name: "Total PSA (Antígeno Prostático)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 35 },
  { id: "psa_libre", name: "PSA Libre", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 35 },
  { id: "ca125", name: "CA-125 (Ovarios)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 35 },
  { id: "ca19_9", name: "CA19-9 (Páncreas, Estómago, Vías Biliares)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 40 },
  { id: "ca15_3", name: "CA 15-3 (Cáncer de Mama)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 40 },
  { id: "insulina", name: "Insulina o Insulina en Ayunas", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 40 },
  { id: "combo_insulina", name: "Combo Insulina Prepandrial y Postpandrial", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 54 },
  { id: "cea", name: "Antígeno Carcinoembrionario (CEA)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "cortisol_am", name: "Cortisol AM (Matutino)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 60 },
  { id: "cortisol_pm", name: "Cortisol PM (Vespertino)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 60 },
  { id: "combo_cortisol", name: "Cortisol Combinado AM + PM", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 60 },
  { id: "alfafetoproteina", name: "Alfafetoproteína (AFP)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "testosterona", name: "Testosterona Total", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 35 },
  { id: "vitamina_d", name: "Vitamina D", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 45 },
  { id: "vitamina_b12", name: "Vitamina B12", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 50 },
  { id: "prolactina", name: "Prolactina", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "beta_estradiol", name: "Beta Estradiol", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "hormona_estimulante_crecimiento", name: "Hormona Estimulante del Crecimiento (GH)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "hormona_foliculoestimulante", name: "Hormona Foliculoestimulante (FSH)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "hormona_luteinizante", name: "Hormona Luteinizante (HL/LH)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 25 },
  { id: "hormona_paratiroidea", name: "Hormona Paratiroidea (PTH)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 40 },
  { id: "sulfato_dihidrepiandrosterona", name: "Sulfato de Dihidrepiandrosterona (DHEA-S)", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 90 },
  { id: "ferritina", name: "Ferritina", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "combo_t4_t3_tsh_tot", name: "Totales Combinados T4 + T3 + TSH", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 35 },
  { id: "combo_t4_t3_tsh_lib", name: "Combo T4 + T3 Libres + TSH", panelId: "hormonas_tiroideas_marcadores", priceKey: "miscelaneo", defaultPrice: 35 },

  // Coproanálisis y Enfermedades Infecciosas
  { id: "concentrado_heces", name: "Concentrado de Heces", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 15 },
  { id: "concentrado_strout", name: "Concentrado de Strout", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 20 },
  { id: "general_heces", name: "General de Heces (EGH)", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 3 },
  { id: "pam", name: "Prueba de Azul de Metileno (PAM)", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 10 },
  { id: "sangre_oculta_heces", name: "Sangre Oculta en Heces", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 10 },
  { id: "rotavirus", name: "Rotavirus en Heces", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 20 },
  { id: "sustancias_reductoras_heces", name: "Sustancias Reductoras en Heces", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 25 },
  { id: "tecnica_graham", name: "Técnica de Graham", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 15 },
  { id: "tincion_gram_heces", name: "Tinción de Gram en Heces", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 15 },
  { id: "helicobacter_pylori", name: "H. Pylori en Heces", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 25 },
  { id: "h_pylori_sangre", name: "H. Pylori en Sangre", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 35 },
  { id: "dengue_duo", name: "Dengue Duo", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "anticuerpos_dengue", name: "Anticuerpos para Dengue", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "chagas_igg", name: "Chagas IgG", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "chagas_igm", name: "Chagas IgM", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "eliza_chagas", name: "Eliza para Chagas", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 35 },
  { id: "vih", name: "VIH", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 12 },
  { id: "vph", name: "VPH (Virus del Papiloma Humano)", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 100 },
  { id: "carga_viral_hiv", name: "Carga Viral (HIV)", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "cd4", name: "CD4", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "hepatitis_a", name: "Hepatitis A", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "hepatitis_b", name: "Hepatitis B", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "hepatitis_c", name: "Hepatitis C", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "toxoplasma_gondii_igm", name: "Toxoplasma Gondii IgM", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 35 },
  { id: "toxoplasma_igg", name: "Toxoplasma IgG", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "toxoplasma_igm", name: "Toxoplasma IgM", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "toxoplasma_igm_igg", name: "Toxoplasma IgM + IgG", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 40 },
  { id: "tripanosomiasis", name: "Tripanosomiasis", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 30 },
  { id: "citomegalovirus_igm", name: "Citomegalovirus IgM", panelId: "coproanalisis", priceKey: "heces", defaultPrice: 200 },

  // Electrolitos y Función Renal
  { id: "sodio_serico", name: "Sodio Sérico", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "sodio_orina", name: "Sodio en Orina", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "sodio_orina_24h", name: "Sodio en Orina de 24 Horas", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "potasio_serico", name: "Potasio Sérico", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "potasio_orina", name: "Potasio en Orina", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "potasio_orina_24h", name: "Potasio en Orina de 24 Horas", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "cloro_serico", name: "Cloro Sérico", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "cloro_orina", name: "Cloro en Orina", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "cloro_orina_24h", name: "Cloro en Orina de 24 Horas", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "calcio_serico", name: "Calcio Sérico", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "calcio_orina", name: "Calcio en Orina", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "calcio_orina_24h", name: "Calcio en Orina 24 Horas", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "magnesio_serico", name: "Magnesio Sérico", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "magnesio_orina", name: "Magnesio en Orina", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "fosforo_serico", name: "Fósforo Sérico", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "fosforo_orina", name: "Fósforo en Orina", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "filtrado_glomerular", name: "Filtrado Glomerular", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "combo_sodio_potasio", name: "Combo Sodio + Potasio", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "combo_sodio_potasio_cloro", name: "Combo Sodio + Potasio + Cloro", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 25 },
  { id: "combo_sodio_potasio_cloro_calcio", name: "Combo Sodio + Potasio + Cloro + Calcio", panelId: "electrolitos_perfil", priceKey: "miscelaneo", defaultPrice: 25 },

  // Química Clínica Ampliada y Enzimas
  { id: "acido_rico", name: "Ácido Úrico Sérico", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 5 },
  { id: "albumina_serica", name: "Albúmina Sérica", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "amilasa_serica", name: "Amilasa Sérica", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "bilirrubina", name: "Bilirrubina", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 8 },
  { id: "combo_bilirrubinas", name: "Bilirrubinas (Total, Directa e Indirecta)", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 8 },
  { id: "colesterol_tot", name: "Colesterol Total", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 5 },
  { id: "colesterol_hdl", name: "Colesterol HDL", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "colesterol_ldl", name: "Colesterol LDL", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "colesterol_vldl", name: "Colesterol VLDL", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 3.75 },
  { id: "cpk_mb", name: "CPK-MB", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "cpk_total", name: "CPK Total", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "creatinina_serica", name: "Creatinina Sérica", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 5 },
  { id: "depuracion_creatinina_24h", name: "Depuración de Creatinina en Orina 24 Horas", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "ldh", name: "Deshidrogenasa Láctica (LDH)", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "ggt", name: "Gamma Glutamil Transpeptidasa (GGT)", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "fosfatasa_alcalina", name: "Fosfatasa Alcalina", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "glucosa_serica", name: "Glucosa Sérica", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 4 },
  { id: "glucosa_post_prandial", name: "Glucosa Post-Prandial", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 8 },
  { id: "glucosa_post_prandial_sullivan", name: "Glucosa Post-Prandial (Test de Sullivan)", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 7 },
  { id: "tolerancia_la_glucosa", name: "Tolerancia a la Glucosa", panelId: "química_y_diabetes", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "tolerancia_2h", name: "Tolerancia a la Glucosa (2 Horas)", panelId: "química_y_diabetes", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "tolerancia_3h", name: "Tolerancia a la Glucosa (3 Horas)", panelId: "química_y_diabetes", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "hba1c_quim_av", name: "Hemoglobina Glicosilada HbA1c", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 18 },
  { id: "hierro_serico", name: "Hierro Sérico", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "lipidos_totales", name: "Lípidos Totales", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 20 },
  { id: "lipasa_serica", name: "Lipasa Sérica", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "bun_serico", name: "Nitrógeno Ureico Sérico", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 5 },
  { id: "urea", name: "Urea Sérica", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 5 },
  { id: "bun_orina", name: "Nitrógeno Ureico en Orina", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 5 },
  { id: "proteinas_totales", name: "Proteínas Totales y Relación A/G", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "relacion_alb_glob", name: "Relación Albúmina/Globulina", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "tgo_ast", name: "TGO/GOT/AST", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "tgp_alt", name: "TGP/GPT/ALT", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "transaminasa_o", name: "Transaminasa O", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "transaminasa_p", name: "Transaminasa P", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "trigliceridos_quim", name: "Triglicéridos", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 6 },
  { id: "wester_block", name: "Wester Block", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 350 },
  { id: "procalcitonina", name: "Procalcitonina (PCT)", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 45 },
  { id: "protinina", name: "Protinina", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "prueba_cruzada", name: "Prueba Cruzada", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 25 },
  { id: "antigenos_febriles", name: "Antígenos Febriles", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 13 },
  { id: "antigenos_febriles_rep", name: "Antígenos Febriles (Repetido/Alterno)", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "antifosfolipidos", name: "Antifosfolípidos", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "antigeno_campylobacter", name: "Antígeno Campylobacter", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "antigeno_celulas_le", name: "Antígeno Células LE", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "celulas_le", name: "Células LE", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "celulas_le_lupus", name: "Células LE (Lupus Eritematoso)", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 20 },
  { id: "anticuerpos_nucleares", name: "Anticuerpos Nucleares", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "antiestreptolisina_o", name: "Antiestreptolisina O (ASTO)", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 10 },
  { id: "androestenediona", name: "Androestenediona", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 70 },
  { id: "gonadotropina_corionica", name: "Gonadotropina Coriónica", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "histoplasma_igm", name: "Histoplasma IgM", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 45 },
  { id: "inmunoglobulina_e", name: "Inmunoglobulina E (IgE)", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "inr", name: "INR", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 25 },
  { id: "liquido_sinovial", name: "Líquido Sinovial (Citoquímico)", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 45 },
  { id: "fta_abs", name: "FTA-ABS", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 30 },
  { id: "combo_tgo_bil_tgp", name: "Combo TGO + Bilirrubinas + TGP", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 15 },
  { id: "combo_perfil_lipidico_full", name: "Combo Colesterol Total + HDL + LDL + Triglicéridos", panelId: "quimica_sanguinea_enzimas", priceKey: "miscelaneo", defaultPrice: 14 },

  // Cultivos Microbiológicos e Informes Especiales
  { id: "urocultivo_completo", name: "Urocultivo (Cultivo de Orina)", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 15 },
  { id: "coprocultivo_completo", name: "Coprocultivo (Cultivo de Heces)", panelId: "coprocultivo", priceKey: "coprocultivo", defaultPrice: 15 },
  { id: "cultivo_faringeo_completo", name: "Cultivo Faríngeo (Exudado)", panelId: "cultivo_faringeo", priceKey: "cultivo_faringeo", defaultPrice: 15 },
  { id: "cultivo_secrecion_completo", name: "Cultivo de Secreciones Varias", panelId: "secreciones_varias", priceKey: "secreciones_varias", defaultPrice: 15 },
  { id: "espermograma_completo", name: "Espermograma Completo", panelId: "espermograma", priceKey: "espermograma", defaultPrice: 25 },
  { id: "cultivo_baar", name: "Cultivo BAAR", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 40 },
  { id: "cultivo_esputo_no_baar", name: "Cultivo de Esputo (No BAAR)", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 15 },
  { id: "cultivo_hongos", name: "Cultivo de Hongos", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 40 },
  { id: "cultivo_semen", name: "Cultivo de Semen", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 15 },
  { id: "cultivo_no_baar", name: "Cultivo No BAAR", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 40 },
  { id: "cultivo_para_secreciones", name: "Cultivo para Secreciones", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 15 },
  { id: "cultivo_directo_secrecion_vaginal", name: "Cultivo y Directo de Secreción Vaginal", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 15 },
  { id: "directo_baar_bk", name: "Directo BAAR (BK)", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 10 },
  { id: "directo_esputo", name: "Directo de Esputo", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 10 },
  { id: "directo_kosh", name: "Directo de Kosh", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 10 },
  { id: "directo_para_no_baar", name: "Directo para No BAAR", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 15 },
  { id: "hemocultivo_15_dias", name: "Hemocultivo (15 días)", panelId: "urocultivo", priceKey: "urocultivo", defaultPrice: 18 }
];

export const getActiveExamsList = (profile?: DecryptedLabProfile): SelectableExam[] => {
  if (profile && profile.customExams && Array.isArray(profile.customExams)) {
    const customIds = new Set(profile.customExams.map(e => e.id));
    const filteredBase = AVAILABLE_EXAMS.filter(e => !customIds.has(e.id));
    return [...filteredBase, ...profile.customExams];
  }
  return AVAILABLE_EXAMS;
};

export const getExamPrice = (exam: SelectableExam, profile: DecryptedLabProfile): number => {
  if (!profile.examPrices) return exam.defaultPrice;
  
  // 1. Specific individual exam override has the highest priority
  if (profile.examPrices[exam.id] !== undefined) {
    return profile.examPrices[exam.id];
  }
  
  // 2. Class/Category price has second priority
  const customCategoryPrice = profile.examPrices[exam.priceKey];
  if (customCategoryPrice !== undefined && exam.priceKey !== "miscelaneo") {
    return customCategoryPrice;
  }
  
  return exam.defaultPrice;
};

export const getMetricIdsForExam = (examId: string): string[] => {
  if (examId === "hemograma_completo") {
    return [
      "hem_leucocitos", "hem_neutrofilos_pct", "hem_linfocitos_pct", "hem_monocitos_pct", 
      "hem_eosinofilos_pct", "hem_basofilos_pct", "glóbulos_rojos", "hemoglobina", 
      "hematocrito", "vcm", "hcm", "chcm", "hem_rdw", "hem_plaquetas", "hem_vpm"
    ];
  }
  if (examId === "general_orina") {
    return [
      "ego_color", "ego_aspecto", "ego_densidad", "ego_ph", 
      "ego_proteinas", "ego_glucosa", "ego_cetonas", "ego_bilirrubina", "ego_urobilinogeno", 
      "ego_sangre_oculta", "ego_nitritos", "ego_esterasa_leucocitaria", "ego_celulas_epiteliales", 
      "ego_leucocitos_campo", "ego_hematies_campo", "ego_bacterias", "ego_cristales", 
      "ego_cilindros", "ego_filamento_muco", "ego_levaduras", "ego_tricomonas", "ego_uratos_amorfos"
    ];
  }
  if (examId === "general_heces") {
    return [
      "eh_color", "eh_consistencia", "eh_moco", "eh_restos_macroscopicos", "eh_restos_microscopicos", "eh_sangre_macroscopica", 
      "eh_leucocitos", "eh_hematies", "eh_grasas_neutras", "eh_quistes_protozoarios", 
      "eh_trofozoitos", "eh_huevos_helmintos", "eh_larvas", "eh_levaduras", "eh_flora_bacteriana"
    ];
  }
  if (examId === "urocultivo_completo") {
    return [
      "uro_recuento_colonias", "uro_germen_aislado", 
      "uro_anti_sensible", "uro_anti_intermedio", "uro_anti_resistente"
    ];
  }
  if (examId === "coprocultivo_completo") {
    return [
      "copro_aspecto", "copro_consistencia", "copro_leucocitos", "copro_directo_gram", 
      "copro_germen_aislado", "copro_anti_sensible", "copro_anti_intermedio", "copro_anti_resistente"
    ];
  }
  if (examId === "cultivo_faringeo_completo") {
    return [
      "faringeo_aspecto", "faringeo_directo_gram", "faringeo_germen_aislado", 
      "faringeo_anti_sensible", "faringeo_anti_intermedio", "faringeo_anti_resistente"
    ];
  }
  if (examId === "cultivo_secrecion_completo") {
    return [
      "sec_origen", "sec_aspecto", "sec_directo_gram", "sec_germen_aislado",
      "sec_anti_sensible", "sec_anti_intermedio", "sec_anti_resistente"
    ];
  }
  if (examId === "espermograma_completo") {
    return [
      "esp_volumen", "esp_color", "esp_ph", "esp_licuefaccion", "esp_viscosidad",
      "esp_concentracion", "esp_total_eyaculado", "esp_movilidad_total", "esp_movilidad_progresiva",
      "esp_vitalidad", "esp_morfologia_normal", "esp_leucocitos"
    ];
  }
  if (examId === "depuracion_creatinina_24h") {
    return [
      "creatinina_serica", "depuracion_volumen", "depuracion_creatinina_orina", "depuracion_creatinina_24h"
    ];
  }
  if (examId === "hba1c_quim_av") {
    return [
      "hba1c_quim_av", "eag_quim_av"
    ];
  }
  
  // Combos de Tiroides y Hormonas
  if (examId === "combo_t4_t3_tsh_tot") {
    return ["t3_total", "t4_total", "tsh_ultrasensible"];
  }
  if (examId === "combo_t4_t3_tsh_lib") {
    return ["t3_libre", "t4_libre", "tsh_ultrasensible"];
  }
  if (examId === "combo_insulina") {
    return ["insulina_pre", "insulina_post"];
  }
  if (examId === "combo_cortisol") {
    return ["cortisol_am", "cortisol_pm"];
  }

  // Combos de Química Sanguínea / Enzimas
  if (examId === "combo_perfil_lipidico_full") {
    return ["colesterol_tot", "colesterol_hdl", "colesterol_ldl", "colesterol_vldl", "trigliceridos_quim"];
  }
  if (examId === "combo_tgo_bil_tgp") {
    return ["tgo_ast", "bilirrubina_total", "bilirrubina_directa", "bilirrubina_indirecta", "tgp_alt"];
  }
  if (examId === "combo_bilirrubinas") {
    return ["bilirrubina_total", "bilirrubina_directa", "bilirrubina_indirecta"];
  }

  // Combos de Electrolitos
  if (examId === "combo_sodio_potasio") {
    return ["sodio_serico", "potasio_serico"];
  }
  if (examId === "combo_sodio_potasio_cloro") {
    return ["sodio_serico", "potasio_serico", "cloro_serico"];
  }
  if (examId === "combo_sodio_potasio_cloro_calcio") {
    return ["sodio_serico", "potasio_serico", "cloro_serico", "calcio_serico"];
  }

  // Combos de Coagulación
  if (examId === "combo_tp_tpt") {
    return ["tp", "tpt"];
  }
  if (examId === "combo_tp_tpt_fib") {
    return ["tp", "tpt", "fibrinogeno"];
  }

  // Pruebas de Tolerancia a la Glucosa (Curvas)
  if (examId === "tolerancia_2h") {
    return ["tg_basal", "tg_1h", "tg_2h"];
  }
  if (examId === "tolerancia_3h") {
    return ["tg_basal", "tg_1h", "tg_2h", "tg_3h"];
  }
  if (examId === "tolerancia_4h") {
    return ["tg_basal", "tg_1h", "tg_2h", "tg_3h", "tg_4h"];
  }
  if (examId === "tolerancia_5h") {
    return ["tg_basal", "tg_1h", "tg_2h", "tg_3h", "tg_4h", "tg_5h"];
  }

  return [examId];
};

export const getPanelPrice = (panelId: string, profile: DecryptedLabProfile): number => {
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

export default function PatientReceptionForm({ profile, onSave, onCancel }: { profile: DecryptedLabProfile, onSave: (record: DecryptedLabRecord) => Promise<void>, onCancel: () => void }) {
  // Patient Fields
  const [patientName, setPatientName] = useState("");
  const [patientIdCard, setPatientIdCard] = useState("N/A");
  const [patientBirthdate, setPatientBirthdate] = useState("1990-01-01");
  const [patientSex, setPatientSex] = useState<"Masculino" | "Femenino">("Masculino");
  const [patientPhone, setPatientPhone] = useState("");
  const [doctorName, setDoctorName] = useState("SOLICITANTE PARTICULAR");
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isDoctorSV, setIsDoctorSV] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  // Selected Exams
  const [selectedExams, setSelectedExams] = useState<Record<string, boolean>>({});
  const [examSearch, setExamSearch] = useState("");
  
  // Payment States
  const [isPaid, setIsPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta" | "Transferencia">("Efectivo");
  
  // UX States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [lastSavedRecord, setLastSavedRecord] = useState<DecryptedLabRecord | null>(null);
  const [showVignetteGenerator, setShowVignetteGenerator] = useState(false);

  const handleToggleExam = (examId: string) => {
    setSelectedExams(prev => ({
      ...prev,
      [examId]: !prev[examId]
    }));
  };

  const examsList = useMemo(() => getActiveExamsList(profile), [profile]);

  // Compute calculated values
  const selectedList = examsList.filter(e => selectedExams[e.id]);
  const totalCost = isDoctorSV ? 0 : selectedList.reduce((sum, e) => sum + getExamPrice(e, profile), 0);

  const CATEGORY_NAMES: Record<string, string> = {
    "hematologia": "Hematología e Índices",
    "hematologia_especial": "Hematología Especial y Frotis",
    "coagulacion_pruebas": "Coagulación y Tiempos",
    "uroanalisis_embarazo": "Uroanálisis e Inmunología Básica",
    "hormonas_tiroideas_marcadores": "Hormonas y Marcadores Séricos",
    "coproanalisis": "Coproanálisis y Parásitos",
    "electrolitos_perfil": "Perfil Sérico y de Electrolitos",
    "quimica_sanguinea_enzimas": "Química Clínica Ampliada y Enzimas",
    "química_y_diabetes": "Química Sanguínea Básica",
    "perfil_lipidico": "Perfil Lipídico",
    "perfil_hepatico": "Perfil Hepático",
    "funcion_renal": "Función Renal",
    "urocultivo": "Urocultivo (Cultivos Microbiológicos)",
    "coprocultivo": "Coprocultivo (Cultivos Microbiológicos)",
    "cultivo_faringeo": "Cultivo Faríngeo (Cultivos Microbiológicos)",
    "secreciones_varias": "Cultivo de Secreciones Varias",
    "espermograma": "Espermograma Completo"
  };

  const filteredExams = useMemo(() => {
    const term = examSearch.toLowerCase().trim();
    if (!term) return examsList;
    return examsList.filter(e => 
      e.name.toLowerCase().includes(term) || 
      (CATEGORY_NAMES[e.panelId] || "").toLowerCase().includes(term)
    );
  }, [examSearch, examsList]);

  const examGroups = useMemo(() => {
    const groups: Record<string, SelectableExam[]> = {};
    filteredExams.forEach(e => {
      if (!groups[e.panelId]) {
        groups[e.panelId] = [];
      }
      groups[e.panelId].push(e);
    });
    return groups;
  }, [filteredExams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");

    // Validations
    if (!patientName.trim()) {
      setErrorText("El nombre completo del paciente es obligatorio.");
      return;
    }
    if (!patientBirthdate) {
      setErrorText("La fecha de nacimiento del paciente es obligatoria.");
      return;
    }
    if (selectedList.length === 0) {
      setErrorText("Debe elegir al menos un examen para la orden del paciente.");
      return;
    }

    setIsSubmitting(true);

    try {
      const generatedTicket = "TK-" + examDate.replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900);
      
      const record: DecryptedLabRecord = {
        id: "REC-" + Date.now().toString() + "-" + Math.floor(Math.random() * 1000),
        patientName: patientName.trim(),
        patientIdCard: patientIdCard.trim() || "N/A",
        patientBirthdate,
        patientSex,
        patientPhone: patientPhone.trim(),
        examDate,
        doctorName: isDoctorSV ? "DOCTOR SV (CONVENIO)" : (doctorName.trim() || "SOLICITANTE PARTICULAR"),
        panels: selectedList.reduce((acc, exam) => {
          // Initialize parent panel folder if not already existing
          if (!acc[exam.panelId]) {
            acc[exam.panelId] = { values: {} };
          }
          return acc;
        }, {} as Record<string, { values: Record<string, string> }>),
        selectedMetricIds: selectedList.flatMap(exam => getMetricIdsForExam(exam.id)),
        notes: "Ingreso registrado por recepción. Pendiente de proceso analítico.",
        labName: profile.labName,
        isPending: true, // Marked as pending request
        isDoctorSV: isDoctorSV,
        isUrgent: isUrgent,
        receptionTime: new Date().toISOString(),
        billing: {
          total: totalCost,
          isPaid: isDoctorSV ? true : isPaid,
          paymentMethod: isDoctorSV ? "Efectivo" : paymentMethod,
          ticketNumber: generatedTicket,
          items: selectedList.map(e => ({
            name: e.name,
            price: isDoctorSV ? 0 : getExamPrice(e, profile)
          }))
        }
      };

      await onSave(record);
      setSuccessText("¡Recepción registrada con éxito! La orden de examen ha sido enviada al laboratorio clínico.");
      setLastSavedRecord(record);
      setShowVignetteGenerator(true);
      
      // Clear all fields on success to allow another input without forcing reload
      setPatientName("");
      setPatientIdCard("");
      setPatientBirthdate("");
      setPatientSex("Masculino");
      setPatientPhone("");
      setDoctorName("");
      setSelectedExams({});
      setIsPaid(true);
      setPaymentMethod("Efectivo");
      setIsDoctorSV(false);
      setIsUrgent(false);
      setExamSearch("");

    } catch (err: any) {
      setErrorText(err.message || "No se pudo almacenar la admisión de recepción.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAllDefaults = () => {
    const defaults: Record<string, boolean> = {};
    // Pre-check basic common package (Hemograma Completo + General de Orina + General de Heces)
    defaults["hemograma_completo"] = true;
    defaults["general_orina"] = true;
    defaults["general_heces"] = true;
    setSelectedExams(defaults);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans" id="patient-reception-mode">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Quick Header Navigation Back Button */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-750 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-purple-650" />
            Volver al Listado del Laboratorio
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleSelectAllDefaults}
              className="px-3 py-1.5 border border-purple-250 bg-purple-50 hover:bg-purple-100 text-[11px] font-bold text-purple-700 rounded-xl transition-all cursor-pointer shadow-sm uppercase tracking-wider"
            >
              Pre-seleccionar Rutina Básica
            </button>
            <button
              onClick={() => setSelectedExams({})}
              className="px-3 py-1.5 border border-red-200 hover:border-red-300 bg-white hover:bg-red-50 text-[11px] font-bold text-red-650 rounded-xl transition-all cursor-pointer shadow-sm uppercase tracking-wider"
            >
              Desmarcar Todo
            </button>
          </div>
        </div>

        {/* Informational Hero Card */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-purple-950/20">
          <div>
            <div className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-extrabold mb-2 uppercase tracking-widest border border-purple-400/20">
              <Sparkles className="w-3 h-3 text-purple-400" /> Módulo de Admisión y Caja
            </div>
            <h1 className="text-xl font-black tracking-tight font-sans">
              Recepción de Pacientes
            </h1>
            <p className="text-xs text-purple-100/90 mt-1 max-w-2xl leading-relaxed font-medium">
              Formulario oficial de recepción. Agregue paciente, seleccione los análisis solicitados con aranceles vigentes de la institución, realice cobros de caja y envíe alertas de procesos en tiempo real al laboratorio.
            </p>
          </div>
          
          <div className="bg-white/10 border border-white/15 px-4 py-3 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-purple-300 text-center tracking-widest mb-1.5">Sede Operativa</span>
            <span className="text-xs font-extrabold text-slate-100 font-mono text-center max-w-44 truncate block">
              {profile.labName}
            </span>
          </div>
        </div>

        {/* Global Success / Errors state messages */}
        {successText && (
          <div className="mb-6 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-3xl p-5 flex items-start gap-3.5 shadow-md animate-fade-in shadow-emerald-500/5">
            <CheckCircle className="w-5.5 h-5.5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-extrabold text-emerald-900 font-sans">{successText}</p>
              <p className="text-[10.5px] text-emerald-700 mt-1">El personal del laboratorio ya visualiza esta orden pendiente en su panel de informes clínicos.</p>
              
              {lastSavedRecord && (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVignetteGenerator(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black cursor-pointer transition-all shadow-sm"
                  >
                    <Tag className="w-3.5 h-3.5" /> Generar e Imprimir Viñetas de Tubos / Muestras
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLastSavedRecord(null);
                      setSuccessText("");
                    }}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Ocultar Aviso
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {errorText && (
          <div className="mb-6 bg-red-50 border border-red-250 text-red-800 rounded-2xl p-4 flex items-start gap-3 shadow-md animate-fade-in">
            <Activity className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-extrabold text-red-950 font-sans">Error al procesar la recepción:</p>
              <p className="text-[10.5px] text-red-800 mt-1">{errorText}</p>
            </div>
          </div>
        )}

        {/* Main Double Grid */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Grid: Demographic Data */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Box 1: Patient Personal Fields */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-teal-600" /> Información General del Paciente
              </h3>
              
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre Completo del Paciente <span className="text-red-550 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="block w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs transition-all font-semibold"
                      placeholder="Ej. Carlos Alberto Rodríguez Alvarado"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>
                </div>

                {/* ID Card and DOB Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ID Document */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      DUI / Cédula / Documento de Identidad
                    </label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs font-semibold font-mono"
                      placeholder="00000000-0"
                      value={patientIdCard}
                      onChange={(e) => setPatientIdCard(e.target.value)}
                    />
                  </div>

                  {/* DOB */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Fecha de Nacimiento <span className="text-red-550 font-bold">*</span>
                    </label>
                    <input
                      type="date"
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs font-semibold font-mono"
                      value={patientBirthdate}
                      onChange={(e) => setPatientBirthdate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Gender and Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sex Selection */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Sexo (Género Clínico)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPatientSex("Masculino")}
                        className={`py-2 px-3 text-xs font-bold border rounded-xl transition-all ${patientSex === "Masculino" ? "border-teal-500 bg-teal-50 text-teal-800 font-extrabold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      >
                        Masculino 👨
                      </button>
                      <button
                        type="button"
                        onClick={() => setPatientSex("Femenino")}
                        className={`py-2 px-3 text-xs font-bold border rounded-xl transition-all ${patientSex === "Femenino" ? "border-pink-500 bg-pink-50 text-pink-800 font-extrabold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      >
                        Femenino 👩
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp/Tel */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Número Telefónico / WhatsApp
                    </label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs font-semibold font-mono"
                      placeholder="Ej. 7700-1122"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Doctor and Exam Date Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Doctor Name */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Médico Solicitante / Solicitud Particular</span>
                      {isDoctorSV && <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-2 py-0.5 rounded-full">CONVENIO 🇸🇻</span>}
                    </label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs font-semibold capitalize disabled:bg-slate-100 disabled:text-slate-550"
                      placeholder="Ej. Dra. Carmen Mendoza"
                      value={doctorName}
                      disabled={isDoctorSV}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </div>

                  {/* Exam Date */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Fecha del Examen
                    </label>
                    <input
                      type="date"
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs font-semibold font-mono"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Doctor SV Option Convenio & Urgent Option */}
                <div className="pt-2 space-y-3">
                  <label className={`flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all ${isDoctorSV ? "border-purple-500 bg-purple-50/40" : "border-slate-200 hover:bg-slate-50"}`}>
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
                      className="h-4.5 w-4.5 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-purple-950 block">✨ Opción Especial: Convenio Doctor SV</span>
                      <span className="text-[10px] text-purple-850 font-semibold block leading-relaxed">
                        Seleccione esta opción para registrar la orden bajo el convenio de cortesía de Doctor SV. Todos los exámenes seleccionados se computarán automáticamente a **$0.00 USD**.
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all ${isUrgent ? "border-orange-500 bg-orange-50/40" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input
                      type="checkbox"
                      checked={isUrgent}
                      onChange={(e) => setIsUrgent(e.target.checked)}
                      className="h-4.5 w-4.5 text-orange-600 border-slate-300 rounded focus:ring-orange-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-orange-950 block flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-orange-600 animate-pulse" /> Marcar Orden como 'Urgente' 🕒
                      </span>
                      <span className="text-[10px] text-orange-850 font-semibold block leading-relaxed">
                        Habilite esta casilla si el paciente requiere prioridad en la entrega. Resalta la orden con color naranja brillante en el tablero de trabajo.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Box 2: Billing & Caja Workspace */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Registro de Copago y Caja
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Paid Toggle Status */}
                <div className="space-y-2">
                  <span className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Estado de Facturación</span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Indica si el paciente canceló por el servicio antes del ingreso del análisis o si queda pendiente de cobro posterior.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsPaid(true)}
                      className={`py-2 px-3 text-xs font-bold border rounded-xl transition-all ${isPaid ? "border-emerald-500 bg-emerald-50/50 text-emerald-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      🟢 Pagado (Caja)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPaid(false)}
                      className={`py-2 px-3 text-xs font-bold border rounded-xl transition-all ${!isPaid ? "border-amber-500 bg-amber-50/50 text-amber-800 font-extrabold animate-pulse" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      🟡 Cuenta Pendiente
                    </button>
                  </div>
                </div>

                {/* Payment Channel */}
                <div className="space-y-2">
                  <span className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Canal de Pago</span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Medio por el cual se procesará o procesó la contraprestación del paciente en taquilla.
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {[
                      { id: "Efectivo", label: "Efectivo 💵" },
                      { id: "Tarjeta", label: "Tarjeta 💳" },
                      { id: "Transferencia", label: "Banco 📲" }
                    ].map(ch => (
                      <button
                        key={ch.id}
                        type="button"
                        disabled={!isPaid}
                        onClick={() => setPaymentMethod(ch.id as any)}
                        className={`py-2 px-1 hover:px-1.5 text-[10px] font-bold border rounded-xl transition-all ${!isPaid ? "opacity-40 cursor-not-allowed" : paymentMethod === ch.id ? "border-indigo-500 bg-indigo-50/50 text-indigo-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Grid: Exam Checklist & Invoice summary */}
          <div className="lg:col-span-12 xl:col-span-5 lg:col-span-5 space-y-6">
            
            {/* Box 3: Exam selections catalog checklist */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Clipboard className="w-4 h-4 text-purple-600" /> Catálogo de Exámenes</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                  98 Exámenes
                </span>
              </h3>
              
              <p className="text-[10.5px] text-slate-550 leading-normal mb-1">
                Marque cada uno de los exámenes solicitados en la orden. Utilice el buscador para localizarlo por nombre o especialidad.
              </p>

              {/* Search bar inside the catalog box */}
              <div className="relative mb-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-purple-500" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-slate-50 hover:bg-slate-50/70 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
                  placeholder="Buscar examen o categoría..."
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                />
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {Object.keys(examGroups).length === 0 ? (
                  <div className="py-6 text-center text-slate-400">
                    <p className="text-xs font-bold">No hay coincidencias</p>
                    <p className="text-[10px] mt-1">Intente otro término de búsqueda.</p>
                  </div>
                ) : (
                  (Object.entries(examGroups) as [string, SelectableExam[]][]).map(([panelId, exams]) => {
                    const groupTitle = CATEGORY_NAMES[panelId] || panelId;
                    return (
                      <div key={panelId} className="space-y-1.5">
                        <h4 className="text-[9.5px] font-black text-purple-950 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded border border-purple-100/55">
                          {groupTitle}
                        </h4>
                        <div className="space-y-1">
                          {exams.map((exam) => {
                            const price = getExamPrice(exam, profile);
                            const isChecked = !!selectedExams[exam.id];

                            return (
                              <label
                                key={exam.id}
                                className={`flex items-center justify-between p-2 hover:bg-slate-50/80 border rounded-xl cursor-pointer transition-all ${isChecked ? "border-purple-600 bg-purple-50/20 shadow-sm" : "border-slate-150 bg-white"}`}
                              >
                                <div className="flex items-center gap-2 max-w-[80%]">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleExam(exam.id)}
                                    className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-slate-300 rounded cursor-pointer"
                                  />
                                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                                    {exam.name}
                                  </span>
                                </div>
                                
                                <div className="text-right shrink-0 select-none">
                                  {isDoctorSV ? (
                                    <span className="text-[10.5px] font-black font-mono text-emerald-600">$0.00</span>
                                  ) : (
                                    <span className="text-[10.5px] font-black font-mono text-slate-900">${price.toFixed(2)}</span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Box 4: Ticket Receipt Receipt overview & action */}
            <div className="bg-white p-6 rounded-2xl border border-slate-205 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full -mr-8 -mt-8" />
              
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 mb-2">
                Resumen de Arancel en Taquilla
              </h3>

              {selectedList.length === 0 ? (
                <div className="py-6 text-center text-slate-405">
                  <p className="text-xs font-bold">No hay exámenes seleccionados</p>
                  <p className="text-[10px] mt-1">Marque ítems del catálogo para computar el costo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {selectedList.map((e) => (
                      <div key={e.id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-655 font-medium truncate">{e.name}</span>
                        <span className="font-mono text-slate-800 font-bold text-right pl-3 shrink-0">
                          {isDoctorSV ? (
                            <span className="text-emerald-600 font-extrabold">$0.00</span>
                          ) : (
                            `$${getExamPrice(e, profile).toFixed(2)}`
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <hr className="border-dashed border-slate-200" />

                  {/* Running Total price */}
                  <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                    <div>
                      <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wide block font-sans">Total Copago Neto</span>
                      <span className="text-[10px] font-bold text-textColor-800 block font-mono">
                        {isDoctorSV ? (
                          <span className="text-purple-700 font-bold">🇸🇻 Convenio Doctor SV</span>
                        ) : isPaid ? (
                          `Método: ${paymentMethod}`
                        ) : (
                          "⚠️ Cobro Pendiente en Caja"
                        )}
                      </span>
                    </div>
                    <span className="text-2xl font-black text-slate-900 font-mono tracking-tight flex items-baseline">
                      <span className="text-xs font-bold text-slate-450 mr-0.5">$</span>
                      {totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit trigger button */}
              <button
                type="submit"
                disabled={isSubmitting || selectedList.length === 0}
                className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 text-white hover:shadow-lg disabled:shadow-none hover:shadow-purple-600/10 text-xs font-black tracking-widest uppercase rounded-2xl cursor-pointer disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-white/90" />
                    Registrar Paciente e Ingresar
                  </>
                )}
              </button>
              
              <p className="text-[9.5px] text-slate-450 font-medium leading-normal text-center uppercase tracking-wide">
                Generará un expediente de análisis listo para reportar
              </p>
            </div>

          </div>

        </form>

      </div>

      {showVignetteGenerator && lastSavedRecord && (
        <VignetteGenerator 
          record={lastSavedRecord} 
          onClose={() => setShowVignetteGenerator(false)} 
        />
      )}
    </div>
  );
}
