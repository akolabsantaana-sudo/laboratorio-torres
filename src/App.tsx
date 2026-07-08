/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Shield, Key, Sparkles, Building2, UserCircle, RefreshCw, HelpCircle, Lock, X } from "lucide-react";

// Types
import { DecryptedLabRecord, DecryptedLabProfile, LabSettings } from "./types";

// Crypto
import { encryptData, decryptData, deriveAuthHash } from "./utils/crypto";

import { getAkoLogoBase64 } from "./utils/akoLogoSvg";

// Clinical & PDF utils
import { generateClinicalPDF } from "./utils/pdfGenerator";
import { CLINICAL_DEMO_RECORDS } from "./utils/demoData";

// Components
import LabAuth from "./components/LabAuth";
import LabProfileForm from "./components/LabProfileForm";
import ClinicalReportForm from "./components/ClinicalReportForm";
import ReportList from "./components/ReportList";
import PatientReceptionForm from "./components/PatientReceptionForm";
import Dashboard from "./components/Dashboard";

const DEFAULT_PROFILE: DecryptedLabProfile = {
  labName: "LABORATORIO CLÍNICO TORRES",
  address: "Catálogo Completo de Exámenes y Lista de Precios",
  phone: "74796040",
  email: "dricardo.torres23@gmail.com",
  customLogo: getAkoLogoBase64(), // Set gorgeous official colored logo by default!
  slogan: "Calidad y Precisión Diagnóstica",
  processedBy: "Dr. Ricardo Torres",
  processedByTitle: "Director Médico y Patólogo Clínico",
  processedByReg: "J.V.P.M. No. 12345",
  reportFooter: "Este reporte de laboratorio clínico constituye un estudio de apoyo diagnóstico primario. Recomendamos que todo resultado sea evaluado, correlacionado e interpretado exclusivamente por su médico tratante.",
  themeColor: "blue",
  examPrices: {
    // Categorías de aranceles predeterminados
    hemograma: 6,
    ego: 4,
    heces: 3,
    quimica_basica: 4,
    perfil_lipidico: 6,
    perfil_hepatico: 10,
    funcion_renal: 5,
    urocultivo: 15,
    coprocultivo: 15,
    cultivo_faringeo: 15,
    secreciones_varias: 15,
    espermograma: 25,
    miscelaneo: 10,

    // Exámenes individuales específicos predeterminados
    hemograma_completo: 6,
    general_orina: 4,
    general_heces: 3,
    glucosa_serica: 4,
    colesterol_tot: 5,
    trigliceridos_quim: 6,
    creatinina_serica: 5,
    acido_rico: 5,
    urocultivo_completo: 15,
    coprocultivo_completo: 15,
    cultivo_faringeo_completo: 15,
    cultivo_secrecion_completo: 15,
    espermograma_completo: 25,

    // Exámenes especializados
    gota_gruesa: 10,
    coombs_directo: 15,
    coombs_indirecto: 15,
    frotis_sangre: 20,
    conteo_plaquetas: 6,
    hemato_hemoglo: 6,
    factor_du: 6,
    vsg_eritrosedimentacion: 10,
    fibrinogeno: 12,
    tp: 15,
    tpt: 15,
    combo_tp_tpt: 15,
    combo_tp_tpt_fib: 20,
    embarazo_orina: 6,
    microalbuminuria: 20,
    factor_reumatoideo: 15,
    pcr_cuantitativa: 12,
    embarazo_serica_cual: 10,
    hcg_cuantitativa: 20,
    sifilis_rpr: 10,
    t3_total: 15,
    t4_total: 15,
    tsh_ultrasensible: 15,
    t3_libre: 12.5,
    t4_libre: 12.5,
    psa_total: 35,
    psa_libre: 35,
    ca125: 35,
    ca19_9: 40,
    ca15_3: 40,
    insulina: 40,
    combo_insulina: 54,
    cea: 30,
    cortisol_am: 60,
    cortisol_pm: 60,
    combo_cortisol: 60,
    alfafetoproteina: 30,
    testosterona: 35,
    vitamina_d: 45,
    combo_t4_t3_tsh_tot: 35,
    combo_t4_t3_tsh_lib: 35,
    concentrado_heces: 15,
    pam: 10,
    sangre_oculta_heces: 10,
    rotavirus: 20,
    helicobacter_pylori: 25,
    sodio_serico: 15,
    sodio_orina: 15,
    sodio_orina_24h: 15,
    potasio_serico: 15,
    potasio_orina: 15,
    potasio_orina_24h: 15,
    cloro_serico: 15,
    cloro_orina: 15,
    cloro_orina_24h: 15,
    calcio_serico: 15,
    calcio_orina: 15,
    calcio_orina_24h: 15,
    magnesio_serico: 15,
    magnesio_orina: 15,
    fosforo_serico: 15,
    fosforo_orina: 15,
    combo_sodio_potasio: 15,
    combo_sodio_potasio_cloro: 25,
    combo_sodio_potasio_cloro_calcio: 25,
    albumina_serica: 6,
    amilasa_serica: 10,
    combo_bilirrubinas: 8,
    colesterol_hdl: 6,
    colesterol_ldl: 6,
    colesterol_vldl: 3.75,
    cpk_mb: 15,
    cpk_total: 15,
    depuracion_creatinina_24h: 15,
    ldh: 30,
    ggt: 30,
    fosfatasa_alcalina: 10,
    hba1c_quim_av: 18,
    hierro_serico: 15,
    lipidos_totales: 20,
    lipasa_serica: 15,
    bun_serico: 5,
    bun_orina: 5,
    proteinas_totales: 10,
    relacion_alb_glob: 10,
    tgo_ast: 6,
    tgp_alt: 6,
    combo_tgo_bil_tgp: 15,
    combo_perfil_lipidico_full: 14
  }
};

