/**
 * Shared server helpers for the Atlas serverless endpoints.
 *
 * Storage is optional and auto-detected, in this order:
 *   1. Upstash Redis / Vercel KV  (KV_REST_API_URL + KV_REST_API_TOKEN)
 *   2. Supabase                   (SUPABASE_URL + SUPABASE_ANON_KEY)
 *   3. Vercel Blob index          (BLOB_READ_WRITE_TOKEN, JSON index)
 *
 * The first request after a deployment performs a one-time clean slate:
 * every cloud test project / file is removed so the corpus starts with the
 * two founding studies (which live in the browser, in portal.js).
 * A marker (KV key or Blob file) guarantees the purge runs exactly once.
 */
import { put, list, del } from "@vercel/blob";

export const LIMIT = 500;

export const DEFAULT_CLASS_CODE = "M1-MEDEA-2026";
export const DEFAULT_TEACHER_CODE = "PROF-MEDEA-2026";

/* Set ATLAS_CLASS_CODE=off (or open/none) to publish without a section code. */
const RAW_CLASS_CODE = String(process.env.ATLAS_CLASS_CODE == null ? "" : process.env.ATLAS_CLASS_CODE).trim();
export const CLASS_CODE = /^(off|open|none)$/i.test(RAW_CLASS_CODE) ? "" : RAW_CLASS_CODE || DEFAULT_CLASS_CODE;

/* Set ATLAS_TEACHER_CODE=off to disable the teacher space entirely. */
const RAW_TEACHER_CODE = String(process.env.ATLAS_TEACHER_CODE == null ? "" : process.env.ATLAS_TEACHER_CODE).trim();
export const TEACHER_CODE = /^(off|open|none)$/i.test(RAW_TEACHER_CODE) ? "" : RAW_TEACHER_CODE || DEFAULT_TEACHER_CODE;

export const CORPUS_KEY = "atlas:corpus";
export const TEACHER_KEY = "atlas:teacher";
export const CORPUS_BLOB = "atlas/corpus.json";
export const TEACHER_BLOB = "atlas/teacher.json";
export const RESET_KEY = "atlas:clean-slate:v1";
export const RESET_BLOB = "atlas/clean-slate.json";

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const SB_URL = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
export const SB_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
export const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";

export const ALLOWED_MODULES = ["SCF", "OUPTI", "SCF & OUPTI"];
export const ALLOWED_CATEGORIES = ["international", "algeria"];
export const ALLOWED_ANNOUNCEMENT_KINDS = ["announcement", "remark", "resource", "note"];
export const ALLOWED_FILE_EXT = /\.(pdf|pptx|png|jpe?g)$/i;

const OWNER_HASH = /^[a-f0-9]{64}$/i;

/* ---------- text helpers ---------- */
export function clean(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

export function cleanList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => clean(x, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value);
}

