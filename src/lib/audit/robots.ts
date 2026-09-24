import type { RobotsGroup, RobotsInfo } from "./types";

export const OUR_BOT = "SeoneiroBot";

/** True when the site owner closed the whole site to our crawler by name (not just to all robots). */
export function blocksOurBot(info: RobotsInfo): boolean {
  const named = info.groups.some((g) => g.agents.some((a) => a.includes(OUR_BOT.toLowerCase())));
  return named && !isAllowed(info, OUR_BOT, "/");
}

export const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Bingbot",
  "YandexBot",
  "Applebot-Extended",
];

const KNOWN = /^(user-agent|disallow|allow|sitemap|crawl-delay|host|clean-param)$/i;

export function parseRobots(body: string, status: number, contentType = ""): RobotsInfo {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let directives = 0;
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  const isText = !/html/i.test(contentType) && !/^\s*<(!doctype|html)/i.test(body);
  if (status === 200 && isText) {
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.replace(/#.*/, "").trim();
      if (!line) continue;
      const idx = line.indexOf(":");
      if (idx < 1) continue;
      const key = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      if (!KNOWN.test(key)) continue;
      directives++;
      if (key === "sitemap") {
        if (value) sitemaps.push(value);
        continue;
      }
      if (key === "user-agent") {
        if (!current || !lastWasAgent) {
          current = { agents: [], rules: [] };
          groups.push(current);
        }
        current.agents.push(value.toLowerCase());
        lastWasAgent = true;
        continue;
      }
      lastWasAgent = false;
      if (!current) continue;
      if (key === "disallow" || key === "allow") {
        // An empty Disallow means "allow everything" and adds no rule.
        if (value) current.rules.push({ allow: key === "allow", path: value });
      }
    }
  }
  return { status, body, groups, sitemaps, directives, isText };
}

function ruleMatches(rulePath: string, path: string): boolean {
  let pattern = rulePath.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  if (pattern.endsWith("\\$")) pattern = pattern.slice(0, -2) + "$";
  return new RegExp("^" + pattern).test(path);
}

/** Group that applies to the given bot: the most specific user-agent match, else "*". */
function groupFor(info: RobotsInfo, agent: string): RobotsGroup[] {
  const a = agent.toLowerCase();
  const specific = info.groups.filter((g) => g.agents.some((x) => x !== "*" && a.includes(x)));
  if (specific.length) return specific;
  return info.groups.filter((g) => g.agents.includes("*"));
}

/** Longest-match rule wins, Allow wins ties (Google/Yandex semantics). */
export function isAllowed(info: RobotsInfo, agent: string, path: string): boolean {
  const rules = groupFor(info, agent).flatMap((g) => g.rules);
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) {
    if (!ruleMatches(r.path, path)) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { allow: r.allow, len };
  }
  return best ? best.allow : true;
}
