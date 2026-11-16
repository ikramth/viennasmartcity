/**
 * Teacher space API — announcements, pedagogical remarks and course supports.
 *
 * GET    /api/announcements  → { ok, announcements, storage }
 * POST   /api/announcements  → { ok, announcement }        (teacher code required)
 * POST   /api/announcements  → { ok } when { verifyCode: true, code }
 * DELETE /api/announcements  → { ok, removed }             (teacher code required)
 *
 * Backed by KV / Blob / Supabase, using the same detection as api/projects.js.
 * This endpoint stores the teacher's notes and announcements only.
 */
import {
  LIMIT,
  ALLOWED_ANNOUNCEMENT_KINDS,
  SB_URL,
  SB_KEY,
  clean,
  isHttpUrl,
  isAllowedFileUrl,
  baseName,
  parseBody,
  dbKind,
  storageInfo,
  teacherAuthorized,
  readTeacherStore,
  writeTeacherStore,
  deleteBlobFile,
  ensureCleanSlate,
} from "./_atlas.js";

const TABLE = process.env.ATLAS_TABLE_TEACHER || "atlas_announcements";

function fromRow(row) {
  return {
    id: row.id,
    kind: row.kind || "announcement",
    title: row.title || "",
    body: row.body || "",
    link: row.link || "",
    fileUrl: row.file_url || "",
    fileName: row.file_name || "",
    projectId: row.project_id || "",
    createdAt: row.created_at || new Date().toISOString(),
    source: "cloud",
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

async function writeSupabase(item) {
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
      id: item.id,
      kind: item.kind,
      title: item.title,
      body: item.body,
      link: item.link || null,
      file_url: item.fileUrl || null,
      file_name: item.fileName || null,
      project_id: item.projectId || null,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase insert failed ${res.status} ${detail}`.trim());
  }
}

async function deleteSupabase(id) {
  const url = `${SB_URL}/rest/v1/${encodeURIComponent(TABLE)}?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Prefer: "return=minimal",
    },
  });
  if (!res.ok) throw new Error(`Supabase delete failed ${res.status}`);
}

function normalizeAnnouncement(input) {
  const p = input && typeof input === "object" ? input : {};
  const kind = ALLOWED_ANNOUNCEMENT_KINDS.includes(p.kind) ? p.kind : "announcement";
  const item = {
    id: /^[A-Za-z0-9_-]{6,64}$/.test(String(p.id || "")) ? String(p.id) : crypto.randomUUID(),
    kind,
    title: clean(p.title, 160),
    body: clean(p.body, 3000),
    link: isHttpUrl(p.link) ? String(p.link).slice(0, 600) : "",
    fileUrl: isAllowedFileUrl(p.fileUrl) ? String(p.fileUrl).slice(0, 800) : "",
    fileName: baseName(p.fileName, 160),
    projectId: /^[A-Za-z0-9_-]{6,64}$/.test(String(p.projectId || "")) ? String(p.projectId) : "",
    createdAt: new Date().toISOString(),
    source: "cloud",
  };
  const errors = [];
  if (!item.title) errors.push("title");
  if (!item.body && !item.link && !item.fileUrl) errors.push("content");
  if (item.kind === "note" && !item.projectId) errors.push("project");
  return { item, errors };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const kind = dbKind();

  if (req.method === "GET") {
    if (kind === "none") {
      return res.status(501).json({ ok: false, error: "storage-not-configured", storage: storageInfo() });
    }
    try {
      await ensureCleanSlate(kind);
      const announcements = kind === "supabase" ? await readSupabase() : await readTeacherStore(kind);
      return res.status(200).json({ ok: true, announcements, storage: storageInfo() });
    } catch (err) {
      console.error("[atlas] teacher read failed", err);
      return res.status(500).json({ ok: false, error: "read-failed", storage: storageInfo() });
    }
  }

  if (req.method === "POST") {
    if (kind === "none") {
      return res.status(501).json({ ok: false, error: "storage-not-configured", storage: storageInfo() });
    }

    const body = parseBody(req.body);
    if (!body) {
      return res.status(400).json({ ok: false, error: "invalid-body" });
    }
    if (!teacherAuthorized(body.code)) {
      return res.status(401).json({ ok: false, error: "invalid-teacher-code" });
    }
    if (body.verifyCode === true) {
      return res.status(200).json({ ok: true, storage: storageInfo() });
    }

    const { item, errors } = normalizeAnnouncement(body.item);
    if (errors.length) {
      return res.status(400).json({ ok: false, error: "missing-fields", fields: errors });
    }

    try {
      if (kind === "supabase") {
        await writeSupabase(item);
      } else {
        const current = await readTeacherStore(kind);
        const next = [item, ...current.filter((a) => a && a.id !== item.id)].slice(0, LIMIT);
        await writeTeacherStore(kind, next);
      }
      return res.status(201).json({ ok: true, announcement: item, storage: storageInfo() });
    } catch (err) {
      console.error("[atlas] teacher write failed", err);
      return res.status(500).json({ ok: false, error: "write-failed" });
    }
  }

  if (req.method === "DELETE") {
    if (kind === "none") {
      return res.status(501).json({ ok: false, error: "storage-not-configured", storage: storageInfo() });
    }

    const body = parseBody(req.body);
    if (!body) {
      return res.status(400).json({ ok: false, error: "invalid-body" });
    }
    if (!teacherAuthorized(body.code)) {
      return res.status(401).json({ ok: false, error: "invalid-teacher-code" });
    }

    const id = clean(body.id, 64);
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) {
      return res.status(400).json({ ok: false, error: "invalid-id" });
    }

    try {
      const current = kind === "supabase" ? await readSupabase() : await readTeacherStore(kind);
      const target = current.find((a) => a && a.id === id);
      if (!target) return res.status(404).json({ ok: false, error: "not-found" });

      await deleteBlobFile(target.fileUrl);
      if (kind === "supabase") {
        await deleteSupabase(id);
      } else {
        await writeTeacherStore(kind, current.filter((a) => a && a.id !== id));
      }
      return res.status(200).json({ ok: true, removed: 1 });
    } catch (err) {
      console.error("[atlas] teacher delete failed", err);
      return res.status(500).json({ ok: false, error: "delete-failed" });
    }
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ ok: false, error: "method-not-allowed" });
}
