import React, { useState } from "react";
import { 
  FolderHeart, Calendar, User, FileText, ArrowLeft, TrendingUp, 
  Download, Edit, Info, Activity, ShieldAlert, CheckCircle2, ChevronRight, Search
} from "lucide-react";
import { DecryptedLabRecord } from "../types";
import { calculateAgeDescription, calculateAge } from "../utils/clinicalCalculations";

interface PatientExpedientesProps {
  records: DecryptedLabRecord[];
  onEditRecord: (record: DecryptedLabRecord) => void;
  onDownloadPDF: (record: DecryptedLabRecord) => void;
  onBack: () => void;
}

interface PatientGroup {
  idCard: string;
  name: string;
  birthdate: string;
  sex: "Masculino" | "Femenino";
  records: DecryptedLabRecord[];
}

interface ChartMetricConfig {
  id: string;
  name: string;
  panelId: string;
  unit: string;
  minVal: number;
  maxVal: (sex: "Masculino" | "Femenino") => number;
}

const HISTORICAL_METRIC_CONFIGS: ChartMetricConfig[] = [
  { id: "glucosa", name: "Glucosa en Ayunas", panelId: "química_y_diabetes", unit: "mg/dL", minVal: 70, maxVal: () => 100 },
  { id: "colesterol_total", name: "Colesterol Total", panelId: "perfil_lipidico", unit: "mg/dL", minVal: 100, maxVal: () => 200 },
  { id: "trigliceridos", name: "Triglicéridos", panelId: "perfil_lipidico", unit: "mg/dL", minVal: 30, maxVal: () => 150 },
  { id: "hemoglobina", name: "Hemoglobina Sérica", panelId: "hematologia", unit: "g/dL", minVal: 11.5, maxVal: (sex) => sex === "Femenino" ? 15.1 : 17.2 },
  { id: "creatinina", name: "Creatinina Sérica", panelId: "funcion_renal", unit: "mg/dL", minVal: 0.6, maxVal: (sex) => sex === "Femenino" ? 1.1 : 1.3 },
  { id: "ast_sgot", name: "Transaminasa AST / SGOT", panelId: "perfil_hepatico", unit: "U/L", minVal: 5, maxVal: (sex) => sex === "Femenino" ? 32 : 40 },
  { id: "alt_sgpt", name: "Transaminasa ALT / SGPT", panelId: "perfil_hepatico", unit: "U/L", minVal: 5, maxVal: (sex) => sex === "Femenino" ? 33 : 41 }
];

