# API Governor (`api-governance`)

> Lint OpenAPI specifications against enterprise rulesets and generate rich governance reports.

API Governor is a CLI tool and Node.js library that runs [Spectral](https://stoplight.io/open-source/spectral) validation against built-in rulesets (OWASP Top 10, REST API Design Guidelines, AI Readiness) and produces scored, interactive HTML or JSON reports.

The bundled rules are **WSO2 API governance rulesets**—the same families of checks used around **WSO2 API Manager** and related tooling (REST design guidelines, AI readiness guidelines, and OWASP-aligned security rules), packaged here for standalone CLI and library use.

## Documentation

Full documentation is in the [`docs/`](./docs/) folder:

| Document | Description |
|---|---|
| [Getting Started](./docs/getting-started.md) | Installation and your first lint run |
| [CLI Reference](./docs/cli-reference.md) | All commands, flags, and examples |
| [Rulesets](./docs/rulesets.md) | Built-in rulesets — OWASP, REST, AI Readiness |
| [Programmatic API](./docs/programmatic-api.md) | Using the library from Node.js |
| [Report Format](./docs/report-format.md) | JSON report schema reference |
| [Configuration](./docs/configuration.md) | Custom rulesets, auth tokens, functions |

## Quick Start

```bash
npm install api-governance
```

```bash
# Lint and open an HTML report
api-governance lint openapi.yaml --ruleset owasp --report html --open

# Lint with a summary in the terminal
api-governance lint openapi.yaml --ruleset rest-api-readiness --pretty --summary

# Output a JSON report file
api-governance lint openapi.yaml --ruleset ai-readiness --report json --report-file report.json
```

## Built-in Rulesets

| ID | Name |
|---|---|
| `owasp` | OWASP API Security Top 10 (2023) |
| `rest-api-readiness` | REST API Design Guidelines |
| `ai-readiness` | REST API AI Readiness Guidelines |

Official background on these rule families: see [WSO2](https://wso2.com/) and [WSO2 API Manager documentation](https://apim.docs.wso2.com/en/latest/) (governance / API quality sections).

## Requirements

- Node.js ≥ 18
