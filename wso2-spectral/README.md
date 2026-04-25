# @wso2/wso2-spectral

Spectral-compatible lint CLI with WSO2 bundled ruleset IDs and HTML report support.

## CLI behavior

The CLI follows Spectral-style command shape:

```bash
wso2-spectral lint <document> --ruleset <value>
```

Two package-specific behaviors are applied:

1. If `--ruleset` is exactly one of the bundled IDs, the matching bundled file is used.
2. If `--report` is set, output is returned as the generated governance report JSON payload.
3. If `--report html` is set, output is rendered as an HTML governance report.

Bundled IDs:

- `ai-readiness`
- `owasp`
- `rest-api-readiness`

If `--ruleset` is not one of the above IDs, it is treated as a normal Spectral ruleset path/URL and loaded directly.

## Install

```bash
npm install @wso2/wso2-spectral
```

Node.js requirement: `>=18` (strict; no polyfills are bundled)

## CLI examples

Raw Spectral output:

```bash
wso2-spectral lint ./openapi.yaml --ruleset owasp --pretty
```

HTML report output:

```bash
wso2-spectral lint ./openapi.yaml --ruleset ai-readiness --report html --report-file ./report.html
```

When present in the ruleset YAML, report metadata such as `name`, `description`, `ruleCategory`, `ruleType`, `artifactType`, `documentationLink`, and `provider` is included in the HTML report.

Generate and auto-open HTML report:

```bash
wso2-spectral lint ./openapi.yaml --ruleset ai-readiness --report html --report-file ./report.html --open
```

External Spectral ruleset path:

```bash
wso2-spectral lint ./openapi.yaml --ruleset ./my-ruleset.yaml --pretty
```

### CLI options

- `--ruleset <value>` (required)
- `--report [json|html]`
- `--report-file <path>`
- `--open`
- `--ruleset-content-path <path>`
- `--functions <path>`
- `--git-root <path>`
- `--auth-token <token>`
- `--output <path>`
- `--pretty`
- `--help`

## Library usage

```js
const fs = require('fs');
const { runSpectralValidation } = require('@wso2/wso2-spectral');

const specContent = fs.readFileSync('/path/to/openapi.yaml', 'utf8');

const result = await runSpectralValidation({
  rulesetId: 'ai-readiness',
  specContent,
  outputFormat: 'summary',
});
```

Build an HTML report from report/summary output:

```js
const { buildHtmlReport } = require('@wso2/wso2-spectral');
const html = buildHtmlReport(result, { title: 'My Governance Report' });
```

`buildHtmlReport(...)` accepts:
- `outputFormat: "report"` response directly (`{ reportId, report, metadata }`)
- `outputFormat: "summary"` response (`summary.report` is used)

### `runSpectralValidation(options)`

Required:

- One of `rulesetId` (`string`) or `rulesetFileUrl` (`string`)
- `specContent` (`string`)

Optional:

- `rulesetFileUrl` (`string`) - Local file path or URL for ruleset source
- `rulesetContentPath` (`string`) - Wrapper key (for example, `rulesetContent`)
- `customFunctionsPath` (`string`) - Path to a module exporting custom ruleset functions
- `customFunctionsPath` (`string[]`) - Multiple module paths; exported maps are merged in order
- `customFunctions` (`object`) - Function map injected directly from code
- `gitRootPath` (`string`) - Used to resolve relative local ruleset paths
- `authToken` (`string`) - Used for private remote ruleset fetches
- `additionalRules` (`object`) - Extra rules merged into parsed ruleset
- `outputFormat` (`"summary" | "report" | "spectral"`) - Defaults to `spectral`

Summary output includes:

- `outputSchemaVersion` (`"1.0.0"`)

## Analyze / governance report (API Designer / VS Code)

After you run Spectral and normalize results to **violations** plus **score** / **passedChecks** / **totalChecks** (same row shape as `governance-summary` / your validation layer), build the single UI/report payload with:

```js
const { generateReport, getReportKind } = require('@wso2/wso2-spectral');

const report = generateReport('OWASP API Security', {
  score: 72,
  passedChecks: 40,
  totalChecks: 50,
  violations: [/* { rule, message, severity, path, range, ... } */],
});
// report.violationsById, report.breakdown.categories, report.issueExplorer, …
```

- **Report kind** is chosen from the **ruleset name** (`ai-readiness`, `owasp`, or WSO2 REST / default `rest-api-readiness`). You can also call `getReportKind(rulesetDisplayName)` to read the same value without building the full report.
- The JSON field **`reportId`** on the result still encodes that kind (kept for compatibility with API Designer’s wire format).
- Also exported: `OWASP_CATEGORIES`, `WSO2_THEMES` (the static category/theme lists used for OWASP and WSO2 REST breakdowns).

TypeScript: see `src/reports/generate-report.d.ts` (`GeneratedReport`, `GenerateReportInput`, re-exported from `src/index.d.ts`).
