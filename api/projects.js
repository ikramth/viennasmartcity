/**
 * GET  /api/projects?meta=1  → { ok, projects, storage }
 * POST /api/projects         → { ok, project }
 * POST /api/projects         → { ok }            when body is { verifyCode: true, code }
 *
 * Storage is optional and auto-detected, in this order:
 *   1. Upstash Redis / Vercel KV  (KV_REST_API_URL + KV_REST_API_TOKEN)
 *   2. Supabase                   (SUPABASE_URL + SUPABASE_ANON_KEY)
 *   3. Vercel Blob index          (BLOB_READ_WRITE_TOKEN, JSON index)
 *
 * With no storage configured the endpoint answers 501 so the portal
 * falls back to its local (localStorage) mode.
 */
import { put, list } from "@vercel/blob";

const TABLE = process.env.ATLAS_TABLE || "research_projects";
const DEFAULT_CLASS_CODE = "M1-MEDEA-2026";
const RAW_CLASS_CODE = String(process.env.ATLAS_CLASS_CODE == null ? "" : process.env.ATLAS_CLASS_CODE).trim();
/* Set ATLAS_CLASS_CODE=off (or open/none) to publish without a passcode. */
const CLASS_CODE = /^(off|open|none)$/i.test(RAW_CLASS_CODE) ? "" : RAW_CLASS_CODE || DEFAULT_CLASS_CODE;
const BLOB_INDEX = "atlas/corpus.json";
const KV_KEY = "atlas:corpus";
const LIMIT = 500;

const ALLOWED_FILE_EXT = /\.(pdf|pptx|png|jpe?g)$/i;

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const SB_URL = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const SB_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";

const ALLOWED_MODULES = ["SCF", "OUPTI", "SCF & OUPTI"];
const ALLOWED_CATEGORIES = ["international", "algeria"];

/* ---------- helpers ---------- */
function clean(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function cleanList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => clean(x, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value);
}

function isAllowedFileUrl(value) {
  if (!isHttpUrl(value)) return false;
  try {
    return ALLOWED_FILE_EXT.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

function baseName(value, max) {
  return clean(String(value == null ? "" : value).split(/[\\/]/).pop(), max);
}

function dbKind() {
  if (KV_URL && KV_TOKEN) return "kv";
  if (SB_URL && SB_KEY) return "supabase";
  if (BLOB_TOKEN) return "blob";
  return "none";
}

function providerLabel(kind) {
  if (kind === "kv") return "Upstash Redis / Vercel KV";
  if (kind === "supabase") return "Supabase";
  if (kind === "blob") return "Vercel Blob";
  return "localStorage";
}

function storageInfo() {
  const db = dbKind();
  return {
    db,
    files: Boolean(BLOB_TOKEN),
    provider: providerLabel(db),
    requireCode: Boolean(CLASS_CODE),
  };
}

async function kvCommand(command) {
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || `KV error ${res.status}`);
  }
  return data.result;
}

async function readKV() {
  const raw = await kvCommand(["GET", KV_KEY]);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeKV(projects) {
  await kvCommand(["SET", KV_KEY, JSON.stringify(projects)]);
}

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    city: row.city || "",
    country: row.country || "",
    authors: row.authors || "",
    module: row.module || "SCF & OUPTI",
    category: row.category || "international",
    summary: row.summary || "",
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    link: row.link || "",
    fileUrl: row.file_url || "",
    fileName: row.file_name || "",
    featured: false,
    source: "cloud",
    createdAt: row.created_at || new Date().toISOString(),
  };
}

async function readSupabase() {
  const url = `${SB_URL}/rest/v1/${encodeURIComponent(TABLE)}?select=*&order=created_at.desc&limit=${LIMIT}`;
  const res = await fetch(url, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(fromRow) : [];
}

async function writeSupabase(project) {
  const url = `${SB_URL}/rest/v1/${encodeURIComponent(TABLE)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: project.id,
      title: project.title,
      city: project.city,
      country: project.country,
      authors: project.authors,
      module: project.module,
      category: project.category,
      summary: project.summary,
      keywords: project.keywords,
      tags: project.keywords,
      file_url: project.fileUrl || null,
      file_name: project.fileName || null,
      link: project.link || null,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase insert failed ${res.status} ${detail}`.trim());
  }
}

