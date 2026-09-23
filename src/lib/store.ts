import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuditRecord } from "./audit/types";

/**
 * File-backed audit storage: one JSON file per audit, plus an in-memory cache for fast status polling.
 * Swap for Postgres by reimplementing these three functions.
 */
const dir = () => path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.AUDIT_DATA_DIR || ".data/audits");
const cache = new Map<string, AuditRecord>();
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isAuditId = (id: string) => ID_RE.test(id);

export async function saveAudit(rec: AuditRecord): Promise<void> {
  cache.set(rec.id, rec);
  await mkdir(dir(), { recursive: true });
  const file = path.join(dir(), `${rec.id}.json`);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(rec));
  await rename(tmp, file);
}

export async function getAudit(id: string): Promise<AuditRecord | null> {
  if (!isAuditId(id)) return null;
  const hit = cache.get(id);
  if (hit) return hit;
  try {
    const rec = JSON.parse(await readFile(path.join(dir(), `${id}.json`), "utf8")) as AuditRecord;
    cache.set(id, rec);
    return rec;
  } catch {
    return null;
  }
}

/** Updates the cached record right away and persists at most every `throttleMs`. */
const lastWrite = new Map<string, number>();
export async function patchAudit(id: string, patch: Partial<AuditRecord>, throttleMs = 0): Promise<AuditRecord | null> {
  const rec = await getAudit(id);
  if (!rec) return null;
  Object.assign(rec, patch);
  const now = Date.now();
  if (now - (lastWrite.get(id) || 0) >= throttleMs) {
    lastWrite.set(id, now);
    await saveAudit(rec);
  }
  return rec;
}