export default function App() {
  const [labSettings, setLabSettings] = useState<LabSettings>({
    labId: "",
    passcode: "",
    isLoggedIn: false,
    derivedAuthHash: "",
    profile: { ...DEFAULT_PROFILE }
  });

  const [records, setRecords] = useState<DecryptedLabRecord[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; role: "general" | "ceo" | "gerente" } | null>(null);
  const [activeView, setActiveView] = useState<"auth" | "list" | "form" | "settings" | "reception" | "dashboard">("auth");
  const [currentEditingRecord, setCurrentEditingRecord] = useState<DecryptedLabRecord | null>(null);
  const [autoOpenVignetteForRecord, setAutoOpenVignetteForRecord] = useState<DecryptedLabRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [showGlobalError, setShowGlobalError] = useState(true);
  const syncInProgressRef = useRef(false);

  // Auto-reveal banner whenever a new central sync message occurs
  useEffect(() => {
    if (globalError) {
      setShowGlobalError(true);
    }
  }, [globalError]);

  // Restore session from localStorage on startup (User Convenience)
  useEffect(() => {
    const cachedSettings = localStorage.getItem("labsync_settings_v1");
    const cachedDemoRecords = localStorage.getItem("labsync_records_demo_v1");
    const cachedUser = localStorage.getItem("labsync_current_user_v1");

    if (cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        
        // Ensure ONLY this unique user is logged in
        const allowedEmails = ["akolabsantaana@gmail.com", "dricardo.torres23@gmail.com"];
        if (!allowedEmails.includes(parsedUser.email.trim().toLowerCase())) {
          console.log("[Auth Restriction] Session cleared for unauthorized user");
          localStorage.removeItem("labsync_current_user_v1");
          localStorage.removeItem("labsync_settings_v1");
          setCurrentUser(null);
          setLabSettings(null);
          setIsDemo(false);
          setActiveView("list");
          return;
        }

        setCurrentUser(parsedUser);

        if (cachedSettings) {
          const parsed = JSON.parse(cachedSettings) as LabSettings;
          
          // Auto-heal cached session passcode if it was saved as lowercase or using the old default 'AKO12345'
          const needsHealing = parsed.passcode && (
            parsed.passcode === "AKO12345" ||
            parsed.passcode === "ako12345" ||
            parsed.passcode === "ako123456" ||
            (parsed.passcode.toLowerCase() === "ako1234" && parsed.passcode !== "AKO1234")
          );
          
          if (needsHealing) {
            console.log("[Session Healing] Upgrading restored passcode to canonical uppercase AKO1234...");
            parsed.passcode = "AKO1234";
            deriveAuthHash(parsed.labId, "AKO1234").then(authHash => {
              parsed.derivedAuthHash = authHash;
              setLabSettings(parsed);
              setIsDemo(false);
              setActiveView("list");
              localStorage.setItem("labsync_settings_v1", JSON.stringify(parsed));
              syncOnlineDatabase(parsed.labId, "AKO1234", authHash);
            }).catch(() => {
              setLabSettings(parsed);
              setIsDemo(false);
              setActiveView("list");
              syncOnlineDatabase(parsed.labId, parsed.passcode, parsed.derivedAuthHash);
            });
          } else {
            setLabSettings(parsed);
            setIsDemo(false);
            setActiveView("list");
            // Fetch and decrypt online database
            syncOnlineDatabase(parsed.labId, parsed.passcode, parsed.derivedAuthHash);
          }
        } else if (cachedDemoRecords) {
          const parsedRecords = JSON.parse(cachedDemoRecords) as DecryptedLabRecord[];
          setRecords(parsedRecords);
          setIsDemo(true);
          setActiveView("list");

          // Restore demo profile if exists
          const cachedDemoProfile = localStorage.getItem("labsync_profile_demo_v1");
          if (cachedDemoProfile) {
            const profile = JSON.parse(cachedDemoProfile) as DecryptedLabProfile;
            setLabSettings(prev => ({
              ...prev,
              isLoggedIn: true,
              isDemo: true,
              profile
            } as any));
          } else {
            setLabSettings(prev => ({
              ...prev,
              isLoggedIn: true,
              isDemo: true,
              profile: { ...DEFAULT_PROFILE }
            } as any));
          }
        } else {
          setActiveView("auth");
        }
      } catch (err) {
        console.warn("Could not parse cached session:", err);
        setActiveView("auth");
      }
    } else {
      setActiveView("auth");
    }
  }, []);

  // Primary function to fetch, decrypt, and load data from the synchronization node
  const syncOnlineDatabase = async (labId: string, passcode: string, authHash: string) => {
    if (syncInProgressRef.current) {
      console.log("[Sync] Synchronization already in progress, bypassing duplicate parallel call.");
      return;
    }
    syncInProgressRef.current = true;
    setIsSyncing(true);
    setGlobalError("");
    
    try {
      const headers = {
        "x-lab-id": labId,
        "x-auth-hash": authHash
      };

      // 1. Process Offline Deletions (Tombstones)
      const tombstoneKey = `labsync_deleted_records_${labId}`;
      const deletedIdsStr = localStorage.getItem(tombstoneKey);
      const deletedIds: string[] = deletedIdsStr ? JSON.parse(deletedIdsStr) : [];
      
      if (deletedIds.length > 0) {
        console.log(`[Sync] Found ${deletedIds.length} offline-deleted records. Syncing deletions to server...`);
        const remainingTombstones: string[] = [];
        for (const recordId of deletedIds) {
          try {
            const delRes = await fetch(`/api/records/${recordId}`, {
              method: "DELETE",
              headers
            });
            if (!delRes.ok && delRes.status !== 404) {
              remainingTombstones.push(recordId);
            }
          } catch (delErr) {
            console.warn(`[Sync] Failed to delete record ${recordId} from server:`, delErr);
            remainingTombstones.push(recordId);
          }
        }
        if (remainingTombstones.length > 0) {
          localStorage.setItem(tombstoneKey, JSON.stringify(remainingTombstones));
        } else {
          localStorage.removeItem(tombstoneKey);
        }
      }

      // 2. Fetch encrypted profile settings and perform Bidirectional Profile Sync
      const cachedProfileStr = localStorage.getItem(`labsync_profile_${labId}_backup`);
      let localProfile: any = null;
      if (cachedProfileStr) {
        try {
          localProfile = JSON.parse(cachedProfileStr);
        } catch {}
      }

      const profileRes = await fetch(`/api/profile?t=${Date.now()}`, { headers, cache: "no-store" });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        
        let serverProfileObj = null;
        if (profileData && profileData.encryptedProfile) {
          try {
            serverProfileObj = await decryptData(profileData.encryptedProfile, passcode, labId);
          } catch {
            // Unconditional fallbacks for robust decrypting regardless of current passcode casing
            if (!serverProfileObj && passcode !== "AKO1234") {
              try {
                serverProfileObj = await decryptData(profileData.encryptedProfile, "AKO1234", labId);
              } catch {}
            }
            if (!serverProfileObj && passcode !== "ako1234") {
              try {
                serverProfileObj = await decryptData(profileData.encryptedProfile, "ako1234", labId);
              } catch {}
            }
            if (!serverProfileObj && passcode !== "AKO12345") {
              try {
                serverProfileObj = await decryptData(profileData.encryptedProfile, "AKO12345", labId);
              } catch {}
            }
            if (!serverProfileObj && passcode !== "ako12345") {
              try {
                serverProfileObj = await decryptData(profileData.encryptedProfile, "ako12345", labId);
              } catch {}
            }
            if (!serverProfileObj && passcode !== "ako123456") {
              try {
                serverProfileObj = await decryptData(profileData.encryptedProfile, "ako123456", labId);
              } catch {}
            }
          }
        }

        // Compare timestamps to find newest profile version
        if (localProfile && localProfile.updatedAt && serverProfileObj && serverProfileObj.updatedAt) {
          const localTime = new Date(localProfile.updatedAt).getTime();
          const serverTime = new Date(serverProfileObj.updatedAt).getTime();
          
          if (localTime > serverTime) {
            console.log("[Sync] Local profile is newer than server profile. Uploading local profile...");
            const encryptedProfileStr = await encryptData(localProfile, passcode, labId);
            await fetch("/api/profile", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...headers
              },
              body: JSON.stringify({ encryptedProfile: encryptedProfileStr })
            });
            setLabSettings(prev => ({ ...prev, profile: localProfile }));
          } else {
            setLabSettings(prev => ({ ...prev, profile: serverProfileObj }));
            localStorage.setItem(`labsync_profile_${labId}_backup`, JSON.stringify(serverProfileObj));
          }
        } else if (serverProfileObj) {
          setLabSettings(prev => ({ ...prev, profile: serverProfileObj }));
          localStorage.setItem(`labsync_profile_${labId}_backup`, JSON.stringify(serverProfileObj));
        } else if (localProfile) {
          console.log("[Sync] Server profile is empty. Syncing local profile up...");
          if (!localProfile.updatedAt) {
            localProfile.updatedAt = new Date().toISOString();
          }
          const encryptedProfileStr = await encryptData(localProfile, passcode, labId);
          await fetch("/api/profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers
            },
            body: JSON.stringify({ encryptedProfile: encryptedProfileStr })
          });
          setLabSettings(prev => ({ ...prev, profile: localProfile }));
        } else {
          // Both empty, upload default
          const defaultProfileWithTime = { ...DEFAULT_PROFILE, updatedAt: new Date().toISOString() };
          const encryptedProfileStr = await encryptData(defaultProfileWithTime, passcode, labId);
          await fetch("/api/profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers
            },
            body: JSON.stringify({ encryptedProfile: encryptedProfileStr })
          });
          setLabSettings(prev => ({ ...prev, profile: defaultProfileWithTime }));
          localStorage.setItem(`labsync_profile_${labId}_backup`, JSON.stringify(defaultProfileWithTime));
        }
      } else {
        // Fallback to local profile cache if profile GET fails
        if (localProfile) {
          setLabSettings(prev => ({
            ...prev,
            profile: localProfile
          }));
        }
      }

      // 3. Fetch encrypted patient records and perform Bidirectional Records Sync
      const recordsRes = await fetch(`/api/records?t=${Date.now()}`, { headers, cache: "no-store" });
      if (!recordsRes.ok) {
        let errorMsg = "No se pudo descargar el registro de resultados.";
        try {
          const errPayload = await recordsRes.json();
          if (errPayload && errPayload.error) {
            errorMsg = errPayload.error;
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const recordsData = await recordsRes.json();
      const serverRecords = recordsData.records || [];

      // Decrypt all server records with intelligent fallback recovery keys
      const decryptedServerList: DecryptedLabRecord[] = [];
      
      for (const item of serverRecords) {
        let decObj = null;

        // Try current passcode
        try {
          decObj = await decryptData(item.encryptedData, passcode, labId);
        } catch {}

        // Fallback passcodes (unconditional to avoid casing logic bugs)
        if (!decObj && passcode !== "AKO1234") {
          try {
            decObj = await decryptData(item.encryptedData, "AKO1234", labId);
          } catch {}
        }
        if (!decObj && passcode !== "ako1234") {
          try {
            decObj = await decryptData(item.encryptedData, "ako1234", labId);
          } catch {}
        }
        if (!decObj && passcode !== "AKO12345") {
          try {
            decObj = await decryptData(item.encryptedData, "AKO12345", labId);
          } catch {}
        }
        if (!decObj && passcode !== "ako12345") {
          try {
            decObj = await decryptData(item.encryptedData, "ako12345", labId);
          } catch {}
        }
        if (!decObj && passcode !== "ako123456") {
          try {
            decObj = await decryptData(item.encryptedData, "ako123456", labId);
          } catch {}
        }

        if (decObj) {
          decryptedServerList.push({
            ...decObj,
            id: item.id,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            isSynced: true
          });
        }
      }

      // Read local records backup to check for any offline modifications
      const cachedRecordsStr = localStorage.getItem(`labsync_records_${labId}_backup`);
      const localRecordsList: DecryptedLabRecord[] = cachedRecordsStr ? JSON.parse(cachedRecordsStr) : [];

      const serverRecordMap = new Map(decryptedServerList.map(r => [r.id, r]));
      const localRecordMap = new Map(localRecordsList.map(r => [r.id, r]));

      const recordsToUpload: DecryptedLabRecord[] = [];
      const finalMergedRecords: DecryptedLabRecord[] = [];

      // Detect newly created offline records or locally newer updates
      for (const localRec of localRecordsList) {
        const serverRec = serverRecordMap.get(localRec.id);
        if (!serverRec) {
          // If the record was previously synced, and now it's missing from the server,
          // it means another device deleted it from the server!
          // We MUST NOT upload it back (which undoes the deletion), we must delete it locally!
          if (localRec.isSynced) {
            console.log(`[Sync] Record ${localRec.id} was deleted on server, removing locally.`);
            // Bypassing finalMergedRecords.push(localRec) deletes it locally
          } else {
            // Created offline! Needs upload
            recordsToUpload.push(localRec);
            finalMergedRecords.push(localRec);
          }
        } else {
          // Compare updatedAt timestamps to find newest edit
          const localTime = localRec.updatedAt ? new Date(localRec.updatedAt).getTime() : 0;
          const serverTime = serverRec.updatedAt ? new Date(serverRec.updatedAt).getTime() : 0;

          if (localTime > serverTime + 1000) { // 1 second threshold to prevent slight drift loops
            recordsToUpload.push(localRec);
            finalMergedRecords.push({ ...localRec, isSynced: true });
          } else {
            // Server is newer or equal, keep server version
            finalMergedRecords.push({ ...serverRec, isSynced: true });
          }
        }
      }

      // Add any records that exist on server but not in local (created on another device)
      for (const serverRec of decryptedServerList) {
        if (!localRecordMap.has(serverRec.id)) {
          finalMergedRecords.push({ ...serverRec, isSynced: true });
        }
      }

      // Upload newer or newly created offline records to the server
      if (recordsToUpload.length > 0) {
        console.log(`[Sync] Uploading ${recordsToUpload.length} locally newer or offline records to server...`);
        for (const rec of recordsToUpload) {
          try {
            const encryptedDataStr = await encryptData(rec, passcode, labId);
            await fetch("/api/records", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...headers
              },
              body: JSON.stringify({
                id: rec.id,
                encryptedData: encryptedDataStr
              })
            });
            rec.isSynced = true;
          } catch (uploadErr) {
            console.warn(`[Sync] Failed to upload record ${rec.id}:`, uploadErr);
          }
        }
      }

      // Sort final merged list by exam date descending
      finalMergedRecords.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
      
      // Save local backup cache for robust offline survival on subsequent edits
      localStorage.setItem(`labsync_records_${labId}_backup`, JSON.stringify(finalMergedRecords));
      setRecords(finalMergedRecords);

    } catch (err: any) {
      console.warn("Sync failed, falling back to local client-side cache to protect user experience:", err);
      // Fallback: Restore client-side local backup if available so they see previous data
      const cachedBackup = localStorage.getItem(`labsync_records_${labId}_backup`);
      if (cachedBackup) {
        try {
          const parsed = JSON.parse(cachedBackup);
          setRecords(parsed);
        } catch {}
      }
      setGlobalError(err.message || "Fallo temporal al conectar con el servidor central.");
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  };

  // Background periodic synchronization (Autosync every 4 seconds to keep devices aligned instantly)
  useEffect(() => {
    if (!labSettings.isLoggedIn || isDemo || !labSettings.labId || !labSettings.derivedAuthHash) {
      return;
    }

    const intervalId = setInterval(() => {
      console.log("[Autosync] Synchronizing in the background to align all devices...");
      syncOnlineDatabase(labSettings.labId, labSettings.passcode, labSettings.derivedAuthHash);
    }, 4000); // 4 seconds

    return () => clearInterval(intervalId);
  }, [labSettings.isLoggedIn, isDemo, labSettings.labId, labSettings.passcode, labSettings.derivedAuthHash]);

  // Event handlers
  const handleLoginSuccess = async (
    labId: string, 
    passcode: string, 
    user: { email: string; name: string; role: "general" | "ceo" | "gerente" }
  ) => {
    setIsDemo(false);
    setGlobalError("");
    setCurrentUser(user);
    localStorage.setItem("labsync_current_user_v1", JSON.stringify(user));
    
    try {
      const authHash = await deriveAuthHash(labId, passcode);
      const activeSettings: LabSettings = {
        labId,
        passcode,
        isLoggedIn: true,
        derivedAuthHash: authHash,
        profile: { 
          ...DEFAULT_PROFILE, 
          labName: (labId.toLowerCase().includes("ako") || labId.toLowerCase() === "demo-local") 
            ? "AKO LABORATORIO CLÍNICO" 
            : `LABORATORIO ${labId.toUpperCase()}`
        }
      };

      setLabSettings(activeSettings);
      localStorage.setItem("labsync_settings_v1", JSON.stringify(activeSettings));
      localStorage.removeItem("labsync_records_demo_v1"); // clean demo variables

      setActiveView("list");
      
      // Perform initial cloud pull
      await syncOnlineDatabase(labId, passcode, authHash);
    } catch (err) {
      console.warn("Crypto derivation error:", err);
      setGlobalError("Fallo catastrófico al derivar claves criptográficas.");
    }
  };

  const handleEnterDemoMode = () => {
    setIsDemo(true);
    localStorage.removeItem("labsync_settings_v1");

    const demoUser = { email: "admin@akolab.com", name: "Administrador General (Demo)", role: "general" as const };
    setCurrentUser(demoUser);
    localStorage.setItem("labsync_current_user_v1", JSON.stringify(demoUser));

    const cachedDemo = localStorage.getItem("labsync_records_demo_v1");
    if (cachedDemo) {
      try {
        setRecords(JSON.parse(cachedDemo));
      } catch {
        setRecords([]);
      }
    } else {
      // Preseed with realistic records
      setRecords(CLINICAL_DEMO_RECORDS);
      localStorage.setItem("labsync_records_demo_v1", JSON.stringify(CLINICAL_DEMO_RECORDS));
    }

    const demoProfile = { ...DEFAULT_PROFILE };
    setLabSettings({
      labId: "demo-local",
      passcode: "demo-local-secret",
      isLoggedIn: true,
      derivedAuthHash: "demo",
      profile: demoProfile
    });
    localStorage.setItem("labsync_profile_demo_v1", JSON.stringify(demoProfile));

    setActiveView("list");
  };

  const handleLogout = () => {
    localStorage.removeItem("labsync_settings_v1");
    localStorage.removeItem("labsync_records_demo_v1");
    localStorage.removeItem("labsync_profile_demo_v1");
    localStorage.removeItem("labsync_current_user_v1");
    
    setCurrentUser(null);
    setLabSettings({
      labId: "",
      passcode: "",
      isLoggedIn: false,
      derivedAuthHash: "",
      profile: { ...DEFAULT_PROFILE }
    });
    setRecords([]);
    setIsDemo(false);
    setActiveView("auth");
  };

  const handleSaveProfile = async (updatedProfile: DecryptedLabProfile) => {
    const profileWithTime = {
      ...updatedProfile,
      updatedAt: new Date().toISOString()
    };

    if (isDemo) {
      // Offline Local demo save
      setLabSettings(prev => {
        const update = { ...prev, profile: profileWithTime };
        localStorage.setItem("labsync_profile_demo_v1", JSON.stringify(profileWithTime));
        return update;
      });
      return;
    }

    // Cloud synchronized E2EE save
    try {
      const encryptedProfileStr = await encryptData(profileWithTime, labSettings.passcode, labSettings.labId);
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lab-id": labSettings.labId,
          "x-auth-hash": labSettings.derivedAuthHash
        },
        body: JSON.stringify({ encryptedProfile: encryptedProfileStr })
      });

      if (!res.ok) {
        throw new Error("No se pudo guardar la configuración de membrete en el servidor.");
      }

      setLabSettings(prev => ({
        ...prev,
        profile: profileWithTime
      }));

      // Cache settings locally too to speed up next logins
      localStorage.setItem("labsync_settings_v1", JSON.stringify({
        ...labSettings,
        profile: profileWithTime
      }));
      localStorage.setItem(`labsync_profile_${labSettings.labId}_backup`, JSON.stringify(profileWithTime));

    } catch (err: any) {
      console.warn("Cloud profile save failed, using local caching to insulate experience:", err);
      // Fallback local persistence
      setLabSettings(prev => ({
        ...prev,
        profile: profileWithTime
      }));
      localStorage.setItem(`labsync_profile_${labSettings.labId}_backup`, JSON.stringify(profileWithTime));
      localStorage.setItem("labsync_settings_v1", JSON.stringify({
        ...labSettings,
        profile: profileWithTime
      }));
    }
  };

  const handleImportBackup = async (importedProfile: DecryptedLabProfile, finalRecords: DecryptedLabRecord[]) => {
    // 1. Update Profile in state and localStorage
    setLabSettings(prev => {
      const updated = {
        ...prev,
        profile: importedProfile
      };
      if (isDemo) {
        localStorage.setItem("labsync_profile_demo_v1", JSON.stringify(importedProfile));
      } else {
        localStorage.setItem(`labsync_profile_${prev.labId}_backup`, JSON.stringify(importedProfile));
        localStorage.setItem("labsync_settings_v1", JSON.stringify(updated));
      }
      return updated;
    });

    // 2. Set records state and local storage
    setRecords(finalRecords);
    if (isDemo) {
      localStorage.setItem("labsync_records_demo_v1", JSON.stringify(finalRecords));
    } else {
      localStorage.setItem(`labsync_records_${labSettings.labId}_backup`, JSON.stringify(finalRecords));
    }

    // 3. Trigger server push / online synchronization if not in demo mode
    if (!isDemo && labSettings.isLoggedIn && labSettings.labId) {
      console.log("[Backup Restore] Triggering background synchronization to upload restored data to cloud database...");
      try {
        // Push the restored profile to server
        const encryptedProfileStr = await encryptData(importedProfile, labSettings.passcode, labSettings.labId);
        await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-lab-id": labSettings.labId,
            "x-auth-hash": labSettings.derivedAuthHash
          },
          body: JSON.stringify({ encryptedProfile: encryptedProfileStr })
        });
      } catch (err) {
        console.warn("[Backup Restore] Failed to sync restored profile directly, syncOnlineDatabase will retry:", err);
      }
      // syncOnlineDatabase will automatically check for any records with isSynced = false and push them
      await syncOnlineDatabase(labSettings.labId, labSettings.passcode, labSettings.derivedAuthHash);
    }
  };

  const handleSaveRecord = async (decRecord: DecryptedLabRecord) => {
    if (activeView === "reception") {
      setAutoOpenVignetteForRecord(decRecord);
    }

    // Assign consistent updatedAt timestamp for multi-device sync
    let finalRecord = { 
      ...decRecord,
      updatedAt: new Date().toISOString()
    };

    if (isDemo) {
      // Local Demo array save
      let newList = [...records];
      const matchIndex = newList.findIndex(r => r.id === finalRecord.id);

      if (matchIndex > -1) {
        newList[matchIndex] = finalRecord;
      } else {
        newList.unshift(finalRecord);
      }

      setRecords(newList);
      localStorage.setItem("labsync_records_demo_v1", JSON.stringify(newList));
      if (activeView !== "reception") {
        setActiveView("list");
      }
      return;
    }

    // Cloud synchronized E2EE save
    try {
      const encryptedDataStr = await encryptData(finalRecord, labSettings.passcode, labSettings.labId);
      
      const res = await fetch("/api/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lab-id": labSettings.labId,
          "x-auth-hash": labSettings.derivedAuthHash
        },
        body: JSON.stringify({
          id: finalRecord.id,
          encryptedData: encryptedDataStr
        })
      });

      if (!res.ok) {
        throw new Error("No se pudo guardar ni sincronizar el registro.");
      }

      // Mark as synced!
      finalRecord.isSynced = true;

      // Update state and local storage backup right away to avoid delay/concurrency races
      let newList = [...records];
      const matchIndex = newList.findIndex(r => r.id === finalRecord.id);
      if (matchIndex > -1) {
        newList[matchIndex] = finalRecord;
      } else {
        newList.unshift(finalRecord);
      }
      setRecords(newList);
      localStorage.setItem(`labsync_records_${labSettings.labId}_backup`, JSON.stringify(newList));

      // Re-trigger database pull to guarantee consistency
      await syncOnlineDatabase(labSettings.labId, labSettings.passcode, labSettings.derivedAuthHash);
      if (activeView !== "reception") {
        setActiveView("list");
      }

    } catch (err: any) {
      console.warn("Cloud save failed, falling back to local fallback to protect user data:", err);
      
      // PERSIST LOCALLY FOR REGISTERED LAB (Offline survival & local backup mode)
      let newList = [...records];
      const matchIndex = newList.findIndex(r => r.id === finalRecord.id);
      
      if (matchIndex > -1) {
        newList[matchIndex] = finalRecord;
      } else {
        newList.unshift(finalRecord);
      }
      
      setRecords(newList);
      
      // Cache locally
      localStorage.setItem(`labsync_records_${labSettings.labId}_backup`, JSON.stringify(newList));
      setGlobalError("Fallo de conexión al servidor. Se han guardado tus cambios localmente en este navegador. Puedes seguir consultando, registrando resultados y descargando tus PDFs sin problemas.");
      if (activeView !== "reception") {
        setActiveView("list");
      }
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (isDemo) {
      // Local demo array delete
      const updated = records.filter(r => r.id !== recordId);
      setRecords(updated);
      localStorage.setItem("labsync_records_demo_v1", JSON.stringify(updated));
      return;
    }

    // Filter local records immediately for instant UI response
    const filteredRecords = records.filter(r => r.id !== recordId);
    setRecords(filteredRecords);
    localStorage.setItem(`labsync_records_${labSettings.labId}_backup`, JSON.stringify(filteredRecords));

    // Cloud delete
    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: "DELETE",
        headers: {
          "x-lab-id": labSettings.labId,
          "x-auth-hash": labSettings.derivedAuthHash
        }
      });

      if (!res.ok) {
        throw new Error("Fallo al eliminar el registro en la nube.");
      }
    } catch (err: any) {
      console.warn("Delete cloud record error, adding to offline deletion queue (tombstones):", err);
      // Queue tombstone
      const tombstoneKey = `labsync_deleted_records_${labSettings.labId}`;
      const deletedIdsStr = localStorage.getItem(tombstoneKey);
      const deletedIds: string[] = deletedIdsStr ? JSON.parse(deletedIdsStr) : [];
      if (!deletedIds.includes(recordId)) {
        deletedIds.push(recordId);
        localStorage.setItem(tombstoneKey, JSON.stringify(deletedIds));
      }
    }
  };

  const handleDownloadPDF = (
    record: DecryptedLabRecord,
    targetExamId?: string,
    targetExamName?: string,
    chemistryLayout?: "compact" | "continuous" | "individual",
    action: "download" | "print" = "download"
  ) => {
    try {
      const pdf = generateClinicalPDF(record, labSettings.profile, targetExamId, chemistryLayout);
      const safeName = record.patientName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
      let suffix = "";
      if (targetExamName) {
        suffix = `_${targetExamName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      } else if (chemistryLayout) {
        suffix = `_quimicas_${chemistryLayout}`;
      }

      if (action === "print") {
        const blob = pdf.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        const newWindow = window.open(blobUrl, "_blank");
        if (newWindow) {
          newWindow.focus();
        } else {
          pdf.save(`Resultado_Lab_${safeName}${suffix}.pdf`);
          alert("La ventana emergente para imprimir fue bloqueada por el navegador. El archivo PDF se ha descargado de forma automática.");
        }
      } else {
        pdf.save(`Resultado_Lab_${safeName}${suffix}.pdf`);
      }
    } catch (err) {
      console.warn("PDF operation failed:", err);
      alert("Error al generar el archivo de reporte PDF.");
    }
  };

  const handleLoadDemoData = () => {
    setRecords(CLINICAL_DEMO_RECORDS);
    localStorage.setItem("labsync_records_demo_v1", JSON.stringify(CLINICAL_DEMO_RECORDS));
  };

  const handleManualSync = async () => {
    await syncOnlineDatabase(labSettings.labId, labSettings.passcode, labSettings.derivedAuthHash);
  };

  // Switch View controllers
  const renderContentView = () => {
    switch (activeView) {
      case "list":
        return (
          <ReportList
            records={records}
            autoOpenVignette={autoOpenVignetteForRecord}
            onClearAutoOpenVignette={() => setAutoOpenVignetteForRecord(null)}
            onAddRecord={() => {
              setCurrentEditingRecord(null);
              setActiveView("form");
            }}
            onEditRecord={(record) => {
              setCurrentEditingRecord(record);
              setActiveView("form");
            }}
            onDeleteRecord={handleDeleteRecord}
            onDownloadPDF={handleDownloadPDF}
            onOpenSettings={() => setActiveView("settings")}
            onLogout={handleLogout}
            onLoadDemoData={handleLoadDemoData}
            labId={labSettings.labId}
            isDemo={isDemo}
            onSync={handleManualSync}
            isSyncing={isSyncing}
            userRole={currentUser?.role}
            profile={labSettings.profile}
          />
        );
      case "form":
        return (
          <ClinicalReportForm
            initialRecord={currentEditingRecord}
            onSave={handleSaveRecord}
            onDownloadPDF={handleDownloadPDF}
            onCancel={() => {
              setCurrentEditingRecord(null);
              setActiveView("list");
            }}
            profile={labSettings.profile}
            records={records}
          />
        );
      case "settings":
        return (
          <LabProfileForm
            initialProfile={labSettings.profile}
            onSaveProfile={handleSaveProfile}
            onCancel={() => setActiveView("list")}
            records={records}
            onImportBackup={handleImportBackup}
            currentLabId={labSettings.labId}
            currentPasscode={labSettings.passcode}
          />
        );
      case "reception":
        return (
          <PatientReceptionForm
            profile={labSettings.profile}
            onSave={handleSaveRecord}
            onCancel={() => setActiveView("list")}
          />
        );
      case "dashboard":
        return (
          <Dashboard
            records={records}
            onBack={() => setActiveView("list")}
          />
        );
      default:
        return null;
    }
  };

  // If not logged in, render the login shield first
  if (activeView === "auth" || !labSettings.isLoggedIn) {
    return (
      <LabAuth
        onLoginSuccess={handleLoginSuccess}
        onEnterDemoMode={handleEnterDemoMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-0 pb-12 font-sans overflow-y-auto" id="app-main-layout">
      {/* Visual Navigation Header Banner */}
      <nav className="bg-[#1e293b] text-white shadow-md border-b border-indigo-950/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo and sync badge */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-teal-400 to-emerald-500 p-1.5 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-950" />
              </div>
              <span className="font-extrabold text-xs sm:text-sm tracking-tight uppercase">
                SISTEMA DE <span className="text-blue-400">LABORATORIO TORRES</span>
              </span>
              <span className="h-4 w-px bg-slate-700 hidden sm:inline" />
              
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 max-w-[140px] truncate">
                  {labSettings.profile.labName}
                </span>
                
                {isDemo ? (
                  <span className="inline-flex items-center text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                    Demo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-teal-400 px-2 py-0.5 rounded-full font-bold">
                    Cifrado
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Modes Trigger Widget */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveView("list");
                  if (!isDemo && labSettings.isLoggedIn && labSettings.labId && labSettings.derivedAuthHash) {
                    syncOnlineDatabase(labSettings.labId, labSettings.passcode, labSettings.derivedAuthHash);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeView === "list" || activeView === "form" ? "bg-teal-650 text-white shadow-md font-extrabold" : "text-slate-300 hover:text-white"}`}
              >
                🔬 Laboratorio
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentEditingRecord(null);
                  setActiveView("reception");
                  if (!isDemo && labSettings.isLoggedIn && labSettings.labId && labSettings.derivedAuthHash) {
                    syncOnlineDatabase(labSettings.labId, labSettings.passcode, labSettings.derivedAuthHash);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeView === "reception" ? "bg-teal-650 text-white shadow-md font-extrabold" : "text-slate-300 hover:text-white"}`}
              >
                📥 Recepción
              </button>
              <button
                type="button"
                onClick={() => setActiveView("dashboard")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeView === "dashboard" ? "bg-teal-650 text-white shadow-md font-extrabold" : "text-slate-300 hover:text-white"}`}
              >
                📈 Estadísticas
              </button>
              <button
                type="button"
                onClick={() => setActiveView("settings")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeView === "settings" ? "bg-teal-650 text-white shadow-md font-extrabold" : "text-slate-300 hover:text-white"}`}
              >
                ⚙️ Configuración
              </button>
            </div>

            {/* Sync trigger & connection status */}
            <div className="flex items-center gap-3">
              {!isDemo && (
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleManualSync}
                  className="flex items-center justify-center h-8.5 w-8.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  title="Resincronizar base cifrada"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                </button>
              )}
              
              <div className="flex items-center gap-2 text-slate-300 pl-2">
                <UserCircle className="w-5 h-5 text-teal-400" />
                <span className="text-xs font-bold font-mono tracking-wide max-w-28 truncate capitalize">
                  {labSettings.labId}
                </span>
              </div>
            </div>

          </div>
        </div>
      </nav>



      {/* Primary Workspace Stage */}
      <main className="flex-grow pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {renderContentView()}
        </div>
      </main>

    </div>
  );
}
