import React, { useState, useEffect } from "react";
import { 
  Search, FileDown, Edit, Trash2, UserPlus, Database, CloudOff, Cloud, 
  Settings, Key, LogOut, Loader2, RefreshCw, AlertCircle, Sparkles, AlertTriangle,
  FolderHeart, MessageCircle, DollarSign, Receipt, BarChart3, TrendingUp, Calendar,
  Clock, CheckCircle, Wallet, Tag, Printer
} from "lucide-react";
import { DecryptedLabRecord, DecryptedLabProfile } from "../types";
import { calculateAgeDescription } from "../utils/clinicalCalculations";
import PatientExpedientes from "./PatientExpedientes";
import { AVAILABLE_EXAMS, getMetricIdsForExam, getActiveExamsList } from "./PatientReceptionForm";
import VignetteGenerator from "./VignetteGenerator";

const formatHour12 = (isoString?: string): string => {
  if (!isoString) return "--:--";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "--:--";
    let hr = d.getHours();
    const min = d.getMinutes().toString().padStart(2, "0");
    const ampm = hr >= 12 ? "PM" : "AM";
    hr = hr % 12;
    hr = hr ? hr : 12;
    return `${hr.toString().padStart(2, "0")}:${min} ${ampm}`;
  } catch {
    return "--:--";
  }
};

const calculateTurnaround = (startIso?: string, endIso?: string): { minutes: number; text: string } | null => {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 0) return { minutes: 0, text: "0 min" };
  if (diffMins < 60) {
    return { minutes: diffMins, text: `${diffMins} min` };
  } else {
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return { minutes: diffMins, text: `${h}h ${m}m` };
  }
};

interface ReportListProps {
  records: DecryptedLabRecord[];
  autoOpenVignette?: DecryptedLabRecord | null;
  onClearAutoOpenVignette?: () => void;
  onAddRecord: () => void;
  onEditRecord: (record: DecryptedLabRecord) => void;
  onDeleteRecord: (recordId: string) => Promise<void>;
  onDownloadPDF: (
    record: DecryptedLabRecord,
    targetExamId?: string,
    targetExamName?: string,
    chemistryLayout?: "compact" | "continuous" | "individual",
    action?: "download" | "print"
  ) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onLoadDemoData: () => void;
  labId: string;
  isDemo: boolean;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  userRole?: string;
  profile?: DecryptedLabProfile;
}

