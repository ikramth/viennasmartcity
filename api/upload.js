/**
 * POST /api/upload
 * Vercel Blob client-upload token endpoint (used by portal-blob-client.js).
 *
 * Hardening rules:
 *   - only .pdf / .pptx / .png / .jpg / .jpeg (matching MIME types)
 *   - 20 MB maximum
 *   - pathname must be atlas/files/<uuid>.<ext> (no original filenames)
 *   - optional cohort passcode (ATLAS_CLASS_CODE, default M1-MEDEA-2026)
 */
import { handleUpload } from "@vercel/blob/client";

const DEFAULT_CLASS_CODE = "M1-MEDEA-2026";

/* Set ATLAS_CLASS_CODE=off (or open/none) to publish without a passcode. */
const RAW_CLASS_CODE = String(process.env.ATLAS_CLASS_CODE == null ? "" : process.env.ATLAS_CLASS_CODE).trim();
const CLASS_CODE = /^(off|open|none)$/i.test(RAW_CLASS_CODE) ? "" : RAW_CLASS_CODE || DEFAULT_CLASS_CODE;

const MAX_SIZE = 20 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
];

/* UUID v4 filename with an allow-listed extension, inside atlas/files/. */
const SAFE_PATHNAME = /^atlas\/files\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|pptx|png|jpe?g)$/i;

function readCode(clientPayload) {
  try {
    const parsed = JSON.parse(clientPayload || "{}");
    return String(parsed.code || "");
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  if (!token) {
    return res.status(501).json({ ok: false, error: "blob-not-configured" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body) {
    return res.status(400).json({ ok: false, error: "invalid-body" });
  }

  try {
    const result = await handleUpload({
      token,
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (typeof pathname !== "string" || !SAFE_PATHNAME.test(pathname)) {
          throw new Error("invalid-pathname");
        }
        if (CLASS_CODE && readCode(clientPayload) !== CLASS_CODE) {
          throw new Error("invalid-class-code");
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: false, // pathname already carries a random UUID
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
    });
    return res.status(200).json(result);
  } catch (err) {
    const known = ["invalid-pathname", "invalid-class-code"];
    const message = err && known.indexOf(err.message) !== -1 ? err.message : "upload-failed";
    console.error("[atlas] upload token failed", err);
    return res.status(400).json({ ok: false, error: message });
  }
}
