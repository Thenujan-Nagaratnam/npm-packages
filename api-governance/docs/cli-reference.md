# CLI Reference

## Synopsis

```
api-governance lint <document> [options]
```

## Arguments

| Argument | Description |
|---|---|
| `<document>` | Path to the OpenAPI document to lint (YAML or JSON). Required. |

## Options

### Ruleset selection

| Flag | Description |
|---|---|
| `--ruleset <id\|path\|url>` | **Required.** Built-in ruleset ID (`owasp`, `rest-api-readiness`, `ai-readiness`), a path to a local Spectral ruleset file, or a remote URL. |
| `--git-root <path>` | Root directory used when resolving relative paths inside a custom ruleset file. |
| `--auth-token <token>` | Bearer token for fetching private remote rulesets. |
| `--functions <path>` | Path to a Node.js module that exports custom Spectral function implementations. |
| `--ruleset-content-path <key>` | Key inside the ruleset file that holds inline YAML content (default: `rulesetContent`). |

### Output control

| Flag | Description |
|---|---|
| `--report [json\|html]` | Generate a structured report instead of raw Spectral output. `json` prints the report object; `html` renders the full visual report. |
| `--report-file <path>` | Write report output to the specified file path instead of stdout. |
| `--open` | Open the generated HTML report in the system default browser (only applies when `--report html` is used). |
| `--output <path>` | Write raw JSON lint results to a file. |
| `--pretty` | Pretty-print JSON output. |
| `--summary` | Print a short governance summary table to stdout after linting. |

### General

| Flag | Description |
|---|---|
| `--help` | Print the help message and exit. |

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Lint completed. Errors may still be present in the output. |
| `1` | Fatal error (invalid arguments, file not found, unsupported Node version). |

## Examples

### Basic lint with summary

```bash
api-governance lint openapi.yaml --ruleset owasp --pretty --summary
```

### Generate and open an HTML report

```bash
api-governance lint openapi.yaml --ruleset rest-api-readiness --report html --open
```

### Write HTML report to a specific path

```bash
api-governance lint openapi.yaml --ruleset ai-readiness --report html --report-file ./reports/ai-report.html
```

### Write JSON report to a file

```bash
api-governance lint openapi.yaml --ruleset owasp --report json --report-file ./reports/owasp.json
```

### Use a custom local Spectral ruleset

```bash
api-governance lint openapi.yaml --ruleset ./my-rules.yaml
```

### Use a remote ruleset with auth

```bash
api-governance lint openapi.yaml \
  --ruleset https://example.com/private-rules.yaml \
  --auth-token $RULESET_TOKEN
```

### Use a custom function module

```bash
api-governance lint openapi.yaml \
  --ruleset ./my-rules.yaml \
  --functions ./my-functions.js
```
