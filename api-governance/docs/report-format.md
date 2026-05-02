# Report Format

`generateReport()` returns a `GeneratedReport` object. This document describes every field.

## Top-level

```ts
interface GeneratedReport {
  schemaVersion: '1';
  reportId:      'owasp' | 'rest-api-readiness' | 'ai-readiness';
  title:         string;
  violationsById: Record<string, ReportIssue>;
  overview:       Overview;
  breakdown:      Breakdown;
  issueExplorer:  IssueExplorer;
}
```

| Field | Description |
|---|---|
| `schemaVersion` | Always `"1"`. Used for forward compatibility. |
| `reportId` | Identifies which ruleset produced the report. |
| `title` | Human-readable report name derived from the ruleset. |
| `violationsById` | Map of issue ID → `ReportIssue`. The ID is a stable hash of rule + path. |

---

## `overview`

```ts
interface Overview {
  score:        number;          // 0–100, penalty-weighted
  passedChecks: number;
  totalChecks:  number;
  metrics: Array<{
    id:      string;
    label:   string;
    value:   number;
    accent?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  }>;
}
```

### Standard metrics

| `id` | `label` | Notes |
|---|---|---|
| `errors` | Errors | Count of error-severity violations |
| `warnings` | Warnings | Count of warn-severity violations |
| `infos` | Infos | Count of info-severity violations |
| `endpoints` | Affected Endpoints | Unique `{method} {path}` pairs with at least one violation |

---

## `breakdown`

```ts
interface Breakdown {
  title:      string;
  subtitle:   string;
  categories: BreakdownCategory[];
}
```

### `BreakdownCategory`

```ts
interface BreakdownCategory {
  id:                string;
  label:             string;
  description?:      string;
  docsUrl?:          string;
  status:            'passed' | 'failed';
  percentage:        number;        // 0–100, penalty-based
  total:             number;        // total violations in this category
  errors:            number;
  warnings:          number;
  infos:             number;
  affectedEndpoints: number;
  topRules?:         string[];      // REST only — top 2 rules by violation count
  viewIssuesFilter:  { key: string; label: string };
  subBuckets?:       ReportSubBucket[];   // AI Readiness only
}
```

### `ReportSubBucket` (AI Readiness only)

```ts
interface ReportSubBucket {
  id:              string;
  label:           string;
  description?:    string;
  percentage:      number;
  total:           number;
  errors:          number;
  warnings:        number;
  infos:           number;
  viewIssuesFilter: { key: string; label: string };
}
```

---

## `issueExplorer`

```ts
interface IssueExplorer {
  title:                  string;
  subtitle:               string;
  breakdownFilterOptions: Array<{ key: string; label: string }>;
}
```

`breakdownFilterOptions` is the list of filter keys that map to breakdown categories, used to drive the category dropdown in the HTML report.

---

## `ReportIssue`

```ts
interface ReportIssue {
  id:             string;       // stable hash — rule + path + message
  rule:           string;
  message:        string;
  description?:   string;
  fixSuggestion?: string;
  severity:       'error' | 'warn' | 'info' | 'hint';
  code?:          string;
  pathSegments:   string[];     // e.g. ['paths', '/users', 'get', 'responses']
  displayPath:    string;       // e.g. "paths › /users › get › responses"
  endpoint:       string;       // e.g. "/users" or "global"
  method:         string;       // e.g. "GET" or "GLOBAL"
  line:           number;       // 1-based; 0 if unknown
  range?: {
    start: { line: number; character: number };
    end:   { line: number; character: number };
  };
  breakdownKeys:  string[];     // filter keys this issue belongs to
}
```

---

## Scoring Algorithm

### OWASP

Each OWASP category has a weight (`api1:2023` = 1.4, …, `api10:2023` = 0.9). The score is:

```
categoryScore = 100 − min(100, sum(severityPenalty for each violation in category))
weightedScore = sum(categoryScore × weight) / sum(weights)
```

Severity penalties: `error` = 1.0 · 10, `warn` = 0.6 · 10, `info` = 0.3 · 10.

### REST API Readiness

Same penalty approach as OWASP but categories are unweighted (simple average).

### AI Readiness

Each sub-bucket is scored independently against its rule list:

```
bucketPenalty = sum(max penalty per violated rule in bucket)
bucketScore   = (totalRulesInBucket − bucketPenalty) / totalRulesInBucket × 100
```

Dimension score = average of its sub-bucket scores.  
Overall score = weighted average of dimension scores.

Severity penalties: `error` = 1.0, `warn` = 0.6, `info` = 0.3, `hint` = 0.15.
