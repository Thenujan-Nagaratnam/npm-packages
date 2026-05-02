# Configuration

## Custom Rulesets

You can use any Spectral-compatible ruleset file instead of the built-in ones.

### Local file

```bash
api-governance lint openapi.yaml --ruleset ./my-rules.yaml
```

### Remote URL

```bash
api-governance lint openapi.yaml --ruleset https://example.com/rules.yaml
```

### Remote URL with authentication

```bash
api-governance lint openapi.yaml \
  --ruleset https://private.example.com/rules.yaml \
  --auth-token $RULESET_TOKEN
```

The token is sent as a `Bearer` header when fetching the ruleset.

---

## Custom Functions

Spectral allows ruleset authors to reference custom JavaScript functions for complex validation logic. Point `--functions` to a Node.js module that exports a map of function name → function:

```js
// my-functions.js
module.exports = {
  checkSemVer(input) {
    if (!/^\d+\.\d+\.\d+$/.test(input)) {
      return [{ message: 'Version must follow semver (x.y.z)' }];
    }
  },
};
```

```bash
api-governance lint openapi.yaml \
  --ruleset ./my-rules.yaml \
  --functions ./my-functions.js
```

---

## Ruleset Content Path

Some rulesets are distributed as files that embed the actual YAML content under a specific key rather than at the top level. Use `--ruleset-content-path` to specify that key:

```bash
api-governance lint openapi.yaml \
  --ruleset ./bundle.yaml \
  --ruleset-content-path rulesetContent
```

The built-in rulesets all use `rulesetContent` by default.

---

## Git Root

When a custom ruleset uses relative `$ref` paths, set `--git-root` to the directory those paths should resolve from:

```bash
api-governance lint openapi.yaml \
  --ruleset ./rules/my-rules.yaml \
  --git-root ./rules
```

---

## CI Integration

### GitHub Actions

```yaml
- name: API Governance Check
  run: |
    npx api-governance lint openapi.yaml \
      --ruleset owasp \
      --report json \
      --report-file governance-report.json

- name: Upload Governance Report
  uses: actions/upload-artifact@v4
  with:
    name: governance-report
    path: governance-report.json
```

### Fail on errors (Node.js script)

```js
const { runSpectralValidation, generateReport, resolveBundledRuleset } = require('api-governance');

async function main() {
  const ruleset = resolveBundledRuleset('owasp');
  const result  = await runSpectralValidation('./openapi.yaml', { rulesetPath: ruleset.path });
  const report  = generateReport(ruleset.title, result);

  const errors = report.overview.metrics.find((m) => m.id === 'errors')?.value ?? 0;
  if (errors > 0) {
    console.error(`Failed: ${errors} error(s). Score: ${report.overview.score}%`);
    process.exit(1);
  }
  console.log(`Passed. Score: ${report.overview.score}%`);
}

main();
```

---

## Programmatic Options

When using the library directly, all CLI options have programmatic equivalents. See [Programmatic API](./programmatic-api.md) for the full reference.
