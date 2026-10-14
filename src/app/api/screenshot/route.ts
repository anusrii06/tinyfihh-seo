// src/app/api/screenshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright-core";

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY || "";

export async function POST(req: NextRequest) {
  let sessionId: string | null = null;

  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    // 1. Create a Remote Browser Session via TinyFish Browser API (3rd Endpoint)
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

    // 2. Connect to TinyFish's Cloud Chromium via CDP
    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0] || (await browser.newContext());
    const page = context.pages()[0] || (await context.newPage());

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500); // Let client-side UI settle

    // 3. Inject Visual SEO Defect Overlays directly into the live DOM
    const highlightedDefects = await page.evaluate(() => {
      const defects: { type: string; count: number }[] = [];

      const badgeElement = (el: HTMLElement, label: string, color: string) => {
        el.style.outline = `3px solid ${color}`;
        el.style.outlineOffset = "2px";
        el.style.position = el.style.position || "relative";

        const badge = document.createElement("div");
        badge.innerText = label;
        badge.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          background: ${color};
          color: #fff;
          font-family: monospace;
          font-size: 11px;
          font-weight: bold;
          padding: 2px 6px;
          z-index: 999999;
          border-radius: 0 0 4px 0;
          pointer-events: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        `;
        el.appendChild(badge);
      };

      // Highlight Images Missing Alt Text (Invisible to AI Vision/Fetch)
      const missingAltImgs = Array.from(
        document.querySelectorAll("img:not([alt]), img[alt='']")
      ) as HTMLElement[];
      missingAltImgs.forEach((img) => badgeElement(img, "MISSING ALT (AI BLIND SPOT)", "#ef4444"));
      if (missingAltImgs.length > 0) {
        defects.push({ type: "Images missing alt attribute", count: missingAltImgs.length });
      }

      // Highlight H1 issues (Multiple H1s or verify primary H1 placement)
      const h1s = Array.from(document.querySelectorAll("h1")) as HTMLElement[];
      if (h1s.length > 1) {
        h1s.forEach((h1, idx) =>
          badgeElement(h1, `DUPLICATE H1 #${idx + 1} (AMBIGUOUS TOPIC)`, "#f59e0b")
        );
        defects.push({ type: "Ambiguous multiple <h1> tags", count: h1s.length });
      } else if (h1s.length === 1) {
        badgeElement(h1s[0], "PRIMARY H1 (AI CHUNK ANCHOR)", "#10b981");
      }

      // Highlight Empty / Non-Descriptive Links
      const weakLinks = Array.from(document.querySelectorAll("a")).filter((a) => {
        const txt = (a.innerText || "").trim().toLowerCase();
        return !txt || txt === "click here" || txt === "read more" || txt === "more";
      }) as HTMLElement[];
      weakLinks.slice(0, 8).forEach((a) => badgeElement(a, "WEAK LINK ANCHOR", "#f97316"));
      if (weakLinks.length > 0) {
        defects.push({ type: "Non-descriptive or empty link anchors", count: weakLinks.length });
      }

      // Check for missing semantic <main> or <article> container
      const hasSemanticMain = Boolean(document.querySelector("main, article"));
      if (!hasSemanticMain && document.body) {
        const banner = document.createElement("div");
        banner.innerText =
          "⚠️ SEO AUDIT WARNING: No <main> or <article> tag found — AI Fetch tools may strip core content as boilerplate";
        banner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #dc2626;
          color: white;
          padding: 10px 16px;
          font-family: sans-serif;
          font-size: 13px;
          font-weight: bold;
          text-align: center;
          z-index: 9999999;
        `;
        document.body.prepend(banner);
        defects.push({ type: "Missing semantic <main> / <article> wrapper", count: 1 });
      }

      return defects;
    });

    // 4. Take Base64 Screenshot of Annotated Page
    const buffer = await page.screenshot({ type: "jpeg", quality: 80, fullPage: false });
    const base64Image = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    await browser.close();

    // 5. Terminate TinyFish Browser Session cleanly
    if (sessionId) {
      await fetch(`https://api.browser.tinyfish.ai/${sessionId}`, {
        method: "DELETE",
        headers: { "X-API-Key": TINYFISH_API_KEY },
      }).catch(() => {});
    }

    return NextResponse.json({
      sessionId,
      screenshot: base64Image,
      highlightedDefects,
    });
  } catch (error: any) {
    if (sessionId) {
      await fetch(`https://api.browser.tinyfish.ai/${sessionId}`, {
        method: "DELETE",
        headers: { "X-API-Key": TINYFISH_API_KEY },
      }).catch(() => {});
    }
    return NextResponse.json(
      { error: error.message || "Failed to capture annotated SEO screenshot" },
      { status: 500 }
    );
  }
}