# Getting Started

## Requirements

- Node.js ≥ 18
- An OpenAPI 3.x document (YAML or JSON)

## Installation

```bash
# npm
npm install api-governance

# yarn
yarn add api-governance
```

After installation the `api-governance` binary is available in your PATH:

```bash
npx api-governance --help
```

## Your First Lint Run

Built-in rules follow **WSO2 API governance** conventions (OWASP, REST design, AI readiness) packaged as Spectral rulesets.

```bash
# Lint against the OWASP Top 10 ruleset
api-governance lint openapi.yaml --ruleset owasp

# Lint against REST API Design Guidelines
api-governance lint openapi.yaml --ruleset rest-api-readiness

# Lint against AI Readiness Guidelines
api-governance lint openapi.yaml --ruleset ai-readiness
```

## Generate an HTML Report

```bash
api-governance lint openapi.yaml --ruleset owasp --report html --open
```

This writes `api-governance-report.html` to the current directory and opens it in your default browser.

## Generate a JSON Report

```bash
api-governance lint openapi.yaml --ruleset rest-api-readiness --report json
```

## Next Steps

- See [CLI Reference](./cli-reference.md) for all available flags.
- See [Rulesets](./rulesets.md) to understand what each ruleset checks.
- See [Programmatic API](./programmatic-api.md) to integrate into your own tools.
