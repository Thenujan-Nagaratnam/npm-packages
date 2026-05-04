# API Governor (`api-governance`)

> Lint OpenAPI specifications against enterprise rulesets and generate rich governance reports.

API Governor is a CLI tool and Node.js library that runs [Spectral](https://stoplight.io/open-source/spectral) validation against built-in rulesets (OWASP Top 10, REST API Design Guidelines, AI Readiness) and produces scored, interactive HTML or JSON reports.

The bundled rules are **WSO2 API governance rulesets**—the same families of checks used around **WSO2 API Manager** and related tooling (REST design guidelines, AI readiness guidelines, and OWASP-aligned security rules), packaged here for standalone CLI and library use.

## Requirements

- Node.js ≥ 18

## Install

Install **globally** so the `api-governance` command is available everywhere on your PATH:

```bash
npm install -g api-governance
```

For a **project-local** install only (no `-g`), add the package to your app and run the CLI with **`npx api-governance`** (see examples below).

## CLI examples

After a **global** install, you can run `api-governance` instead of `npx api-governance`. The commands below use `npx` so they also work with a local install.

Lint a spec and open an HTML report (built-in **AI readiness** ruleset id is `ai-readiness`):

```bash
npx api-governance lint leave-management-api.json --ruleset ai-readiness --report html --open
```

Other built-in ruleset IDs: `owasp`, `rest-api-readiness`. You can also pass a path or URL to any Spectral ruleset YAML.

```bash
npx api-governance lint openapi.yaml --ruleset owasp --report html --open
npx api-governance lint openapi.yaml --ruleset rest-api-readiness --pretty --summary
npx api-governance lint openapi.yaml --ruleset ai-readiness --report json --report-file report.json
```

Common flags:

- `--ruleset <id|path|url>` (required) — bundled id (`owasp`, `rest-api-readiness`, `ai-readiness`) or custom ruleset file/URL
- `--report [json|html]` — governance report instead of raw Spectral output
- `--report-file <path>` — write report to disk
- `--open` — open generated HTML (only with `--report html`)
- `--pretty` — pretty-print JSON
- `--summary` — governance summary JSON
- `--output <path>` — write main JSON output to a file
- `--help` — usage

## Built-in rulesets

| ID | Name |
|---|---|
| `owasp` | OWASP API Security Top 10 (2023) |
| `rest-api-readiness` | REST API Design Guidelines |
| `ai-readiness` | REST API AI Readiness Guidelines |

Official background: [WSO2](https://wso2.com/) and [WSO2 API Manager documentation](https://apim.docs.wso2.com/en/latest/) (governance / API quality).

## Library usage

```js
const { runSpectralValidation, buildHtmlReport } = require('api-governance');
const fs = require('fs');

(async () => {
  const specPath = './openapi.yaml';
  const specContent = fs.readFileSync(specPath, 'utf8');
  const result = await runSpectralValidation(specPath, 'ai-readiness');
  const html = buildHtmlReport(result, { specContent });
  fs.writeFileSync('report.html', html);
})();
```

`generateReport`, `resolveBundledRuleset`, and other exports are available from the same package.
