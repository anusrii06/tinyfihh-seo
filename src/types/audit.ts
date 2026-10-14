// src/types/audit.ts
export interface AuditFix {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "AI Readability" | "Search Visibility" | "Technical SEO" | "Agent Accessibility";
  title: string;
  impact: string;
  evidence: string;
  codeFix?: string;
}

export interface SiteAuditSeoMetrics {
  status: number;
  request_time_ms: number;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  h1_count: number;
  h2_count: number;
  h3_count: number;
  h1_list: string[];
  images: number;
  images_without_alt: number;
  schema_types: string[];
  text_ratio_percent: number;
  html_size_kb: number;
  raw_word_count: number;
  og_title: string;
  og_image: boolean;
}