export default function ReportList({
  records, autoOpenVignette, onClearAutoOpenVignette, onAddRecord, onEditRecord, onDeleteRecord, onDownloadPDF, 
  onOpenSettings, onLogout, onLoadDemoData, labId, isDemo, onSync, isSyncing,
  userRole = "general",
  profile
}: ReportListProps) {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"reports" | "records" | "stats">("reports");
  const [selectedRecordForPDFOptions, setSelectedRecordForPDFOptions] = useState<DecryptedLabRecord | null>(null);
  const [recordForVignette, setRecordForVignette] = useState<DecryptedLabRecord | null>(null);
  const [pdfAction, setPdfAction] = useState<"download" | "print">("download");

  useEffect(() => {
    if (autoOpenVignette) {
      setRecordForVignette(autoOpenVignette);
      onClearAutoOpenVignette?.();
    }
  }, [autoOpenVignette, onClearAutoOpenVignette]);

  // CONTROL DE ENVÍOS DE REFERENCIA Y CIERRES SEMANALES DE CAJA
  const [weeklyExpenses, setWeeklyExpenses] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("labsync_weekly_expenses_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const getWeekAgoDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  };

  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const [inputStartDate, setInputStartDate] = useState(getWeekAgoDate());
  const [inputEndDate, setInputEndDate] = useState(getTodayDate());
  const [inputShippingCost, setInputShippingCost] = useState("");
  const [inputOtherCost, setInputOtherCost] = useState("");
  const [inputExpenseNotes, setInputExpenseNotes] = useState("");

  const calculateRevenueInRange = (start: string, end: string) => {
    let sum = 0;
    records.forEach(r => {
      if (r.examDate >= start && r.examDate <= end) {
        if (r.billing) {
          if (r.billing.isPaid) sum += r.billing.total;
        } else {
          sum += Object.keys(r.panels).length * 12;
        }
      }
    });
    return sum;
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const start = inputStartDate;
    const end = inputEndDate;
    const rev = calculateRevenueInRange(start, end);
    const ship = parseFloat(inputShippingCost) || 0;
    const other = parseFloat(inputOtherCost) || 0;
    
    const newRecord = {
      id: "exp_" + Date.now(),
      startDate: start,
      endDate: end,
      weekLabel: `Cierre del ${start} al ${end}`,
      calculatedRevenue: rev,
      shippingCost: ship,
      otherCost: other,
      notes: inputExpenseNotes.trim(),
      createdAt: new Date().toISOString()
    };
    const updated = [newRecord, ...weeklyExpenses];
    setWeeklyExpenses(updated);
    localStorage.setItem("labsync_weekly_expenses_v1", JSON.stringify(updated));
    
    // reset inputs
    setInputShippingCost("");
    setInputOtherCost("");
    setInputExpenseNotes("");
  };

  const handleDeleteExpense = (id: string) => {
    const updated = weeklyExpenses.filter(e => e.id !== id);
    setWeeklyExpenses(updated);
    localStorage.setItem("labsync_weekly_expenses_v1", JSON.stringify(updated));
  };

  // Top-level unconditional useMemos to satisfy Rules of Hooks:
  const totalCharged = React.useMemo(() => {
    let total = 0;
    records.forEach(r => {
      if (r.billing) {
        if (r.billing.isPaid) total += r.billing.total;
      } else {
        total += Object.keys(r.panels).length * 12; // Retroactive estimate
      }
    });
    return total;
  }, [records]);

  const totalExamsCount = React.useMemo(() => {
    let count = 0;
    records.forEach(r => {
      count += Object.keys(r.panels).length || 1;
    });
    return count;
  }, [records]);

  const totalPendingAmount = React.useMemo(() => {
    let total = 0;
    records.forEach(r => {
      if (r.billing && !r.billing.isPaid) total += r.billing.total;
    });
    return total;
  }, [records]);

  const monthlyExamsData = React.useMemo(() => {
    const monthlyExams: Record<string, number> = {};
    records.forEach(r => {
      const dateParts = r.examDate.split("-");
      const yr = dateParts[0] || "2026";
      const mo = dateParts[1] || "01";
      const monthsSp = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const nameStr = monthsSp[parseInt(mo) - 1] || "Mes";
      const label = `${nameStr} ${yr}`;

      const panelsCount = Object.keys(r.panels).length || 1;
      monthlyExams[label] = (monthlyExams[label] || 0) + panelsCount;
    });

    const sortedLabels = Object.keys(monthlyExams).sort((a, b) => {
      const partsA = a.split(" "), partsB = b.split(" ");
      const yrA = parseInt(partsA[1] || "0"), yrB = parseInt(partsB[1] || "0");
      if (yrA !== yrB) return yrA - yrB;
      const order = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      return order.indexOf(partsA[0] || "") - order.indexOf(partsB[0] || "");
    });

    const maxVal = Math.max(...Object.values(monthlyExams), 1);

    return { monthlyExams, sortedLabels, maxVal };
  }, [records]);

  const monthlyIncomeData = React.useMemo(() => {
    const monthlyIncome: Record<string, number> = {};
    records.forEach(r => {
      const dateParts = r.examDate.split("-");
      const yr = dateParts[0] || "2026";
      const mo = dateParts[1] || "01";
      const monthsSp = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const nameStr = monthsSp[parseInt(mo) - 1] || "Mes";
      const label = `${nameStr} ${yr}`;

      let total = 0;
      if (r.billing) {
        if (r.billing.isPaid) total = r.billing.total;
      } else {
        total = Object.keys(r.panels).length * 12; // Retroactive estimate
      }

      monthlyIncome[label] = (monthlyIncome[label] || 0) + total;
    });

    const sortedLabels = Object.keys(monthlyIncome).sort((a, b) => {
      const partsA = a.split(" "), partsB = b.split(" ");
      const yrA = parseInt(partsA[1] || "0"), yrB = parseInt(partsB[1] || "0");
      if (yrA !== yrB) return yrA - yrB;
      const order = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      return order.indexOf(partsA[0] || "") - order.indexOf(partsB[0] || "");
    });

    const maxVal = Math.max(...Object.values(monthlyIncome), 1);

    return { monthlyIncome, sortedLabels, maxVal };
  }, [records]);

  const paymentChannelData = React.useMemo(() => {
    const methodRevenue = { Efectivo: 0, Tarjeta: 0, Transferencia: 0 };
    const methodCounts = { Efectivo: 0, Tarjeta: 0, Transferencia: 0 };
    let totalPaid = 0;

    records.forEach(r => {
      let cost = 0;
      let paid = true;
      let method: "Efectivo" | "Tarjeta" | "Transferencia" = "Efectivo";

      if (r.billing) {
        cost = r.billing.total;
        paid = r.billing.isPaid;
        method = r.billing.paymentMethod || "Efectivo";
      } else {
        cost = Object.keys(r.panels).length * 12;
      }

      if (paid) {
        totalPaid += cost;
        if (method === "Efectivo" || method === "Tarjeta" || method === "Transferencia") {
          methodRevenue[method] += cost;
          methodCounts[method]++;
        }
      }
    });

    return { methodRevenue, methodCounts, totalPaid };
  }, [records]);

  // Filter records based on search term
  const filteredRecords = records.filter(record => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      record.patientName.toLowerCase().includes(term) ||
      record.patientIdCard.toLowerCase().includes(term) ||
      record.doctorName.toLowerCase().includes(term)
    );
  });

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await onDeleteRecord(id);
      setDeleteConfirmId(null);
    } catch (err) {
      alert("Error al eliminar el registro.");
    } finally {
      setIsDeleting(false);
    }
  };

  // WhatsApp helper
  const handleShareWhatsApp = (record: DecryptedLabRecord) => {
    try {
      onDownloadPDF(record);
    } catch (e) {
      console.warn("Could not auto-download PDF on WhatsApp share", e);
    }
    const patientPhone = record.patientPhone ? record.patientPhone.replace(/[^0-9]/g, "") : "";
    const greeting = `Hola, *${record.patientName}*! ✨ Esperamos que se encuentre muy bien.
Le escribimos de *${(profile?.labName || "LABORATORIO CLÍNICO TORRES").toUpperCase()}* para informarle que sus resultados ya están listos y validados por nuestro equipo especialista. 🩺📋
Adjunto a este mensaje encontrará su reporte en formato PDF (se ha descargado automáticamente en su dispositivo, listo para ser adjuntado). Para su tranquilidad y correcto seguimiento, recuerde compartir este archivo con su médico de cabecera.
¡Muchas gracias por elegirnos para cuidar de su salud! Si necesita algo más, solo responda a este chat. Que tenga un feliz día. 👍`;
    const encodedText = encodeURIComponent(greeting);
    const waUrl = patientPhone 
      ? `https://wa.me/${patientPhone}?text=${encodedText}` 
      : `https://web.whatsapp.com/send?text=${encodedText}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="w-full" id="report-list-root">
      
      {/* Upper Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 font-sans">
        
        {/* Lab Title */}
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 font-sans tracking-tight">
            Pacientes e Informes Clínicos
          </h2>
          <div className="flex items-center gap-2 mt-1">
            {isDemo ? (
              <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 font-bold border border-amber-200 px-2 py-0.5 rounded-full">
                <CloudOff className="w-3 h-3" /> Modo Demostración Local
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 px-2 py-0.5 rounded-full">
                <Cloud className="w-3 h-3" /> Conectado en Línea: {labId}
              </span>
            )}
            <span className="text-[10px] text-slate-400">
              {records.length} {records.length === 1 ? "registro cargado" : "registros cargados"}
            </span>
          </div>
        </div>

        {/* Actions Button panel */}
        <div className="flex flex-wrap items-center gap-2">
          {!isDemo && (
            <button
               onClick={onSync}
               disabled={isSyncing}
               className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-all disabled:opacity-40"
               id="sync-btn"
               title="Resincronizar de forma rápida sobre la nube cifrada"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-505 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sincronizar"}
            </button>
          )}

          {(userRole === "general" || userRole === "ceo" || userRole === "gerente") && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-755 text-xs font-semibold rounded-xl cursor-pointer transition-all"
              id="settings-btn"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              Configurar Membrete
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-150 hover:bg-red-50 text-red-650 text-xs font-semibold rounded-xl cursor-pointer transition-all"
            id="logout-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir de Lab
          </button>

          {(userRole === "general" || userRole === "ceo" || userRole === "gerente") && (
            <button
              onClick={onAddRecord}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-650 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-500/10 cursor-pointer transition-all"
              id="add-report-btn"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Reporte
            </button>
          )}
        </div>

      </div>

      {/* View Mode Switching Tabs Selector */}
      <div className="flex border-b border-slate-200 mb-6 gap-6 px-1">
        <button
          onClick={() => setViewMode("reports")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            viewMode === "reports"
              ? "border-purple-600 text-purple-850 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
          id="tab-view-reports"
        >
          <FileDown className="w-4 h-4" />
          Listado de Informes ({records.length})
        </button>
        
        {(userRole === "general" || userRole === "ceo" || userRole === "gerente") && (
          <button
            onClick={() => setViewMode("records")}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              viewMode === "records"
                ? "border-purple-600 text-purple-850 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
            id="tab-view-expedientes"
          >
            <FolderHeart className="w-4 h-4" />
            Expedientes Clínicos (Historias por Paciente)
          </button>
        )}

        <button
          onClick={() => setViewMode("stats")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            viewMode === "stats"
              ? "border-purple-600 text-purple-900 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
          id="tab-view-stats"
        >
          <BarChart3 className="w-4 h-4 text-purple-500" />
          Caja & Estadísticas Mensuales 📊
        </button>
      </div>

      {viewMode === "records" ? (
        <div className="mb-8 font-sans">
          <PatientExpedientes
            records={records}
            onEditRecord={onEditRecord}
            onDownloadPDF={onDownloadPDF}
            onBack={() => setViewMode("reports")}
          />
        </div>
      ) : viewMode === "stats" ? (
        /* Dynamic SVG graphs, cash totals & tickets ledger panel */
        <div className="space-y-6 font-sans">
          
          {/* KPI Cards header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <DollarSign className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Caja Cobrada (Total)</span>
                <span className="text-xl font-extrabold text-slate-900 block font-mono">
                  ${totalCharged.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Exámenes Realizados</span>
                <span className="text-xl font-extrabold text-slate-900 block font-mono">
                  {totalExamsCount} análisis
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Boletas Emitidas</span>
                <span className="text-xl font-extrabold text-slate-900 block font-mono">{records.length} tickets</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cartera Pendiente</span>
                <span className="text-xl font-extrabold text-slate-900 block font-mono">
                  ${totalPendingAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* SVG Statistics Graphs Row (Dual Bar Charts!) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Bar Chart: Exámenes / Análisis realizados al mes */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 border-b pb-2">
                <TrendingUp className="w-4 h-4 text-purple-600" /> Gráfica de Exámenes Realizados al Mes
              </h4>
              {monthlyExamsData.sortedLabels.length === 0 ? (
                <p className="text-slate-400 text-xs py-12 text-center font-semibold">No hay registros suficientes para graficar.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-end justify-between h-44 pt-5 pb-2 border-b border-slate-200 px-2 gap-4">
                    {monthlyExamsData.sortedLabels.map((monthKey) => {
                      const val = monthlyExamsData.monthlyExams[monthKey] || 0;
                      const pctStr = `${Math.max((val / monthlyExamsData.maxVal) * 100, 6)}%`;
                      return (
                        <div key={monthKey} className="flex flex-col items-center flex-1 group">
                          <span className="text-[10px] font-bold text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">
                            {val} uts
                          </span>
                          <div 
                            className="w-full max-w-[40px] bg-purple-500 hover:bg-purple-600 rounded-t-lg transition-all shadow-md shadow-purple-500/10 cursor-pointer" 
                            style={{ height: pctStr }}
                          />
                          <span className="text-[10px] text-slate-500 font-bold mt-2 truncate w-full text-center">
                            {monthKey}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[9px] text-slate-400 text-center uppercase tracking-wider font-semibold">
                Volumen acumulado de exámenes procesados por el laboratorio mensualmente
              </p>
            </div>

            {/* 2. Bar Chart: Entrada de Dinero Mensual */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 border-b pb-2">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Recaudación de Dinero Mensual ($ USD)
              </h4>
              {monthlyIncomeData.sortedLabels.length === 0 ? (
                <p className="text-slate-400 text-xs py-12 text-center font-semibold">No hay recursos suficientes para graficar.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-end justify-between h-44 pt-5 pb-2 border-b border-slate-200 px-2 gap-4">
                    {monthlyIncomeData.sortedLabels.map((monthKey) => {
                      const val = monthlyIncomeData.monthlyIncome[monthKey] || 0;
                      const pctStr = `${Math.max((val / monthlyIncomeData.maxVal) * 100, 6)}%`;
                      return (
                        <div key={monthKey} className="flex flex-col items-center flex-1 group">
                          <span className="text-[10px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">
                            ${val.toFixed(0)}
                          </span>
                          <div 
                            className="w-full max-w-[40px] bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-all shadow-md shadow-emerald-500/10 cursor-pointer" 
                            style={{ height: pctStr }}
                          />
                          <span className="text-[10px] text-slate-500 font-bold mt-2 truncate w-full text-center">
                            {monthKey}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[9px] text-slate-400 text-center uppercase tracking-wider font-semibold">
                Flujo de efectivo cobrado y reconciliado de boletas mensuales ($ USD)
              </p>
            </div>

          </div>

          {/* Payment breakdown and historic ledger list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Payment channels count bar splits */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest border-b pb-1.5 mb-2">Canales de Copago</h4>
              
              <div className="space-y-4 pt-1">
                {[
                  { label: "Efectivo 💵", amount: paymentChannelData.methodRevenue.Efectivo, count: paymentChannelData.methodCounts.Efectivo, color: "bg-emerald-500" },
                  { label: "Tarjeta de Débito/Crédito 💳", amount: paymentChannelData.methodRevenue.Tarjeta, count: paymentChannelData.methodCounts.Tarjeta, color: "bg-blue-500" },
                  { label: "Transferencia Bancaria 📲", amount: paymentChannelData.methodRevenue.Transferencia, count: paymentChannelData.methodCounts.Transferencia, color: "bg-indigo-500" }
                ].map((m, idx) => {
                  const pct = paymentChannelData.totalPaid > 0 ? (m.amount / paymentChannelData.totalPaid) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span className="truncate max-w-[150px]">{m.label}</span>
                        <span className="font-mono text-slate-900">${m.amount.toFixed(2)} ({m.count} tks)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Historic virtual tickets list ledger */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest border-b pb-1.5 mb-2">Libro de Taquilla Reciente (Conteo de Caja)</h4>
              
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {records.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold text-center py-6">No hay boletas disponibles.</p>
                ) : (
                  records.slice(0, 30).map((r, idx) => {
                    const ticketCode = r.billing?.ticketNumber || `TK-${r.examDate.replace(/-/g, "")}-${100 + idx}`;
                    const cost = r.billing?.total ?? (Object.keys(r.panels).length * 12);
                    const paid = r.billing?.isPaid ?? true;
                    const method = r.billing?.paymentMethod || "Efectivo";

                    return (
                      <div key={idx} className="flex items-center justify-between p-2 pb-2.5 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block font-black">{ticketCode}</span>
                            <span className="text-xs font-bold text-slate-900 block capitalize truncate max-w-[150px]">{r.patientName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                           <span className={`text-[9px] px-2 py-0.5 font-bold rounded-full border ${paid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                             {paid ? "COBRADO" : "PENDIENTE"}
                           </span>
                           <span className="text-[11px] font-semibold text-slate-400 font-mono">({method})</span>
                           <span className="text-xs font-black font-mono text-slate-950">${cost.toFixed(2)}</span>
                           <button
                              onClick={() => handleShareWhatsApp(r)}
                              className="p-1 px-2 border border-slate-200 rounded hover:bg-emerald-50 hover:border-emerald-250 text-slate-500 hover:text-emerald-700 transition-all font-semibold text-[10px]"
                              title="Enviar recordatorio y saludos por WhatsApp"
                           >
                             <MessageCircle className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* CONTROL DE ENVÍOS DE REFERENCIA Y CIERRES SEMANALES DE CAJA */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2" id="closure-panel-title">
                <Calendar className="w-5 h-5 text-indigo-600 animate-pulse" />
                Cierre Semanal de Caja y Control de Envíos de Referencia
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Deduzca los gastos por envío de pruebas a laboratorios de referencia/externos y calcule con precisión su balance general de ganancias.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Formulario de Cierre de Caja en Rango de Fechas */}
              <form onSubmit={handleAddExpense} className="lg:col-span-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4" id="weekly-closure-form">
                <span className="text-xs font-black text-indigo-950 uppercase tracking-widest block">📝 Registrar Nuevo Cierre</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Fecha Inicio</label>
                    <input 
                      type="date"
                      value={inputStartDate}
                      onChange={(e) => setInputStartDate(e.target.value)}
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Fecha Fin</label>
                    <input 
                      type="date"
                      value={inputEndDate}
                      onChange={(e) => setInputEndDate(e.target.value)}
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-dashed border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-slate-400">Ingresos Proyectados</span>
                    <span className="text-xs font-black text-emerald-600 font-mono">
                      ${calculateRevenueInRange(inputStartDate, inputEndDate).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                    Ingresos de caja calculados a partir de pacientes atendidos en este intervalo.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Gasto de Envíos de Referencia ($ USD)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-xs font-bold font-mono">$</span>
                      </div>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={inputShippingCost}
                        onChange={(e) => setInputShippingCost(e.target.value)}
                        className="block w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 font-mono font-bold"
                        required
                        id="ship-expense-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Otros Gastos del Laboratorio ($ USD)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-xs font-bold font-mono">$</span>
                      </div>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={inputOtherCost}
                        onChange={(e) => setInputOtherCost(e.target.value)}
                        className="block w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 font-mono font-bold"
                        id="other-expense-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Comentarios / Notas del Envío</label>
                    <textarea 
                      placeholder="Ej. Envío de cultivos y frotis a laboratorio de referencia de zona central..."
                      rows={2}
                      value={inputExpenseNotes}
                      onChange={(e) => setInputExpenseNotes(e.target.value)}
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900"
                      id="expense-notes-textarea"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  📥 Guardar Cierre Semanal
                </button>
              </form>

              {/* Historial de Cierres de Caja Realizados */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex justify-between items-center pb-1 border-b pb-2">
                  <span className="text-xs font-black text-indigo-950 uppercase tracking-widest block">📋 Cierres y Balances de Envíos Guardados</span>
                  
                  {/* Balance General de Ganancias Deduciendo Envíos */}
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Presupuesto General Ganancia Neta</span>
                    <span className="text-sm font-black text-indigo-700 font-mono">
                      ${(weeklyExpenses.reduce((acc, current) => acc + (current.calculatedRevenue - current.shippingCost - current.otherCost), 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {weeklyExpenses.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
                      <Database className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-1" />
                      <p className="text-xs text-slate-400 font-semibold">No se han registrado cierres de caja semanales aún.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Utilice el formulario de la izquierda seleccionando el rango de fechas de su operación.</p>
                    </div>
                  ) : (
                    weeklyExpenses.map((expense) => {
                      const netProfit = expense.calculatedRevenue - expense.shippingCost - expense.otherCost;
                      
                      const handleCopyReport = () => {
                        const template = `=== REPORTE DE CIERRE DE CAJA LABORAL ===\n` +
                          `Rango: ${expense.startDate} al ${expense.endDate}\n` +
                          `───────────────────────────────────\n` +
                          `(+) Ingreso Total Bruto: $${expense.calculatedRevenue.toFixed(2)}\n` +
                          `(-) Gasto Envíos Referencia: $${expense.shippingCost.toFixed(2)}\n` +
                          `(-) Otros Gastos de Lab: $${expense.otherCost.toFixed(2)}\n` +
                          `───────────────────────────────────\n` +
                          `(=) GANANCIA NETA FINAL: $${netProfit.toFixed(2)}\n` +
                          `Notas: ${expense.notes || 'Ninguna registrado.'}\n` +
                          `Enviado de forma segura desde Sistema AKOLAB E2EE.`;
                        navigator.clipboard.writeText(template);
                        alert(`¡Reporte de cierre copiado al portapapeles! Listo para pegar en WhatsApp.`);
                      };

                      return (
                        <div key={expense.id} className="p-4 border border-slate-100 rounded-2xl bg-white hover:border-slate-200 hover:shadow-sm transition-all space-y-3 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[11px] font-extrabold text-slate-900 block flex items-center gap-1">
                                📅 {expense.weekLabel}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium font-mono">
                                Ingreso Bruto Calculado: ${expense.calculatedRevenue.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCopyReport}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-lg border border-emerald-200 transition-colors"
                                title="Copiar informe para WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" /> WhatsApp
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="p-1 px-1.5 border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-[8px] uppercase font-bold text-slate-400 block">Gastos Envío Ref.</span>
                              <span className="text-xs font-bold text-rose-600 font-mono">${expense.shippingCost.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-[8px] uppercase font-bold text-slate-400 block">Otros Gastos Lab</span>
                              <span className="text-xs font-bold text-rose-600 font-mono">${expense.otherCost.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-[8px] uppercase font-bold text-slate-400 block">Ganancia Neta</span>
                              <span className={`text-xs font-black font-mono ${netProfit >= 0 ? "text-emerald-600" : "text-rose-700"}`}>
                                ${netProfit.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {expense.notes && (
                            <p className="text-[10px] text-slate-500 italic font-medium bg-slate-50/50 p-2 rounded-lg border-l-2 border-indigo-500 truncate">
                              "{expense.notes}"
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>

          </div>
      ) : (
        /* Main List Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        
        {/* Search header bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative rounded-xl shadow-sm w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por paciente, cédula / DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs transition-all"
              id="patient-search-input"
            />
          </div>
          
          {isDemo && records.length === 0 && (
            <button
              onClick={onLoadDemoData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-full transition-all cursor-pointer shadow-sm animate-pulse"
              id="load-demo-records-btn"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generar Datos Demo Pacientes
            </button>
          )}
        </div>

        {/* Records Listing */}
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center" id="empty-records-state">
            <Database className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-3" />
            <span className="text-sm font-bold text-slate-800 block">Excelente base segura cifrada</span>
            <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto leading-normal">
              No se encontraron informes médicos guardados. Comience hoy creando un registro para un paciente o cargue datos clínicos simulados de prueba.
            </p>
            <div className="mt-5 flex gap-2 justify-center">
              {isDemo && (
                <button
                  onClick={onLoadDemoData}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl cursor-pointer transition-all"
                >
                  Inicializar con Datos Demo
                </button>
              )}
              <button
                onClick={onAddRecord}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-md"
              >
                + Registrar Primer Paciente
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Identificación</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Edad / Sexo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha / Cobro</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiempos (Rapidez)</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paneles Reportados</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRecords.map((record) => {
                  const activePanelsList = Object.keys(record.panels);
                  const ageStr = calculateAgeDescription(record.patientBirthdate);

                  return (
                    <tr 
                      key={record.id} 
                      className={`transition-all ${
                        record.isUrgent 
                          ? "bg-orange-50/20 hover:bg-orange-50/30 border-l-4 border-l-orange-500 shadow-xs" 
                          : record.isPending 
                            ? "bg-amber-50/15 hover:bg-amber-50/25 border-l-4 border-l-amber-400" 
                            : "hover:bg-slate-50/50"
                      }`}
                    >
                      {/* Name of Patient */}
                      <td className="px-5 py-4.5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-8.5 w-8.5 rounded-full flex items-center justify-center font-bold text-xs border uppercase ${
                            record.isUrgent 
                              ? "bg-orange-100 text-orange-900 border-orange-200" 
                              : record.isPending 
                                ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse" 
                                : "bg-purple-50 text-purple-800 border-purple-100"
                          }`}>
                            {record.patientName.substring(0, 2)}
                          </div>
                          <div className="ml-3">
                            <span className="text-xs font-bold text-slate-900 block capitalize flex items-center gap-1.5 flex-wrap">
                              {record.patientName}
                              {record.isUrgent && (
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] bg-orange-100 text-orange-950 border border-orange-300 px-1.5 py-0.2 rounded-md font-extrabold uppercase animate-pulse">
                                  <AlertTriangle className="w-2.5 h-2.5 text-orange-600" /> ¡Urgente! ⚠️
                                </span>
                              )}
                              {record.isPending && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] bg-amber-100 text-amber-850 border border-amber-200 px-1.5 py-0.2 rounded-md font-extrabold uppercase animate-pulse">
                                  <Clock className="w-2 h-2" /> Pendiente
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 flex items-center gap-1.5 flex-wrap">
                              Médico: {record.doctorName}
                              {record.isDoctorSV && (
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] bg-purple-50 text-purple-700 border border-purple-150 px-1 py-0.2 rounded font-black uppercase">
                                  Convenio Dr. SV 🇸🇻
                                </span>
                              )}
                            </span>


                            
                            {/* QUICK ACTION ROW FOR EASY ACCESS ON MOBILE & SMALL SCREENS */}
                            <div className="flex items-center gap-2 mt-1.5 font-sans">
                              {record.isPending ? (
                                (userRole === "general" || userRole === "ceo" || userRole === "gerente") && (
                                  <button
                                    type="button"
                                    onClick={() => onEditRecord(record)}
                                    className="py-1 px-2.5 text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-xs border border-indigo-700 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold text-[9.5px]"
                                  >
                                    <Sparkles className="w-3 h-3 text-indigo-100" /> Procesar Análisis
                                  </button>
                                )
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleShareWhatsApp(record)}
                                    className="py-1 px-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-350 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-extrabold text-[9.5px]"
                                    title="WhatsApp de contacto rápido"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> WhatsApp
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRecordForPDFOptions(record)}
                                    className="py-1 px-2 text-teal-700 bg-teal-50/50 hover:bg-teal-100 border border-teal-200 hover:border-teal-350 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-extrabold text-[9.5px]"
                                    title="PDF & Impresión"
                                  >
                                    <FileDown className="w-3.5 h-3.5 text-teal-600 shrink-0" /> PDF
                                  </button>
                                  {(userRole === "general" || userRole === "ceo" || userRole === "gerente") && (
                                    <button
                                      type="button"
                                      onClick={() => onEditRecord(record)}
                                      className="p-1 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                                      title="Modificar reporte"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ID Document */}
                      <td className="px-5 py-4.5 whitespace-nowrap text-xs font-semibold font-mono text-slate-600">
                        {record.patientIdCard || "No especificada"}
                      </td>

                      {/* Age & Sex */}
                      <td className="px-5 py-4.5 whitespace-nowrap text-xs font-medium text-slate-700">
                        {ageStr}  /  <span className="font-semibold text-slate-500 text-[10px]">{record.patientSex}</span>
                      </td>

                      {/* Date of report & price catalog arancel */}
                      <td className="px-5 py-4.5 whitespace-nowrap text-xs text-slate-700 font-mono">
                        <div>{record.examDate}</div>
                        {record.billing && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[9.5px] font-bold text-slate-700 font-mono">
                              ${record.billing.total.toFixed(2)}
                            </span>
                            <span className={`text-[7.5px] px-1 hover:px-1.5 py-0.2 font-black rounded uppercase transition-all ${record.billing.isPaid ? "bg-emerald-50 text-emerald-800 border border-emerald-150" : "bg-rose-50 text-rose-800 border border-rose-150 animate-pulse"}`}>
                              {record.billing.isPaid ? "Pagado" : "Pendiente"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Tiempos / Rapidez */}
                      <td className="px-5 py-4.5 whitespace-nowrap text-xs text-slate-600 font-medium">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10.5px]">
                            <span className="text-slate-400 font-semibold" title="Hora de Admisión">📥 Rec:</span>
                            <span className="font-mono text-slate-800 font-bold">{record.receptionTime ? formatHour12(record.receptionTime) : record.createdAt ? formatHour12(record.createdAt) : "--:--"}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-[10.5px]">
                            <span className="text-slate-400 font-semibold" title="Hora de Reportado">🔬 Rep:</span>
                            <span className="font-mono text-slate-800 font-bold">
                              {record.isPending ? (
                                <span className="text-amber-600 font-extrabold animate-pulse text-[9.5px]">🕒 En Proceso</span>
                              ) : record.reportedTime ? (
                                formatHour12(record.reportedTime)
                              ) : record.updatedAt ? (
                                formatHour12(record.updatedAt)
                              ) : (
                                "--:--"
                              )}
                            </span>
                          </div>

                          {!record.isPending && (record.receptionTime || record.createdAt) && (record.reportedTime || record.updatedAt) && (() => {
                            const speed = calculateTurnaround(record.receptionTime || record.createdAt, record.reportedTime || record.updatedAt);
                            if (!speed) return null;
                            
                            let badgeStyle = "bg-purple-50 text-purple-700 border-purple-150";
                            if (speed.minutes <= 30) {
                              badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-150 font-extrabold";
                            } else if (speed.minutes <= 120) {
                              badgeStyle = "bg-purple-50 text-purple-700 border-purple-155";
                            } else {
                              badgeStyle = "bg-amber-50 text-amber-700 border-amber-150";
                            }

                            return (
                              <div className="pt-0.5">
                                <span className={`inline-flex items-center gap-0.5 text-[8.5px] px-1.5 py-0.2 rounded border font-bold ${badgeStyle}`} title="Tiempo total de proceso">
                                  ⏱️ {speed.text}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Active tests count badges */}
                      <td className="px-5 py-4.5 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1 max-w-52">
                          {activePanelsList.length === 0 ? (
                            <span className="text-[9px] bg-slate-50 border border-slate-200 text-slate-400 font-semibold px-2 py-0.5 rounded-full">
                              Vacío
                            </span>
                          ) : (
                            activePanelsList.map(panelId => (
                              <span 
                                key={panelId} 
                                className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full truncate border ${record.isPending ? "bg-amber-50/50 border-amber-200 text-amber-700" : "bg-slate-100 border border-slate-200 text-slate-700"}`}
                                title={panelId}
                              >
                                {panelId.replace("_", " ").toUpperCase().substring(0, 11)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Action Triggers */}
                      <td className="px-5 py-4.5 whitespace-nowrap text-right text-xs font-medium">
                        {deleteConfirmId === record.id ? (
                          // Confirm delete context menu
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> ¿Eliminar?
                            </span>
                            <button
                              disabled={isDeleting}
                              onClick={() => handleDelete(record.id)}
                              className="px-2 py-1 bg-red-650 hover:bg-red-750 text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                            >
                              Eliminar
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition-all"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          // Default Actions Row
                          <div className="flex items-center justify-end gap-2">
                            {record.isPending ? (
                              <>
                                <button
                                  onClick={() => onDownloadPDF(record)}
                                  className="p-1 px-2.2 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-semibold text-[10px]"
                                  title="Descargar Comprobante / Recibo de Caja"
                                >
                                  <FileDown className="w-3.5 h-3.5 text-emerald-650" /> Recibo PDF
                                </button>
                                <button
                                  onClick={() => setRecordForVignette(record)}
                                  className="p-1 px-2.2 text-purple-700 hover:bg-purple-50 border border-purple-200 hover:border-purple-300 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-semibold text-[10px]"
                                  title="Imprimir Viñetas (adhesivos para tubos de ensayo)"
                                >
                                  <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" /> Viñetas
                                </button>
                                 {(userRole === "general" || userRole === "ceo" || userRole === "gerente") && (
                                  <>
                                    <button
                                      onClick={() => onEditRecord(record)}
                                      className="p-1 px-3 text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/15 border border-indigo-700 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-bold text-[10px] animate-pulse"
                                      title="Procesar resultados clínicos de este paciente en laboratorio"
                                    >
                                      <Sparkles className="w-3 h-3 text-indigo-100" /> Procesar Análisis
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmId(record.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 border border-transparent rounded-xl transition-all cursor-pointer"
                                      title="Cancelar / Eliminar Petición"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleShareWhatsApp(record)}
                                  className="p-1 px-2.2 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-semibold text-[10px]"
                                  title="Enviar saludos y resultados por WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-650" /> WhatsApp
                                </button>
                                <button
                                  onClick={() => setRecordForVignette(record)}
                                  className="p-1 px-2.2 text-purple-700 hover:bg-purple-50 border border-purple-200 hover:border-purple-300 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-semibold text-[10px]"
                                  title="Imprimir Viñetas (adhesivos para tubos de ensayo)"
                                >
                                  <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" /> Viñetas
                                </button>
                                <button
                                  onClick={() => setSelectedRecordForPDFOptions(record)}
                                  className="p-1 px-2.2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-semibold text-[10px]"
                                  title="Opciones de descarga de PDF (Individual o Completo)"
                                >
                                  <FileDown className="w-3.5 h-3.5" /> PDF
                                </button>
                                 {(userRole === "general" || userRole === "ceo" || userRole === "gerente") && (
                                  <>
                                    <button
                                      onClick={() => onEditRecord(record)}
                                      className="p-1 px-2.2 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-semibold text-[10px]"
                                      title="Modificar reporte e índices"
                                    >
                                      <Edit className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmId(record.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 border border-transparent rounded-xl transition-all cursor-pointer"
                                      title="Eliminar de la base"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

              {/* SELECTION MODAL TO SPECIFY INDIVIDUAL OR COMPLETE EXAMINATION PDF DOWNLOADS */}
      {selectedRecordForPDFOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="pdf-download-picker">
          <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-md w-full overflow-hidden transform scale-95 transition-all duration-300">
            <div className="bg-gradient-to-tr from-indigo-900 to-purple-800 p-6 text-white text-center relative">
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForPDFOptions(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white font-extrabold cursor-pointer border-0"
                >
                  ✕
                </button>
              </div>
              <Printer className="w-10 h-10 text-indigo-200 mx-auto mb-3" />
              <h3 className="font-bold text-base tracking-tight">Opciones del Reporte</h3>
              <p className="text-indigo-100 text-[11px] mt-1 uppercase tracking-wider font-extrabold">
                Paciente: {selectedRecordForPDFOptions.patientName}
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
                        ? "bg-indigo-650 text-white shadow-xs font-extrabold"
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
                        ? "bg-indigo-650 text-white shadow-xs font-extrabold"
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
                  if (selectedRecordForPDFOptions.selectedMetricIds && selectedRecordForPDFOptions.selectedMetricIds.length > 0) {
                    return examMetricIds.some(mId => selectedRecordForPDFOptions.selectedMetricIds!.includes(mId));
                  }
                  const panelData = selectedRecordForPDFOptions.panels[exam.panelId];
                  if (!panelData) return false;
                  return examMetricIds.some(mId => {
                    const val = panelData.values[mId];
                    return val && val.trim() !== "" && val !== "-";
                  });
                });

                if (!hasActiveChemistry) return null;

                return (
                  <div className="space-y-2.5 p-4.5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <span className="block text-[9.5px] font-black text-indigo-700 uppercase tracking-widest font-sans flex items-center gap-1">
                      🧪 Opciones de Química Analítica
                    </span>
                    <p className="text-[10px] text-indigo-900 leading-normal font-medium">
                      Gestione cómo se darán los resultados para los exámenes de Química:
                    </p>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const chemistryExams = getActiveExamsList(profile).filter(e => e.panelId === "quimica_sanguinea_enzimas" || e.panelId === "química_y_diabetes").filter(exam => {
                            const examMetricIds = getMetricIdsForExam(exam.id);
                            if (selectedRecordForPDFOptions.selectedMetricIds && selectedRecordForPDFOptions.selectedMetricIds.length > 0) {
                              return examMetricIds.some(mId => selectedRecordForPDFOptions.selectedMetricIds!.includes(mId));
                            }
                            const panelData = selectedRecordForPDFOptions.panels[exam.panelId];
                            if (!panelData) return false;
                            return examMetricIds.some(mId => {
                              const val = panelData.values[mId];
                              return val && val.trim() !== "" && val !== "-";
                            });
                          });
                          chemistryExams.forEach(exam => {
                            onDownloadPDF(selectedRecordForPDFOptions, exam.id, exam.name, "individual", pdfAction);
                          });
                          setSelectedRecordForPDFOptions(null);
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
                          onDownloadPDF(selectedRecordForPDFOptions, undefined, undefined, "continuous", pdfAction);
                          setSelectedRecordForPDFOptions(null);
                        }}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-bold shadow-xs border-0"
                      >
                        <span className="flex items-center gap-1.5">
                          {pdfAction === "download" ? <FileDown className="w-4 h-4 text-indigo-500" /> : <Printer className="w-4 h-4 text-indigo-500" />}
                          2. Química Juntos por Prueba
                        </span>
                        <span className="text-[8px] text-indigo-800 bg-indigo-100 py-0.5 px-1.5 rounded uppercase font-black font-mono">Tabla Combinada</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDownloadPDF(selectedRecordForPDFOptions, undefined, undefined, "compact", pdfAction);
                          setSelectedRecordForPDFOptions(null);
                        }}
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-bold shadow-md shadow-indigo-600/10 border-0"
                      >
                        <span className="flex items-center gap-1.5">
                          {pdfAction === "download" ? <FileDown className="w-4 h-4 text-white" /> : <Printer className="w-4 h-4 text-white" />}
                          3. Compacto (Una Sola Página)
                        </span>
                        <span className="text-[8px] text-indigo-100 bg-indigo-850 py-0.5 px-1.5 rounded uppercase font-black font-mono">Impresión</span>
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
                    onDownloadPDF(selectedRecordForPDFOptions, undefined, undefined, undefined, pdfAction);
                    setSelectedRecordForPDFOptions(null);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-tr from-indigo-700 to-purple-750 hover:from-indigo-805 hover:to-purple-850 text-white font-bold text-xs rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-650/15 border-0"
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
                    if (selectedRecordForPDFOptions.selectedMetricIds && selectedRecordForPDFOptions.selectedMetricIds.length > 0) {
                      return examMetricIds.some(mId => selectedRecordForPDFOptions.selectedMetricIds!.includes(mId));
                    }
                    const panelData = selectedRecordForPDFOptions.panels[exam.panelId];
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
                        onDownloadPDF(selectedRecordForPDFOptions, exam.id, exam.name, undefined, pdfAction);
                      }}
                      className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 text-slate-755 font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-between text-left group"
                    >
                      <span className="truncate group-hover:text-indigo-800">{exam.name}</span>
                      <span className="text-[9px] text-indigo-700 bg-white group-hover:bg-indigo-100 hover:shadow-xs px-2.2 py-0.8 rounded-md border border-slate-200 font-extrabold flex items-center gap-1 shrink-0 transition-all">
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
                onClick={() => setSelectedRecordForPDFOptions(null)}
                className="py-2 px-4 bg-slate-200 hover:bg-slate-250 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border-0"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {recordForVignette && (
        <VignetteGenerator
          record={recordForVignette}
          onClose={() => setRecordForVignette(null)}
        />
      )}

    </div>
  );
}
