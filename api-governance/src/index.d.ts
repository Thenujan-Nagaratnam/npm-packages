// ─── Shared primitives ────────────────────────────────────────────────────────

export interface Range {
  start: { line: number; character: number };
  end:   { line: number; character: number };
}

export type Severity = 'error' | 'warn' | 'info' | 'hint';

export interface Violation {
  rule:          string;
  message:       string;
  severity:      Severity;
  path:          (string | number)[];
  description?:  string;
  fixSuggestion?: string;
  range?:        Range;
  endpoint?:     string;
  method?:       string;
  line?:         number;
  displayPath?:  string;
}

export interface PassedRule {
  rule:          string;
  message:       string;
  severity:      'passed';
  description?:  string;
  fixSuggestion?: string;
}

// ─── Report structures ────────────────────────────────────────────────────────

export interface OverviewMetric {
  id:     string;
  label:  string;
  value:  number;
  accent: 'error' | 'warning' | 'info';
}

export interface Overview {
  score:        number;
  passedChecks: number;
  totalChecks:  number;
  metrics:      OverviewMetric[];
}

export interface SubBucket {
  id:          string;
  label:       string;
  description: string;
  percentage:  number;
  total?:      number;
  errors?:     number;
  warnings?:   number;
  infos?:      number;
  viewIssuesFilter: { key: string; label: string };
}

export interface BreakdownCategory {
  id:                string;
  label:             string;
  description:       string;
  status:            'passed' | 'failed';
  total:             number;
  errors:            number;
  warnings:          number;
  infos:             number;
  percentage:        number;
  affectedEndpoints: number;
  docsUrl?:          string;
  viewIssuesFilter:  { key: string; label: string };
  subBuckets:        SubBucket[];
  topRules?:         string[];
}

export interface Breakdown {
  title:      string;
  subtitle:   string;
  categories: BreakdownCategory[];
}

export interface IssueExplorerFilterOption {
  key:   string;
  label: string;
}

export interface IssueExplorer {
  title:                  string;
  subtitle:               string;
  breakdownFilterOptions: IssueExplorerFilterOption[];
}

export type ReportId = 'owasp' | 'ai-readiness' | 'rest-api-readiness';

export interface GeneratedReport {
  schemaVersion: string;
  reportId:      ReportId;
  title:         string;
  violationsById: Record<string, Violation & {
    id:           string;
    pathSegments: (string | number)[];
    displayPath:  string;
    endpoint:     string;
    method:       string;
    line?:        number;
    breakdownKeys: string[];
  }>;
  overview:      Overview;
  breakdown:     Breakdown;
  issueExplorer: IssueExplorer;
  aiReadinessSummary?: AiReadinessSummary;
}

// ─── AI Readiness ─────────────────────────────────────────────────────────────

export interface AiReadinessSubBucket {
  id:          string;
  label:       string;
  description: string;
  score:       number;
  weight:      number;
  violations:  number;
}

export interface AiReadinessDimension {
  id:          string;
  label:       string;
  description: string;
  weight:      number;
  score:       number;
  subBuckets:  AiReadinessSubBucket[];
}

export interface AiReadinessSummary {
  score:      number;
  dimensions: AiReadinessDimension[];
}

// ─── Governance summary (runSpectralValidation result) ───────────────────────

export interface GovernanceSummary {
  outputSchemaVersion: string;
  score:               number;
  totalRuleCount:      number;
  passedRuleCount:     number;
  failedRuleCount:     number;
  totalChecks:         number;
  passedChecks:        number;
  failedChecks:        number;
  violationSummary: {
    totalViolations:   number;
    errorRules:        number;
    warningRules:      number;
    infoRules:         number;
    hintRules:         number;
    errorViolations:   number;
    warningViolations: number;
    infoViolations:    number;
    hintViolations:    number;
  };
  violations:         Violation[];
  passedRules:        PassedRule[];
  reportId:           ReportId;
  report:             GeneratedReport;
  rulesetMetadata?:   Record<string, unknown>;
  aiReadinessSummary?: AiReadinessSummary;
}

// ─── Bundled ruleset descriptor ───────────────────────────────────────────────

export interface BundledRuleset {
  rulesetId:           string;
  rulesetTitle:        string;
  rulesetFileUrl:      string;
  rulesetContentPath:  string;
  customFunctionsPath: string;
}

// ─── Custom ruleset options ───────────────────────────────────────────────────

export interface CustomRulesetOptions {
  rulesetFileUrl:      string;
  rulesetContentPath?: string;
  customFunctionsPath?: string;
  gitRootPath?:        string;
  authToken?:          string;
  outputFormat?:       'spectral' | 'summary' | 'report';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Lint an OpenAPI document and return a governance summary with violations and scores. */
export function runSpectralValidation(
  specPath: string,
  ruleset: string | CustomRulesetOptions
): Promise<GovernanceSummary>;

/** Build a structured report from a governance summary. */
export function generateReport(
  rulesetNameOrId: string,
  input: GovernanceSummary | { violations?: Violation[]; passedRules?: PassedRule[]; passedChecks?: number; totalChecks?: number; score?: number }
): GeneratedReport;

/** Render a self-contained HTML report string. */
export function buildHtmlReport(
  reportInput: { report: GeneratedReport } | GovernanceSummary,
  options?: { specContent?: string }
): string;

/** Resolve a bundled ruleset by ID (case-insensitive). Returns null for unknown IDs. */
export function resolveBundledRuleset(id: string): BundledRuleset | null;

/** Resolve the full filesystem path for a ruleset. */
export function constructRulesetPath(fileName: string): string;

/** Resolve the report kind (owasp / ai-readiness / rest-api-readiness) for a ruleset name. */
export function getReportKind(rulesetName: string): ReportId;

export const BUNDLED_RULESETS: Record<string, BundledRuleset>;
export const OWASP_CATEGORIES: Array<{ key: string; label: string; docsUrl?: string }>;
