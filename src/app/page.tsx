// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  ExternalLink,
  FileCode2,
  Globe2,
  Layers3,
  LoaderCircle,
  Moon,
  Search,
  Sun,
  XCircle,
  Camera,
  RefreshCw,
  Maximize2,
  X,
  TrendingUp,
} from "lucide-react";

type Theme = "dark" | "light";

type AuditFix = {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  impact: string;
  evidence: string;
  codeFix?: string;
};

type AuditReport = {
  url: string;
  domain: string;
  effectiveQuery: string;
  scores: {
    overall: number;
    aiReadability: number;
    searchVisibility: number;
  };
  siteAuditSeoMetrics: {
    status: number;
    request_time_ms: number;
    title: string;
    description: string;
    canonical: string;
    robots: string;
    h1_count: number;
    h2_count: number;
    h3_count: number;
    images: number;
    images_without_alt: number;
    schema_types: string[];
    text_ratio_percent: number;
    html_size_kb: number;
    raw_word_count: number;
  };
  tinyfishFetch: {
    ai_word_count: number;
    survival_rate_percent: number;
    extracted_headings: string[];
    markdown_preview: string;
    error?: { error?: string } | null;
  };
  tinyfishSearch: {
    exact_rank: number | null;
    domain_rank: number | null;
    is_domain_indexed: boolean;
    top_serp_results: Array<{
      url: string;
      title: string;
      snippet: string;
      position: number;
    }>;
    competitor_benchmark?: {
      url: string;
      title: string;
      wordCount: number;
      headings: string[];
    } | null;
  };
  tinyfishAgent?: unknown;
  fixes: AuditFix[];
};

const DEMO_PAGES = [
  {
    label: "TinyFish Docs",
    url: "https://docs.tinyfish.ai/fetch-api",
    query: "web agent fetch api markdown extraction",
  },
  {
    label: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/Search_engine_optimization",
    query: "what is search engine optimization",
  },
  {
    label: "Hacker News",
    url: "https://news.ycombinator.com",
    query: "tech startup news aggregator",
  },
  {
    label: "Next.js Docs",
    url: "https://nextjs.org/docs",
    query: "react server components framework documentation",
  },
];

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
  const parsed = new URL(candidate);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Enter a web address that starts with http:// or https://.");
  }
  return parsed.toString();
}

function scoreTone(score: number) {
  if (score >= 80) return "score-value--good";
  if (score >= 50) return "score-value--medium";
  return "score-value--low";
}

function isOwnDomain(resultUrl: string, domain: string) {
  try {
    const host = new URL(resultUrl).hostname.replace(/^www\./, "").toLowerCase();
    const normalizedDomain = domain.replace(/^www\./, "").toLowerCase();
    return host === normalizedDomain || host.endsWith("." + normalizedDomain);
  } catch {
    return false;
  }
}

