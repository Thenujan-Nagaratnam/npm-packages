# @wso2/wso2-spectral

Spectral-compatible lint CLI with WSO2 bundled ruleset IDs and optional processed summaries.

## CLI behavior

The CLI follows Spectral-style command shape:

```bash
wso2-spectral lint <document> --ruleset <value>
```

Two package-specific behaviors are applied:

1. If `--ruleset` is exactly one of the bundled IDs, the matching bundled file is used.
2. If `--summary` is set, output is returned as processed governance summary JSON.

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

Processed summary output:

```bash
wso2-spectral lint ./openapi.yaml --ruleset ai-readiness --summary --pretty
```

External Spectral ruleset path:

```bash
wso2-spectral lint ./openapi.yaml --ruleset ./my-ruleset.yaml --pretty
```

### CLI options

- `--ruleset <value>` (required)
- `--summary`
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
- `outputFormat` (`"summary" | "spectral"`) - Defaults to `spectral`

Summary output includes:

- `outputSchemaVersion` (`"1.0.0"`)
