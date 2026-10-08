import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

/*
 * Milestone 1 stores uploads on the local filesystem. Milestone 3 swaps this
 * for object storage (R2 / Vercel Blob); nothing outside this module knows
 * where the bytes actually live.
 */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Allow-list, not a deny-list: the extension is chosen by us from the type. */
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export type SaveResult = { ok: true; url: string } | { ok: false; reason: string };

export async function saveUpload(file: File): Promise<SaveResult> {
  const extension = ALLOWED[file.type];
  if (!extension) return { ok: false, reason: "unsupported-type" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "too-large" };
  if (file.size === 0) return { ok: false, reason: "empty" };

  // The client filename is never used: it is attacker-controlled and could
  // contain path separators or traversal sequences.
  const name = `${Date.now().toString(36)}-${nanoid(10)}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads");

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), Buffer.from(await file.arrayBuffer()));

  return { ok: true, url: `/uploads/${name}` };
}
