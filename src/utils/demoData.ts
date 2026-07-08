import { DecryptedLabRecord } from "../types";

export const CLINICAL_DEMO_RECORDS: DecryptedLabRecord[] = [
  {
    id: "REC-DEMO-CARLOS-1958",
    patientName: "Carlos Ernesto Beltrán",
    patientIdCard: "01824792-3",
    patientBirthdate: "1958-03-12", // 68 years old
    patientSex: "Masculino",
    examDate: "2026-05-18",
    doctorName: "Dra. Carolina Meléndez (Endocrinóloga)",
    notes: "Paciente masculino con diabetes mellitus tipo 2 diagnosticada hace 10 años. Presenta descontrol glucémico intermitente y signos tempranos de nefropatía diabética grado II evidenciada por disminución en la filtración glomerular estimada eGFR. Se recomienda estricto monitoreo de microalbuminuria.",
    labName: "AKO LABORATORIO CLÍNICO",
    panels: {
      "química_y_diabetes": {
        values: {
          "glucosa": "168", // HIGH (Normal 70-100)
          "hba1c": "7.8",   // HIGH (Diabetes >= 6.5)
          "eag": "177",     // HIGH Calculated (28.7 * 7.8 - 46.7 = 177.16)
          "urea": "58",     // HIGH (Normal 15-45)
          "bun": "27.1"     // HIGH Calculated
        }
      },
      "funcion_renal": {
        values: {
          "creatinina": "1.65", // HIGH (Normal male range 0.7-1.3)
          "egfr_ckdepi": "41.5" // REDUCED / Insuficiencia renal moderada (eGFR < 60)
        }
      }
    }
  },
  {
    id: "REC-DEMO-ANA-1994",
    patientName: "Ana Sofía Villalta",
    patientIdCard: "04918237-6",
    patientBirthdate: "1994-08-25", // 31 years old
    patientSex: "Femenino",
    examDate: "2026-06-03",
    doctorName: "Dr. Roberto Solari (Cardiólogo)",
    notes: "Paciente femenina de 31 años que acude para evaluación de riesgo cardiovascular. Se evidencia dislipidemia mixta severa caracterizada por hipercolesterolemia primaria y triglicéridos elevados. El índice de Castelli superior al umbral crítico femenino (<4.5) indica un factor de riesgo aterogénico medio-alto. Sin compromiso renal ni hepático.",
    labName: "AKO LABORATORIO CLÍNICO",
    panels: {
      "perfil_lipidico": {
        values: {
          "colesterol_total": "252", // HIGH (Normal < 200)
          "trigliceridos": "185",    // HIGH (Normal < 150)
          "hdl": "42",               // LOW for female (Normal women > 50)
          "ldl": "173",              // HIGH Calculated (252 - 42 - 185/5 = 173) opt < 100
          "castelli": "6.0",         // HIGH Calculated (252 / 42 = 6.0) threshold < 4.5
          "trig_hdl_relation": "4.4" // HIGH (Normal < 3.0)
        }
      },
      "funcion_renal": {
        values: {
          "creatinina": "0.72", // NORMAL (Normal female range 0.6-1.1)
          "egfr_ckdepi": "98.7" // EXCELENTE (>90)
        }
      }
    }
  },
  {
    id: "REC-DEMO-SANTIAGO-2022",
    patientName: "Santiago Nicolás Ramos",
    patientIdCard: "Menor de Edad",
    patientBirthdate: "2022-10-15", // ~3.5 years old
    patientSex: "Masculino",
    examDate: "2026-01-20",
    doctorName: "Dr. Milton Rivera (Pediatra)",
    notes: "Paciente pediátrico con sospecha clínica de anemia microcítica reactiva a déficit nutricional (ferropénica). Se evidencian índices hematimétricos corporales (VCM y HCM) disminuidos de forma moderada. Se aconseja iniciar suplementación de sulfato ferroso y repetir perfil de hemograma completo en un lapso de 6 semanas.",
    labName: "AKO LABORATORIO CLÍNICO",
    panels: {
      "hematologia": {
        values: {
          "hemoglobina": "10.4", // LOW for children (Normal 11.5 - 13.5)
          "hematocrito": "31.2", // LOW for children (Normal 34-40%)
          "glóbulos_rojos": "4.15", // Normal
          "vcm": "75.2",         // LOW / Microcitosis (< 80 fL)
          "hcm": "25.1",         // LOW / Hipocromía (< 27 pg)
          "chcm": "33.3"         // Normal (32 - 36)
        }
      }
    }
  }
];