export default function PatientExpedientes({
  records, onEditRecord, onDownloadPDF, onBack
}: PatientExpedientesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientKey, setSelectedPatientKey] = useState<string | null>(null);
  const [activeMetricId, setActiveMetricId] = useState<string>("glucosa");

  // Group records by patient identifier: patientIdCard (DNI/Cédula) normalized or name lowercase if DNI is empty
  const patientGroupsMap: { [key: string]: PatientGroup } = {};

  records.forEach((record) => {
    const rawId = record.patientIdCard ? record.patientIdCard.trim() : "";
    // Unique key: Prefer ID Card, fallback to name
    const key = rawId ? rawId : record.patientName.trim().toLowerCase();

    if (!patientGroupsMap[key]) {
      patientGroupsMap[key] = {
        idCard: record.patientIdCard || "",
        name: record.patientName,
        birthdate: record.patientBirthdate,
        sex: record.patientSex,
        records: []
      };
    }
    patientGroupsMap[key].records.push(record);
  });

  // Convert to array and sort each patient's records newest to oldest
  const patientGroups = Object.keys(patientGroupsMap).map((key) => {
    const gp = patientGroupsMap[key];
    // Sort records descending (newest first) for general UI timeline
    gp.records.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
    
    // Inherit latest profile details
    const latestRecord = gp.records[0];
    return {
      key,
      idCard: gp.idCard,
      name: latestRecord.patientName,
      birthdate: latestRecord.patientBirthdate,
      sex: latestRecord.patientSex,
      records: gp.records
    };
  });

  // Filter patients based on search
  const filteredPatients = patientGroups.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.name.toLowerCase().includes(term) ||
      p.idCard.toLowerCase().includes(term)
    );
  });

  const selectedPatient = selectedPatientKey ? patientGroups.find(p => p.key === selectedPatientKey) : null;

  // Compile progression data for selected patient & analyte
  const getProgressionData = () => {
    if (!selectedPatient) return [];
    
    const config = HISTORICAL_METRIC_CONFIGS.find(c => c.id === activeMetricId);
    if (!config) return [];

    // Extract exams carrying values for this metric, sorted oldest to newest for linear graphing
    const dataPoints: { date: string; value: number; originalStr: string }[] = [];
    
    const sortedTimeline = [...selectedPatient.records].sort(
      (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
    );

    sortedTimeline.forEach((rec) => {
      const panel = rec.panels[config.panelId];
      if (panel && panel.values) {
        const valStr = panel.values[config.id];
        if (valStr && valStr.trim() !== "" && !isNaN(parseFloat(valStr))) {
          dataPoints.push({
            date: rec.examDate,
            value: parseFloat(valStr),
            originalStr: valStr
          });
        }
      }
    });

    return dataPoints;
  };

  const trendData = getProgressionData();
  const selectedMetricConfig = HISTORICAL_METRIC_CONFIGS.find(c => c.id === activeMetricId);

  // SVG Line Chart Drawer Component inside PatientExpedientes
  const renderSVGLineChart = () => {
    if (trendData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
          <Activity className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-600">Sin datos cargados para graficar</p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
            Este paciente no registra resultados numéricos rellenados para el parámetro analítico seleccionado ("{selectedMetricConfig?.name}").
          </p>
        </div>
      );
    }

    if (!selectedPatient || !selectedMetricConfig) return null;

    // Normal margins & dimensions
    const width = 600;
    const height = 240;
    const paddingLeft = 55;
    const paddingRight = 30;
    const paddingTop = 30;
    const paddingBottom = 40;

    const values = trendData.map(d => d.value);
    
    // Bounds definitions
    const refMin = selectedMetricConfig.minVal;
    const refMax = selectedMetricConfig.maxVal(selectedPatient.sex);

    // Grid Min & Max values to size graph vertically
    const minValInPoints = Math.min(...values);
    const maxValInPoints = Math.max(...values);
    
    const yScaleMin = Math.max(0, Math.min(refMin, minValInPoints) * 0.8);
    const yScaleMax = Math.max(refMax * 1.2, maxValInPoints * 1.1);
    const yScaleRange = yScaleMax - yScaleMin || 1;

    // Coordinate conversion functions
    const getX = (index: number) => {
      if (trendData.length <= 1) return paddingLeft + (width - paddingLeft - paddingRight) / 2;
      return paddingLeft + (index / (trendData.length - 1)) * (width - paddingLeft - paddingRight);
    };

    const getY = (val: number) => {
      const scale = (val - yScaleMin) / yScaleRange;
      return height - paddingBottom - scale * (height - paddingTop - paddingBottom);
    };

    // Reference band coordinate helpers
    const refMinY = getY(refMin);
    const refMaxY = getY(refMax);

    // Build the SVG path
    let pathD = "";
    trendData.forEach((pt, idx) => {
      const cx = getX(idx);
      const cy = getY(pt.value);
      if (idx === 0) {
        pathD += `M ${cx} ${cy}`;
      } else {
        pathD += ` L ${cx} ${cy}`;
      }
    });

    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div>
            <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Gráfico de Continuidad y Trajectoria Analítica
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Visualiza de forma clara la tendencia física e histórica del paciente.
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-md font-medium">
              Segmento Saludable: {refMin} - {refMax} {selectedMetricConfig.unit}
            </span>
          </div>
        </div>

        {/* SVG Wrapper wrapper container */}
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] h-auto">
            {/* Background grids */}
            <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#f1f5f9" strokeWidth="1" />
            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#e2e8f0" strokeWidth="1.5" />
            
            {/* Shaded Reference Interval Band (E.g. Normal green area) */}
            {refMinY > 0 && refMaxY > 0 && (
              <rect
                x={paddingLeft}
                y={Math.min(refMinY, refMaxY)}
                width={width - paddingLeft - paddingRight}
                height={Math.abs(refMinY - refMaxY)}
                fill="rgba(52, 211, 153, 0.08)"
                stroke="rgba(52, 211, 153, 0.15)"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            )}

            {/* horizontal lines for limits */}
            <text x={paddingLeft - 5} y={refMinY + 3} textAnchor="end" fill="#059669" className="text-[8.5px] font-bold">Min: {refMin}</text>
            <text x={paddingLeft - 5} y={refMaxY + 3} textAnchor="end" fill="#059669" className="text-[8.5px] font-bold">Max: {refMax}</text>

            {/* Y Axis ticks & values */}
            {[0.25, 0.5, 0.75].map((ratio) => {
              const tickVal = yScaleMin + ratio * yScaleRange;
              const cy = getY(tickVal);
              return (
                <g key={ratio} className="opacity-60">
                  <line x1={paddingLeft} y1={cy} x2={width - paddingRight} y2={cy} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                  <text x={paddingLeft - 5} y={cy + 3} textAnchor="end" fill="#94a3b8" className="text-[8px] font-mono">{tickVal.toFixed(1)}</text>
                </g>
              );
            })}

            {/* Bottom X-Axis ticks & Date tags */}
            {trendData.map((pt, idx) => {
              const cx = getX(idx);
              const formattedDate = pt.date.substring(5); // Show MM-DD to save space
              return (
                <g key={idx}>
                  <line x1={cx} y1={height - paddingBottom} x2={cx} y2={height - paddingBottom + 4} stroke="#cbd5e1" strokeWidth="1" />
                  <text 
                    x={cx} 
                    y={height - paddingBottom + 14} 
                    textAnchor="middle" 
                    fill="#64748b" 
                    className="text-[8px] font-semibold font-sans uppercase"
                  >
                    {formattedDate}
                  </text>
                  <text 
                    x={cx} 
                    y={height - paddingBottom + 22} 
                    textAnchor="middle" 
                    fill="#94a3b8" 
                    className="text-[7.5px] font-mono"
                  >
                    {pt.date.substring(0, 4)}
                  </text>
                </g>
              );
            })}

            {/* Plotted Path line */}
            <path
              d={pathD}
              fill="none"
              stroke="#0f766e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Node Dots & tooltips overlay */}
            {trendData.map((pt, idx) => {
              const cx = getX(idx);
              const cy = getY(pt.value);
              const isNormalValue = pt.value >= refMin && pt.value <= refMax;
              
              return (
                <g key={idx} className="group cursor-pointer">
                  <circle
                    cx={cx}
                    cy={cy}
                    r="5"
                    fill={isNormalValue ? "#10b981" : "#ef4444"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="transition-all duration-150 group-hover:r-[7px]"
                  />
                  {/* Tooltip background & text */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                    <rect
                      x={cx - 30}
                      y={cy - 22}
                      width="60"
                      height="16"
                      rx="3"
                      fill="#1e293b"
                    />
                    <text
                      x={cx}
                      y={cy - 11}
                      fill="#ffffff"
                      textAnchor="middle"
                      className="text-[8.5px] font-bold font-mono"
                    >
                      {pt.originalStr} {selectedMetricConfig.unit}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-1 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            <span>Resultado Saludable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
            <span>Resultado Fuera de Rango (Anomalía)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-5 bg-teal-50 border border-green-200 border-dashed" />
            <span>Región del Intervalo de Referencia</span>
          </div>
        </div>
      </div>
    );
  };

  // 1. Single Patient File View
  if (selectedPatient) {
    const ageValue = calculateAge(selectedPatient.birthdate);
    const ageFormatted = calculateAgeDescription(selectedPatient.birthdate);
    
    // Aggregate all abnormal values registered over patient's metrics
    const abnormalIndicators: { date: string; metricName: string; value: string; status: "high" | "low" }[] = [];
    selectedPatient.records.forEach(rec => {
      HISTORICAL_METRIC_CONFIGS.forEach(met => {
        const pan = rec.panels[met.panelId];
        const valStr = pan?.values?.[met.id];
        if (valStr && valStr.trim() !== "") {
          const valNum = parseFloat(valStr);
          if (!isNaN(valNum)) {
            const maxVal = met.maxVal(selectedPatient.sex);
            if (valNum > maxVal) {
              abnormalIndicators.push({
                date: rec.examDate,
                metricName: met.name,
                value: valStr + " " + met.unit,
                status: "high"
              });
            } else if (valNum < met.minVal) {
              abnormalIndicators.push({
                date: rec.examDate,
                metricName: met.name,
                value: valStr + " " + met.unit,
                status: "low"
              });
            }
          }
        }
      });
    });

    return (
      <div className="w-full bg-slate-50" id="patient-folder-detail">
        {/* Navigation path banner */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setSelectedPatientKey(null)}
            className="flex items-center gap-1 text-xs font-bold text-teal-700 bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Expedientes
          </button>
          <span className="text-slate-400 text-xs">/</span>
          <span className="text-slate-500 font-semibold text-xs truncate max-w-56 capitalize">
            {selectedPatient.name}
          </span>
        </div>

        {/* Master details Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDE PANEL - Patient Card & timeline history */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Bio Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 w-28 h-28 bg-teal-500/5 rounded-full blur-2xl -z-0 pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-teal-100 text-teal-800 rounded-2xl flex items-center justify-center font-bold text-sm border border-teal-200">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 capitalize leading-none mb-1">
                    {selectedPatient.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    ID: {selectedPatient.idCard || "S/N (Sin DNI)"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-1 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Biótipo / Sexo:</span>
                  <span className="text-slate-800 font-bold">{selectedPatient.sex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Edad Estimada:</span>
                  <span className="text-slate-800 font-bold">{ageFormatted} ({ageValue} años)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Fórmulas Biológicas:</span>
                  <span className="text-teal-700 font-bold bg-teal-50 px-1 rounded text-[10px]">Edad Activa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Informes Archivados:</span>
                  <span className="text-slate-850 font-extrabold">{selectedPatient.records.length} exámenes</span>
                </div>
              </div>
            </div>

            {/* Timeline component */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                Historial de Exámenes (Cronología)
              </h4>
              
              <div className="relative border-l border-slate-150 ml-2 mt-2 pl-4 space-y-5">
                {selectedPatient.records.map((rec, i) => (
                  <div key={rec.id} className="relative">
                    {/* Node Dot icon */}
                    <span className="absolute -left-6.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-50 border-2 border-teal-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                    </span>
                    
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">{rec.examDate}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Ref: {rec.doctorName || "General"}</span>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onDownloadPDF(rec)}
                          className="flex items-center gap-1 text-[9px] bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-350 px-2 py-1 rounded text-slate-700 transition-all font-bold cursor-pointer"
                        >
                          <Download className="w-2.5 h-2.5" /> Bajar PDF
                        </button>
                        <button
                          onClick={() => onEditRecord(rec)}
                          className="flex items-center gap-1 text-[9px] bg-teal-50 border border-teal-100 hover:bg-teal-100 px-2 py-1 rounded text-teal-850 transition-all font-bold cursor-pointer"
                        >
                          <Edit className="w-2.5 h-2.5" /> Editar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE PANEL - Historical charts & Parameter comparison */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Analyzer select panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-teal-600" />
                    Evolución Analítica Intertemporal
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Mide el comportamiento de los valores de laboratorio a lo largo de las fechas.
                  </p>
                </div>

                <div className="w-full sm:w-auto">
                  <select
                    value={activeMetricId}
                    onChange={(e) => setActiveMetricId(e.target.value)}
                    className="w-full sm:w-48 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {HISTORICAL_METRIC_CONFIGS.map(metric => (
                      <option key={metric.id} value={metric.id}>
                        {metric.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Render dynamic customizable line chart */}
              {renderSVGLineChart()}

              {/* Specific indicator table */}
              {trendData.length > 0 && selectedMetricConfig && (
                <div className="mt-5">
                  <h4 className="text-[11px] font-bold text-slate-800 mb-2 uppercase. tracking-wide">
                    Valores Históricos de Registros
                  </h4>
                  <div className="bg-slate-50 border border-slate-150 rounded-xl overflow-hidden text-xs">
                    <table className="min-w-full text-left font-sans">
                      <thead>
                        <tr className="bg-slate-155 text-slate-500 font-bold text-[9px] uppercase tracking-wide border-b border-slate-200">
                          <th className="px-3.5 py-2">Fecha</th>
                          <th className="px-3.5 py-2">Valor Obtenido</th>
                          <th className="px-3.5 py-2">Intervalo de Referencia</th>
                          <th className="px-3.5 py-2 text-right">Resultado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {trendData.map((pt, idx) => {
                          const refLimitMin = selectedMetricConfig.minVal;
                          const refLimitMax = selectedMetricConfig.maxVal(selectedPatient.sex);
                          const isNormalVal = pt.value >= refLimitMin && pt.value <= refLimitMax;
                          const isHigh = pt.value > refLimitMax;

                          return (
                            <tr key={idx} className="hover:bg-slate-100/50">
                              <td className="px-3.5 py-2 font-mono text-slate-705">{pt.date}</td>
                              <td className="px-3.5 py-2 font-bold text-slate-900">
                                {pt.originalStr} <span className="text-[9px] font-medium text-slate-400">{selectedMetricConfig.unit}</span>
                              </td>
                              <td className="px-3.5 py-2 text-slate-500 text-[10px]">
                                {refLimitMin} - {refLimitMax} {selectedMetricConfig.unit}
                              </td>
                              <td className="px-3.5 py-2 text-right">
                                {isNormalVal ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> Normal
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                                    <ShieldAlert className="w-2.5 h-2.5 text-red-500" /> {isHigh ? "ALTO (H)" : "BAJO (L)"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Historical Alerts Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-550" />
                Alertas o Parámetros Fuera de Rango Históricos Detectados
              </h4>
              
              {abnormalIndicators.length === 0 ? (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center text-xs text-emerald-800">
                  ¡Excelente! No se registran resultados anómalos o críticos en ningún examen de este paciente.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {abnormalIndicators.map((ind, i) => (
                    <div key={i} className="bg-amber-50/35 border border-amber-200/50 rounded-xl p-3 flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">{ind.date}</span>
                        <span className="text-xs font-bold text-slate-800 block mt-0.5">{ind.metricName}</span>
                        <span className="text-xs text-slate-600 block">
                          Valor: <span className="font-bold text-red-750">{ind.value}</span> ({ind.status === "high" ? "Arriba del Límite" : "Abajo del Límite"})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    );
  }

  // 2. Patient Portfolios / Folder cards Grid
  return (
    <div className="w-full" id="patient-expedientes-grid">
      
      {/* Search Header and actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
            <FolderHeart className="w-4.5 h-4.5 text-teal-600" />
            Expedientes Clínicos (Historias por Paciente)
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Consolide los múltiples análisis de laboratorio de un mismo paciente en una única historia interactiva.
          </p>
        </div>

        <div className="relative rounded-xl shadow-sm w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-8.5 pr-3 py-1.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs transition-all bg-white"
          />
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <FolderHeart className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-3" />
          <span className="text-sm font-bold text-slate-800 block">Sin expedientes creados</span>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto leading-normal">
            No hay pacientes registrados que cumplan la condición de búsqueda actual. Registre nuevos resultados o limpie los filtros.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => {
            const ageFormatted = calculateAgeDescription(patient.birthdate);
            const latestExam = patient.records[0];

            return (
              <div 
                key={patient.key} 
                onClick={() => setSelectedPatientKey(patient.key)}
                className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 bg-teal-50 text-teal-800 rounded-xl flex items-center justify-center font-bold text-xs uppercase border border-teal-100">
                        {patient.name.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-950 capitalize truncate max-w-36">
                          {patient.name}
                        </h4>
                        <span className="text-[9.5px] text-slate-400 block font-mono mt-0.5">
                          DNI: {patient.idCard || "Sin Documento"}
                        </span>
                      </div>
                    </div>

                    <span className="text-[9px] bg-teal-50 text-teal-800 border border-teal-150 px-2 py-0.5 rounded-full font-bold">
                      {patient.records.length} {patient.records.length === 1 ? "Examen" : "Exámenes"}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-3 space-y-1.5 text-[11px] text-slate-500">
                    <div className="flex justify-between">
                      <span>Género / Edad:</span>
                      <strong className="text-slate-800 font-semibold">{patient.sex} ({ageFormatted})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Último análisis:</span>
                      <strong className="text-slate-800 font-semibold">{latestExam.examDate}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-teal-700 font-bold hover:text-teal-900 transition-colors">
                  <span>Revisar Historial Clínico</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
