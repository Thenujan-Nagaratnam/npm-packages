# Programmatic API

## Installation

```bash
npm install @wso2/api-governance
```

## Quick Example

```js
const {
  runSpectralValidation,
  generateReport,
  buildHtmlReport,
} = require('@wso2/api-governance');
const fs = require('fs');

async function main() {
  const specPath = './openapi.yaml';
  const specContent = fs.readFileSync(specPath, 'utf8');

  // 1. Run validation — just pass the ruleset ID
  const result = await runSpectralValidation(specPath, 'owasp');

  // 2. Build the report — just pass the ruleset ID
  const report = generateReport('owasp', result);

  // 3. Render to HTML
  const html = buildHtmlReport({ report }, { specContent });
  fs.writeFileSync('report.html', html);
}

main();
```

---

## API Reference

### `runSpectralValidation(specPath, ruleset)`

Reads the spec file, runs Spectral validation, and returns normalized results.

```ts
runSpectralValidation(
  specPath: string,
  ruleset: string | RunOptions
): Promise<{ violations: ValidationFinding[]; passedRules: Array<{ rule: string }> }>
```

**Built-in ruleset IDs** — pass the ID string directly:

```js
// OWASP Top 10
const result = await runSpectralValidation('./openapi.yaml', 'owasp');

// WSO2 REST API Design Guidelines
const result = await runSpectralValidation('./openapi.yaml', 'rest-api-readiness');

// WSO2 AI Readiness Guidelines
const result = await runSpectralValidation('./openapi.yaml', 'ai-readiness');
```

**Custom ruleset** — pass an options object:

```js
const result = await runSpectralValidation('./openapi.yaml', {
  rulesetFileUrl:      './my-rules.yaml',
  rulesetContentPath:  'rulesetContent',   // optional
  authToken:           process.env.TOKEN,  // optional
  customFunctionsPath: './my-functions.js',// optional
});
```

#### `RunOptions`

| Field | Type | Description |
|---|---|---|
| `rulesetFileUrl` | `string` | Path or URL to a Spectral ruleset file. |
| `rulesetContentPath` | `string` | Key inside the file that holds inline YAML content. |
| `authToken` | `string` | Bearer token for private remote rulesets. |
| `customFunctions` | `object` | Inline map of custom Spectral functions. |
| `customFunctionsPath` | `string` | Path to a module exporting custom functions. |
| `gitRootPath` | `string` | Base directory for resolving relative `$ref` paths. |
| `additionalRules` | `object` | Extra rules merged on top of the loaded ruleset. |

#### `ValidationFinding`

```ts
interface ValidationFinding {
  rule:           string;
  message:        string;
  severity:       'error' | 'warn' | 'info' | 'hint';
  path?:          string[];
  range?: {
    start: { line: number; character: number };
    end:   { line: number; character: number };
  };
  description?:   string;
  fixSuggestion?: string;
}
```

---

### `generateReport(rulesetId, result)`

Builds a scored `GeneratedReport` from validation results.

```ts
generateReport(
  rulesetId: string,
  result: {
    violations:  ValidationFinding[];
    passedRules: Array<{ rule: string }>;
  }
): GeneratedReport
```

Accepts either the built-in **ruleset ID** or the full ruleset **display name**:

```js
// By ID (recommended)
const report = generateReport('owasp', result);

// By display name (also works)
const report = generateReport('OWASP Top 10 Security', result);
```

See [Report Format](./report-format.md) for a full description of the `GeneratedReport` structure.

---

### `buildHtmlReport(input, options?)`

Renders a `GeneratedReport` to a self-contained HTML string.

```ts
buildHtmlReport(
  input:    { report: GeneratedReport } | GeneratedReport,
  options?: { specContent?: string }
): string
```

`specContent` is the raw spec text — when provided it enables highlighted YAML snippets in the Issue Explorer detail panel.

```js
const specContent = fs.readFileSync('./openapi.yaml', 'utf8');
const html = buildHtmlReport({ report }, { specContent });
fs.writeFileSync('report.html', html);
```

---

## Common Patterns

### All three rulesets in one script

```js
const { runSpectralValidation, generateReport, buildHtmlReport } = require('@wso2/api-governance');
const fs = require('fs');

const specPath = './openapi.yaml';
const specContent = fs.readFileSync(specPath, 'utf8');

for (const id of ['owasp', 'rest-api-readiness', 'ai-readiness']) {
  const result = await runSpectralValidation(specPath, id);
  const report = generateReport(id, result);
  const html   = buildHtmlReport({ report }, { specContent });
  fs.writeFileSync(`${id}-report.html`, html);
  console.log(`${id}: score ${report.overview.score}%`);
}
```

### Fail CI on errors

```js
const { runSpectralValidation, generateReport } = require('@wso2/api-governance');

const result = await runSpectralValidation('./openapi.yaml', 'owasp');
const report  = generateReport('owasp', result);
const errors  = report.overview.metrics.find((m) => m.id === 'errors')?.value ?? 0;

if (errors > 0) {
  console.error(`Governance check failed: ${errors} error(s). Score: ${report.overview.score}%`);
  process.exit(1);
}
console.log(`Passed. Score: ${report.overview.score}%`);
```

### Save JSON report

```js
const result = await runSpectralValidation('./openapi.yaml', 'rest-api-readiness');
const report  = generateReport('rest-api-readiness', result);
fs.writeFileSync('report.json', JSON.stringify(report, null, 2));
```

### Per-category scores

```js
const result = await runSpectralValidation('./openapi.yaml', 'owasp');
const report  = generateReport('owasp', result);

for (const cat of report.breakdown.categories) {
  console.log(`${cat.label}: ${Math.round(cat.percentage)}%  (${cat.errors} errors, ${cat.warnings} warnings)`);
}
```
