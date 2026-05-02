/**
 * One row from your Spectral / lint result list (before normalization).
 */
export interface ValidationFinding {
  rule: string;
  code?: string;
  message: string;
  description?: string;
  fixSuggestion?: string;
  severity: string;
  path?: string[] | string;
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

/**
 * What you pass into {@link generateReport}: optional scores plus the violation list.
 */
export interface GenerateReportInput {
  violations?: ValidationFinding[];
  /** Rules that passed (used to improve scoring accuracy for OWASP/REST). */
  passedRules?: Array<{ rule: string }>;
  score?: number;
  passedChecks?: number;
  totalChecks?: number;
}

/**
 * Distinguishes AI readiness vs OWASP vs WSO2 REST in the generated payload (`reportId`).
 */
export type ReportKind = 'ai-readiness' | 'owasp' | 'rest-api-readiness';

/**
 * Normalized issue in `violationsById` on the generated report.
 */
export interface ReportIssue {
  id: string;
  rule: string;
  message: string;
  description?: string;
  fixSuggestion?: string;
  severity: 'error' | 'warn' | 'info' | 'hint';
  code?: string;
  pathSegments: string[];
  displayPath: string;
  endpoint: string;
  method: string;
  line: number;
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  /** Dimension key + sub-bucket key for this violation (used by breakdown filters). */
  breakdownKeys: string[];
}

/**
 * Sub-bucket inside an AI Readiness dimension category.
 */
export interface ReportSubBucket {
  id: string;
  label: string;
  description?: string;
  /** Penalty-based pass percentage (0–100). */
  percentage: number;
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  viewIssuesFilter: { key: string; label: string };
}

/**
 * One category row under `breakdown.categories`.
 */
export interface BreakdownCategory {
  id: string;
  label: string;
  description?: string;
  status: 'passed' | 'failed';
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  /** Penalty-based pass percentage (0–100). */
  percentage: number;
  affectedEndpoints: number;
  docsUrl?: string;
  viewIssuesFilter: { key: string; label: string };
  /** AI Readiness: one entry per sub-bucket (summaries, descriptions, …). */
  subBuckets?: ReportSubBucket[];
  /** REST Compliance: top 2 rules by violation count. */
  topRules?: string[];
}

/**
 * Full report object returned from {@link generateReport}.
 */
export interface GeneratedReport {
  schemaVersion: '1';
  reportId: ReportKind;
  title: string;
  violationsById: Record<string, ReportIssue>;
  overview: {
    score: number;
    passedChecks: number;
    totalChecks: number;
    metrics: Array<{
      id: string;
      label: string;
      value: number;
      accent?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
    }>;
  };
  breakdown: {
    title: string;
    subtitle: string;
    categories: BreakdownCategory[];
  };
  issueExplorer: {
    title: string;
    subtitle: string;
    breakdownFilterOptions: Array<{ key: string; label: string }>;
  };
}

/** Guess report type from the ruleset's display name (e.g. "OWASP …" → `owasp`). */
export function getReportKind(rulesetName: string): ReportKind;

/**
 * Build the full analyze/governance report from raw validation output.
 * @param rulesetName - Ruleset display name; used to choose report type and for `title`
 * @param input - Scores, passed rules, and violation list from your Spectral (or similar) run
 */
export function generateReport(rulesetName: string, input: GenerateReportInput): GeneratedReport;

export const OWASP_CATEGORIES: ReadonlyArray<{ key: string; label: string; docsUrl?: string }>;
export const AI_RULE_CATEGORY: Record<string, string>;
export const AI_CATEGORIES: ReadonlyArray<{ id: string; label: string; description: string }>;
