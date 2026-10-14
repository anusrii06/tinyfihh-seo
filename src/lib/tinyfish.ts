// src/lib/tinyfish.ts
const API_KEY = process.env.TINYFISH_API_KEY || "";

// ENDPOINT 1: TinyFish Fetch API (Live Uncached Extraction)
export async function runTinyFishFetch(url: string, purpose: string, ttl = 0) {
  const res = await fetch("https://api.fetch.tinyfish.ai", {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      urls: [url],
      format: "markdown",
      ttl, // ttl: 0 guarantees live extraction
      purpose,
    }),
  });
  return res.json();
}

// ENDPOINT 2: TinyFish Search API (Live Indexation & SERP Ranking)
export async function runTinyFishSearch(query: string, purpose: string, includeDomains?: string) {
  const url = new URL("https://api.search.tinyfish.ai");
  url.searchParams.set("query", query);
  url.searchParams.set("purpose", purpose);
  if (includeDomains) {
    url.searchParams.set("include_domains", includeDomains);
  }

  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": API_KEY },
    cache: "no-store",
  });
  return res.json();
}

// ENDPOINT 3: TinyFish Web Agent API (Interactive Hidden DOM Check)
export async function runTinyFishAgentAudit(url: string) {
  try {
    const res = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        goal: "Inspect the live page for content hidden inside tabs, accordions, pricing toggles, or 'Read more' buttons that static crawlers miss. Return JSON with keys: interactiveElementsFound (number), hiddenContentSummary (string), and agentNavigationBlockers (string).",
      }),
    });

    if (!res.body) return null;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let finalEvent: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.result || parsed.output || parsed.status === "COMPLETED") {
              finalEvent = parsed;
            }
          } catch {}
        }
      }
    }
    return finalEvent;
  } catch (err: any) {
    return { error: err.message };
  }
}