async function readBlob() {
  const { blobs } = await list({ prefix: "atlas/", token: BLOB_TOKEN });
  const target = (blobs || []).find((b) => b.pathname === BLOB_INDEX);
  if (!target) return [];
  const res = await fetch(target.url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  if (!data) return [];
  return Array.isArray(data) ? data : Array.isArray(data.projects) ? data.projects : [];
}

async function writeBlob(projects) {
  await put(BLOB_INDEX, JSON.stringify({ projects, updatedAt: new Date().toISOString() }), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: BLOB_TOKEN,
  });
}

async function readProjects(kind) {
  if (kind === "kv") return readKV();
  if (kind === "supabase") return readSupabase();
  if (kind === "blob") return readBlob();
  return [];
}

async function writeProjects(kind, projects) {
  if (kind === "kv") return writeKV(projects);
  if (kind === "supabase") return; // insert handled per project
  if (kind === "blob") return writeBlob(projects);
}

/* ---------- validation ---------- */
function normalizeProject(input) {
  const p = input && typeof input === "object" ? input : {};
  const project = {
    id: /^[A-Za-z0-9_-]{6,64}$/.test(String(p.id || "")) ? String(p.id) : crypto.randomUUID(),
    title: clean(p.title, 160),
    city: clean(p.city, 120),
    country: clean(p.country, 90),
    authors: clean(p.authors, 140),
    module: ALLOWED_MODULES.includes(p.module) ? p.module : "",
    category: ALLOWED_CATEGORIES.includes(p.category) ? p.category : "",
    summary: clean(p.summary, 3000),
    keywords: cleanList(p.keywords, 8, 40),
    link: isHttpUrl(p.link) ? String(p.link).slice(0, 600) : "",
    fileUrl: isAllowedFileUrl(p.fileUrl) ? String(p.fileUrl).slice(0, 800) : "",
    fileName: baseName(p.fileName, 160),
    featured: false,
    source: "cloud",
    createdAt: new Date().toISOString(),
  };

  const errors = [];
  if (!project.title) errors.push("title");
  if (!project.country) errors.push("country");
  if (!project.authors) errors.push("authors");
  if (!project.module) errors.push("module");
  if (!project.category) errors.push("category");
  if (!project.link && !project.fileUrl) errors.push("file-or-link");
  return { project, errors };
}

/* ---------- handler ---------- */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const kind = dbKind();

  if (req.method === "GET") {
    if (kind === "none") {
      return res.status(501).json({
        ok: false,
        error: "storage-not-configured",
        storage: storageInfo(),
      });
    }
    try {
      const projects = await readProjects(kind);
      return res.status(200).json({ ok: true, projects, storage: storageInfo() });
    } catch (err) {
      console.error("[atlas] read failed", err);
      return res.status(500).json({ ok: false, error: "read-failed", storage: storageInfo() });
    }
  }

  if (req.method === "POST") {
    if (kind === "none") {
      return res.status(501).json({ ok: false, error: "storage-not-configured", storage: storageInfo() });
    }

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = null; }
    }
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "invalid-body" });
    }

    if (CLASS_CODE && clean(body.code, 80) !== CLASS_CODE) {
      return res.status(401).json({ ok: false, error: "invalid-class-code" });
    }

    // Lightweight preflight used before a Blob upload, so a bad cohort code
    // fails with a clear message instead of a generic upload-token error.
    if (body.verifyCode === true) {
      return res.status(200).json({ ok: true, storage: storageInfo() });
    }

    const { project, errors } = normalizeProject(body.project);
    if (errors.length) {
      return res.status(400).json({ ok: false, error: "missing-fields", fields: errors });
    }

    try {
      if (kind === "supabase") {
        await writeSupabase(project);
      } else {
        const current = await readProjects(kind);
        const next = [project, ...current.filter((p) => p && p.id !== project.id)].slice(0, LIMIT);
        await writeProjects(kind, next);
      }
      return res.status(201).json({ ok: true, project, storage: storageInfo() });
    } catch (err) {
      console.error("[atlas] write failed", err);
      return res.status(500).json({ ok: false, error: "write-failed" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, error: "method-not-allowed" });
}
