// src/app/api/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractSiteAuditMetrics } from "@/lib/site-audit-parser";
import { runTinyFishFetch, runTinyFishSearch, runTinyFishAgentAudit } from "@/lib/tinyfish";
import { AuditFix } from "@/types/audit";

export async function POST(req: NextRequest) {
  try {
    const { url, query, runAgentAudit } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const domain = new URL(normalizedUrl).hostname.replace(/^www\./, "");

    // 1. Run Raw HTML Baseline + TinyFish Fetch (Live ttl: 0) in parallel
    const [rawMetrics, fetchData] = await Promise.all([
      extractSiteAuditMetrics(normalizedUrl),
      runTinyFishFetch(
        normalizedUrl,
        `Audit AI readability and extract core topical content for ${query || normalizedUrl}`,
        0
      ),
    ]);

    const tfPage = fetchData?.results?.[0] || null;
    const tfError = fetchData?.errors?.[0] || null;
    const aiMarkdown: string = tfPage?.text || "";
    const aiWordCount = aiMarkdown ? aiMarkdown.split(/\s+/).filter(Boolean).length : 0;
    const aiHeadings = aiMarkdown
      .split("\n")
      .filter((line) => /^#{1,3}\s+/.test(line.trim()))
      .map((line) => line.trim());

    // 2. Run TinyFish Search (Target Query + Domain Indexation Check)
    const effectiveQuery =
      query?.trim() ||
      rawMetrics.h1_list[0] ||
      rawMetrics.title.split(/[|\-–—]/)[0]?.trim() ||
      domain;

    const [querySearchData, domainSearchData] = await Promise.all([
      runTinyFishSearch(effectiveQuery, `Evaluate search visibility and top competitors for ${effectiveQuery}`),
      runTinyFishSearch(`${domain} ${effectiveQuery}`, `Verify domain indexation for ${domain}`, domain),
    ]);

    const queryResults: any[] = querySearchData?.results || [];
    const domainResults: any[] = domainSearchData?.results || [];

    const exactMatchRank = queryResults.findIndex(
      (r) => r.url?.replace(/\/$/, "") === normalizedUrl.replace(/\/$/, "")
    );
    const domainMatchRank = queryResults.findIndex((r) => r.url?.includes(domain));

    const indexedEntry =
      queryResults[exactMatchRank] ||
      domainResults.find((r) => r.url?.replace(/\/$/, "") === normalizedUrl.replace(/\/$/, "")) ||
      domainResults[0] ||
      null;

    // 3. Benchmark #1 Competitor via TinyFish Fetch
    const topCompetitor = queryResults.find((r) => !r.url?.includes(domain));
    let competitorComparison = null;

    if (topCompetitor?.url) {
      try {
        const compFetch = await runTinyFishFetch(
          topCompetitor.url,
          `Extract structure of #1 ranking page for ${effectiveQuery}`,
          3600
        );
        const compPage = compFetch?.results?.[0];
        if (compPage?.text) {
          competitorComparison = {
            url: topCompetitor.url,
            title: topCompetitor.title,
            snippet: topCompetitor.snippet,
            wordCount: compPage.text.split(/\s+/).filter(Boolean).length,
            headings: compPage.text
              .split("\n")
              .filter((l: string) => /^#{1,3}\s+/.test(l.trim()))
              .slice(0, 8),
          };
        }
      } catch {}
    }

    // 4. Optional 3rd Endpoint: TinyFish Agent Audit
    const agentAuditResult = runAgentAudit ? await runTinyFishAgentAudit(normalizedUrl) : null;

    // 5. Generate Specific, Same-Day Actionable Fixes
    const fixes: AuditFix[] = [];

    if (tfError || aiWordCount < 50) {
      fixes.push({
        id: "ai-fetch-blocked-or-empty",
        severity: "critical",
        category: "AI Readability",
        title: tfError
          ? `TinyFish Fetch Failed (${tfError.error || "Blocked/Timeout"})`
          : `Critically Thin AI Extraction (${aiWordCount} words extracted)`,
        impact:
          "AI answer engines strip boilerplate and extract semantic containers (<main>, <article>). Because TinyFish Fetch extracted almost no text, LLMs cannot cite or rank this page.",
        evidence: `Raw HTML contains ${rawMetrics.raw_word_count} visible words, but TinyFish Fetch extracted only ${aiWordCount} words.`,
        codeFix: `<main id="main-content">\n  <article>\n    <h1>${rawMetrics.h1_list[0] || rawMetrics.title || "Primary Topic"}</h1>\n    <p>Move core answer-first content directly inside semantic <article> tags.</p>\n  </article>\n</main>`,
      });
    }

    if (aiWordCount > rawMetrics.raw_word_count * 1.35 && rawMetrics.raw_word_count < 150) {
      fixes.push({
        id: "csr-js-dependency",
        severity: "warning",
        category: "AI Readability",
        title: "High Client-Side JavaScript Rendering Dependency",
        impact:
          "Raw HTML returned very little text compared to TinyFish Fetch's headless JS renderer. Non-JS AI crawlers (GPTBot, ClaudeBot, PerplexityBot) will see an empty shell.",
        evidence: `Raw SSR HTML had ${rawMetrics.raw_word_count} words vs. ${aiWordCount} words after TinyFish JS execution.`,
        codeFix: `// Convert client-fetched sections into a Next.js Server Component:\nexport default async function Page() {\n  const content = await fetchSSRContent();\n  return <article>{content}</article>;\n}`,
      });
    }

    if (rawMetrics.h1_count !== 1) {
      fixes.push({
        id: "h1-count-invalid",
        severity: rawMetrics.h1_count === 0 ? "critical" : "warning",
        category: "Technical SEO",
        title:
          rawMetrics.h1_count === 0
            ? "Missing Primary <h1> Heading"
            : `Multiple <h1> Tags Detected (${rawMetrics.h1_count})`,
        impact:
          "AI retrieval pipelines split documents by Markdown heading hierarchy (# H1, ## H2). Missing or duplicate H1s degrade passage chunking.",
        evidence: `Found ${rawMetrics.h1_count} <h1> tags in DOM: ${rawMetrics.h1_list.slice(0, 3).join(" | ") || "None"}`,
        codeFix: `<h1>${rawMetrics.title || effectiveQuery}</h1>`,
      });
    }

    if (rawMetrics.schema_types.length === 0) {
      fixes.push({
        id: "missing-schema-jsonld",
        severity: "warning",
        category: "AI Readability",
        title: "No JSON-LD Schema.org Markup Detected",
        impact:
          "AI search engines cross-reference extracted Markdown with explicit JSON-LD entities to verify authorship, FAQs, and organization details.",
        evidence: `0 <script type="application/ld+json"> blocks found on ${normalizedUrl}.`,
        codeFix: `<script type="application/ld+json">\n${JSON.stringify(
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: rawMetrics.title || tfPage?.title || effectiveQuery,
            description: rawMetrics.description || tfPage?.description || "Summary for AI search agents",
            url: normalizedUrl,
          },
          null,
          2
        )}\n</script>`,
      });
    }

    if (exactMatchRank === -1 && domainMatchRank === -1) {
      fixes.push({
        id: "not-ranking-for-query",
        severity: "critical",
        category: "Search Visibility",
        title: `Not Ranking in Top 10 for "${effectiveQuery}"`,
        impact: competitorComparison
          ? `TinyFish Search ranks ${competitorComparison.url} at #1 with ${competitorComparison.wordCount} AI-readable words and ${competitorComparison.headings.length} structured sections, compared to your ${aiWordCount} AI-extracted words.`
          : `Your page did not appear in TinyFish Search's top results for "${effectiveQuery}".`,
        evidence: indexedEntry
          ? `Domain is indexed ("${indexedEntry.title}"), but lacks topical coverage to rank for "${effectiveQuery}".`
          : `TinyFish Search found 0 indexed pages for domain "${domain}" matching this topic.`,
        codeFix: competitorComparison
          ? `<!-- #1 Competitor (${competitorComparison.url}) covers these Markdown sections missing on your page: -->\n${competitorComparison.headings
              .slice(0, 5)
              .map((h: string) => `<!-- ${h} -->`)
              .join("\n")}\n\n<h2>${effectiveQuery}</h2>\n<p>Add a direct 40-60 word answer paragraph right below this heading so AI search engines can extract it as a featured snippet.</p>`
          : undefined,
      });
    }

    // Calculate composite scores
    const aiReadabilityScore = Math.max(
      0,
      Math.min(
        100,
        (aiWordCount > 250 ? 40 : Math.floor((aiWordCount / 250) * 40)) +
          (aiHeadings.length >= 3 ? 25 : aiHeadings.length * 8) +
          (rawMetrics.schema_types.length > 0 ? 15 : 0) +
          (rawMetrics.h1_count === 1 ? 10 : 0) +
          (rawMetrics.text_ratio_percent >= 10 ? 10 : 5)
      )
    );

    const searchVisibilityScore = Math.max(
      0,
      Math.min(
        100,
        (exactMatchRank !== -1 ? 50 - exactMatchRank * 4 : domainMatchRank !== -1 ? 25 : 0) +
          (indexedEntry ? 25 : 0) +
          (rawMetrics.description.length >= 50 && rawMetrics.description.length <= 165 ? 15 : 5) +
          (rawMetrics.canonical ? 10 : 0)
      )
    );

    return NextResponse.json({
      url: normalizedUrl,
      domain,
      effectiveQuery,
      scores: {
        aiReadability: aiReadabilityScore,
        searchVisibility: searchVisibilityScore,
        overall: Math.round(aiReadabilityScore * 0.55 + searchVisibilityScore * 0.45),
      },
      siteAuditSeoMetrics: rawMetrics,
      tinyfishFetch: {
        title: tfPage?.title || null,
        description: tfPage?.description || null,
        language: tfPage?.language || null,
        ai_word_count: aiWordCount,
        survival_rate_percent:
          rawMetrics.raw_word_count > 0
            ? Math.min(100, Math.round((aiWordCount / rawMetrics.raw_word_count) * 100))
            : 0,
        extracted_headings: aiHeadings,
        markdown_preview: aiMarkdown.slice(0, 2500),
        error: tfError,
      },
      tinyfishSearch: {
        exact_rank: exactMatchRank !== -1 ? exactMatchRank + 1 : null,
        domain_rank: domainMatchRank !== -1 ? domainMatchRank + 1 : null,
        is_domain_indexed: domainResults.length > 0 || domainMatchRank !== -1,
        indexed_snippet: indexedEntry,
        top_serp_results: queryResults.slice(0, 5),
        competitor_benchmark: competitorComparison,
      },
      tinyfishAgent: agentAuditResult,
      fixes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Audit failed" }, { status: 500 });
  }
}