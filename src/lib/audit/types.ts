import type { CheerioAPI } from "cheerio";

export type Severity = "critical" | "important" | "advice";

export type CategoryKey =
  | "technical"
  | "meta"
  | "indexing"
  | "ai"
  | "content"
  | "structure"
  | "markup"
  | "mobile"
  | "trust";

export type CheckStatus = "passed" | "failed" | "na";

export interface CheckOutcome {
  status: CheckStatus;
  /** Fact about the site, always with a number where possible. */
  details: string;
  affectedUrls?: string[];
}

export interface CheckDef {
  id: string;
  category: CategoryKey;
  severity: Severity;
  title: string;
  explain: string;
  recommendation: string;
  /** Falls back to the category impact when omitted. */
  impact?: string;
  run(ctx: SiteContext): CheckOutcome;
}

export interface HttpResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  bytes: number;
  ttfbMs: number;
  contentType: string;
  error?: string;
}

export interface RedirectChain {
  hops: HttpResponse[];
  final: HttpResponse;
  loop: boolean;
  error?: string;
}

export interface LinkInfo {
  href: string;
  abs: string | null;
  text: string;
  rel: string;
  internal: boolean;
  ariaLabel: string;
  hasImgAlt: boolean;
  inNav: boolean;
  target: string;
}

export interface ImageInfo {
  src: string;
  abs: string | null;
  alt: string | null;
  width: string | null;
  height: string | null;
  srcset: string | null;
  inPicture: boolean;
  hasAspectRatio: boolean;
}

export interface JsonLdBlock {
  raw: string;
  data: unknown;
  error?: string;
  types: string[];
}

export interface FormInfo {
  isSearch: boolean;
  personalFields: number;
  unlabeledFields: number;
  consentCheckbox: boolean;
  consentPrechecked: boolean;
  consentText: boolean;
  spamProtected: boolean;
}

export interface PageData {
  url: string;
  status: number;
  headers: Record<string, string>;
  html: string;
  bytes: number;
  ttfbMs: number;
  $: CheerioAPI;
  title: string | null;
  titleCount: number;
  description: string | null;
  keywordsMeta: string | null;
  metaRobots: string;
  metaCharset: string | null;
  lang: string | null;
  viewport: string | null;
  canonicals: string[];
  h1: string[];
  headings: { level: number; text: string }[];
  og: Record<string, string>;
  twitter: Record<string, string>;
  jsonld: JsonLdBlock[];
  links: LinkInfo[];
  images: ImageInfo[];
  forms: FormInfo[];
  text: string;
  topText: string;
  words: number;
  styles: string;
  scripts: string[];
  inlineScriptsBytes: number;
  hasMain: boolean;
  hasBreadcrumbs: boolean;
  depth: number;
}

export interface RobotsGroup {
  agents: string[];
  rules: { allow: boolean; path: string }[];
}

export interface RobotsInfo {
  status: number;
  body: string;
  groups: RobotsGroup[];
  sitemaps: string[];
  directives: number;
  isText: boolean;
}

export interface SitemapInfo {
  status: number;
  found: boolean;
  isXml: boolean;
  valid: boolean;
  urls: string[];
  source: string | null;
}

export interface AssetInfo {
  url: string;
  status: number;
  bytes: number | null;
  contentType: string;
  headers: Record<string, string>;
}

export interface SiteContext {
  inputUrl: string;
  origin: string;
  host: string;
  startedAt: number;
  homeChain: RedirectChain;
  httpProbe: RedirectChain | null;
  altHostProbe: RedirectChain | null;
  notFound: HttpResponse | null;
  faviconProbe: HttpResponse | null;
  robots: RobotsInfo;
  sitemap: SitemapInfo;
  pages: PageData[];
  home: PageData;
  /** Status of every internal URL we have a response for (crawled or HEAD-checked). */
  linkStatus: Map<string, number>;
  /** Internal link target -> pages that link to it. */
  linkSources: Map<string, Set<string>>;
  images: Map<string, AssetInfo>;
  cssText: string;
  staticAssets: AssetInfo[];
}

export interface CheckResult extends CheckOutcome {
  checkId: string;
}

export interface CategoryScore {
  key: CategoryKey;
  label: string;
  score: number;
  passed: number;
  failed: number;
}

export interface PageSummary {
  url: string;
  issues: number;
  critical: number;
}

export interface KeywordTerm {
  term: string;
  score: number;
}

export interface PsiResult {
  strategy: "mobile" | "desktop";
  status: "ok" | "error";
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  errorMessage: string | null;
}

export type AuditStatus = "pending" | "running" | "done" | "failed";
export type PsiStatus = "pending" | "ready" | "failed";

export interface AuditRecord {
  id: string;
  url: string;
  host: string;
  createdAt: string;
  status: AuditStatus;
  psiStatus: PsiStatus;
  progressStep: string;
  progressPercent: number;
  pagesCrawled: number;
  pagesPlanned: number;
  score: number | null;
  errorMessage: string | null;
  results: CheckResult[];
  categories: CategoryScore[];
  pages: PageSummary[];
  keywords: { words: KeywordTerm[]; phrases: KeywordTerm[] };
  psi: PsiResult[];
}

export interface AuditStatusPayload {
  status: AuditStatus;
  psiStatus: PsiStatus;
  progressStep: string;
  progressPercent: number;
  pagesCrawled: number;
  pagesPlanned: number;
  score: number | null;
  errorMessage: string | null;
}
