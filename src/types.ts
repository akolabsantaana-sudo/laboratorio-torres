export interface PatientInfo {
  name: string;
  idCard: string;
  birthdate: string;
  sex: "Masculino" | "Femenino";
  patientPhone?: string;
}

export interface MetricValue {
  metricId: string;
  value: string;
}

export interface DecryptedLabRecord {
  id: string; // Patient record unique id
  patientName: string;
  patientIdCard: string;
  patientBirthdate: string;
  patientSex: "Masculino" | "Femenino";
  patientPhone?: string; // Patient WhatsApp number
  examDate: string; // YYYY-MM-DD
  doctorName: string;
  isPending?: boolean; // True if registered at reception but results not filled yet
  isUrgent?: boolean; // True if the report is marked as urgent (Urgente)
  isDoctorSV?: boolean; // True if the patient is registered under 'Doctor SV' category (no cost/sin cobro)
  receptionTime?: string; // ISO string when admitted at reception
  reportedTime?: string; // ISO string when results were filled/reported
  panels: {
    [panelId: string]: {
      values: { [metricId: string]: string };
      customUnits?: { [metricId: string]: string };
      customReferences?: { [metricId: string]: string };
    }
  };
  selectedMetricIds?: string[]; // Custom individual tests requested at reception
  notes: string;
  labName: string;
  createdAt?: string;
  updatedAt?: string;
  billing?: {
    total: number;
    isPaid: boolean;
    paymentMethod: "Efectivo" | "Tarjeta" | "Transferencia";
    ticketNumber: string;
    items: { name: string; price: number }[];
  };
  isSynced?: boolean;
}

export interface ServerEncryptedRecord {
  id: string;
  labId: string;
  encryptedData: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelectableExam {
  id: string;
  name: string;
  panelId: string;
  priceKey: string;
  defaultPrice: number;
}

export interface DecryptedLabProfile {
  labName: string;
  address: string;
  phone: string;
  email: string;
  customLogo: string; // Base64 string for custom diagnostic logo
  reportFooter: string; // default footer for reports
  slogan?: string; // Custom laboratory slogan / subtitle
  processedBy?: string; // Name of person who processes
  processedByTitle?: string; // Professional title
  processedByReg?: string; // Registration/license number (e.g., JVPLC)
  labSeal?: string; // Base64 string for laboratory stamp/seal
  signatureSeal?: string; // Base64 string for signature seal of the processor
  themeColor?: string; // e.g. "purple" | "teal"
  examPrices?: Record<string, number>; // exam panel ID mapped to pricing USD
  customExams?: SelectableExam[]; // Custom added/configured exams
  sigWidth?: number;
  sigHeight?: number;
  sigXOffset?: number;
  sigYOffset?: number;
  sealWidth?: number;
  sealHeight?: number;
  sealXOffset?: number;
  sealYOffset?: number;
}

export interface LabSettings {
  labId: string;
  passcode: string;
  isLoggedIn: boolean;
  derivedAuthHash: string;
  profile: DecryptedLabProfile;
}
