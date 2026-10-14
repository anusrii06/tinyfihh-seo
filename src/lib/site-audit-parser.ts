// src/lib/site-audit-parser.ts
import * as cheerio from "cheerio";
import { SiteAuditSeoMetrics } from "@/types/audit";

export async function extractSiteAuditMetrics(url: string): Promise<SiteAuditSeoMetrics> {
  const startTime = Date.now();
  let rawHtml = "";
  let status = 0;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TinyFishSEOBot/1.0)" },
      cache: "no-store",
    });
    status = res.status;
    rawHtml = await res.text();
  } catch {
    status = 500;
  }

  const request_time_ms = Date.now() - startTime;
  const $ = cheerio.load(rawHtml || "<html></html>");

  const title = $("title").first().text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() || "";
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || "";
  const robots = $('meta[name="robots"]').attr("content")?.trim() || "";
  const og_title = $('meta[property="og:title"]').attr("content")?.trim() || "";
  const og_image = Boolean($('meta[property="og:image"]').attr("content")?.trim());

  const h1_list = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2_list = $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h3_list = $("h3").map((_, el) => $(el).text().trim()).get().filter(Boolean);

  const schema_types: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || "{}");
      const collect = (obj: any) => {
        if (!obj) return;
        if (Array.isArray(obj)) obj.forEach(collect);
        else if (typeof obj === "object") {
          if (obj["@type"]) {
            schema_types.push(Array.isArray(obj["@type"]) ? obj["@type"].join(", ") : obj["@type"]);
          }
          if (obj["@graph"]) collect(obj["@graph"]);
        }
      };
      collect(parsed);
    } catch {}
  });

  const images = $("img").length;
  const images_without_alt = $("img:not([alt]), img[alt='']").length;

  const $clean = cheerio.load(rawHtml || "<html></html>");
  $clean("script, style, noscript, svg").remove();
  const visibleText = $clean("body").text().replace(/\s+/g, " ").trim();
  const htmlBytes = Buffer.byteLength(rawHtml || "", "utf8");
  const text_ratio_percent =
    htmlBytes > 0 ? Number(((Buffer.byteLength(visibleText, "utf8") / htmlBytes) * 100).toFixed(2)) : 0;

  return {
    status,
    request_time_ms,
    title,
    description,
    canonical,
    robots,
    h1_count: h1_list.length,
    h2_count: h2_list.length,
    h3_count: h3_list.length,
    h1_list,
    images,
    images_without_alt,
    schema_types,
    text_ratio_percent,
    html_size_kb: Number((htmlBytes / 1024).toFixed(1)),
    raw_word_count: visibleText ? visibleText.split(/\s+/).filter(Boolean).length : 0,
    og_title,
    og_image,
  };
}