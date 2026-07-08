import React, { useState, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, Users, Calendar, Award, CheckCircle, Clock, AlertCircle, 
  Layers, ArrowLeft, Download, Filter, FileText, PieChart as PieIcon, Activity
} from "lucide-react";
import { DecryptedLabRecord } from "../types";

// Human-friendly translations for standard panel keys
const PANEL_NAMES: Record<string, string> = {
  hematologia: "Hematología",
  quimica_y_diabetes: "Química y Diabetes",
  química_y_diabetes: "Química y Diabetes",
  funcion_renal: "Función Renal",
  perfil_lipidico: "Perfil Lipídico",
  perfil_hepatico: "Perfil Hepático",
  ego: "Uroanálisis (EGO)",
  orina: "Uroanálisis (EGO)",
  general_orina: "Uroanálisis (EGO)",
  heces: "Coproanálisis",
  general_heces: "Coproanálisis",
  inmunologia: "Inmunología",
  urocultivo: "Urocultivo",
  coprocultivo: "Coprocultivo",
  espermograma: "Espermograma",
  miscelaneo: "Misceláneos",
  cultivo_faringeo: "Cultivo Faríngeo",
  secreciones_varias: "Cultivos Varios"
};

const formatPanelName = (id: string): string => {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
};

const COLORS = [
  "#8b5cf6", // Purple
  "#0d9488", // Teal
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#f43f5e", // Rose
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#a855f7", // Violet
  "#64748b"  // Slate
];

const getMonthYearKey = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 2) return "";
  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);
  const monthNames = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];
  if (monthNum >= 1 && monthNum <= 12) {
    return `${monthNames[monthNum - 1]} ${year}`;
  }
  return dateStr.substring(0, 7);
};

interface DashboardProps {
  records: DecryptedLabRecord[];
  onBack: () => void;
}

