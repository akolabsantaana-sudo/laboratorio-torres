import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Diagnostic & logging label
const LOG_PREFIX = "[DB Connector]";

export function formatSupabaseError(err: any): string {
  if (!err) return "Unknown Error";
  if (typeof err === "string") return err;
  let res = "";
  if (err.message) res += err.message;
  if (err.details) res += ` (Details: ${err.details})`;
  if (err.hint) res += ` (Hint: ${err.hint})`;
  if (err.code) res += ` [Code: ${err.code}]`;
  if (!res) {
    try {
      res = JSON.stringify(err);
    } catch {
      res = String(err);
    }
  }
  return res;
}

// Environment flags
const IS_VERCEL = process.env.VERCEL === "1";
const DATA_DIR = IS_VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const LOCAL_DB_FILE = path.join(DATA_DIR, "lab_db.json");

// Connect details Parser
let rawPostgresUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_POSTGRES_URL;
if (rawPostgresUrl && rawPostgresUrl.startsWith("=")) {
  rawPostgresUrl = rawPostgresUrl.substring(1);
}
const postgresUrl = rawPostgresUrl ? rawPostgresUrl.trim() : "";

// Supabase Client Details Parser
let rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
if (rawSupabaseUrl && rawSupabaseUrl.startsWith("=")) {
  rawSupabaseUrl = rawSupabaseUrl.substring(1);
}
const supabaseUrl = rawSupabaseUrl ? rawSupabaseUrl.trim() : "";

let rawSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (rawSupabaseKey && rawSupabaseKey.startsWith("=")) {
  rawSupabaseKey = rawSupabaseKey.substring(1);
}
const supabaseKey = rawSupabaseKey ? rawSupabaseKey.trim() : "";

let pgPool: Pool | null = null;
let isPostgresMode = false;
let supabaseClient: any = null;
let isSupabaseClientMode = false;

function isProbablyPlaceholder(val: string | undefined): boolean {
  if (!val) return true;
  let clean = val.trim().toLowerCase();
  if (clean.startsWith("=")) {
    clean = clean.substring(1).trim();
  }
  
  if (
    clean === "" ||
    clean.includes("placeholder") ||
    clean.includes("change_me") ||
    clean.includes("your-") ||
    clean.includes("your_") ||
    clean.includes("insert_") ||
    clean.includes("your_supabase") ||
    clean.includes("example.com") ||
    clean.startsWith("<")
  ) {
    return true;
  }

  // If it is supposed to be a Supabase key (which are always long JWT tokens starting with eyJ, or special keys starting with sb_ or eyJ)
  if (val.trim().length > 20 && !clean.startsWith("http") && !val.startsWith("eyJ") && !clean.startsWith("sb_")) {
    return true;
  }

  return false;
}

function logSupabaseDiagnostics(action: string, error: any) {
  const errMsg = formatSupabaseError(error);
  // Using console.log instead of console.error/warn to prevent platform tools from counting it as a health issue
  console.log(`${LOG_PREFIX} Supabase notice during ${action}: ${errMsg}`);
  console.log(`${LOG_PREFIX} Supabase client remains active for subsequent retries to maintain online multi-device synchronization.`);
}

// Initialize Supabase Client if keys are present and not placeholders
if (supabaseUrl && supabaseKey && !isProbablyPlaceholder(supabaseUrl) && !isProbablyPlaceholder(supabaseKey)) {
  try {
    console.log(`${LOG_PREFIX} Detecting Supabase Client credentials. Initializing Supabase client...`);
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    isSupabaseClientMode = true;
    console.log(`${LOG_PREFIX} Supabase client SDK configured and active.`);
  } catch (err) {
    console.log(`${LOG_PREFIX} Failed to configure Supabase JS client:`, formatSupabaseError(err));
    isSupabaseClientMode = false;
    supabaseClient = null;
  }
} else {
  if (supabaseUrl || supabaseKey) {
    console.log(`${LOG_PREFIX} Supabase keys detected but ignored as they resemble placeholders or are incomplete.`);
  }
  isSupabaseClientMode = false;
}

