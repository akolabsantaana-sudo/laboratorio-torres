import React, { useState, useRef, useEffect } from "react";
import { Building2, MapPin, Phone, Mail, FileText, Upload, Trash2, Save, ArrowLeft, CheckCircle2, ShieldCheck, Search, Sliders, Link, Unlink, Download, UploadCloud, FileJson, ShieldAlert, Info, KeyRound } from "lucide-react";
import { DecryptedLabProfile, DecryptedLabRecord, SelectableExam } from "../types";
import { AVAILABLE_EXAMS } from "./PatientReceptionForm";
import { encryptData, decryptData } from "../utils/crypto";
import DatabaseDiagnostics from "./DatabaseDiagnostics";

interface LabProfileFormProps {
  initialProfile: DecryptedLabProfile;
  onSaveProfile: (profile: DecryptedLabProfile) => Promise<void>;
  onCancel: () => void;
  records: DecryptedLabRecord[];
  onImportBackup: (importedProfile: DecryptedLabProfile, finalRecords: DecryptedLabRecord[]) => Promise<void>;
  currentLabId: string;
  currentPasscode: string;
}

export default function LabProfileForm({ 
  initialProfile, 
  onSaveProfile, 
  onCancel,
  records,
  onImportBackup,
  currentLabId,
  currentPasscode
}: LabProfileFormProps) {
  const [labName, setLabName] = useState(initialProfile.labName || "");
  const [address, setAddress] = useState(initialProfile.address || "");
  const [phone, setPhone] = useState(initialProfile.phone || "");
  const [email, setEmail] = useState(initialProfile.email || "");
  const [reportFooter, setReportFooter] = useState(initialProfile.reportFooter || "");
  const [logoBase64, setLogoBase64] = useState(initialProfile.customLogo || "");
  const [slogan, setSlogan] = useState(initialProfile.slogan || "");
  const [processedBy, setProcessedBy] = useState(initialProfile.processedBy || "");
  const [processedByTitle, setProcessedByTitle] = useState(initialProfile.processedByTitle || "");
  const [processedByReg, setProcessedByReg] = useState(initialProfile.processedByReg || "");
  const [labSeal, setLabSeal] = useState(initialProfile.labSeal || "");
  const [signatureSeal, setSignatureSeal] = useState(initialProfile.signatureSeal || "");
  const [themeColor, setThemeColor] = useState(initialProfile.themeColor || "teal");

  const [sigWidth, setSigWidth] = useState<number>(initialProfile.sigWidth ?? 45);
  const [sigHeight, setSigHeight] = useState<number>(initialProfile.sigHeight ?? 14);
  const [sigXOffset, setSigXOffset] = useState<number>(initialProfile.sigXOffset ?? 0);
  const [sigYOffset, setSigYOffset] = useState<number>(initialProfile.sigYOffset ?? 0);

  const [sealWidth, setSealWidth] = useState<number>(initialProfile.sealWidth ?? 25);
  const [sealHeight, setSealHeight] = useState<number>(initialProfile.sealHeight ?? 25);
  const [sealXOffset, setSealXOffset] = useState<number>(initialProfile.sealXOffset ?? 0);
  const [sealYOffset, setSealYOffset] = useState<number>(initialProfile.sealYOffset ?? 0);

  // Aspect ratio states for proportional locking
  const [sigRatio, setSigRatio] = useState<number | null>(null);
  const [sealRatio, setSealRatio] = useState<number | null>(null);
  const [lockSigRatio, setLockSigRatio] = useState<boolean>(true);
  const [lockSealRatio, setLockSealRatio] = useState<boolean>(true);
  
  // Tab navigation state for polished modular configurations panel
  const [activeSettingsTab, setActiveSettingsTab] = useState<"general" | "exams" | "signature" | "users" | "backup">("general");

  // Read actual image dimensions to lock natural aspect ratios on load
  useEffect(() => {
    if (initialProfile.signatureSeal) {
      const img = new Image();
      img.onload = () => {
        setSigRatio(img.width / img.height);
      };
      img.src = initialProfile.signatureSeal;
    }
    if (initialProfile.labSeal) {
      const img = new Image();
      img.onload = () => {
        setSealRatio(img.width / img.height);
      };
      img.src = initialProfile.labSeal;
    }
  }, [initialProfile.signatureSeal, initialProfile.labSeal]);

  // --- EMERGENCY BACKUP & RECOVERY STATE ---
  const [backupTab, setBackupTab] = useState<"export" | "import">("export");
  
  // Export States
  const [exportPasscode, setExportPasscode] = useState<string>(currentPasscode || "AKO1234");
  const [exportLabId, setExportLabId] = useState<string>(currentLabId || "demo-local");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  
  // Import States
  const [importPasscode, setImportPasscode] = useState<string>(currentPasscode || "AKO1234");
  const [importLabId, setImportLabId] = useState<string>(currentLabId || "demo-local");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptedPayload, setDecryptedPayload] = useState<{ profile: DecryptedLabProfile; records: DecryptedLabRecord[] } | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "overwrite">("merge");
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  const handleGenerateExport = async () => {
    if (!exportPasscode.trim()) {
      alert("Por favor introduce una contraseña de cifrado para proteger tu archivo.");
      return;
    }
    if (!exportLabId.trim()) {
      alert("Por favor introduce el ID del Laboratorio.");
      return;
    }

    setIsExporting(true);
    setExportSuccessMsg(null);

    try {
      // 1. Compile backup payload
      const backupObj = {
        version: "1.0-emergency",
        exportedAt: new Date().toISOString(),
        labId: exportLabId.trim().toLowerCase(),
        data: {
          profile: {
            labName,
            address,
            phone,
            email,
            reportFooter,
            customLogo: logoBase64,
            slogan,
            processedBy,
            processedByTitle,
            processedByReg,
            labSeal,
            signatureSeal,
            themeColor,
            sigWidth,
            sigHeight,
            sigXOffset,
            sigYOffset,
            sealWidth,
            sealHeight,
            sealXOffset,
            sealYOffset,
            examPrices: initialProfile.examPrices || {},
            customExams: customExams
          },
          records: records
        }
      };

      // 2. Encrypt using derived passcode & labId
      const encryptedString = await encryptData(backupObj, exportPasscode.trim(), exportLabId.trim());

      // 3. Package as file structure
      const finalFileJson = {
        backup_version: "1.0",
        encryptedPayload: encryptedString,
        labId: exportLabId.trim().toLowerCase(),
        exportedAt: new Date().toISOString(),
        recordCount: records.length,
        note: "Este archivo contiene datos clinicos altamente confidenciales encriptados de extremo a extremo. Solo puede ser descifrado mediante el sistema oficial de AKOLAB usando la contraseña correspondiente."
      };

      // 4. Download file
      const blob = new Blob([JSON.stringify(finalFileJson, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
      link.href = url;
      link.download = `ako_backup_emergencia_${exportLabId.trim().toLowerCase()}_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccessMsg(`¡Copia de seguridad generada con éxito! Se descargó el archivo con ${records.length} pacientes.`);
      setTimeout(() => setExportSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error(err);
      alert("Error al generar copia de seguridad: " + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDecryptedPayload(null);
      setDecryptError(null);
    }
  };

  const handleDecryptImport = () => {
    if (!selectedFile) {
      setDecryptError("Por favor selecciona un archivo de copia de seguridad (.json)");
      return;
    }
    if (!importPasscode.trim()) {
      setDecryptError("Introduce la contraseña de cifrado que se utilizó para crear este archivo.");
      return;
    }
    if (!importLabId.trim()) {
      setDecryptError("Introduce el ID del Laboratorio que se utilizó para crear este archivo.");
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);
    setDecryptedPayload(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);
        
        if (!json.encryptedPayload) {
          throw new Error("El archivo seleccionado no es un formato válido de copia de seguridad (No contiene datos cifrados).");
        }

        // Decrypt
        const decrypted = await decryptData(json.encryptedPayload, importPasscode.trim(), importLabId.trim());
        
        if (!decrypted || decrypted.version !== "1.0-emergency" || !decrypted.data) {
          throw new Error("El archivo descifrado no tiene un formato interno de emergencia compatible.");
        }

        setDecryptedPayload({
          profile: decrypted.data.profile,
          records: decrypted.data.records || []
        });
        setDecryptError(null);
      } catch (err: any) {
        setDecryptError(err?.message || "Error al descifrar. Por favor, verifica que la contraseña de cifrado y el ID del laboratorio sean exactamente los correctos.");
        setDecryptedPayload(null);
      } finally {
        setIsDecrypting(false);
      }
    };
    reader.onerror = () => {
      setDecryptError("No se pudo leer el archivo seleccionado.");
      setIsDecrypting(false);
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirmRestore = async () => {
    if (!decryptedPayload) return;
    setIsRestoring(true);
    setRestoreSuccessMsg(null);

    try {
      let finalRecordsList: DecryptedLabRecord[] = [];

      if (restoreMode === "overwrite") {
        // Just overwrite entirely. 
        // Set isSynced = false so that they will be pushed to the server next sync!
        finalRecordsList = decryptedPayload.records.map(rec => ({
          ...rec,
          isSynced: false
        }));
      } else {
        // Smart Merge: combine records by ID, keeping the newest updatedAt
        const mergedMap = new Map<string, DecryptedLabRecord>();
        
        // Add existing records first
        records.forEach(rec => {
          mergedMap.set(rec.id, rec);
        });

        // Merge backup records
        decryptedPayload.records.forEach(backupRec => {
          const existing = mergedMap.get(backupRec.id);
          if (existing) {
            const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
            const backupTime = backupRec.updatedAt ? new Date(backupRec.updatedAt).getTime() : 0;
            
            if (backupTime > existingTime) {
              // Backup is newer, overwrite and set isSynced = false so it propagates
              mergedMap.set(backupRec.id, {
                ...backupRec,
                isSynced: false
              });
            }
          } else {
            // New record, add as unsynced so it uploads
            mergedMap.set(backupRec.id, {
              ...backupRec,
              isSynced: false
            });
          }
        });

        finalRecordsList = Array.from(mergedMap.values());
      }

      // Sort by examDate descending
      finalRecordsList.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());

      // Propagate import!
      await onImportBackup(decryptedPayload.profile, finalRecordsList);

      setRestoreSuccessMsg(`¡Restauración de emergencia completada con éxito! Se cargó el perfil de laboratorio y se integraron ${decryptedPayload.records.length} pacientes.`);
      
      // Clean up states
      setSelectedFile(null);
      setDecryptedPayload(null);

      setTimeout(() => {
        setRestoreSuccessMsg(null);
      }, 8000);
    } catch (err: any) {
      alert("Error al restaurar copia: " + (err.message || err));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSigWidthChange = (val: number) => {
    setSigWidth(val);
    if (lockSigRatio && sigRatio) {
      const targetHeight = Math.round((val / sigRatio) * 10) / 10;
      setSigHeight(targetHeight || 1);
    }
  };

  const handleSigHeightChange = (val: number) => {
    setSigHeight(val);
    if (lockSigRatio && sigRatio) {
      const targetWidth = Math.round((val * sigRatio) * 10) / 10;
      setSigWidth(targetWidth || 1);
    }
  };

  const handleSealWidthChange = (val: number) => {
    setSealWidth(val);
    if (lockSealRatio && sealRatio) {
      const targetHeight = Math.round((val / sealRatio) * 10) / 10;
      setSealHeight(targetHeight || 1);
    }
  };

  const handleSealHeightChange = (val: number) => {
    setSealHeight(val);
    if (lockSealRatio && sealRatio) {
      const targetWidth = Math.round((val * sealRatio) * 10) / 10;
      setSealWidth(targetWidth || 1);
    }
  };
  const [examPrices, setExamPrices] = useState<Record<string, number>>(
    initialProfile.examPrices || {
      hemograma: 8,
      ego: 2,
      heces: 2,
      quimica_basica: 3,
      perfil_lipidico: 3,
      perfil_hepatico: 4,
      funcion_renal: 3,
      urocultivo: 10,
      coprocultivo: 10,
      cultivo_faringeo: 10,
      secreciones_varias: 10,
      espermograma: 35,
      miscelaneo: 6
    }
  );
  const [showIndividualPrices, setShowIndividualPrices] = useState(false);
  const [priceSearchQuery, setPriceSearchQuery] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [errorStatus, setErrorStatus] = useState("");
  const [successStatus, setSuccessStatus] = useState(false);

  // USERS MANAGEMENT FOR SCIENTIFIC CLINICAL ACCOUNTS
  const [usersList, setUsersList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("labsync_users_v1");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    const defaultSeed = [
      { email: "admin@akolab.com", password: "ako123", name: "Administrador General", role: "general" },
      { email: "ceo@akolab.com", password: "ceo123", name: "Licda. Ana Kely Ortéz (CEO)", role: "ceo" },
      { email: "gerente@akolab.com", password: "gerente123", name: "Gerencia de Operaciones (Gerente)", role: "gerente" }
    ];
    localStorage.setItem("labsync_users_v1", JSON.stringify(defaultSeed));
    return defaultSeed;
  });

  // CONFIGURACIÓN DE EXÁMENES PERSONALIZADOS
  const [customExams, setCustomExams] = useState<SelectableExam[]>(initialProfile.customExams || []);
  const [newExamName, setNewExamName] = useState("");
  const [newExamPanelId, setNewExamPanelId] = useState("miscelaneo");
  const [newExamPrice, setNewExamPrice] = useState<string>("10.00");
  const [examConfigError, setExamConfigError] = useState("");
  const [examConfigSuccess, setExamConfigSuccess] = useState("");

  const handleAddCustomExam = () => {
    setExamConfigError("");
    setExamConfigSuccess("");

    if (!newExamName.trim()) {
      setExamConfigError("Por favor ingrese el nombre del examen.");
      return;
    }

    const priceNum = parseFloat(newExamPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setExamConfigError("Por favor ingrese un precio válido (mayor o igual a 0).");
      return;
    }

    // Generate clean id
    const cleanId = "custom_" + newExamName.toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/__+/g, "_") + "_" + Date.now().toString().slice(-4);

    const getPriceKeyForPanel = (panelId: string): string => {
      const mapping: Record<string, string> = {
        "hematologia": "hemograma",
        "uroanalisis_embarazo": "ego",
        "coproanalisis": "heces",
        "química_y_diabetes": "quimica_basica",
        "urocultivo": "urocultivo",
        "coprocultivo": "coprocultivo",
        "cultivo_faringeo": "cultivo_faringeo",
        "secreciones_varias": "secreciones_varias",
        "espermograma": "espermograma",
      };
      return mapping[panelId] || "miscelaneo";
    };

    const newExam: SelectableExam = {
      id: cleanId,
      name: newExamName.trim(),
      panelId: newExamPanelId,
      priceKey: getPriceKeyForPanel(newExamPanelId),
      defaultPrice: priceNum
    };

    setCustomExams(prev => [...prev, newExam]);
    setNewExamName("");
    setNewExamPrice("10.00");
    setExamConfigSuccess(`Examen "${newExam.name}" agregado con éxito.`);
    setTimeout(() => setExamConfigSuccess(""), 4000);
  };

  const handleDeleteCustomExam = (id: string) => {
    setCustomExams(prev => prev.filter(e => e.id !== id));
  };

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"general" | "ceo" | "gerente">("general");
  const [userAdminError, setUserAdminError] = useState("");
  const [userAdminSuccess, setUserAdminSuccess] = useState("");

  const handleAddNewUser = () => {
    setUserAdminError("");
    setUserAdminSuccess("");

    if (!newUserName.trim()) {
      setUserAdminError("Por favor ingrese el nombre completo del usuario.");
      return;
    }
    if (!newUserEmail.trim() || !newUserEmail.includes("@")) {
      setUserAdminError("Por favor ingrese un correo electrónico válido.");
      return;
    }
    if (!newUserPassword.trim() || newUserPassword.length < 4) {
      setUserAdminError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    if (usersList.some(u => u.email.toLowerCase() === newUserEmail.toLowerCase().trim())) {
      setUserAdminError("Ya existe un usuario científico registrado con este correo.");
      return;
    }

    const newUser = {
      email: newUserEmail.toLowerCase().trim(),
      password: newUserPassword.trim(),
      name: newUserName.trim(),
      role: newUserRole
    };

    const updatedList = [...usersList, newUser];
    setUsersList(updatedList);
    localStorage.setItem("labsync_users_v1", JSON.stringify(updatedList));

    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("general");
    setUserAdminSuccess(`¡Éxito! El usuario "${newUser.name}" fue creado exitosamente.`);
    setTimeout(() => setUserAdminSuccess(""), 4000);
  };

  const handleDeleteUser = (emailToDelete: string) => {
    setUserAdminError("");
    setUserAdminSuccess("");

    if (emailToDelete.toLowerCase() === "admin@akolab.com") {
      setUserAdminError("Por motivos de seguridad, no se puede eliminar la cuenta maestra.");
      return;
    }

    const updatedList = usersList.filter(u => u.email.toLowerCase() !== emailToDelete.toLowerCase());
    setUsersList(updatedList);
    localStorage.setItem("labsync_users_v1", JSON.stringify(updatedList));
    setUserAdminSuccess("El usuario científico ha sido eliminado.");
    setTimeout(() => setUserAdminSuccess(""), 3500);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Resize and compress uploaded images using Canvas to save DB storage space
  const compressAndSet = (
    file: File, 
    callback: (base64: string, w: number, h: number) => void, 
    maxWidth = 250, 
    maxHeight = 100
  ) => {
    if (!file.type.match("image.*")) {
      setErrorStatus("La carga debe ser una imagen válida (PNG, JPG, JPEG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/png", 0.85);
          callback(compressed, width, height);
          setErrorStatus("");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressAndSet(file, (base64) => setLogoBase64(base64), 300, 120);
  };

  const handleLabSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressAndSet(file, (base64, w, h) => {
      setLabSeal(base64);
      const ratio = w / h;
      setSealRatio(ratio);
      setSealWidth(25);
      setSealHeight(Math.round((25 / ratio) * 10) / 10);
    }, 200, 200); // Seals are usually square
  };

  const handleSignatureSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressAndSet(file, (base64, w, h) => {
      setSignatureSeal(base64);
      const ratio = w / h;
      setSigRatio(ratio);
      setSigWidth(45);
      setSigHeight(Math.round((45 / ratio) * 10) / 10);
    }, 240, 100); // Signatures are wider
  };

  const removeLogo = () => {
    setLogoBase64("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeLabSeal = () => {
    setLabSeal("");
    if (sealInputRef.current) sealInputRef.current.value = "";
  };

  const removeSignatureSeal = () => {
    setSignatureSeal("");
    if (signatureInputRef.current) signatureInputRef.current.value = "";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labName.trim()) {
      setErrorStatus("El nombre del laboratorio es mandatorio.");
      return;
    }

    setIsSaving(true);
    setErrorStatus("");
    setSuccessStatus(false);

    try {
      await onSaveProfile({
        labName: labName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        customLogo: logoBase64,
        reportFooter: reportFooter.trim(),
        slogan: slogan.trim(),
        processedBy: processedBy.trim(),
        processedByTitle: processedByTitle.trim(),
        processedByReg: processedByReg.trim(),
        labSeal: labSeal,
        signatureSeal: signatureSeal,
        themeColor,
        examPrices,
        customExams,
        sigWidth,
        sigHeight,
        sigXOffset,
        sigYOffset,
        sealWidth,
        sealHeight,
        sealXOffset,
        sealYOffset
      });
      setSuccessStatus(true);
      setTimeout(() => setSuccessStatus(false), 3000);
    } catch (err: any) {
      setErrorStatus(err.message || "No se pudo sincronizar el perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4" id="lab-profile-container">
      {/* Back banner */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <button
          onClick={onCancel}
          className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors gap-2 cursor-pointer focus:outline-none"
          id="profile-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero
        </button>
        <div className="flex items-center text-xs text-slate-500 gap-1.5 font-medium bg-slate-100 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Sincronización Protegida
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner header */}
        <div className="bg-slate-550 bg-gradient-to-tr from-slate-800 to-indigo-900 px-6 py-5 text-white">
          <h2 className="text-xl font-bold font-sans">Configuración Personalizada del Laboratorio</h2>
          <p className="text-slate-300 text-xs mt-1 leading-relaxed">
            Personaliza el membrete oficial, información de contacto, logo y pie de página que se incluirá en cada PDF (Boleta de Resultados) automático.
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6" id="lab-profile-form">
          {/* Tabs Navigation */}
          <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 p-1.5 rounded-xl gap-1" id="config-tabs-bar">
            <button
              type="button"
              onClick={() => setActiveSettingsTab("general")}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSettingsTab === "general"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              📋 Membrete y Datos
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab("signature")}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSettingsTab === "signature"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              ✍️ Firma y Sello
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab("exams")}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSettingsTab === "exams"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              🔬 Exámenes y Precios
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab("users")}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSettingsTab === "users"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              👥 Colaboradores
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab("backup")}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSettingsTab === "backup"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              💾 Copia de Seguridad
            </button>
          </div>

          {activeSettingsTab === "general" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Logo Upload Section */}
              <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-850">Logo de Boleta Oficial</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2 space-y-2">
                <p className="text-xs text-slate-500 leading-normal">
                  Carga un logo para que aparezca elegantemente alineado en el informe PDF. Se recomienda un logo apaisado con fondo claro o transparente. Máxima resolución reducida automáticamente.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all"
                    id="trigger-logo-upload-btn"
                  >
                    <Upload className="w-4 h-4 text-slate-500" /> Cargar Fotografía
                  </button>
                  {logoBase64 && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                      id="remove-logo-btn"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                />
              </div>

              {/* Logo Preview box */}
              <div className="border border-dashed border-slate-300 bg-slate-50 rounded-2xl h-28 flex items-center justify-center p-3 overflow-hidden relative group">
                {logoBase64 ? (
                  <img
                    src={logoBase64}
                    alt="Lab Logo Preview"
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-1 stroke-1 text-slate-300" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Sin Logo Personalizado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Core Info Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nombre Oficial del Laboratorio
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="ej. Laboratorio Clínico Central"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Número Telefónico
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="+503 2235-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Dirección Física del Laboratorio
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <MapPin className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Avenida General Escalon, No 23A, San Salvador"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Eslogan o Subtítulo del Membrete
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type="text"
                  placeholder="ej. Innovación y Precisión al servicio de su salud"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Correo Electrónico de Contacto
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="email"
                  placeholder="contacto@mi-laboratorio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pie de Página predeterminado de Boleta
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FileText className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Resultados confirmados mediante controles de calidad internacionales."
                  value={reportFooter}
                  onChange={(e) => setReportFooter(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>
          </div>
          
          {/* Theme Color Selection (Rendered inside General Tab) */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/40">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-150 pb-2 mb-4">
              Color del Tema de la Boleta (Tema Visual)
            </h3>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider">
                Paleta de Color de la Boleta (Tema Visual)
              </label>
              <p className="text-[10px] text-slate-500 leading-normal">
                Define el color de acento para las líneas, encabezados de tablas, de tus boletas de resultados clínicos.
              </p>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 px-4 py-2 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors flex-1 ${themeColor === "blue" ? "border-blue-500 bg-blue-50/20" : "border-slate-200"}`}>
                  <input
                    type="radio"
                    name="themeColor"
                    value="blue"
                    checked={themeColor === "blue"}
                    onChange={() => setThemeColor("blue")}
                    className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Azul Marino (Torres)</span>
                    <span className="text-[9px] text-blue-700 block font-bold font-mono">#1E3A8A Azul Marino</span>
                  </div>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors flex-1 ${themeColor === "teal" ? "border-teal-500 bg-teal-50/20" : "border-slate-200"}`}>
                  <input
                    type="radio"
                    name="themeColor"
                    value="teal"
                    checked={themeColor === "teal"}
                    onChange={() => setThemeColor("teal")}
                    className="text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Médico Clásico (Teal)</span>
                    <span className="text-[9px] text-slate-400 block font-mono">#227093 Glacial</span>
                  </div>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors flex-1 ${themeColor === "purple" ? "border-purple-500 bg-purple-50/20" : "border-slate-200"}`}>
                  <input
                    type="radio"
                    name="themeColor"
                    value="purple"
                    checked={themeColor === "purple"}
                    onChange={() => setThemeColor("purple")}
                    className="text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Púrpura Amatista Médica</span>
                    <span className="text-[9px] text-purple-600 block font-bold font-mono">#6D28D9 Vibrante</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
          </div>
          )}

          {/* TAB 3: EXAMENES Y PRECIOS */}
          {activeSettingsTab === "exams" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Pricing catalogs */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-150 pb-2 mb-4">
                  Catálogo de Aranceles (Precios de Venta)
                </h3>
                <label className="block text-xs font-bold text-slate-707 uppercase tracking-wider">
                  Precios de Venta Base del Laboratorio
                </label>
                <p className="text-[10px] text-slate-500 leading-normal mb-3">
                  Fija los precios oficiales de venta para cada examen. Esto alimentará la taquilla de ingresos mensuales automáticamente.
                </p>
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-550 border-b pb-1.5 mb-1.5 uppercase">
                    <span>Examen Clínico</span>
                    <span>Precio (USD $)</span>
                  </div>
                  {[
                    { id: "hemograma", name: "Hemograma Completo" },
                    { id: "ego", name: "General de Orina (EGO)" },
                    { id: "heces", name: "General de Heces" },
                    { id: "quimica_basica", name: "Química Sanguínea" },
                    { id: "perfil_lipidico", name: "Perfil Lipídico" },
                    { id: "perfil_hepatico", name: "Perfil Hepático" },
                    { id: "funcion_renal", name: "Función Renal" },
                    { id: "urocultivo", name: "Urocultivo" },
                    { id: "coprocultivo", name: "Coprocultivo" },
                    { id: "cultivo_faringeo", name: "Cultivo Faríngeo" },
                    { id: "secreciones_varias", name: "Cultivo de Secreciones Varias" },
                    { id: "espermograma", name: "Espermograma Completo" },
                    { id: "miscelaneo", name: "Otros / Examen Especial" }
                  ].map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-xs text-slate-700 py-1 border-b border-slate-100 last:border-none">
                      <span>{p.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-semibold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={examPrices[p.id] ?? 10}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setExamPrices(prev => ({ ...prev, [p.id]: val }));
                          }}
                          className="w-16 text-right px-1.5 py-0.5 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            {/* Custom Individual Price override section */}
            <div className="border border-indigo-100 bg-indigo-50/25 p-4 rounded-2xl mt-4">
              <button
                type="button"
                onClick={() => setShowIndividualPrices(!showIndividualPrices)}
                className="flex items-center justify-between w-full text-xs font-black text-indigo-900 uppercase tracking-widest cursor-pointer select-none"
              >
                <span className="flex items-center gap-2">
                  ✨ CONFIGURAR ARANCELES POR EXAMEN INDIVIDUAL ({AVAILABLE_EXAMS.length} Exámenes)
                </span>
                <span className="text-indigo-600 font-bold font-mono">
                  {showIndividualPrices ? "[ OCULTAR PANEL - ]" : "[ VER EXÁMENES + ]"}
                </span>
              </button>
              
              {showIndividualPrices && (
                <div className="mt-4 space-y-4">
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    ¿Deseas personalizar el arancel de un examen específico? Digita su nombre abajo para buscarlo y escribe su valor de venta. Si lo dejas vacío o en $0, heredará automáticamente el precio general de su categoría.
                  </p>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nombre de análisis (ej. Coombs, PCR, PSA, Perfil...)"
                      value={priceSearchQuery}
                      onChange={(e) => setPriceSearchQuery(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white font-medium"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-xl bg-white max-h-64 overflow-y-auto divide-y divide-slate-100 shadow-inner">
                    {AVAILABLE_EXAMS.filter(exam => 
                      exam.name.toLowerCase().includes(priceSearchQuery.toLowerCase()) ||
                      exam.id.toLowerCase().includes(priceSearchQuery.toLowerCase())
                    ).map((exam) => {
                      const customPrice = examPrices[exam.id];
                      return (
                        <div key={exam.id} className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col pr-4">
                            <span className="text-[11px] font-bold text-slate-800">{exam.name}</span>
                            <span className="text-[8.5px] text-slate-400 font-mono">ID: {exam.id} | Categoría base: {exam.priceKey}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-md">Base: ${exam.defaultPrice}</span>
                            <span className="text-xs text-indigo-700 font-bold">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={exam.defaultPrice.toFixed(2)}
                              value={customPrice !== undefined ? customPrice : ""}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                if (valStr === "") {
                                  setExamPrices(prev => {
                                    const copy = { ...prev };
                                    delete copy[exam.id];
                                    return copy;
                                  });
                                } else {
                                  const val = parseFloat(valStr) || 0;
                                  setExamPrices(prev => ({ ...prev, [exam.id]: val }));
                                }
                              }}
                              className="w-16 text-right px-2 py-0.5 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-indigo-500 font-bold bg-white text-indigo-950"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Configuración de Nuevos Exámenes Personalizados */}
            <div className="border border-teal-100 bg-teal-50/15 p-5 rounded-2xl mt-5">
              <span className="block text-xs font-black text-teal-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                🔬 CONFIGURAR NUEVOS EXÁMENES ({customExams.length} Personalizados)
              </span>
              
              <p className="text-[10.5px] text-slate-500 leading-relaxed font-medium mb-4">
                Agrega análisis que no estén presentes en el listado base del laboratorio. Estos nuevos exámenes estarán disponibles de inmediato para registrar pacientes en recepción, facturar, gestionar aranceles y completar resultados clínicos.
              </p>

              {/* Formulario para agregar */}
              <div className="bg-white p-4 rounded-xl border border-teal-100/70 shadow-xs mb-4 space-y-3">
                <span className="block text-[10px] font-extrabold text-teal-850 uppercase tracking-widest">
                  ➕ Registrar Nuevo Examen Clínico
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1">Nombre del Examen</label>
                    <input
                      type="text"
                      placeholder="ej. Dengue IgG/IgM Rápido"
                      value={newExamName}
                      onChange={(e) => setNewExamName(e.target.value)}
                      className="block w-full px-3 py-1.8 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1">Categoría / Panel Analítico</label>
                    <select
                      value={newExamPanelId}
                      onChange={(e) => setNewExamPanelId(e.target.value)}
                      className="block w-full px-3 py-1.8 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 font-medium bg-white"
                    >
                      <option value="miscelaneo">Otros / Misceláneo</option>
                      <option value="hematologia_especial">Hematología Especial y Frotis</option>
                      <option value="coagulacion_pruebas">Coagulación y Tiempos</option>
                      <option value="uroanalisis_embarazo">Uroanálisis e Inmunología Básica</option>
                      <option value="hormonas_tiroideas_marcadores">Hormonas y Marcadores Séricos</option>
                      <option value="coproanalisis">Coproanálisis y Parásitos</option>
                      <option value="electrolitos_perfil">Perfil Sérico y de Electrolitos</option>
                      <option value="quimica_sanguinea_enzimas">Química Clínica Ampliada y Enzimas</option>
                      <option value="química_y_diabetes">Química Sanguínea Básica</option>
                      <option value="espermograma">Espermograma Completo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1">Precio Predeterminado ($)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="10.00"
                        value={newExamPrice}
                        onChange={(e) => setNewExamPrice(e.target.value)}
                        className="block w-full pl-6 pr-3 py-1.8 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {examConfigError && (
                  <p className="text-[10px] text-red-650 font-bold bg-red-50 p-2 rounded-md">
                    ⚠️ {examConfigError}
                  </p>
                )}

                {examConfigSuccess && (
                  <p className="text-[10px] text-teal-850 font-bold bg-teal-50 p-2 rounded-md">
                    ✓ {examConfigSuccess}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddCustomExam}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    Agregar Examen
                  </button>
                </div>
              </div>

              {/* Listado de agregados */}
              {customExams.length > 0 ? (
                <div className="border border-slate-200 rounded-xl bg-white max-h-60 overflow-y-auto divide-y divide-slate-100 shadow-inner font-sans">
                  {customExams.map((exam) => (
                    <div key={exam.id} className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col pr-4">
                        <span className="text-[11px] font-extrabold text-slate-800">{exam.name}</span>
                        <span className="text-[8.5px] text-slate-400 font-mono">
                          ID: {exam.id} | Categoría: {exam.panelId}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                          ${exam.defaultPrice.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomExam(exam.id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-650 rounded-lg transition-all cursor-pointer"
                          title="Eliminar Examen Personalizado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 bg-white rounded-xl border border-dashed border-slate-250">
                  <p className="text-xs text-slate-400 font-medium">No hay exámenes personalizados configurados aún.</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* TAB 2: FIRMA Y SELLO */}
          {activeSettingsTab === "signature" && (
            <div className="space-y-6 animate-fadeIn">
              {/* PROCESSOR AND SIGNATURE SEAL SECTION */}
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Validación, Firma y Sello del Laboratorio
                </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Quién Procesa / Firma
                </label>
                <input
                  type="text"
                  placeholder="ej. Lic. Alejandro K. Orellana"
                  value={processedBy}
                  onChange={(e) => setProcessedBy(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Título Profesional
                </label>
                <input
                  type="text"
                  placeholder="ej. Licenciado en Laboratorio Clínico"
                  value={processedByTitle}
                  onChange={(e) => setProcessedByTitle(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Número de Registro / Licencia
                </label>
                <input
                  type="text"
                  placeholder="ej. Reg. J.V.P.L.C. #4591"
                  value={processedByReg}
                  onChange={(e) => setProcessedByReg(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* Live Print Simulation Panel */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Simulador Digital de Impresión (Ajuste en Tiempo Real)</span>
                </div>
                <div className="text-[10px] bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full font-bold border border-teal-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"></span>
                  Vista Previa Escala 1.7x
                </div>
              </div>
              
              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                Este panel simula exactamente el pie de página que se generará en el archivo PDF de resultados. Use los controles inferiores de ancho, alto y las barras de desplazamiento (Offsets) para mover o redimensionar las imágenes interactivamente. ¡Evita deformaciones usando los botones de proporción!
              </p>

              <div className="flex justify-center py-2.5">
                {/* Simulated physical paper cut-out with millimetric mesh background */}
                <div className="w-[367px] h-32 bg-white rounded-xl shadow-md border border-slate-200 relative overflow-hidden select-none bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:8px_8px]">
                  
                  {/* Left Side: Signature Section */}
                  {/* Signature line at baseline height 82px */}
                  <div className="absolute border-b border-slate-400" id="preview-sig-line" style={{ left: '37px', width: '102px', top: '82px' }} />
                  
                  {/* Signature Image */}
                  {signatureSeal ? (
                    <img
                      src={signatureSeal}
                      alt="Firma"
                      id="preview-sig-img"
                      className="absolute object-contain pointer-events-none transition-all duration-75"
                      referrerPolicy="no-referrer"
                      style={{
                        width: `${sigWidth * 1.7}px`,
                        height: `${sigHeight * 1.7}px`,
                        left: `${37 + (5 * 1.7) + (sigXOffset * 1.7)}px`,
                        top: `${82 - (sigHeight * 1.7) - 3 + (sigYOffset * 1.7)}px`,
                      }}
                    />
                  ) : (
                    <div className="absolute flex items-center justify-center border border-dashed border-slate-300 text-[7px] font-bold text-slate-400 bg-slate-50/50 rounded pointer-events-none"
                         id="preview-sig-none"
                         style={{
                           width: `${sigWidth * 1.7}px`,
                           height: `${sigHeight * 1.7}px`,
                           left: `${37 + (5 * 1.7) + (sigXOffset * 1.7)}px`,
                           top: `${82 - (sigHeight * 1.7) - 3 + (sigYOffset * 1.7)}px`,
                         }}>
                      Sin Firma Cargada
                    </div>
                  )}
                  
                  {/* Under-signature credentials */}
                  <div className="absolute flex flex-col text-left pointer-events-none" id="preview-sig-details" style={{ left: '37px', top: '86px', width: '150px' }}>
                    <span className="text-[7.5px] font-bold text-slate-800 tracking-tight leading-none uppercase truncate">
                      {processedBy ? processedBy.toUpperCase() : "LIC. ALEJANDRO K. ORELLANA"}
                    </span>
                    <span className="text-[6.2px] text-slate-500 font-medium leading-tight mt-0.5 truncate">
                      {processedByTitle || "Licenciado en Laboratorio Clínico"}
                    </span>
                    <span className="text-[6.2px] text-slate-400 leading-none mt-0.5 font-mono truncate">
                      {processedByReg || "Reg. J.V.P.L.C. #4591"}
                    </span>
                  </div>

                  {/* Right Side: Stamp Section */}
                  {labSeal ? (
                    <img
                      src={labSeal}
                      alt="Sello"
                      id="preview-seal-img"
                      className="absolute object-contain pointer-events-none transition-all duration-75"
                      referrerPolicy="no-referrer"
                      style={{
                        width: `${sealWidth * 1.7}px`,
                        height: `${sealHeight * 1.7}px`,
                        left: `${261 + (10 * 1.7) + (sealXOffset * 1.7)}px`,
                        top: `${82 - (sealHeight * 1.7) + (sealYOffset * 1.7)}px`,
                      }}
                    />
                  ) : (
                    <div className="absolute rounded-full border border-dashed border-slate-350 bg-slate-50/40 flex flex-col items-center justify-center pointer-events-none"
                         id="preview-seal-none"
                         style={{
                           width: `${sealWidth * 1.7}px`,
                           height: `${sealHeight * 1.7}px`,
                           left: `${261 + (10 * 1.7) + (sealXOffset * 1.7)}px`,
                           top: `${82 - (sealHeight * 1.7) + (sealYOffset * 1.7)}px`,
                         }}>
                      <span className="text-[5.5px] font-bold text-slate-450 text-center leading-none">Sello</span>
                      <span className="text-[4.5px] font-mono text-slate-350 mt-0.5">{sealWidth}x{sealHeight} mm</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Lab Seal Card */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3" id="lab_seal_config_card">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Sello Oficial de sucursal o firma</span>
                  {labSeal && (
                    <button
                      type="button"
                      onClick={removeLabSeal}
                      className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Carga el sello húmedo del laboratorio (ideal fondo blanco o transparente). Esto aparecerá impreso al lado de la firma.
                </p>
                <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => sealInputRef.current?.click()}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Subir Sello
                    </button>
                    <input
                      type="file"
                      ref={sealInputRef}
                      onChange={handleLabSealUpload}
                      accept="image/png, image/jpeg"
                      className="hidden"
                    />
                  </div>
                  
                  <div className="w-12 h-12 border rounded bg-white flex items-center justify-center overflow-hidden p-0.5">
                    {labSeal ? (
                      <img src={labSeal} alt="Seal preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[7px] text-slate-300 uppercase font-bold text-center">Sin sello</span>
                    )}
                  </div>
                </div>

                {/* Sello metrics setting */}
                <div className="pt-2.5 border-t border-slate-200/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dimensiones del Sello</span>
                    <button
                      type="button"
                      onClick={() => setLockSealRatio(!lockSealRatio)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        lockSealRatio
                          ? "bg-teal-50/50 text-teal-700 border-teal-200"
                          : "bg-slate-100 text-slate-550 border-slate-250"
                      }`}
                      title={lockSealRatio ? "Relación de aspecto bloqueada" : "Relación de aspecto libre"}
                    >
                      {lockSealRatio ? (
                        <>
                          <Link className="w-2.5 h-2.5 text-teal-600" />
                          <span>Proporcional</span>
                        </>
                      ) : (
                        <>
                          <Unlink className="w-2.5 h-2.5 text-slate-450" />
                          <span>Libre</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Proportional Fixer & Presets Button */}
                  {labSeal && (
                    <div className="flex flex-col gap-1.5 bg-white p-2 rounded-lg border border-slate-150">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-slate-600">Preajustes sugeridos:</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!labSeal) return;
                            const img = new Image();
                            img.onload = () => {
                              const ratio = img.width / img.height;
                              setSealRatio(ratio);
                              setSealWidth(25);
                              setSealHeight(Math.round((25 / ratio) * 10) / 10);
                            };
                            img.src = labSeal;
                          }}
                          className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded border border-amber-200 transition-colors"
                        >
                          ⚡ Auto-Ajustar Proporción Real
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSealWidth(24);
                            setSealHeight(24);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-semibold border border-slate-200"
                        >
                          Redondo (24x24)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSealWidth(30);
                            setSealHeight(30);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-semibold border border-slate-200"
                        >
                          Redondo Grande (30x30)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSealWidth(36);
                            setSealHeight(18);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-semibold border border-slate-200"
                        >
                          Oval/Rect (36x18)
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-750">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ancho (mm)</label>
                      <input
                        type="number"
                        step="1"
                        min="5"
                        max="100"
                        value={sealWidth}
                        onChange={(e) => handleSealWidthChange(Math.max(5, parseFloat(e.target.value) || 25))}
                        className="w-full px-2 py-1 border border-slate-350 rounded bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Alto (mm)</label>
                      <input
                        type="number"
                        step="1"
                        min="5"
                        max="100"
                        value={sealHeight}
                        onChange={(e) => handleSealHeightChange(Math.max(5, parseFloat(e.target.value) || 25))}
                        className="w-full px-2 py-1 border border-slate-350 rounded bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-[9px] uppercase font-bold text-slate-500">Ahoriz. (X Offset)</label>
                        <button
                          type="button"
                          onClick={() => setSealXOffset(0)}
                          className="text-[8px] text-slate-400 hover:text-slate-600 underline font-semibold"
                        >
                          Centrar
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min="-40"
                          max="40"
                          step="1"
                          value={sealXOffset}
                          onChange={(e) => setSealXOffset(parseInt(e.target.value) || 0)}
                          className="w-full accent-teal-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                        />
                        <span className="font-mono text-[9px] font-bold w-6 text-right text-slate-500">{sealXOffset > 0 ? `+${sealXOffset}` : sealXOffset}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-[9px] uppercase font-bold text-slate-500">Verti. (Y Offset)</label>
                        <button
                          type="button"
                          onClick={() => setSealYOffset(0)}
                          className="text-[8px] text-slate-400 hover:text-slate-600 underline font-semibold"
                        >
                          Centrar
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min="-40"
                          max="40"
                          step="1"
                          value={sealYOffset}
                          onChange={(e) => setSealYOffset(parseInt(e.target.value) || 0)}
                          className="w-full accent-teal-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                        />
                        <span className="font-mono text-[9px] font-bold w-6 text-right text-slate-500">{sealYOffset > 0 ? `+${sealYOffset}` : sealYOffset}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Seal Card */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3" id="signature_config_card">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Firma Digital del Analista</span>
                  {signatureSeal && (
                    <button
                      type="button"
                      onClick={removeSignatureSeal}
                      className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Sube tu firma escaneada o fotografiada (tinta negra/azul sobre fondo blanco). Aparecerá posicionada exactamente sobre la línea de firma.
                </p>
                <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Subir Firma
                    </button>
                    <input
                      type="file"
                      ref={signatureInputRef}
                      onChange={handleSignatureSealUpload}
                      accept="image/png, image/jpeg"
                      className="hidden"
                    />
                  </div>
                  
                  <div className="w-16 h-10 border rounded bg-white flex items-center justify-center overflow-hidden p-0.5">
                    {signatureSeal ? (
                      <img src={signatureSeal} alt="Signature preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[7px] text-slate-300 uppercase font-bold text-center">Sin firma</span>
                    )}
                  </div>
                </div>

                {/* Firma metrics setting */}
                <div className="pt-2.5 border-t border-slate-200/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dimensiones de Firma</span>
                    <button
                      type="button"
                      onClick={() => setLockSigRatio(!lockSigRatio)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        lockSigRatio
                          ? "bg-teal-50/50 text-teal-700 border-teal-200"
                          : "bg-slate-100 text-slate-550 border-slate-250"
                      }`}
                      title={lockSigRatio ? "Relación de aspecto bloqueada" : "Relación de aspecto libre"}
                    >
                      {lockSigRatio ? (
                        <>
                          <Link className="w-2.5 h-2.5 text-teal-600" />
                          <span>Proporcional</span>
                        </>
                      ) : (
                        <>
                          <Unlink className="w-2.5 h-2.5 text-slate-450" />
                          <span>Libre</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Proportional Fixer & Presets Button */}
                  {signatureSeal && (
                    <div className="flex flex-col gap-1.5 bg-white p-2 rounded-lg border border-slate-150">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-slate-600">Preajustes sugeridos:</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!signatureSeal) return;
                            const img = new Image();
                            img.onload = () => {
                              const ratio = img.width / img.height;
                              setSigRatio(ratio);
                              setSigWidth(45);
                              setSigHeight(Math.round((45 / ratio) * 10) / 10);
                            };
                            img.src = signatureSeal;
                          }}
                          className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded border border-amber-200 transition-colors"
                        >
                          ⚡ Auto-Ajustar Proporción Real
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSigWidth(45);
                            setSigHeight(14);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-semibold border border-slate-200"
                        >
                          Estándar (45x14)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSigWidth(38);
                            setSigHeight(12);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-semibold border border-slate-200"
                        >
                          Compacta (38x12)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSigWidth(55);
                            setSigHeight(18);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-semibold border border-slate-200"
                        >
                          Grande (55x18)
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-750">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ancho (mm)</label>
                      <input
                        type="number"
                        step="1"
                        min="5"
                        max="100"
                        value={sigWidth}
                        onChange={(e) => handleSigWidthChange(Math.max(5, parseFloat(e.target.value) || 45))}
                        className="w-full px-2 py-1 border border-slate-350 rounded bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Alto (mm)</label>
                      <input
                        type="number"
                        step="1"
                        min="5"
                        max="100"
                        value={sigHeight}
                        onChange={(e) => handleSigHeightChange(Math.max(5, parseFloat(e.target.value) || 14))}
                        className="w-full px-2 py-1 border border-slate-350 rounded bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-[9px] uppercase font-bold text-slate-500">Horiz. (X Offset)</label>
                        <button
                          type="button"
                          onClick={() => setSigXOffset(0)}
                          className="text-[8px] text-slate-400 hover:text-slate-600 underline font-semibold"
                        >
                          Centrar
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min="-40"
                          max="40"
                          step="1"
                          value={sigXOffset}
                          onChange={(e) => setSigXOffset(parseInt(e.target.value) || 0)}
                          className="w-full accent-teal-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                        />
                        <span className="font-mono text-[9px] font-bold w-6 text-right text-slate-500">{sigXOffset > 0 ? `+${sigXOffset}` : sigXOffset}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-[9px] uppercase font-bold text-slate-500">Verti. (Y Offset)</label>
                        <button
                          type="button"
                          onClick={() => setSigYOffset(0)}
                          className="text-[8px] text-slate-400 hover:text-slate-600 underline font-semibold"
                        >
                          Centrar
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min="-40"
                          max="40"
                          step="1"
                          value={sigYOffset}
                          onChange={(e) => setSigYOffset(parseInt(e.target.value) || 0)}
                          className="w-full accent-teal-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                        />
                        <span className="font-mono text-[9px] font-bold w-6 text-right text-slate-500">{sigYOffset > 0 ? `+${sigYOffset}` : sigYOffset}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
          )}

          {/* TAB 4: COLABORADORES */}
          {activeSettingsTab === "users" && (
            <div className="space-y-6 animate-fadeIn">
              {/* SECCIÓN: GESTIÓN DE USUARIOS CIENTÍFICOS */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left" id="scientific-users-admin-section">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              Gestión de Usuarios Científicos y Roles 🧪
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 mb-4 leading-normal">
              Controle quién accede al sistema. Configure cuentas para directivos (CEO, Gerentes) con permisos limitados exclusivamente a consulta de exámenes procesados, cierres de caja y estadísticas.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
              {/* Formulario de Crear Nuevo Usuario */}
              <div className="lg:col-span-5 bg-white p-4.5 rounded-xl border border-slate-150 space-y-3 text-left">
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">Crear Nuevo Colaborador</h4>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Ej. Licda. María López"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="correo@akolab.com"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contraseña / PIN de Acceso</label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="PIN numérico o contraseña"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rol y Permisos</label>
                  <select
                    value={newUserRole}
                    onChange={(e: any) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                  >
                    <option value="general">Administrador General (Acceso Total)</option>
                    <option value="ceo">CEO (Solo ver procesados + Estadísticas + Caja)</option>
                    <option value="gerente text-left font-sans">Gerente General (Solo ver procesados + Estadísticas + Caja)</option>
                  </select>
                </div>

                {userAdminError && (
                  <p className="text-[10px] text-red-650 font-semibold bg-red-50 border border-red-100 p-2 rounded-lg">{userAdminError}</p>
                )}

                {userAdminSuccess && (
                  <p className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 p-2 rounded-lg">{userAdminSuccess}</p>
                )}

                <button
                  type="button"
                  onClick={handleAddNewUser}
                  className="w-full py-2 bg-gradient-to-tr from-slate-800 to-indigo-950 hover:from-slate-700 hover:to-indigo-850 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  Registrar Científico
                </button>
              </div>

              {/* Listado de Colaboradores de Laboratorio */}
              <div className="lg:col-span-7 bg-white p-4.5 rounded-xl border border-slate-150 flex flex-col justify-between text-left">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Colaboradores con Acceso</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {usersList.map((usr: any) => {
                      const isMaestro = usr.email === "admin@akolab.com";
                      return (
                        <div key={usr.email} className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors bg-slate-50/40">
                          <div className="mr-2 min-w-0 text-left">
                            <span className="text-xs font-bold text-slate-800 block truncate leading-tight capitalize">{usr.name}</span>
                            <span className="text-[10px] text-slate-450 font-mono block truncate">{usr.email}</span>
                            <span className="text-[9px] text-slate-400 block font-mono mt-0.5">Clave: {usr.password}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[8.5px] px-2 py-0.5 font-bold uppercase rounded-full border ${
                              usr.role === "general"
                                ? "bg-purple-50 text-purple-700 border-purple-250"
                                : usr.role === "ceo"
                                ? "bg-amber-50 text-amber-700 border-amber-250"
                                : "bg-blue-50 text-blue-700 border-blue-250"
                            }`}>
                              {usr.role === "general" ? "Administrador" : usr.role === "ceo" ? "CEO" : "Gerente"}
                            </span>
                            {!isMaestro && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(usr.email)}
                                className="p-1 px-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-lg transition-all"
                                title="Revocar permiso"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 leading-normal mt-4">
                  💡 <strong>Seguridad de Datos Criptográficos:</strong> Las contraseñas de las cuentas científicas actúan como PINs de derivación y se almacenan de forma segura para permitir cambios fluidos de perfil.
                </div>
              </div>
            </div>
          </div>
          </div>
          )}

          {/* TAB 5: COPIA DE SEGURIDAD */}
          {activeSettingsTab === "backup" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Emergency E2EE Backup & Recovery Section */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm text-left" id="emergency-backup-card">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">Copia de Seguridad y Recuperación de Emergencia</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Salvaguarda tus datos localmente en un archivo cifrado independiente de la nube</p>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex bg-slate-200/60 p-0.5 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setBackupTab("export")}
                  className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-all ${backupTab === "export" ? "bg-white text-slate-850 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Exportar Copia
                </button>
                <button
                  type="button"
                  onClick={() => setBackupTab("import")}
                  className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-all ${backupTab === "import" ? "bg-white text-slate-850 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Restaurar Copia
                </button>
              </div>
            </div>

            <div className="p-5">
              {backupTab === "export" ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 p-3.5 bg-indigo-50/30 border border-indigo-100/50 rounded-xl text-xs text-indigo-900">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">¿Cómo funciona la Exportación de Emergencia?</p>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Se compilará un archivo JSON que contiene todos tus registros clínicos actuales ({records.length} pacientes) y tu configuración de laboratorio. 
                        Toda esta información se encriptará localmente en tu propio navegador mediante criptografía simétrica <strong>AES-GCM de 256 bits</strong> de grado militar. 
                        Nadie podrá leer los datos sin la contraseña configurada a continuación.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-1.5">ID del Laboratorio</label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={exportLabId}
                          onChange={(e) => setExportLabId(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                          placeholder="demo-local"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-1.5">Contraseña de Cifrado del Backup</label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={exportPasscode}
                          onChange={(e) => setExportPasscode(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono font-bold text-slate-700"
                          placeholder="Contraseña de cifrado"
                        />
                      </div>
                    </div>
                  </div>

                  {exportSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-850 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> {exportSuccessMsg}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleGenerateExport}
                      disabled={isExporting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      {isExporting ? "Encriptando..." : "Descargar Backup Encriptado (.json)"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/40 border border-amber-100 rounded-xl text-xs text-amber-900">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Precaución de Recuperación de Emergencia</p>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Esta función te permite restaurar tu base de datos clínica completa usando un archivo previamente exportado. 
                        Puedes elegir entre <strong>Combinar</strong> los registros de la copia con los de este dispositivo (conservando los más nuevos), o 
                        <strong>Reemplazar</strong> todo el estado local con los datos del backup. Una vez realizada, los cambios se sincronizarán automáticamente con la nube.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-1.5">ID del Laboratorio original</label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={importLabId}
                          onChange={(e) => setImportLabId(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                          placeholder="demo-local"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-1.5">Contraseña de Cifrado original</label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={importPasscode}
                          onChange={(e) => setImportPasscode(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                          placeholder="Contraseña"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-1.5">Seleccionar Archivo de Respaldo</label>
                    <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-5 text-center transition-all cursor-pointer relative bg-slate-50/50">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <UploadCloud className="w-8 h-8 text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">
                          {selectedFile ? selectedFile.name : "Haga clic o arrastre el archivo de copia de seguridad aquí"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Formatos válidos: .json"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {decryptError && (
                    <div className="p-3 bg-red-50 border border-red-150 text-red-700 rounded-xl text-xs font-medium">
                      ⚠️ {decryptError}
                    </div>
                  )}

                  {restoreSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-850 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> {restoreSuccessMsg}
                    </div>
                  )}

                  {!decryptedPayload ? (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={handleDecryptImport}
                        disabled={isDecrypting || !selectedFile}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40"
                      >
                        {isDecrypting ? "Cargando y Descifrando..." : "Cargar y Descifrar Backup"}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold">¡Copia de seguridad descifrada con éxito!</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/80 p-3 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Datos del Laboratorio Encontrados</p>
                          <p className="font-bold text-slate-800 mt-0.5">{decryptedPayload.profile.labName || "Sin Nombre"}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">{decryptedPayload.profile.processedBy || "Sin firmas"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Pacientes Registrados</p>
                          <p className="font-bold text-slate-800 mt-0.5">{decryptedPayload.records.length} registros clínicos</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">Slogan: "{decryptedPayload.profile.slogan || "Sin slogan"}"</p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider">Modo de Restauración</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${restoreMode === "merge" ? "bg-indigo-50/40 border-indigo-200 text-indigo-900" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                            <input
                              type="radio"
                              name="restoreMode"
                              checked={restoreMode === "merge"}
                              onChange={() => setRestoreMode("merge")}
                              className="mt-0.5"
                            />
                            <div className="text-left">
                              <span className="text-xs font-bold block leading-tight">Combinar con Registros Locales</span>
                              <span className="text-[10px] text-slate-450 mt-0.5 block leading-normal">Une los registros de la copia con los del navegador de forma segura. Si hay duplicados, se conserva la versión más reciente.</span>
                            </div>
                          </label>

                          <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${restoreMode === "overwrite" ? "bg-indigo-50/40 border-indigo-200 text-indigo-900" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                            <input
                              type="radio"
                              name="restoreMode"
                              checked={restoreMode === "overwrite"}
                              onChange={() => setRestoreMode("overwrite")}
                              className="mt-0.5"
                            />
                            <div className="text-left">
                              <span className="text-xs font-bold block leading-tight">Reemplazar Base de Datos Completa</span>
                              <span className="text-[10px] text-slate-450 mt-0.5 block leading-normal">Elimina todo el estado clínico actual del navegador y lo reemplaza exactamente por el contenido del archivo de copia de seguridad.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setDecryptedPayload(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-750 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmRestore}
                          disabled={isRestoring}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                        >
                          {isRestoring ? "Restaurando..." : "Confirmar Restauración"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>



              {/* Database Diagnostics and Hosting Real-time Check */}
              <div className="mt-6">
                <DatabaseDiagnostics />
              </div>
            </div>
          )}

          <hr className="border-slate-200 mt-6" />

          {/* Feedback & Actions */}
          {errorStatus && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 block">
              {errorStatus}
            </div>
          )}

          {successStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Perfil guardado e implantado con éxito en la nube de forma cifrada.
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl cursor-pointer transition-all"
              id="cancel-profile-btn"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-tr from-slate-800 to-indigo-900 hover:from-slate-700 hover:to-indigo-800 text-white text-sm font-semibold rounded-xl cursor-pointer shadow-md shadow-indigo-900/10 transition-all disabled:opacity-50"
              id="save-profile-btn"
            >
              {isSaving ? "Guardando..." : <><Save className="w-4 h-4" /> Guardar Cambios</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
