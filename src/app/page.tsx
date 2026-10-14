// src/app/page.tsx
"use client";

import React, { useState } from "react";
import {
  Search,
  FileCode2,
  Bot,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  Globe,
  Layers,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Cpu,
  TrendingUp,
} from "lucide-react";

const DEMO_PAGES = [
  {
    label: "TinyFish Docs (Clean SSR)",
    url: "https://docs.tinyfish.ai/fetch-api",
    query: "web agent fetch api markdown extraction",
  },
  {
    label: "Wikipedia (Dense Semantic HTML)",
    url: "https://en.wikipedia.org/wiki/Search_engine_optimization",
    query: "what is search engine optimization",
  },
  {
    label: "Hacker News (Minimal Table DOM)",
    url: "https://news.ycombinator.com",
    query: "tech startup news aggregator",
  },
  {
    label: "Next.js Docs (Hybrid RSC)",
    url: "https://nextjs.org/docs",
    query: "react server components framework documentation",
  },
];

export default function AuditDashboard() {
  const [url, setUrl] = useState("https://docs.tinyfish.ai/fetch-api");
  const [query, setQuery] = useState("web agent fetch api markdown extraction");
  const [runAgentAudit, setRunAgentAudit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"markdown" | "headings">("markdown");

  const handleAudit = async (targetUrl = url, targetQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          query: targetQuery,
          runAgentAudit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong while running the live audit.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" /> TinyFish × DTU Workshop Build (3-Endpoint Architecture)
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              AI Search &amp; Readability SEO Auditor
            </h1>
            <p className="text-slate-400 mt-1 text-sm md:text-base max-w-3xl">
              Audits live pages using{" "}
              <code className="text-cyan-400 font-mono">TinyFish Fetch</code> (what AI tools actually extract),{" "}
              <code className="text-cyan-400 font-mono">TinyFish Search</code> (live SERP &amp; competitor gap), and{" "}
              <code className="text-cyan-400 font-mono">TinyFish Agent</code> (hidden interactive DOM check).
            </p>
          </div>
        </header>

        {/* INPUT FORM & DEMO PRESETS */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Target Live Page URL *
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/page"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Target Search Query (Optional)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Auto-derived from H1/Title if left blank"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                onClick={() => handleAudit(url, query)}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? "Auditing..." : "Audit Page"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3rd Endpoint Toggle + Quick Demo Presets */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-medium">One-Click Real Demo Pages:</span>
              {DEMO_PAGES.map((preset) => (
                <button
                  key={preset.url}
                  onClick={() => {
                    setUrl(preset.url);
                    setQuery(preset.query);
                    handleAudit(preset.url, preset.query);
                  }}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={runAgentAudit}
                onChange={(e) => setRunAgentAudit(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500"
              />
              <span>
                Include 3rd Endpoint: Deep Agentic UI Check (
                <code className="text-cyan-400 font-mono">/v1/automation/run-sse</code>)
              </span>
            </label>
          </div>
        </section>

        {/* ERROR BANNER */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* LOADING SKELETON */}
        {loading && (
          <div className="p-12 bg-slate-900/50 border border-slate-800 rounded-2xl text-center space-y-3 animate-pulse">
            <Cpu className="w-8 h-8 text-cyan-400 mx-auto animate-spin" />
            <div className="text-base font-semibold text-white">
              Running Live Uncached Audit via TinyFish Endpoints...
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Fetching live DOM baseline, extracting clean AI Markdown (<code className="text-cyan-400">ttl: 0</code>), querying live SERPs, and benchmarking the #1 ranking competitor.
            </p>
          </div>
        )}

        {/* AUDIT RESULTS */}
        {report && !loading && (
          <div className="space-y-8">
            {/* SCORE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs uppercase font-semibold text-slate-400">
                  Overall AI SEO Score
                </span>
                <div className={`text-4xl font-bold mt-2 ${getScoreColor(report.scores.overall)}`}>
                  {report.scores.overall}/100
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Weighted composite of AI readability (55%) &amp; live search visibility (45%).
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs uppercase font-semibold text-slate-400">
                  AI Readability (Fetch API)
                </span>
                <div className={`text-4xl font-bold mt-2 ${getScoreColor(report.scores.aiReadability)}`}>
                  {report.scores.aiReadability}/100
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  <strong>{report.tinyfishFetch.ai_word_count} words</strong> &amp;{" "}
                  <strong>{report.tinyfishFetch.extracted_headings.length} headings</strong> survived extraction ({report.tinyfishFetch.survival_rate_percent}% survival rate).
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs uppercase font-semibold text-slate-400">
                  Search Visibility (Search API)
                </span>
                <div className={`text-4xl font-bold mt-2 ${getScoreColor(report.scores.searchVisibility)}`}>
                  {report.scores.searchVisibility}/100
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {report.tinyfishSearch.exact_rank
                    ? `Ranks #${report.tinyfishSearch.exact_rank} for "${report.effectiveQuery}"`
                    : report.tinyfishSearch.is_domain_indexed
                    ? "Domain is indexed, but misses Top 10 for target query"
                    : "Domain not found in Top 10 results"}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs uppercase font-semibold text-slate-400">
                  Same-Day Fixes
                </span>
                <div className="text-4xl font-bold mt-2 text-amber-400">
                  {report.fixes.length} {report.fixes.length === 1 ? "Issue" : "Issues"}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Copy-pasteable HTML, JSON-LD Schema, and content gap fixes below.
                </p>
              </div>
            </div>

            {/* ACTIONABLE FIXES (PRIORITIZED) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Same-Day Actionable Fixes (Connecting AI Readability to Search Ranking)
                </h2>
              </div>

              {report.fixes.length === 0 ? (
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>
                    Zero critical readability or visibility blockers detected! Your page is cleanly structured for AI extraction and ranks well for its target query.
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.fixes.map((fix: any) => (
                    <div
                      key={fix.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full ${
                              fix.severity === "critical"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : fix.severity === "warning"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {fix.severity}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {fix.category}
                          </span>
                          <h3 className="font-semibold text-base text-white">{fix.title}</h3>
                        </div>
                      </div>

                      <p className="text-sm text-slate-300">{fix.impact}</p>

                      <div className="text-xs font-mono bg-slate-950/90 border border-slate-800/80 p-3 rounded-lg text-slate-400">
                        <strong className="text-slate-200">Live Audit Evidence:</strong> {fix.evidence}
                      </div>

                      {fix.codeFix && (
                        <div className="relative mt-3">
                          <div className="flex items-center justify-between bg-slate-950 px-4 py-2 rounded-t-xl border border-b-0 border-slate-800 text-xs text-slate-400">
                            <span>Recommended Drop-in Code Fix</span>
                            <button
                              onClick={() => copyCode(fix.id, fix.codeFix)}
                              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                            >
                              {copiedId === fix.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" /> Copy Fix
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-b-xl text-xs text-cyan-300 overflow-x-auto font-mono">
                            <code>{fix.codeFix}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SIDE-BY-SIDE: RAW DOM (viasite/site-audit-seo) VS TINYFISH FETCH */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: viasite/site-audit-seo Technical Baseline */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" />
                    Raw HTML Baseline (<code className="text-xs text-slate-400">site-audit-seo</code> Metrics)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    What traditional non-JS crawlers see in the raw server HTML response.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">HTTP Status &amp; Latency</span>
                    <strong className="text-sm text-white">
                      {report.siteAuditSeoMetrics.status} ({report.siteAuditSeoMetrics.request_time_ms} ms)
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Text-to-HTML Ratio</span>
                    <strong className="text-sm text-white">
                      {report.siteAuditSeoMetrics.text_ratio_percent}% ({report.siteAuditSeoMetrics.html_size_kb} KB)
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Raw DOM vs. AI Word Count</span>
                    <strong className="text-sm text-white">
                      {report.siteAuditSeoMetrics.raw_word_count} raw / {report.tinyfishFetch.ai_word_count} AI words
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Heading Counts (H1 / H2 / H3)</span>
                    <strong className="text-sm text-white">
                      {report.siteAuditSeoMetrics.h1_count} / {report.siteAuditSeoMetrics.h2_count} /{" "}
                      {report.siteAuditSeoMetrics.h3_count}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">JSON-LD Schema Types</span>
                    <strong className="text-sm text-white truncate block">
                      {report.siteAuditSeoMetrics.schema_types.join(", ") || "None (0)"}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Images Missing Alt Text</span>
                    <strong className="text-sm text-white">
                      {report.siteAuditSeoMetrics.images_without_alt} of {report.siteAuditSeoMetrics.images}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 col-span-2">
                    <span className="text-slate-400 block">Canonical URL &amp; Robots Meta</span>
                    <strong className="text-xs text-white truncate block mt-0.5">
                      Canonical: {report.siteAuditSeoMetrics.canonical || "Missing"} | Robots:{" "}
                      {report.siteAuditSeoMetrics.robots || "index, follow (default)"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Right: What TinyFish Fetch Actually Extracts */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <FileCode2 className="w-5 h-5 text-emerald-400" />
                      TinyFish Fetch Output (<code className="text-xs text-cyan-400">ttl: 0</code>)
                    </h3>
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                      <button
                        onClick={() => setActiveTab("markdown")}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          activeTab === "markdown"
                            ? "bg-slate-800 text-white font-medium"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Extracted Markdown
                      </button>
                      <button
                        onClick={() => setActiveTab("headings")}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          activeTab === "headings"
                            ? "bg-slate-800 text-white font-medium"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Headings ({report.tinyfishFetch.extracted_headings.length})
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    What AI tools and LLM RAG pipelines actually read from this URL. Any copy missing here is invisible to AI search answers.
                  </p>

                  {activeTab === "markdown" ? (
                    <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                      {report.tinyfishFetch.markdown_preview ||
                        "No Markdown content could be extracted by TinyFish Fetch."}
                    </pre>
                  ) : (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 h-64 overflow-y-auto space-y-1.5 font-mono">
                      {report.tinyfishFetch.extracted_headings.length > 0 ? (
                        report.tinyfishFetch.extracted_headings.map((h: string, idx: number) => (
                          <div key={idx} className="text-cyan-300">
                            {h}
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500">
                          No semantic Markdown headings (#, ##, ###) survived extraction.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TINYFISH SEARCH SERP & COMPETITOR BENCHMARK */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    TinyFish Search Visibility &amp; #1 Competitor Gap (
                    <code className="text-xs text-cyan-400">api.search.tinyfish.ai</code>)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Target Query: <strong className="text-white">&ldquo;{report.effectiveQuery}&rdquo;</strong> — Connects your AI readability directly to live search rankings.
                  </p>
                </div>
              </div>

              {report.tinyfishSearch.competitor_benchmark && (
                <div className="p-4 bg-slate-950 border border-cyan-500/30 rounded-xl text-xs space-y-2">
                  <div className="text-cyan-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                    <span>#1 Ranking Competitor Benchmark (Extracted via TinyFish Fetch)</span>
                    <a
                      href={report.tinyfishSearch.competitor_benchmark.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                    >
                      Inspect Competitor <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-slate-300">
                    <strong>{report.tinyfishSearch.competitor_benchmark.title}</strong> ranks at the top with{" "}
                    <strong className="text-emerald-400">
                      {report.tinyfishSearch.competitor_benchmark.wordCount} AI-readable words
                    </strong>{" "}
                    compared to your{" "}
                    <strong className="text-cyan-400">{report.tinyfishFetch.ai_word_count} words</strong>.
                  </p>
                  {report.tinyfishSearch.competitor_benchmark.headings?.length > 0 && (
                    <div className="pt-2">
                      <span className="text-slate-400 block mb-1">
                        Top Competitor&apos;s Extracted Markdown Headings:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {report.tinyfishSearch.competitor_benchmark.headings.map(
                          (h: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-300"
                            >
                              {h}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Live Top Search Results for &ldquo;{report.effectiveQuery}&rdquo;
                </div>
                {report.tinyfishSearch.top_serp_results.map((item: any) => {
                  const isTargetDomain = item.url?.includes(report.domain);
                  return (
                    <div
                      key={item.url}
                      className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 text-xs ${
                        isTargetDomain
                          ? "bg-emerald-500/10 border-emerald-500/40"
                          : "bg-slate-950 border-slate-800"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-400">#{item.position}</span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-white hover:underline flex items-center gap-1"
                          >
                            {item.title} <ExternalLink className="w-3 h-3 text-slate-500" />
                          </a>
                          {isTargetDomain && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                              Your Domain
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400">{item.snippet}</p>
                        <span className="text-slate-500 text-[11px] block">{item.url}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* OPTIONAL 3RD ENDPOINT RESULT: TINYFISH AGENT INTERACTIVE AUDIT */}
            {report.tinyfishAgent && (
              <section className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 space-y-3">
                <h3 className="text-lg font-bold flex items-center gap-2 text-cyan-400">
                  <Bot className="w-5 h-5" />
                  Deep Agentic UI Audit (
                  <code className="text-xs">agent.tinyfish.ai/v1/automation/run-sse</code>)
                </h3>
                <p className="text-xs text-slate-400">
                  Interactive browser agent inspection checking whether critical copy is trapped behind tabs, accordions, or client-side click handlers.
                </p>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 overflow-x-auto font-mono">
                  {JSON.stringify(report.tinyfishAgent, null, 2)}
                </pre>
              </section>
            )}
          </div>
        )}

        {/* REQUIREMENT #5: SHORT EXPLANATION OF HOW TINYFISH IS USED */}
        <footer className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-xs text-slate-400 space-y-3">
          <div className="font-bold text-white uppercase tracking-wider">
            How TinyFish Powers This Auditor (3-Endpoint Integration)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <div className="font-semibold text-cyan-400">1. TinyFish Fetch API (ttl: 0)</div>
              <p>
                Extracts live, uncached Markdown from the target URL and diffs it against raw SSR HTML (<code className="text-slate-300">viasite/site-audit-seo</code> metrics) to quantify the AI Content Survival Rate and JS rendering dependency.
              </p>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <div className="font-semibold text-emerald-400">2. TinyFish Search API</div>
              <p>
                Checks domain indexation (<code className="text-slate-300">include_domains</code>) and live SERP ranking for the target query, then passes the #1 ranking competitor back into TinyFish Fetch to expose exact topical &amp; heading gaps.
              </p>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <div className="font-semibold text-amber-400">3. TinyFish Web Agent API</div>
              <p>
                Executes an interactive live browser run (<code className="text-slate-300">/v1/automation/run-sse</code>) to detect content trapped inside accordions, tabs, or toggles that static crawlers miss.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}