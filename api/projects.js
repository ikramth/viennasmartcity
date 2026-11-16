/**
 * GET    /api/projects?meta=1  → { ok, projects, storage }
 * POST   /api/projects         → { ok, project }
 * POST   /api/projects         → { ok } when body is { verifyCode: true, code }
 * DELETE /api/projects         → { ok, removed } (owner token or teacher code)
 *
 * Owner rule (no password):
 *   - every browser silently creates `atlas_owner_token` (crypto.randomUUID).
 *   - only its SHA-256 hash is stored with the project (owner_hash).
 *   - GET returns `owned: true` on projects matching the X-Atlas-Owner header.
 *   - DELETE accepts the raw owner token (hash compared server-side) or the
 *     teacher code. The associated Vercel Blob file is removed as well.
 *
 * Storage is optional and auto-detected (see api/_atlas.js). With no storage
 * configured the endpoint answers 501 and the portal stays in local mode.
 */
import {
  LIMIT,
  ALLOWED_MODULES,
  ALLOWED_CATEGORIES,
  SB_URL,
  SB_KEY,
  BLOB_TOKEN,
  clean,
  cleanList,
  isHttpUrl,
  isAllowedFileUrl,
  baseName,
  isOwnerHash,
  sha256Hex,
  parseBody,
  dbKind,
  storageInfo,
  classAuthorized,
  teacherAuthorized,
  readCorpusStore,
  writeCorpusStore,
  deleteBlobFile,
  ensureCleanSlate,
} from "./_atlas.js";

const TABLE = process.env.ATLAS_TABLE || "research_projects";

/* ---------- row mapping ---------- */
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
    ownerHash: row.owner_hash || "",
  };
}

/* Never leak owner hashes: expose a boolean instead. */
function publicProject(project, requestHash) {
  return {
    id: project.id,
    title: project.title,
    city: project.city || "",
    country: project.country || "",
    authors: project.authors || "",
    module: project.module || "SCF & OUPTI",
    category: project.category || "international",
    summary: project.summary || "",
    keywords: Array.isArray(project.keywords) ? project.keywords : [],
    link: project.link || "",
    fileUrl: project.fileUrl || "",
    fileName: project.fileName || "",
    featured: false,
    source: "cloud",
    createdAt: project.createdAt || new Date().toISOString(),
    owned: Boolean(requestHash && project.ownerHash && project.ownerHash === requestHash),
  };
}

/* ---------- Supabase ---------- */
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
      owner_hash: project.ownerHash || null,
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

async function readProjects(kind) {
  if (kind === "supabase") return readSupabase();
  return readCorpusStore(kind);
}

async function writeProjects(kind, projects) {
  if (kind === "supabase") return; // row writes handled per project
  return writeCorpusStore(kind, projects);
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
    ownerHash: isOwnerHash(p.ownerHash) ? String(p.ownerHash).toLowerCase() : "",
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
      // One-time purge of test data on the first request after deployment.
      await ensureCleanSlate(kind);
      const ownerRaw = clean(req.headers["x-atlas-owner"] || "", 200);
      const requestHash = ownerRaw
        ? (isOwnerHash(ownerRaw) ? ownerRaw.toLowerCase() : await sha256Hex(ownerRaw))
        : "";
      const projects = await readProjects(kind);
      return res.status(200).json({
        ok: true,
        projects: projects.map((p) => publicProject(p, requestHash)),
        storage: storageInfo(),
      });
    } catch (err) {
      console.error("[atlas] read failed", err);
      return res.status(500).json({ ok: false, error: "read-failed", storage: storageInfo() });
    }
  }

  if (req.method === "POST") {
    if (kind === "none") {
      return res.status(501).json({ ok: false, error: "storage-not-configured", storage: storageInfo() });
    }

    let body = parseBody(req.body);
    if (!body) {
      return res.status(400).json({ ok: false, error: "invalid-body" });
    }

    if (!classAuthorized(body.code) && !teacherAuthorized(body.code)) {
      return res.status(401).json({ ok: false, error: "invalid-class-code" });
    }

    // Lightweight preflight used before a Blob upload, so a bad section code
    // fails with a clear message instead of a generic upload-token error.
    if (body.verifyCode === true) {
      return res.status(200).json({ ok: true, storage: storageInfo() });
    }

    // The browser sends its anonymous owner token; only the SHA-256 hash is
    // stored with the project (the raw token never reaches the database).
    const rawOwnerToken = clean(body.ownerToken, 200);
    if (rawOwnerToken && body.project && typeof body.project === "object") {
      body.project.ownerHash = await sha256Hex(rawOwnerToken);
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
      return res.status(201).json({
        ok: true,
        project: publicProject(project, project.ownerHash),
        storage: storageInfo(),
      });
    } catch (err) {
      console.error("[atlas] write failed", err);
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

    const isTeacher = teacherAuthorized(body.code);

    try {
      await ensureCleanSlate(kind);

      /* Teacher-only manual purge, useful if a test entry slips through. */
      if (body.purge === true || body.purge === "tests") {
        if (!isTeacher) {
          return res.status(401).json({ ok: false, error: "invalid-teacher-code" });
        }
        const current = await readProjects(kind);
        for (const project of current) {
          await deleteBlobFile(project.fileUrl);
        }
        if (kind === "supabase") {
          for (const project of current) await deleteSupabase(project.id);
        } else {
          await writeProjects(kind, []);
        }
        return res.status(200).json({ ok: true, removed: current.length });
      }

      const id = clean(body.id, 64);
      if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) {
        return res.status(400).json({ ok: false, error: "invalid-id" });
      }

      const current = await readProjects(kind);
      const target = current.find((p) => p && p.id === id);
      if (!target) {
        return res.status(404).json({ ok: false, error: "not-found" });
      }

      let allowed = isTeacher;
      if (!allowed && body.ownerToken) {
        const hash = await sha256Hex(clean(body.ownerToken, 200));
        allowed = Boolean(target.ownerHash) && target.ownerHash === hash;
      }
      if (!allowed) {
        return res.status(403).json({ ok: false, error: "not-owner" });
      }

      await deleteBlobFile(target.fileUrl);
      if (kind === "supabase") {
        await deleteSupabase(id);
      } else {
        await writeProjects(kind, current.filter((p) => p && p.id !== id));
      }
      return res.status(200).json({ ok: true, removed: 1 });
    } catch (err) {
      console.error("[atlas] delete failed", err);
      return res.status(500).json({ ok: false, error: "delete-failed" });
    }
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ ok: false, error: "method-not-allowed" });
}
