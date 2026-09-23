import type { CheckDef, CheckResult, SiteContext } from "../types";
import { aiChecks } from "./ai";
import { contentChecks } from "./content";
import { indexingChecks } from "./indexing";
import { markupChecks } from "./markup";
import { metaChecks } from "./meta";
import { mobileChecks } from "./mobile";
import { structureChecks } from "./structure";
import { technicalChecks } from "./technical";
import { trustChecks } from "./trust";

export const REGISTRY: CheckDef[] = [
  ...technicalChecks,
  ...metaChecks,
  ...indexingChecks,
  ...aiChecks,
  ...contentChecks,
  ...structureChecks,
  ...markupChecks,
  ...mobileChecks,
  ...trustChecks,
];

/** Shown on the landing and in the report; always computed, never typed by hand. */
export const CHECK_COUNT = REGISTRY.length;

export const CHECK_BY_ID = new Map(REGISTRY.map((c) => [c.id, c]));

export function runChecks(ctx: SiteContext): CheckResult[] {
  return REGISTRY.map((check) => {
    try {
      const out = check.run(ctx);
      return { checkId: check.id, ...out, affectedUrls: out.affectedUrls?.filter(Boolean).slice(0, 200) };
    } catch (e) {
      console.error(`check ${check.id} failed`, e);
      return { checkId: check.id, status: "na", details: "Проверку не удалось выполнить на этом сайте." };
    }
  });
}