export default function AuditDashboard() {
  const [url, setUrl] = useState("https://docs.tinyfish.ai/fetch-api");
  const [query, setQuery] = useState("web agent fetch api markdown extraction");
  const [runAgentAudit, setRunAgentAudit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"markdown" | "headings">("markdown");
  const [theme, setTheme] = useState<Theme>("dark");

  // Multi-Severity Screenshot State (Lazy-loaded via TinyFish Browser API)
  const [shotLoading, setShotLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [selectedShot, setSelectedShot] = useState<any | null>(null);
  const [shotData, setShotData] = useState<{
    sessionId?: string;
    screenshots?: {
      id: string;
      severity: "critical" | "warning" | "info";
      title: string;
      description: string;
      selector: string;
      elementCount: number;
      codeFix: string;
      screenshotBase64: string;
    }[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("tinyfish-theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : systemPrefersDark
        ? "dark"
        : "light";
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem("tinyfish-theme", nextTheme);
    setTheme(nextTheme);
  };

  const triggerLazyScreenshots = async (targetUrl: string) => {
    setShotLoading(true);
    setShotData(null);
    try {
      const res = await fetch("/api/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Browser screenshot capture failed");
      setShotData(data);
    } catch (err: any) {
      setShotData({ error: err.message });
    } finally {
      setShotLoading(false);
    }
  };

  const handleAudit = async (targetUrl: string, targetQuery: string, includeAgent: boolean) => {
    setLoading(true);
    setError(null);
    setShotData(null);
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          query: targetQuery,
          runAgentAudit: includeAgent,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The audit could not be completed.");
      setReport(data as AuditReport);
      setActiveTab("markdown");

      // Fire Lazy-Loaded Multi-Severity Screenshots via TinyFish Browser API
      triggerLazyScreenshots(targetUrl);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while running the audit."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let normalized: string;
    try {
      normalized = normalizeUrl(url);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Enter a valid web address.");
      return;
    }
    setUrl(normalized);
    void handleAudit(normalized, query.trim(), runAgentAudit);
  };

  const runPreset = (preset: (typeof DEMO_PAGES)[number]) => {
    setUrl(preset.url);
    setQuery(preset.query);
    setError(null);
    void handleAudit(preset.url, preset.query, runAgentAudit);
  };

  const copyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setError("Clipboard access is unavailable. Select and copy the code instead.");
    }
  };

  const getSeverityBadgeStyle = (severity: "critical" | "warning" | "info") => {
    if (severity === "critical")
      return "bg-red-500/20 text-red-400 border border-red-500/40";
    if (severity === "warning")
      return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
    return "bg-blue-500/20 text-blue-300 border border-blue-500/40";
  };

  const filteredScreenshots =
    shotData?.screenshots?.filter(
      (s) => severityFilter === "all" || s.severity === severityFilter
    ) || [];

  return (
    <main className="app-shell">
      <div className="page-frame">
        <header className="topbar">
          <a className="brand" href="#" aria-label="TinyFish SEO Auditor home">
            <span className="brand-mark" aria-hidden="true">
              <Activity size={17} strokeWidth={2.3} />
            </span>
            <span className="brand-name">TinyFish <span>/</span> Audit</span>
          </a>
          <div className="topbar-actions">
            <span className="system-label"><span className="live-dot" /> Live analysis</span>
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={"Switch to " + (theme === "dark" ? "light" : "dark") + " mode"}
              title={"Switch to " + (theme === "dark" ? "light" : "dark") + " mode"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === "dark" ? "Light" : "Dark"} mode</span>
            </button>
          </div>
        </header>

        <section className="intro">
          <div className="eyebrow"><span className="eyebrow-line" /> SEARCH &amp; AI READABILITY</div>
          <div className="intro-row">
            <div>
              <h1>See how your page<br className="desktop-break" /> gets understood.</h1>
              <p className="intro-copy">
                Audits live pages using TinyFish Fetch (AI extraction), TinyFish Search (SERP &amp; competitor gap), and lazy-loaded TinyFish Browser (multi-severity annotated DOM screenshots).
              </p>
            </div>
          </div>
        </section>

        <section className="audit-panel" aria-labelledby="audit-form-title">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">NEW AUDIT</div>
              <h2 id="audit-form-title">Choose a page to inspect</h2>
            </div>
            <span className="panel-index">01 <span>/</span> INPUT</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field field--url">
                <label htmlFor="target-url">Page URL <span className="required-mark">Required</span></label>
                <div className="input-wrap">
                  <Globe2 size={17} aria-hidden="true" />
                  <input
                    id="target-url"
                    name="url"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    required
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com/page"
                    aria-describedby="url-help"
                  />
                </div>
                <p className="field-help" id="url-help">A domain without a protocol is treated as HTTPS.</p>
              </div>
              <div className="field field--query">
                <label htmlFor="target-query">Search query <span className="optional-mark">Optional</span></label>
                <div className="input-wrap">
                  <Search size={17} aria-hidden="true" />
                  <input
                    id="target-query"
                    name="query"
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Derived from page title if blank"
                  />
                </div>
                <p className="field-help">Used to compare your page with live search results.</p>
              </div>
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}
                <span>{loading ? "Auditing page" : "Run audit"}</span>
              </button>
            </div>

            <div className="form-footer">
              <div className="demo-pages">
                <span className="demo-label">Try a sample</span>
                {DEMO_PAGES.map((preset) => (
                  <button
                    className="demo-chip"
                    key={preset.url}
                    type="button"
                    onClick={() => runPreset(preset)}
                    disabled={loading}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </section>

        {error && (
          <div className="notice notice--error" role="alert">
            <XCircle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">Dismiss</button>
          </div>
        )}

        {loading && (
          <div className="progress-panel" role="status" aria-live="polite">
            <div className="progress-icon"><LoaderCircle size={19} className="spin" /></div>
            <div>
              <strong>Collecting live audit data</strong>
              <p>Extracting live Markdown, checking SERP rankings, and generating multi-severity screenshots. This can take a little while.</p>
            </div>
          </div>
        )}

        {report && (
          <div className="results" aria-live="polite">
            <div className="results-heading">
              <div>
                <div className="section-kicker">AUDIT REPORT</div>
                <h2>Findings</h2>
              </div>
              <div className="report-target">
                <span className="report-host">{report.domain}</span>
                <a href={report.url} target="_blank" rel="noreferrer" aria-label="Open audited page in a new tab">
                  Open page <ExternalLink size={13} />
                </a>
              </div>
            </div>

            <section className="score-grid" aria-label="Audit scores">
              <article className="score-card score-card--primary">
                <div className="score-label">Overall score</div>
                <div className={"score-value " + scoreTone(report.scores.overall)}>
                  {report.scores.overall}<span>/100</span>
                </div>
                <p>Weighted view of readability and search visibility.</p>
              </article>
              <article className="score-card">
                <div className="score-label">AI readability</div>
                <div className={"score-value " + scoreTone(report.scores.aiReadability)}>
                  {report.scores.aiReadability}<span>/100</span>
                </div>
                <p>{report.tinyfishFetch.ai_word_count} extracted words · {report.tinyfishFetch.survival_rate_percent}% survival</p>
              </article>
              <article className="score-card">
                <div className="score-label">Search visibility</div>
                <div className={"score-value " + scoreTone(report.scores.searchVisibility)}>
                  {report.scores.searchVisibility}<span>/100</span>
                </div>
                <p>
                  {report.tinyfishSearch.exact_rank
                    ? "Page ranks #" + report.tinyfishSearch.exact_rank + " for “" + report.effectiveQuery + "”"
                    : report.tinyfishSearch.is_domain_indexed
                    ? "Domain appears in results; target page was not found."
                    : "No matching domain result was found."}
                </p>
              </article>
              <article className="score-card">
                <div className="score-label">Recommended fixes</div>
                <div className="score-value score-value--neutral">
                  {report.fixes.length}<span>{report.fixes.length === 1 ? " item" : " items"}</span>
                </div>
                <p>Prioritized by severity and audit evidence.</p>
              </article>
            </section>

            {/* LAZY-LOADED 3RD ENDPOINT: MULTI-SEVERITY ANNOTATED SCREENSHOT GALLERY */}
            <section className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 space-y-5 my-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="section-kicker text-cyan-400">TINYFISH BROWSER API</div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Camera className="w-5 h-5 text-cyan-400" />
                    Multi-Severity Visual DOM Audit — Places Lacking SEO
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Lazy-loaded via a single TinyFish Cloud Browser CDP session. Outlines offending DOM nodes in Red (Critical), Amber (Warning), or Blue (Info).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {shotData?.screenshots && shotData.screenshots.length > 0 && (
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                      {(["all", "critical", "warning", "info"] as const).map((sev) => (
                        <button
                          key={sev}
                          onClick={() => setSeverityFilter(sev)}
                          className={`px-2.5 py-1 rounded-lg uppercase font-semibold transition cursor-pointer ${
                            severityFilter === sev
                              ? "bg-slate-800 text-cyan-400"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => triggerLazyScreenshots(report.url)}
                    disabled={shotLoading}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${shotLoading ? "animate-spin" : ""}`} />
                    {shotLoading ? "Capturing DOM..." : "Re-Capture"}
                  </button>
                </div>
              </div>

              {shotLoading && (
                <div className="p-10 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2 animate-pulse">
                  <Camera className="w-7 h-7 text-cyan-400 mx-auto animate-bounce" />
                  <div className="text-sm font-medium text-slate-200">
                    Spinning up TinyFish Cloud Browser &amp; capturing screenshots by issue severity...
                  </div>
                </div>
              )}

              {shotData?.error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
                  Browser Screenshot Notice: {shotData.error}
                </div>
              )}

              {shotData?.screenshots && !shotLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredScreenshots.map((shot) => (
                    <div
                      key={shot.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div
                          className="relative group cursor-pointer border-b border-slate-800 bg-slate-900"
                          onClick={() => setSelectedShot(shot)}
                        >
                          <img
                            src={shot.screenshotBase64}
                            alt={shot.title}
                            className="w-full h-56 object-cover object-top group-hover:opacity-90 transition"
                          />
                          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] text-slate-200 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <Maximize2 className="w-3 h-3 text-cyan-400" /> Expand Full Viewport
                          </div>
                        </div>

                        <div className="p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full ${getSeverityBadgeStyle(
                                shot.severity
                              )}`}
                            >
                              {shot.severity}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              Selector: <code className="text-cyan-400">{shot.selector}</code> ({shot.elementCount}x)
                            </span>
                          </div>

                          <h4 className="font-semibold text-sm text-white">{shot.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{shot.description}</p>
                        </div>
                      </div>

                      <div className="px-4 pb-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>DOM Fix</span>
                            <button
                              onClick={() => copyCode(shot.id, shot.codeFix)}
                              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                            >
                              {copiedId === shot.id ? (
                                <>
                                  <Check className="w-3 h-3" /> Copied
                                </>
                              ) : (
                                <>
                                  <Clipboard className="w-3 h-3" /> Copy Snippet
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="text-[11px] text-cyan-300 font-mono overflow-x-auto whitespace-pre-wrap">
                            <code>{shot.codeFix}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="findings-section" aria-labelledby="fixes-title">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">WHAT TO ADDRESS</div>
                  <h3 id="fixes-title">Recommended fixes</h3>
                </div>
                <span className="section-count">{report.fixes.length.toString().padStart(2, "0")}</span>
              </div>
              {report.fixes.length === 0 ? (
                <div className="empty-success">
                  <CheckCircle2 size={19} />
                  <div>
                    <strong>No fixes were generated for this audit.</strong>
                    <p>Review the supporting metrics below; an empty fix list is not a guarantee of complete SEO coverage.</p>
                  </div>
                </div>
              ) : (
                <div className="fix-list">
                  {report.fixes.map((fix, index) => (
                    <article className="fix-card" key={fix.id}>
                      <div className="fix-number">{(index + 1).toString().padStart(2, "0")}</div>
                      <div className="fix-content">
                        <div className="fix-meta">
                          <span className={"severity severity--" + fix.severity}>{fix.severity}</span>
                          <span className="category-label">{fix.category}</span>
                        </div>
                        <h4>{fix.title}</h4>
                        <p className="fix-impact">{fix.impact}</p>
                        <details className="evidence-details">
                          <summary>Audit evidence <ChevronDown size={14} /></summary>
                          <p>{fix.evidence}</p>
                        </details>
                        {fix.codeFix && (
                          <div className="code-fix">
                            <div className="code-fix-heading">
                              <span><FileCode2 size={14} /> Suggested code</span>
                              <button type="button" onClick={() => void copyCode(fix.id, fix.codeFix || "")}>
                                {copiedId === fix.id ? <Check size={14} /> : <Clipboard size={14} />}
                                {copiedId === fix.id ? "Copied" : "Copy"}
                              </button>
                            </div>
                            <pre><code>{fix.codeFix}</code></pre>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="detail-section" aria-labelledby="details-title">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">SUPPORTING DATA</div>
                  <h3 id="details-title">Page diagnostics</h3>
                </div>
                <span className="section-count"><ArrowDownToLine size={15} /></span>
              </div>

              <div className="diagnostics-grid">
                <article className="data-panel">
                  <div className="data-panel-heading">
                    <div className="data-icon"><Layers3 size={16} /></div>
                    <div><h4>Source HTML</h4><p>What a basic HTML fetch returned</p></div>
                  </div>
                  <dl className="metric-list">
                    <div><dt>HTTP status</dt><dd>{report.siteAuditSeoMetrics.status || "Unavailable"}</dd></div>
                    <div><dt>Response time</dt><dd>{report.siteAuditSeoMetrics.request_time_ms} ms</dd></div>
                    <div><dt>Visible words</dt><dd>{report.siteAuditSeoMetrics.raw_word_count}</dd></div>
                    <div><dt>Text / HTML</dt><dd>{report.siteAuditSeoMetrics.text_ratio_percent}% · {report.siteAuditSeoMetrics.html_size_kb} KB</dd></div>
                    <div><dt>Headings H1 / H2 / H3</dt><dd>{report.siteAuditSeoMetrics.h1_count} / {report.siteAuditSeoMetrics.h2_count} / {report.siteAuditSeoMetrics.h3_count}</dd></div>
                    <div><dt>Images missing alt</dt><dd>{report.siteAuditSeoMetrics.images_without_alt} of {report.siteAuditSeoMetrics.images}</dd></div>
                    <div><dt>Structured data</dt><dd>{report.siteAuditSeoMetrics.schema_types.join(", ") || "None detected"}</dd></div>
                    <div><dt>Canonical</dt><dd className="metric-long">{report.siteAuditSeoMetrics.canonical || "None detected"}</dd></div>
                    <div><dt>Robots</dt><dd>{report.siteAuditSeoMetrics.robots || "index, follow (default)"}</dd></div>
                  </dl>
                </article>

                <article className="data-panel">
                  <div className="data-panel-heading">
                    <div className="data-icon data-icon--teal"><FileCode2 size={16} /></div>
                    <div><h4>Extracted content</h4><p>What TinyFish Fetch returned</p></div>
                  </div>
                  <div className="tab-list" role="tablist" aria-label="Extracted content view">
                    <button
                      className={activeTab === "markdown" ? "tab-button is-active" : "tab-button"}
                      id="tab-markdown"
                      tabIndex={activeTab === "markdown" ? 0 : -1}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === "markdown"}
                      aria-controls="panel-markdown"
                      onClick={() => setActiveTab("markdown")}
                    >Markdown</button>
                    <button
                      className={activeTab === "headings" ? "tab-button is-active" : "tab-button"}
                      id="tab-headings"
                      tabIndex={activeTab === "headings" ? 0 : -1}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === "headings"}
                      aria-controls="panel-headings"
                      onClick={() => setActiveTab("headings")}
                    >Headings <span>{report.tinyfishFetch.extracted_headings.length}</span></button>
                  </div>
                  {activeTab === "markdown" ? (
                    <pre className="extract-preview" id="panel-markdown" role="tabpanel" aria-labelledby="tab-markdown">
                      {report.tinyfishFetch.markdown_preview || "No Markdown content was extracted."}
                    </pre>
                  ) : (
                    <div className="extract-preview heading-preview" id="panel-headings" role="tabpanel" aria-labelledby="tab-headings">
                      {report.tinyfishFetch.extracted_headings.length > 0
                        ? report.tinyfishFetch.extracted_headings.map((heading, index) => <div key={index}>{heading}</div>)
                        : <p>No semantic Markdown headings were extracted.</p>}
                    </div>
                  )}
                </article>
              </div>
            </section>

            <section className="search-section" aria-labelledby="search-results-title">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">LIVE SEARCH</div>
                  <h3 id="search-results-title">Results for “{report.effectiveQuery}”</h3>
                </div>
                <span className="section-count"><Search size={15} /></span>
              </div>
              {report.tinyfishSearch.competitor_benchmark && (
                <div className="competitor-note">
                  <div className="competitor-title">Top competitor comparison</div>
                  <p>
                    <a href={report.tinyfishSearch.competitor_benchmark.url} target="_blank" rel="noreferrer">
                      {report.tinyfishSearch.competitor_benchmark.title || report.tinyfishSearch.competitor_benchmark.url}
                      <ExternalLink size={13} />
                    </a>
                    <span>{report.tinyfishSearch.competitor_benchmark.wordCount} extracted words compared with {report.tinyfishFetch.ai_word_count} on this page.</span>
                  </p>
                </div>
              )}
              {report.tinyfishSearch.top_serp_results.length > 0 ? (
                <ol className="serp-list">
                  {report.tinyfishSearch.top_serp_results.map((result) => {
                    const ownDomain = isOwnDomain(result.url, report.domain);
                    return (
                      <li className={ownDomain ? "serp-item serp-item--own" : "serp-item"} key={result.url}>
                        <span className="serp-position">{String(result.position).padStart(2, "0")}</span>
                        <div className="serp-content">
                          <div className="serp-title-row">
                            <a href={result.url} target="_blank" rel="noreferrer">{result.title || result.url}</a>
                            {ownDomain && <span className="own-result">Your domain</span>}
                          </div>
                          <p>{result.snippet}</p>
                          <span className="serp-url">{result.url}</span>
                        </div>
                        <a className="serp-open" href={result.url} target="_blank" rel="noreferrer" aria-label="Open search result in a new tab">
                          <ExternalLink size={15} />
                        </a>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="no-results">No search results were returned for this query.</p>
              )}
            </section>
          </div>
        )}

        {/* LIGHTBOX MODAL FOR FULL-SIZE ANNOTATED SCREENSHOT */}
        {selectedShot && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedShot(null)}
          >
            <div
              className="max-w-5xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full ${getSeverityBadgeStyle(
                      selectedShot.severity
                    )}`}
                  >
                    {selectedShot.severity}
                  </span>
                  <h3 className="font-bold text-white text-base">{selectedShot.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedShot(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={selectedShot.screenshotBase64}
                alt={selectedShot.title}
                className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-800 bg-slate-950"
              />
            </div>
          </div>
        )}

        <footer className="page-footer">
          <span>One URL per audit</span>
          <span>Scores are heuristic summaries; use the evidence and source metrics to guide decisions.</span>
        </footer>
      </div>
    </main>
  );
}