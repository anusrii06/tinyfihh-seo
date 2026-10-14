// src/app/api/screenshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright-core";

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY || "";

export interface SeverityScreenshot {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  selector: string;
  elementCount: number;
  codeFix: string;
  screenshotBase64: string;
}

export async function POST(req: NextRequest) {
  let sessionId: string | null = null;

  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    // 1. Start TinyFish Cloud Browser Session (3rd Endpoint)
    const sessionRes = await fetch("https://api.browser.tinyfish.ai", {
      method: "POST",
      headers: {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: normalizedUrl }),
    });

    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      throw new Error(`TinyFish Browser API error (${sessionRes.status}): ${errText}`);
    }

    const sessionData = await sessionRes.json();
    sessionId = sessionData.session_id;
    const cdpUrl = sessionData.cdp_url;

    // 2. Connect to TinyFish Cloud Chromium via CDP
    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0] || (await browser.newContext());
    const page = context.pages()[0] || (await context.newPage());

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);

    // 3. Detect Visual SEO Issues Categorized by Severity
    const detectedTasks = await page.evaluate(() => {
      const tasks: {
        id: string;
        severity: "critical" | "warning" | "info";
        title: string;
        description: string;
        selector: string;
        elementCount: number;
        codeFix: string;
      }[] = [];

      // CRITICAL 1: Missing or Multiple H1s
      const h1s = document.querySelectorAll("h1");
      if (h1s.length === 0) {
        tasks.push({
          id: "crit-missing-h1",
          severity: "critical",
          title: "Missing Primary <h1> Heading in Above-the-Fold Viewport",
          description:
            "AI chunkers rely on a single H1 to anchor the document's primary topic. No <h1> exists in the live DOM.",
          selector: "body",
          elementCount: 0,
          codeFix: `<h1>Primary Page Topic & Target Keyword</h1>`,
        });
      } else if (h1s.length > 1) {
        tasks.push({
          id: "crit-multiple-h1",
          severity: "critical",
          title: `Multiple Competing <h1> Headings (${h1s.length} Found)`,
          description:
            "Multiple H1 tags fragment topical authority when TinyFish Fetch converts DOM hierarchy into Markdown.",
          selector: "h1",
          elementCount: h1s.length,
          codeFix: `<!-- Keep only 1 primary H1 and demote secondary H1s to H2: -->\n<h2>Secondary Section Heading</h2>`,
        });
      }

      // CRITICAL 2: Missing Semantic <main> or <article> Container
      const semanticRoot = document.querySelector("main, article, [role='main']");
      if (!semanticRoot) {
        tasks.push({
          id: "crit-no-semantic-main",
          severity: "critical",
          title: "Missing Semantic <main> or <article> Wrapper",
          description:
            "AI Fetch tools strip non-semantic <div> soup as boilerplate. Wrapping core text in <main> or <article> guarantees extraction.",
          selector: "body > div:first-of-type, body",
          elementCount: 1,
          codeFix: `<main>\n  <article>\n    <!-- Move primary page content here -->\n  </article>\n</main>`,
        });
      }

      // WARNING 1: Images Missing Alt Attributes (Visual AI Blind Spots)
      const imgsMissingAlt = Array.from(
        document.querySelectorAll("img:not([alt]), img[alt='']")
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 24 && rect.height > 24;
      });
      if (imgsMissingAlt.length > 0) {
        imgsMissingAlt.forEach((el, i) => el.setAttribute("data-tf-audit", `missing-alt-${i}`));
        tasks.push({
          id: "warn-missing-alt",
          severity: "warning",
          title: `${imgsMissingAlt.length} Visible Image(s) Missing Alt Text`,
          description:
            "TinyFish Fetch and LLM crawlers cannot interpret visual diagrams or product photos without descriptive alt text.",
          selector: "[data-tf-audit^='missing-alt-']",
          elementCount: imgsMissingAlt.length,
          codeFix: `<img src="..." alt="Descriptive explanation of the visual content for AI agents" />`,
        });
      }

      // WARNING 2: Generic / Empty Link Anchors ("Click here", "Read more", or empty)
      const weakLinks = Array.from(document.querySelectorAll("a")).filter((a) => {
        const text = (a.innerText || "").trim().toLowerCase();
        const aria = a.getAttribute("aria-label") || a.getAttribute("title");
        const rect = a.getBoundingClientRect();
        return (
          rect.width > 10 &&
          rect.height > 10 &&
          ((!text && !aria) || ["click here", "read more", "more", "learn more", "link"].includes(text))
        );
      });
      if (weakLinks.length > 0) {
        weakLinks.forEach((el, i) => el.setAttribute("data-tf-audit-link", `weak-link-${i}`));
        tasks.push({
          id: "warn-weak-links",
          severity: "warning",
          title: `${weakLinks.length} Non-Descriptive or Empty Link Anchor(s)`,
          description:
            "AI agents and crawlers use anchor text to understand the destination URL's context before following links.",
          selector: "[data-tf-audit-link^='weak-link-']",
          elementCount: weakLinks.length,
          codeFix: `<a href="/pricing" aria-label="View Enterprise API Pricing Tiers">View Enterprise API Pricing Tiers</a>`,
        });
      }

      // INFO / VERIFIED: Always capture the Primary Heading / Hero Anchor Structure
      if (h1s.length === 1) {
        tasks.push({
          id: "info-h1-anchor",
          severity: "info",
          title: "Verified Primary <h1> & Above-the-Fold Topic Anchor",
          description:
            "Single primary <h1> cleanly anchors the Markdown document tree for TinyFish Fetch and LLM RAG chunkers.",
          selector: "h1",
          elementCount: 1,
          codeFix: `<!-- H1 structure is valid. Ensure a concise 40-60 word summary paragraph immediately follows this H1. -->`,
        });
      }

      return tasks;
    });

    const screenshots: SeverityScreenshot[] = [];

    // 4. Loop Through Each Severity Task, Scroll to Target, Highlight & Capture Screenshot
    for (const task of detectedTasks.slice(0, 4)) {
      const color =
        task.severity === "critical"
          ? "#ef4444" // Red
          : task.severity === "warning"
          ? "#f59e0b" // Amber
          : "#3b82f6"; // Blue

      // Scroll first matching element into view
      const locator = page.locator(task.selector).first();
      if ((await locator.count()) > 0) {
        await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);
      }

      // Inject severity-specific visual overlays into DOM
      await page.evaluate(
        ({ selector, label, badgeColor, severity }) => {
          // Remove previous overlays before taking this specific screenshot
          document.querySelectorAll(".tf-audit-overlay-badge").forEach((el) => el.remove());
          document.querySelectorAll("[data-tf-outlined]").forEach((el) => {
            (el as HTMLElement).style.outline = "";
            el.removeAttribute("data-tf-outlined");
          });

          // Top HUD Banner showing which severity issue is pictured
          const hud = document.createElement("div");
          hud.className = "tf-audit-overlay-badge";
          hud.innerText = `[${severity.toUpperCase()}] ${label}`;
          hud.style.cssText = `
            position: fixed;
            top: 12px;
            left: 12px;
            background: ${badgeColor};
            color: #ffffff;
            padding: 8px 14px;
            font-family: monospace;
            font-size: 13px;
            font-weight: bold;
            border-radius: 6px;
            z-index: 2147483647;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          `;
          document.body.appendChild(hud);

          const targets = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
          targets.slice(0, 10).forEach((el, idx) => {
            el.setAttribute("data-tf-outlined", "true");
            el.style.outline = `4px solid ${badgeColor}`;
            el.style.outlineOffset = "3px";

            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const tag = document.createElement("div");
              tag.className = "tf-audit-overlay-badge";
              tag.innerText = `${severity.toUpperCase()} #${idx + 1}`;
              tag.style.cssText = `
                position: fixed;
                top: ${Math.max(48, rect.top - 22)}px;
                left: ${Math.max(8, rect.left)}px;
                background: ${badgeColor};
                color: #fff;
                font-family: monospace;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 4px;
                z-index: 2147483646;
                pointer-events: none;
              `;
              document.body.appendChild(tag);
            }
          });
        },
        {
          selector: task.selector,
          label: task.title,
          badgeColor: color,
          severity: task.severity,
        }
      );

      const buf = await page.screenshot({ type: "jpeg", quality: 75, fullPage: false });
      screenshots.push({
        ...task,
        screenshotBase64: `data:image/jpeg;base64,${buf.toString("base64")}`,
      });
    }

    await browser.close();

    // 5. Cleanly close TinyFish Browser Session
    if (sessionId) {
      await fetch(`https://api.browser.tinyfish.ai/${sessionId}`, {
        method: "DELETE",
        headers: { "X-API-Key": TINYFISH_API_KEY },
      }).catch(() => {});
    }

    // Sort Critical -> Warning -> Info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    screenshots.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      sessionId,
      screenshots,
    });
  } catch (error: any) {
    if (sessionId) {
      await fetch(`https://api.browser.tinyfish.ai/${sessionId}`, {
        method: "DELETE",
        headers: { "X-API-Key": TINYFISH_API_KEY },
      }).catch(() => {});
    }
    return NextResponse.json(
      { error: error.message || "Failed to capture multi-severity SEO screenshots" },
      { status: 500 }
    );
  }
}