export function isAllowedFileUrl(value) {
  if (!isHttpUrl(value)) return false;
  try {
    return ALLOWED_FILE_EXT.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

export function baseName(value, max) {
  return clean(String(value == null ? "" : value).split(/[\\/]/).pop(), max);
}

export function isOwnerHash(value) {
  return typeof value === "string" && OWNER_HASH.test(value);
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value == null ? "" : value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------- request body ---------- */
export function parseBody(body) {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === "object" ? body : null;
}

/* ---------- storage detection ---------- */
export function dbKind() {
  if (KV_URL && KV_TOKEN) return "kv";
  if (SB_URL && SB_KEY) return "supabase";
  if (BLOB_TOKEN) return "blob";
  return "none";
}

export function providerLabel(kind) {
  if (kind === "kv") return "Upstash Redis / Vercel KV";
  if (kind === "supabase") return "Supabase";
  if (kind === "blob") return "Vercel Blob";
  return "localStorage";
}

export function storageInfo() {
  const db = dbKind();
  return {
    db,
    files: Boolean(BLOB_TOKEN),
    provider: providerLabel(db),
    requireCode: Boolean(CLASS_CODE),
    teacherProtected: Boolean(TEACHER_CODE),
  };
}

export function classAuthorized(code) {
  return !CLASS_CODE || clean(code, 120) === CLASS_CODE;
}

export function teacherAuthorized(code) {
  return Boolean(TEACHER_CODE) && clean(code, 120) === TEACHER_CODE;
}

/* ---------- KV ---------- */
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

export async function kvGet(key) {
  return (await kvCommand(["GET", key])) || "";
}

export async function kvSet(key, value) {
  await kvCommand(["SET", key, typeof value === "string" ? value : JSON.stringify(value)]);
}

export async function kvDel(key) {
  await kvCommand(["DEL", key]);
}

/* ---------- Blob ---------- */
export async function readBlobJson(pathname, fallback) {
  const { blobs } = await list({ prefix: pathname, token: BLOB_TOKEN });
  const target = (blobs || []).find((b) => b.pathname === pathname);
  if (!target) return fallback;
  const res = await fetch(`${target.url}?ts=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return fallback;
  const data = await res.json().catch(() => null);
  return data == null ? fallback : data;
}

export async function writeBlobJson(pathname, data) {
  await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: BLOB_TOKEN,
  });
}

/* ---------- corpus / teacher stores (KV or Blob) ---------- */
export async function readCorpusStore(kind) {
  if (kind === "kv") {
    const raw = await kvGet(CORPUS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (kind === "blob") {
    const data = await readBlobJson(CORPUS_BLOB, null);
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.projects) ? data.projects : [];
  }
  return [];
}

export async function writeCorpusStore(kind, projects) {
  if (kind === "kv") return kvSet(CORPUS_KEY, projects);
  if (kind === "blob") return writeBlobJson(CORPUS_BLOB, { projects, updatedAt: new Date().toISOString() });
}

export async function readTeacherStore(kind) {
  if (kind === "kv") {
    const raw = await kvGet(TEACHER_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (kind === "blob") {
    const data = await readBlobJson(TEACHER_BLOB, null);
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.announcements) ? data.announcements : [];
  }
  return [];
}

export async function writeTeacherStore(kind, announcements) {
  if (kind === "kv") return kvSet(TEACHER_KEY, announcements);
  if (kind === "blob") return writeBlobJson(TEACHER_BLOB, { announcements, updatedAt: new Date().toISOString() });
}

/* ---------- Blob file deletion ---------- */
export async function deleteBlobFile(fileUrl) {
  if (!BLOB_TOKEN || !isHttpUrl(fileUrl)) return false;
  try {
    const url = new URL(fileUrl);
    // Only ever delete Atlas uploads, never arbitrary public URLs.
    if (!/\.blob\.vercel-storage\.com$/i.test(url.hostname)) return false;
    if (url.pathname.indexOf("/atlas/files/") === -1) return false;
    await del(fileUrl, { token: BLOB_TOKEN });
    return true;
  } catch (err) {
    console.error("[atlas] blob file delete failed", err);
    return false;
  }
}

async function deleteAtlasBlobs() {
  if (!BLOB_TOKEN) return;
  const { blobs } = await list({ prefix: "atlas/", token: BLOB_TOKEN });
  const urls = (blobs || []).map((b) => b.url);
  if (urls.length) await del(urls, { token: BLOB_TOKEN });
}

/* ---------- one-time clean slate ---------- */
export async function ensureCleanSlate(kind) {
  if (kind !== "kv" && kind !== "blob") return false;
  try {
    if (kind === "kv") {
      if (await kvGet(RESET_KEY)) return false;
      await kvDel(CORPUS_KEY);
      await kvDel(TEACHER_KEY);
      await deleteAtlasBlobs();
      await kvSet(RESET_KEY, new Date().toISOString());
      console.info("[atlas] clean slate: cloud test data removed");
      return true;
    }

    const { blobs } = await list({ prefix: "atlas/", token: BLOB_TOKEN });
    const existing = blobs || [];
    if (existing.some((b) => b.pathname === RESET_BLOB)) return false;
    const urls = existing.filter((b) => b.pathname !== RESET_BLOB).map((b) => b.url);
    if (urls.length) await del(urls, { token: BLOB_TOKEN });
    await writeBlobJson(RESET_BLOB, { clearedAt: new Date().toISOString() });
    console.info("[atlas] clean slate: blob test data removed");
    return true;
  } catch (err) {
    // Never block the portal because a cleanup failed.
    console.error("[atlas] clean slate skipped", err);
    return false;
  }
}
