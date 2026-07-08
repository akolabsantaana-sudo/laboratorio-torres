import React, { useState, useEffect } from "react";
import { Database, Cpu, Server, Activity, Wifi, CheckCircle2, AlertCircle, RefreshCw, Radio } from "lucide-react";

interface DiagnosticsData {
  isVercel: boolean;
  postgresConfigured: boolean;
  supabaseClientConfigured: boolean;
  activeStorageEngine: "SUPABASE_JS_SDK" | "RAW_POSTGRES_POOL" | "LOCAL_JSON_FILE";
  status: "OK" | "ERROR";
  latencyMs?: number;
  message: string;
}

export default function DatabaseDiagnostics() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<"supabase" | "vercel" | "github">("supabase");

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/db-diagnostics?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) {
        let errMsg = `Error de servidor (${res.status})`;
        try {
          const jsonErr = await res.json();
          if (jsonErr && jsonErr.details) {
            errMsg = `${jsonErr.error || "Error"}: ${jsonErr.details}`;
          } else if (jsonErr && jsonErr.error) {
            errMsg = jsonErr.error;
          }
        } catch {
          // If response is not JSON (e.g. HTML from a 502/503 during a dev server restart or cold start)
          if (res.status === 502 || res.status === 503 || res.status === 504) {
            errMsg = `El servidor web se está iniciando o compilando (Código ${res.status}). Por favor, espere unos segundos e intente de nuevo con el botón 'Realizar Test'.`;
          } else if (res.statusText) {
            errMsg = `Error de servidor (${res.status}): ${res.statusText}`;
          }
        }
        throw new Error(errMsg);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch") || err?.message?.includes("fetch")) {
        setError("No se pudo conectar con el servidor web. El servidor podría estar reiniciándose, compilando o temporalmente desconectado.");
      } else {
        setError(err?.message || "Error al conectar con la API de diagnóstico");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm text-left" id="database-diagnostics-card">
      {/* Card Header Banner decoration */}
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-150 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-tight">Diagnóstico de Base de Datos y Servidor</h3>
            <p className="text-[10px] text-slate-400 font-medium">Revisión en tiempo real de la persistencia e infraestructura</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchDiagnostics}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          {loading ? "Revisando..." : "Realizar Test"}
        </button>
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-150 text-red-700 rounded-xl text-xs flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Error de Enlace temporal con el Servidor:</p>
              <p className="text-slate-600 font-medium leading-relaxed">{error}</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                * Nota: Si el contenedor de desarrollo se estaba iniciando, compilando o reiniciando, este error desaparecerá en unos segundos. 
                Mientras tanto, la base de datos de contingencia local está activa en memoria para garantizar que puedas continuar guardando pacientes y reportes de forma segura y sin interrupciones. 
                Haz clic en <strong className="text-indigo-600">"Realizar Test"</strong> para reintentar la conexión.
              </p>
            </div>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Status Segment */}
            <div className="bg-slate-50/65 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Estado de Conexión</span>
              <div className="flex items-center gap-2 mt-2">
                {data.status === "OK" ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-505 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-slate-800">Activo (Sincronizado)</span>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-xs font-bold text-red-650">Error de Enlace</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-slate-450 mt-1 font-semibold leading-relaxed shrink-0">
                {data.message}
              </span>
            </div>

            {/* Persistence Engine Segment */}
            <div className="bg-slate-50/65 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Motor Activo</span>
              <div className="flex items-center gap-1.5 mt-2 bg-white/80 p-1 px-2.5 border border-slate-205 rounded-lg w-fit text-slate-750 font-mono text-xs font-bold">
                <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                {data.activeStorageEngine === "SUPABASE_JS_SDK" && "Supabase Client SDK"}
                {data.activeStorageEngine === "RAW_POSTGRES_POOL" && "PostgreSQL Pool TCP"}
                {data.activeStorageEngine === "LOCAL_JSON_FILE" && "Local JSON/Memory File"}
              </div>
              <p className="text-[9.5px] text-slate-400 mt-1 font-medium leading-normal">
                {data.activeStorageEngine === "SUPABASE_JS_SDK" && "Sincroniza registros directo mediante peticiones HTTPS seguras al REST API."}
                {data.activeStorageEngine === "RAW_POSTGRES_POOL" && "Conexión TCP directa mediante socket pool a Base de Datos relacional."}
                {data.activeStorageEngine === "LOCAL_JSON_FILE" && "Backup local preventivo de contingencia activo en el contenedor virtual."}
              </p>
            </div>

            {/* Latency and Hosting Segment */}
            <div className="bg-slate-50/65 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hosting e Infraeestructura</span>
              <div className="mt-2 text-xs font-bold text-slate-800 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-450 font-medium">Contenedor Cloud Run / Vercel:</span>
                  <span className="font-mono text-[10px] bg-indigo-50/70 border border-indigo-100/50 text-indigo-700 px-1.5 py-0.5 rounded font-extrabold uppercase">
                    {data.isVercel ? "Vercel Node" : "Cloud Run Core"}
                  </span>
                </div>
                {data.latencyMs !== undefined && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-slate-450 font-medium">Latencia Consulta:</span>
                    <span className="font-mono text-[10px] text-slate-600">
                      {data.latencyMs} ms
                    </span>
                  </div>
                )}
              </div>
              <div className="text-[9.5px] text-slate-400 mt-1 leading-normal font-medium">
                La persistencia es escalable y segura bajo cifrado simétrico robusto AES-GCM del lado del cliente.
              </div>
            </div>
          </div>
        )}

        {/* Technical Keys Diagnostic Table */}
        {data && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Estado de Variables de Entorno</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-450">DATABASES_URL / SUPABASE_DB_URL</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${data.postgresConfigured ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-550/10 text-amber-600 border border-amber-500/10"}`}>
                  {data.postgresConfigured ? "CONFIGURADA" : "PENDIENTE DE ENLACE"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-450">SUPABASE_URL & ANON_KEY (SDK)</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${data.supabaseClientConfigured ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-550/10 text-amber-600 border border-amber-500/10"}`}>
                  {data.supabaseClientConfigured ? "CONFIGURADA" : "PENDIENTE DE ENLACE"}
                </span>
              </div>
            </div>

            {/* Step-by-step Interactive Deployment & Sync Manual */}
            <div className="mt-5 p-4 rounded-xl border border-indigo-100 bg-indigo-50/15 text-slate-700 text-xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <p className="font-extrabold text-[#4F46E5] uppercase tracking-wide text-[11px]">Centro de Integración: Supabase, Vercel & GitHub</p>
              </div>
              <p className="text-[11.5px] text-slate-500 leading-normal mb-3.5">
                Sigue esta guía interactiva paso a paso para desplegar tu aplicación en producción utilizando Vercel, enlazar tu propia base de datos cifrada en Supabase y mantener tu código sincronizado con GitHub.
              </p>

              {/* Tabs selector */}
              <div className="flex border-b border-slate-200 mb-4 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab("supabase")}
                  className={`px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                    activeGuideTab === "supabase"
                      ? "border-indigo-650 text-indigo-700 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-650"
                  }`}
                >
                  ⚡ Supabase (SQL & Config)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab("vercel")}
                  className={`px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                    activeGuideTab === "vercel"
                      ? "border-indigo-650 text-indigo-700 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-650"
                  }`}
                >
                  ▲ Despliegue en Vercel
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab("github")}
                  className={`px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                    activeGuideTab === "github"
                      ? "border-indigo-650 text-indigo-700 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-650"
                  }`}
                >
                  🐙 Sincronización GitHub
                </button>
              </div>

              {/* Tab Content: Supabase */}
              {activeGuideTab === "supabase" && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-550 leading-normal">
                    La persistencia de <strong>AKO Laboratorio</strong> utiliza cifrado AES-GCM del lado del cliente. Puedes enlazar Supabase de dos formas:
                  </p>

                  <div className="space-y-3 font-sans">
                    <div className="bg-white/90 p-3.5 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full uppercase font-mono">Opción Recomendada A (Conexión TCP Postgres Directa)</span>
                      <p className="mt-1 text-[11px] text-slate-650">Configura la siguiente variable en tu archivo de variables de entorno o Secretos:</p>
                      <div className="mt-1.5 font-mono text-[10.5px] p-2.5 bg-slate-50 rounded border border-slate-100 break-all select-all select-text font-bold text-indigo-700">
                        DATABASE_URL=postgres://postgres.[ID_PROYECTO]:[CONTRASENA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
                      </div>
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        * Al usar esta opción, las tablas se autoinicializan e insertan de forma completamente automatizada en tu base de datos Supabase al arrancar el servidor.
                      </p>
                    </div>
                    
                    <div className="bg-white/90 p-3.5 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full uppercase font-mono">Opción B (Cliente HTTP SDK)</span>
                      <p className="mt-1 text-[11px] text-slate-650">Configura estas dos variables de entorno:</p>
                      <div className="mt-1.5 space-y-1 font-mono text-[10.5px] text-slate-800 p-2.5 bg-slate-50 rounded border border-slate-100">
                        <div><strong className="text-teal-980">NEXT_PUBLIC_SUPABASE_URL</strong> = https://xxxx.supabase.co</div>
                        <div><strong className="text-teal-980">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</strong> = eyJhbGciOiJIUzI1NiIs...</div>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 font-bold">
                        ⚠️ Requisito de Tablas para Opción B:
                      </p>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Si te conectas por HTTP SDK, debes crear las tablas manualmente. Copia y ejecuta este script SQL directamente en el <strong>SQL Editor</strong> de tu panel de Supabase:
                      </p>
                      <div className="mt-2 font-mono text-[10px] p-2.5 bg-slate-900 text-slate-200 rounded-lg border border-slate-950 max-h-48 overflow-y-auto select-all">
{`CREATE TABLE IF NOT EXISTS lab_users (
    lab_id TEXT PRIMARY KEY,
    auth_token_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lab_records (
    id TEXT PRIMARY KEY,
    lab_id TEXT NOT NULL REFERENCES lab_users(lab_id) ON DELETE CASCADE,
    encrypted_data TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lab_profiles (
    lab_id TEXT PRIMARY KEY REFERENCES lab_users(lab_id) ON DELETE CASCADE,
    encrypted_profile TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lab_records_lab_id ON lab_records (lab_id);`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Vercel */}
              {activeGuideTab === "vercel" && (
                <div className="space-y-3.5">
                  <p className="text-[11px] text-slate-550 leading-normal">
                    Este proyecto cuenta con soporte nativo de backend serverless para desplegarse en <strong>Vercel</strong> en un solo paso:
                  </p>
                  <ol className="list-decimal pl-5 space-y-2 text-[11px] text-slate-600 leading-normal">
                    <li>
                      Crea un proyecto en tu panel de <strong className="text-slate-800">Vercel</strong> e importa el repositorio de tu proyecto.
                    </li>
                    <li>
                      En la sección de <strong>Environment Variables</strong> de Vercel, agrega tu variable de conexión a base de datos (por ejemplo, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-bold">DATABASE_URL</code> de Supabase).
                    </li>
                    <li>
                      Vercel utilizará de forma automática la configuración que hemos preparado en <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-bold">vercel.json</code>, la cual redirige correctamente todas las rutas <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-bold">/api/*</code> hacia nuestro backend serverless Express en <code className="bg-slate-100 px-1 py-0.5 rounded">/api/index.ts</code>.
                    </li>
                    <li>
                      Haz clic en <strong>Deploy</strong>. Vercel compilará la SPA de React con Vite y servirá tus endpoints REST de forma instantánea.
                    </li>
                  </ol>
                  <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg text-[10.5px] text-indigo-750">
                    💡 <strong>¡Soporte Serverless Listo!</strong> El proyecto ya contiene todos los archivos necesarios para resolver la ruta estática y las conexiones API en Vercel de forma automática sin configuraciones adicionales.
                  </div>
                </div>
              )}

              {/* Tab Content: GitHub */}
              {activeGuideTab === "github" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-550 leading-normal">
                    Mantén tu código seguro y automatiza tus despliegues a Vercel sincronizando tu proyecto con <strong>GitHub</strong>:
                  </p>
                  <div className="bg-white/90 p-3 rounded-lg border border-slate-100 shadow-sm space-y-2">
                    <p className="font-bold text-slate-750 text-[11px]">Opción 1: Exportar Directamente</p>
                    <p className="text-[11px] text-slate-650 leading-relaxed">
                      En la esquina superior derecha de esta interfaz, ve a la configuración y selecciona <strong>"Export to GitHub"</strong>. Podrás loguearte y crear un repositorio con el código actual directamente en tu cuenta de GitHub.
                    </p>
                  </div>
                  <div className="bg-white/90 p-3 rounded-lg border border-slate-100 shadow-sm space-y-2">
                    <p className="font-bold text-slate-750 text-[11px]">Opción 2: Subida Manual vía Terminal</p>
                    <p className="text-[11px] text-slate-650 leading-relaxed">
                      Descarga el archivo ZIP del proyecto, descomprímelo en tu computadora, abre la terminal en esa carpeta y ejecuta:
                    </p>
                    <div className="font-mono text-[10px] p-2.5 bg-slate-900 text-slate-200 rounded-lg select-all text-left">
{`git init
git add .
git commit -m "feat: launch AKO laboratorio"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main`}
                    </div>
                  </div>
                  <div className="mt-2 text-[10.5px] text-slate-450 leading-relaxed">
                    💡 Al conectar el repositorio de GitHub con tu proyecto de Vercel, cada <code className="bg-slate-100 px-1 py-0.5 rounded">git push</code> que realices actualizará tu sitio web en producción en tiempo real de forma automática.
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-3.5 bg-indigo-50/20 border border-indigo-100/30 p-2.5 rounded-lg text-left">
              💬 <strong>Nota de Seguridad:</strong> Todas las bases de datos externas funcionan bajo encapsulado de extremo a extremo (E2E Encrypted AES-GCM) derivando llaves en tu propio navegador. El servidor de base de datos solo almacena bloques altamente cifrados ilegibles para terceros.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
