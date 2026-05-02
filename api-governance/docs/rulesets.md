# Rulesets

API Governor ships three built-in rulesets. Pass the ruleset ID to `--ruleset`.

These packs implement **WSO2 API governance** rule families—the Spectral rules aligned with **WSO2 REST API Design Guidelines**, **WSO2 REST API AI Readiness Guidelines**, and **OWASP API Security** checks as used in **WSO2 API Manager** and similar products. This package bundles them so you can run the same style of governance locally or in CI without hosting on WSO2’s platform.

---

## `owasp` — OWASP API Security Top 10

Checks your OpenAPI spec against the [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x00-header/).

**Use when:** You need to identify security vulnerabilities before deployment.

```bash
api-governance lint openapi.yaml --ruleset owasp
```

### Categories

| ID | Name | Description |
|---|---|---|
| `api1:2023` | Broken Object Level Authorization | Checks for numeric/predictable resource identifiers |
| `api2:2023` | Broken Authentication | Validates authentication scheme presence and configuration |
| `api3:2023` | Broken Object Property Level Authorization | Detects unrestricted property exposure (additionalProperties) |
| `api4:2023` | Unrestricted Resource Consumption | Checks for missing rate limiting headers |
| `api5:2023` | Broken Function Level Authorization | Validates HTTP method restrictions |
| `api6:2023` | Unrestricted Access to Sensitive Business Flows | Checks for missing bot protection indicators |
| `api7:2023` | Server Side Request Forgery | Validates URL parameter handling |
| `api8:2023` | Security Misconfiguration | Checks security scheme definitions |
| `api9:2023` | Improper Inventory Management | Validates server and environment definitions |
| `api10:2023` | Unsafe Consumption of APIs | Checks third-party endpoint and schema definitions |

---

## `rest-api-readiness` — REST API Design Guidelines

Enforces REST API design best practices for production-ready APIs.

**Use when:** You want to ensure your API follows consistent, well-documented REST conventions.

```bash
api-governance lint openapi.yaml --ruleset rest-api-readiness
```

### Categories

| ID | Name | Description |
|---|---|---|
| `documentation` | Documentation Quality | Info descriptions, contact details, external docs |
| `operations-methods` | Operations & Methods | Operation IDs, summaries, HTTP method usage |
| `resource-design` | Resource Design | Path structure, plural nouns, naming conventions |
| `contracts-responses` | Contracts & Responses | Response schemas, status codes, error formats |
| `security-governance` | Security & Governance | Security scheme references, server definitions |

---

## `ai-readiness` — REST API AI Readiness Guidelines

Evaluates how well your API is described for consumption by LLM agents and AI-powered tooling.

**Use when:** You want your API to be discoverable and usable by AI agents, Copilots, or MCP integrations.

```bash
api-governance lint openapi.yaml --ruleset ai-readiness
```

### Dimensions

| ID | Name | Description |
|---|---|---|
| `descriptiveness` | Descriptiveness | Completeness of descriptions at every level of the spec |
| `structure` | Structure & Discoverability | Consistent naming, tags, operation IDs for machine navigation |
| `contracts` | Contracts & Schemas | Response schemas, examples, and type definitions |
| `security` | Security Context | Security scheme descriptions and scope documentation |

Each dimension is further broken down into sub-buckets (e.g. summaries, descriptions, parameters, responses) which are scored independently.

---

## Using a Custom Ruleset

Any Spectral-compatible ruleset file (YAML or JSON) can be used directly:

```bash
api-governance lint openapi.yaml --ruleset ./custom-rules.yaml
```

Remote rulesets are also supported:

```bash
api-governance lint openapi.yaml --ruleset https://example.com/rules.yaml
```

See [Configuration](./configuration.md) for advanced options including auth tokens and custom functions.