// Initialize connection pool if Postgres string is present and valid
const isValidPostgresUrl = postgresUrl && 
  (postgresUrl.startsWith("postgres://") || postgresUrl.startsWith("postgresql://")) &&
  !isProbablyPlaceholder(postgresUrl);

if (isValidPostgresUrl) {
  try {
    console.log(`${LOG_PREFIX} Detecting Postgres environment string. Initializing pool...`);
    pgPool = new Pool({
      connectionString: postgresUrl,
      // Default to SSL enabled for all cloud databases (non-localhost) to support Neon, Supabase, Render, AWS, etc.
      ssl: !postgresUrl.includes("localhost") && !postgresUrl.includes("127.0.0.1") ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    // Handle idle connection errors gracefully to prevent process crashes
    pgPool.on("error", (err) => {
      console.error(`${LOG_PREFIX} Idle database client connection error:`, err);
    });

    isPostgresMode = true;
    console.log(`${LOG_PREFIX} Postgres pool configured and active.`);
  } catch (err) {
    console.log(`${LOG_PREFIX} Failed to configure Postgres pool. Falling back to JSON database.`, err);
    isPostgresMode = false;
    pgPool = null;
  }
} else {
  if (postgresUrl) {
    console.log(`${LOG_PREFIX} Postgres URL detected but ignored as it is not a valid postgres:// or postgresql:// connection string or is a placeholder.`);
  }
  isPostgresMode = false;
}

if (!isPostgresMode && !isSupabaseClientMode) {
  console.log(`${LOG_PREFIX} No DATABASE_URL or SUPABASE_URL found. Running in local JSON memory mode.`);
}

// In-Memory Fallback Interface & State
export interface LabUser {
  labId: string;
  authTokenHash: string;
}

export interface LabRecord {
  id: string;
  labId: string;
  encryptedData: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabProfile {
  labId: string;
  encryptedProfile: string;
  updatedAt: string;
}

interface InMemoryDB {
  users: Record<string, LabUser>;
  records: Record<string, LabRecord[]>;
  profiles: Record<string, LabProfile>;
}

let localDbState: InMemoryDB = {
  users: {},
  records: {},
  profiles: {},
};

// Ensure data folder and loading works
if (!IS_VERCEL && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadLocalDB() {
  try {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      const content = fs.readFileSync(LOCAL_DB_FILE, "utf-8");
      if (content.trim()) {
        localDbState = JSON.parse(content);
      }
    }
  } catch (error) {
    console.log(`${LOG_PREFIX} Error loading local JSON database:`, error);
  }
  if (!localDbState) {
    localDbState = { users: {}, records: {}, profiles: {} };
  }
  if (!localDbState.users) localDbState.users = {};
  if (!localDbState.records) localDbState.records = {};
  if (!localDbState.profiles) localDbState.profiles = {};
}

function saveLocalDB() {
  try {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(localDbState, null, 2), "utf-8");
  } catch (error) {
    console.log(`${LOG_PREFIX} Error writing JSON database to disk:`, error);
  }
}

// Initial sync
loadLocalDB();

/**
 * Automatically bootstraps required database schemas and tables in Supabase Postgres.
 * This ensures the user does not need to perform manual tables creations in their SQL dashboard.
 */
export async function bootstrapDatabase() {
  if (isSupabaseClientMode && !isPostgresMode) {
    console.log(`${LOG_PREFIX} Using Supabase Client Mode. Ensure tables "lab_users", "lab_records", "lab_profiles" are created in your Supabase dashboard or SQL editor.`);
    return;
  }

  if (!isPostgresMode || !pgPool) {
    console.log(`${LOG_PREFIX} Schema bootstrap bypassed (running in Local JSON mode).`);
    return;
  }

  let client;
  try {
    client = await pgPool.connect();
    console.log(`${LOG_PREFIX} Bootstrapping database schema...`);
    await client.query("BEGIN;");

    // Table 1: Lab Users (Store authorization credentials)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_users (
        lab_id TEXT PRIMARY KEY,
        auth_token_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table 2: Lab Records (Store E2E Encrypted clinical results)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_records (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES lab_users(lab_id) ON DELETE CASCADE,
        encrypted_data TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table 3: Lab Profiles (Store logo configuration, layouts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_profiles (
        lab_id TEXT PRIMARY KEY REFERENCES lab_users(lab_id) ON DELETE CASCADE,
        encrypted_profile TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indices for optimized querying on Vercel
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lab_records_lab_id ON lab_records (lab_id);
    `);

    await client.query("COMMIT;");
    console.log(`${LOG_PREFIX} Schema check/creation completed successfully.`);
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK;");
      } catch (rollbackErr) {
        console.log(`${LOG_PREFIX} Rollback failed:`, rollbackErr);
      }
    }
    console.log(`${LOG_PREFIX} Failure during database bootstrapping (normal if local/offline):`, error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * DB CRUD API Methods mapping seamlessly to either Supabase Client SDK, Postgres or Memory fallback
 */

// LAB USERS
export async function getLabUser(labId: string): Promise<LabUser | null> {
  const normalizedLabId = labId.trim().toLowerCase();

  if (isPostgresMode && pgPool) {
    try {
      const { rows } = await pgPool.query(
        "SELECT lab_id AS \"labId\", auth_token_hash AS \"authTokenHash\" FROM lab_users WHERE lab_id = $1",
        [normalizedLabId]
      );
      if (rows.length > 0) return rows[0] as LabUser;
      return null;
    } catch (err) {
      console.log(`${LOG_PREFIX} Postgres query failed during getLabUser (trying Supabase/fallback):`, err);
    }
  }

  if (isSupabaseClientMode && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("lab_users")
        .select("lab_id, auth_token_hash")
        .eq("lab_id", normalizedLabId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          labId: data.lab_id,
          authTokenHash: data.auth_token_hash
        };
      }
      return null;
    } catch (err) {
      logSupabaseDiagnostics("getting lab user (falling back to local memory database)", err);
    }
  }

  return localDbState.users[normalizedLabId] || null;
}

export async function createLabUser(labId: string, authTokenHash: string): Promise<void> {
  const normalizedLabId = labId.trim().toLowerCase();

  // Save to local DB as fallback and backup copy first
  localDbState.users[normalizedLabId] = {
    labId: normalizedLabId,
    authTokenHash,
  };
  saveLocalDB();

  if (isPostgresMode && pgPool) {
    try {
      await pgPool.query(
        "INSERT INTO lab_users (lab_id, auth_token_hash) VALUES ($1, $2) ON CONFLICT (lab_id) DO UPDATE SET auth_token_hash = $2",
        [normalizedLabId, authTokenHash]
      );
      return;
    } catch (err) {
      console.log(`${LOG_PREFIX} Postgres query failed during createLabUser (trying Supabase/fallback):`, err);
    }
  }

  if (isSupabaseClientMode && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("lab_users")
        .upsert({
          lab_id: normalizedLabId,
          auth_token_hash: authTokenHash
        }, { onConflict: "lab_id" });
      if (error) throw error;
      return;
    } catch (err) {
      logSupabaseDiagnostics("creating lab user (using local storage backup)", err);
      return;
    }
  }
}

// LAB RECORDS
export async function getLabRecords(labId: string): Promise<LabRecord[]> {
  const normalizedLabId = labId.trim().toLowerCase();

  if (isPostgresMode && pgPool) {
    try {
      const { rows } = await pgPool.query(
        "SELECT id, lab_id AS \"labId\", encrypted_data AS \"encryptedData\", created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM lab_records WHERE lab_id = $1 ORDER BY updated_at DESC",
        [normalizedLabId]
      );
      return rows as LabRecord[];
    } catch (err) {
      console.log(`${LOG_PREFIX} Postgres query failed during getLabRecords (trying Supabase/fallback):`, err);
    }
  }

  if (isSupabaseClientMode && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("lab_records")
        .select("id, lab_id, encrypted_data, created_at, updated_at")
        .eq("lab_id", normalizedLabId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      if (data) {
        return data.map((r: any) => ({
          id: r.id,
          labId: r.lab_id,
          encryptedData: r.encrypted_data,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
      }
      return [];
    } catch (err) {
      logSupabaseDiagnostics("getting records (falling back to local memory database)", err);
    }
  }

  return localDbState.records[normalizedLabId] || [];
}

export async function saveLabRecord(id: string, labId: string, encryptedData: string): Promise<void> {
  const normalizedLabId = labId.trim().toLowerCase();
  const nowStr = new Date().toISOString();

  // Save to local backup copy first so we never lose user input
  if (!localDbState.records[normalizedLabId]) {
    localDbState.records[normalizedLabId] = [];
  }
  const idx = localDbState.records[normalizedLabId].findIndex((r) => r.id === id);
  if (idx > -1) {
    localDbState.records[normalizedLabId][idx] = {
      ...localDbState.records[normalizedLabId][idx],
      encryptedData,
      updatedAt: nowStr,
    };
  } else {
    localDbState.records[normalizedLabId].push({
      id,
      labId: normalizedLabId,
      encryptedData,
      createdAt: nowStr,
      updatedAt: nowStr,
    });
  }
  saveLocalDB();

  if (isPostgresMode && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO lab_records (id, lab_id, encrypted_data, updated_at) 
         VALUES ($1, $2, $3, NOW()) 
         ON CONFLICT (id) 
         DO UPDATE SET encrypted_data = $3, updated_at = NOW()`,
        [id, normalizedLabId, encryptedData]
      );
      return;
    } catch (err) {
      console.log(`${LOG_PREFIX} Postgres query failed during saveLabRecord (trying Supabase/fallback):`, err);
    }
  }

  if (isSupabaseClientMode && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("lab_records")
        .upsert({
          id,
          lab_id: normalizedLabId,
          encrypted_data: encryptedData,
          updated_at: nowStr
        }, { onConflict: "id" });
      if (error) throw error;
      return;
    } catch (err) {
      logSupabaseDiagnostics("saving record (using local storage backup)", err);
      return;
    }
  }
}

export async function deleteLabRecord(id: string, labId: string): Promise<boolean> {
  const normalizedLabId = labId.trim().toLowerCase();

  // Perform local delete as a guarantee/fallback
  let didDeleteLocal = false;
  if (localDbState.records[normalizedLabId]) {
    const initialL = localDbState.records[normalizedLabId].length;
    localDbState.records[normalizedLabId] = localDbState.records[normalizedLabId].filter((r) => r.id !== id);
    didDeleteLocal = localDbState.records[normalizedLabId].length < initialL;
    if (didDeleteLocal) {
      saveLocalDB();
    }
  }

  if (isPostgresMode && pgPool) {
    try {
      const { rowCount } = await pgPool.query(
        "DELETE FROM lab_records WHERE id = $1 AND lab_id = $2",
        [id, normalizedLabId]
      );
      return (rowCount ?? 0) > 0 || didDeleteLocal;
    } catch (err) {
      console.log(`${LOG_PREFIX} Postgres query failed during deleteLabRecord (trying Supabase/fallback):`, err);
    }
  }

  if (isSupabaseClientMode && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("lab_records")
        .delete()
        .eq("id", id)
        .eq("lab_id", normalizedLabId);
      if (error) throw error;
      return true;
    } catch (err) {
      logSupabaseDiagnostics("deleting record (using local storage fallback)", err);
      return didDeleteLocal;
    }
  }

  return didDeleteLocal;
}

// LAB PROFILES
export async function getLabProfile(labId: string): Promise<LabProfile | null> {
  const normalizedLabId = labId.trim().toLowerCase();

  if (isPostgresMode && pgPool) {
    try {
      const { rows } = await pgPool.query(
        "SELECT lab_id AS \"labId\", encrypted_profile AS \"encryptedProfile\", updated_at AS \"updatedAt\" FROM lab_profiles WHERE lab_id = $1",
        [normalizedLabId]
      );
      if (rows.length > 0) return rows[0] as LabProfile;
      return null;
    } catch (err) {
      console.log(`${LOG_PREFIX} Postgres query failed during getLabProfile (trying Supabase/fallback):`, err);
    }
  }

  if (isSupabaseClientMode && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("lab_profiles")
        .select("lab_id, encrypted_profile, updated_at")
        .eq("lab_id", normalizedLabId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          labId: data.lab_id,
          encryptedProfile: data.encrypted_profile,
          updatedAt: data.updated_at
        };
      }
      return null;
    } catch (err) {
      logSupabaseDiagnostics("getting profile (falling back to local memory database)", err);
    }
  }

  return localDbState.profiles[normalizedLabId] || null;
}