export default function Dashboard({ records, onBack }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<"all" | "3m" | "6m" | "12m">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");

  // Filter records based on selected time range and status
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Status Filter
      if (statusFilter === "completed" && record.isPending) return false;
      if (statusFilter === "pending" && !record.isPending) return false;

      // Time Range Filter
      if (timeRange !== "all") {
        const recordDate = new Date(record.examDate);
        const limitDate = new Date();
        if (timeRange === "3m") limitDate.setMonth(limitDate.getMonth() - 3);
        else if (timeRange === "6m") limitDate.setMonth(limitDate.getMonth() - 6);
        else if (timeRange === "12m") limitDate.setMonth(limitDate.getMonth() - 12);
        
        if (recordDate < limitDate) return false;
      }

      return true;
    });
  }, [records, timeRange, statusFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    let totalExams = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let urgentCount = 0;
    let doctorSVCount = 0;
    const examTypeCounts: Record<string, number> = {};

    filteredRecords.forEach(record => {
      if (record.isPending) {
        pendingCount++;
      } else {
        completedCount++;
      }

      if (record.isUrgent) {
        urgentCount++;
      }

      if (record.isDoctorSV) {
        doctorSVCount++;
      }

      // Count each panel as an exam type
      const panels = record.panels || {};
      const panelKeys = Object.keys(panels);
      
      panelKeys.forEach(panelId => {
        const readableName = PANEL_NAMES[panelId] || formatPanelName(panelId);
        examTypeCounts[readableName] = (examTypeCounts[readableName] || 0) + 1;
        totalExams++;
      });

      // Handle cases where patients are registered at reception but don't have filled panels yet
      if (panelKeys.length === 0 && record.isPending && record.selectedMetricIds && record.selectedMetricIds.length > 0) {
        const defaultName = "Por Procesar / Recepción";
        examTypeCounts[defaultName] = (examTypeCounts[defaultName] || 0) + 1;
        totalExams++;
      }
    });

    // Find most popular exam
    let mostPopularExam = "Ninguno";
    let mostPopularCount = 0;
    Object.entries(examTypeCounts).forEach(([name, count]) => {
      if (count > mostPopularCount) {
        mostPopularCount = count;
        mostPopularExam = name;
      }
    });

    return {
      totalExams,
      pendingCount,
      completedCount,
      urgentCount,
      doctorSVCount,
      mostPopularExam,
      mostPopularCount,
      examTypeCounts
    };
  }, [filteredRecords]);

  // Chart 1: Monthly Summary of Exams (desglosado por tipo) - Stacked Bar Chart
  const monthlyTypeData = useMemo(() => {
    const monthGroups: Record<string, Record<string, number>> = {};
    const examTypesSet = new Set<string>();

    filteredRecords.forEach(record => {
      const dateStr = record.examDate;
      if (!dateStr) return;

      const monthKey = getMonthYearKey(dateStr);
      const sortKey = dateStr.substring(0, 7); // e.g., "2026-05"

      if (!monthGroups[sortKey]) {
        monthGroups[sortKey] = { _label: monthKey } as any;
      }

      const panels = record.panels || {};
      const panelKeys = Object.keys(panels);

      panelKeys.forEach(panelId => {
        const readableName = PANEL_NAMES[panelId] || formatPanelName(panelId);
        examTypesSet.add(readableName);
        monthGroups[sortKey][readableName] = (monthGroups[sortKey][readableName] || 0) + 1;
      });

      if (panelKeys.length === 0 && record.isPending && record.selectedMetricIds && record.selectedMetricIds.length > 0) {
        const defaultName = "Por Procesar / Recepción";
        examTypesSet.add(defaultName);
        monthGroups[sortKey][defaultName] = (monthGroups[sortKey][defaultName] || 0) + 1;
      }
    });

    const sortedKeys = Object.keys(monthGroups).sort();
    const chartData = sortedKeys.map(sortKey => {
      const group = monthGroups[sortKey];
      const dataPoint: any = {
        name: group._label,
        sortKey
      };

      let total = 0;
      Array.from(examTypesSet).forEach(examType => {
        const count = group[examType] || 0;
        dataPoint[examType] = count;
        total += count;
      });
      dataPoint.total = total;
      return dataPoint;
    });

    return {
      chartData,
      examTypes: Array.from(examTypesSet)
    };
  }, [filteredRecords]);

  // Chart 2: Distribution of Exam Types (Pie Chart)
  const pieChartData = useMemo(() => {
    return (Object.entries(stats.examTypeCounts) as [string, number][])
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stats.examTypeCounts]);

  // Chart 3: Patient Trend over time
  const patientTrendData = useMemo(() => {
    const monthGroups: Record<string, { total: number; urgent: number; doctorSV: number; label: string }> = {};

    filteredRecords.forEach(record => {
      const dateStr = record.examDate;
      if (!dateStr) return;

      const monthKey = getMonthYearKey(dateStr);
      const sortKey = dateStr.substring(0, 7);

      if (!monthGroups[sortKey]) {
        monthGroups[sortKey] = { total: 0, urgent: 0, doctorSV: 0, label: monthKey };
      }

      monthGroups[sortKey].total++;
      if (record.isUrgent) monthGroups[sortKey].urgent++;
      if (record.isDoctorSV) monthGroups[sortKey].doctorSV++;
    });

    return Object.keys(monthGroups)
      .sort()
      .map(sortKey => ({
        name: monthGroups[sortKey].label,
        "Total Pacientes": monthGroups[sortKey].total,
        "Urgentes": monthGroups[sortKey].urgent,
        "Convenio Dr. SV": monthGroups[sortKey].doctorSV
      }));
  }, [filteredRecords]);

  return (
    <div className="space-y-6" id="dashboard-root-panel">
      {/* Header section with back button and title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/65 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-all cursor-pointer"
            title="Volver al Listado"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-850 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5.5 h-5.5 text-teal-600" /> PANEL DE CONTROL ESTADÍSTICO
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 leading-normal">
              Visualización interactiva, métricas de rendimiento clínico y desglose analítico de exámenes del laboratorio.
            </p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                statusFilter === "completed" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Completados
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                statusFilter === "pending" ? "bg-amber-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Pendientes
            </button>
          </div>

          {/* Time range filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setTimeRange("all")}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                timeRange === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Todo
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("3m")}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                timeRange === "3m" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              3 Meses
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("6m")}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                timeRange === "6m" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              6 Meses
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("12m")}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                timeRange === "12m" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              1 Año
            </button>
          </div>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-bento-grid">
        {/* KPI 1: Total Exams */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/65 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total de Exámenes</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.totalExams}</h3>
            <span className="block text-[10px] text-slate-500 leading-normal">
              Solicitudes procesadas en el periodo.
            </span>
          </div>
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Total Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/65 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pacientes Atendidos</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{filteredRecords.length}</h3>
            <span className="block text-[10px] text-slate-500 leading-normal flex items-center gap-1">
              <span className="font-semibold text-emerald-600">{stats.completedCount} listos</span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-amber-600">{stats.pendingCount} pendientes</span>
            </span>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Most Popular Exam */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/65 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Examen Más Solicitado</span>
            <h3 className="text-base font-black text-slate-800 truncate max-w-[160px]" title={stats.mostPopularExam}>
              {stats.mostPopularExam}
            </h3>
            <span className="block text-[10px] text-slate-500 leading-normal">
              Frecuencia de <strong className="text-slate-700">{stats.mostPopularCount}</strong> unidades.
            </span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Special Statuses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/65 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Estados Especiales</span>
            <div className="flex gap-4">
              <div>
                <span className="block text-[9px] text-slate-400 uppercase font-bold">Urgentes</span>
                <span className="text-lg font-black text-red-650 flex items-center gap-1">
                  {stats.urgentCount} <AlertCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="block text-[9px] text-slate-400 uppercase font-bold">Dr. SV 🇸🇻</span>
                <span className="text-lg font-black text-purple-600">
                  {stats.doctorSVCount}
                </span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart: Monthly summary breakdown by exam type (Stacked Bar) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/65 shadow-xs lg:col-span-2 space-y-4" id="monthly-exams-chart-container">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                Resumen Mensual Desglosado por Tipo de Examen
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Cantidad total de pruebas agrupadas por mes y categorizadas por tipo.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-slate-500 font-mono">
                {monthlyTypeData.chartData.length} meses registrados
              </span>
            </div>
          </div>

          <div className="h-80 w-full font-mono text-xs">
            {monthlyTypeData.chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <FileText className="w-8 h-8 opacity-55" />
                <span>No hay suficientes datos para generar la gráfica en este periodo.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyTypeData.chartData}
                  margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                    labelStyle={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', color: '#38bdf8' }}
                  />
                  <Legend 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: '15px', fontSize: '10px', fontFamily: 'sans-serif' }}
                  />
                  {/* Stack each unique exam type using a unique color */}
                  {monthlyTypeData.examTypes.map((examType, index) => (
                    <Bar
                      key={examType}
                      dataKey={examType}
                      stackId="a"
                      fill={COLORS[index % COLORS.length]}
                      radius={[0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Secondary Chart: Donut Exam Distribution (Pie Chart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/65 shadow-xs space-y-4" id="distribution-chart-container">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-purple-600" /> Distribución Global de Pruebas
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Porcentaje proporcional de demanda por examen clínico.
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center font-mono">
            {pieChartData.length === 0 ? (
              <div className="text-xs text-slate-400">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ fontSize: '11px' }}
                    formatter={(value, name) => [`${value} examen(es)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Clean list index mapping for colors */}
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-sans text-xs">
            {pieChartData.slice(0, 6).map((item, index) => {
              const totalVal = pieChartData.reduce((acc, curr) => acc + curr.value, 0);
              const percentage = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(1) : "0";
              return (
                <div key={item.name} className="flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <span className="truncate font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10.5px]">
                    <span className="font-bold text-slate-750">{item.value}</span>
                    <span className="text-slate-400">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
            {pieChartData.length > 6 && (
              <div className="text-center text-[9.5px] text-slate-400 font-bold uppercase pt-1 border-t border-slate-100">
                + {pieChartData.length - 6} categorías adicionales
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Tertiary Row: Patient Registrations and Detailed Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend of Registrations over time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/65 shadow-xs space-y-4" id="patient-trend-container">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" /> Tendencia de Ingresos de Pacientes
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Frecuencia histórica de admisiones de pacientes por mes.
            </p>
          </div>

          <div className="h-60 w-full font-mono text-xs">
            {patientTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">Sin registros</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={patientTrendData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Total Pacientes" 
                    stroke="#0d9488" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPatients)" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Urgentes" 
                    stroke="#ef4444" 
                    strokeWidth={1.5} 
                    dot={{ r: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Breakdown table listing all test types & counts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/65 shadow-xs lg:col-span-2 space-y-4" id="table-breakdown-container">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                Métricas de Demanda por Categoría Clínica
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Tabla detallada con la cantidad total de unidades realizadas y su relevancia estadística.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                // Generate CSV structure and initiate browser download safely
                const headers = ["Categoria Clinica", "Unidades Realizadas", "Porcentaje sobre el Total"];
                const total = stats.totalExams || 1;
                const rows = (Object.entries(stats.examTypeCounts) as [string, number][]).map(([name, count]) => [
                  name,
                  count.toString(),
                  `${((count / total) * 100).toFixed(1)}%`
                ]);
                
                const csvContent = "data:text/csv;charset=utf-8," 
                  + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `ako_reporte_estadistico_${new Date().toISOString().split("T")[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl max-h-56 overflow-y-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9.5px] tracking-wider sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Categoría Clínica</th>
                  <th className="px-4 py-2.5 text-center">Unidades</th>
                  <th className="px-4 py-2.5 text-center">Relevancia</th>
                  <th className="px-4 py-2.5">Estado Operativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(Object.entries(stats.examTypeCounts) as [string, number][]).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                      No se encontraron registros en el periodo de tiempo seleccionado.
                    </td>
                  </tr>
                ) : (
                  (Object.entries(stats.examTypeCounts) as [string, number][])
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, count], index) => {
                      const totalVal = stats.totalExams || 1;
                      const percentage = (count / totalVal) * 100;
                      return (
                        <tr key={name} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-4 py-2.5 flex items-center gap-2">
                            <span 
                              className="w-2 h-2 rounded-full shrink-0" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-slate-800 font-bold">{name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono text-slate-900 font-bold">
                            {count}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-1.5 font-mono text-[10.5px]">
                              <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0 hidden sm:block">
                                <div 
                                  className="h-full bg-teal-600 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-slate-600 font-bold">{percentage.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Activo
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