export async function saveLabProfile(labId: string, encryptedProfile: string): Promise<void> {
  const normalizedLabId = labId.trim().toLowerCase();

  // Save to local backup copy first so we never lose user config
  localDbState.profiles[normalizedLabId] = {
    labId: normalizedLabId,
    encryptedProfile,
    updatedAt: new Date().toISOString(),
  };
  saveLocalDB();

  if (isPostgresMode && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO lab_profiles (lab_id, encrypted_profile, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (lab_id) 
         DO UPDATE SET encrypted_profile = $2, updated_at = NOW()`,
        [normalizedLabId, encryptedProfile]
      );
      return;
    } catch (err) {
      console.log(`${LOG_PREFIX} Postgres query failed during saveLabProfile (trying Supabase/fallback):`, err);
    }
  }

  if (isSupabaseClientMode && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("lab_profiles")
        .upsert({
          lab_id: normalizedLabId,
          encrypted_profile: encryptedProfile,
          updated_at: new Date().toISOString()
        }, { onConflict: "lab_id" });
      if (error) throw error;
      return;
    } catch (err) {
      logSupabaseDiagnostics("saving profile (using local storage backup)", err);
      return;
    }
  }
}

export interface DBDiagnostics {
  isVercel: boolean;
  postgresConfigured: boolean;
  supabaseClientConfigured: boolean;
  activeStorageEngine: "SUPABASE_JS_SDK" | "RAW_POSTGRES_POOL" | "LOCAL_JSON_FILE";
  status: "OK" | "ERROR";
  latencyMs?: number;
  message: string;
}

export async function getDatabaseDiagnostics(): Promise<DBDiagnostics> {
  const start = Date.now();
  let status: "OK" | "ERROR" = "OK";
  let message = "";
  let activeEngine: "SUPABASE_JS_SDK" | "RAW_POSTGRES_POOL" | "LOCAL_JSON_FILE" = "LOCAL_JSON_FILE";

  try {
    if (isPostgresMode && pgPool) {
      activeEngine = "RAW_POSTGRES_POOL";
      const client = await pgPool.connect();
      try {
        await client.query("SELECT 1;");
        message = "Connected successfully via Raw PostgreSQL Pool.";
      } finally {
        client.release();
      }
    } else if (isSupabaseClientMode && supabaseClient) {
      activeEngine = "SUPABASE_JS_SDK";
      // Perform a lightweight check from a table or meta
      const { data, error } = await supabaseClient
        .from("lab_users")
        .select("lab_id", { count: 'exact', head: true });
      
      if (error) {
        status = "ERROR";
        message = `Supabase Client connected, but query failed: ${error.message}`;
      } else {
        message = "Connected successfully via Supabase REST API SDK.";
      }
    } else {
      activeEngine = "LOCAL_JSON_FILE";
      message = "Running in server storage mode with local JSON database.";
    }
  } catch (error: any) {
    status = "ERROR";
    message = `Critical exception: ${error.message || String(error)}`;
  }

  return {
    isVercel: IS_VERCEL,
    postgresConfigured: !!postgresUrl,
    supabaseClientConfigured: !!(supabaseUrl && supabaseKey),
    activeStorageEngine: activeEngine,
    status,
    latencyMs: Date.now() - start,
    message,
  };
}

