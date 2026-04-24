const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { runSpectralValidation, resolveBundledRuleset } = require('../src');

const ROOT_DIR = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const VALID_SPEC_PATH = path.join(FIXTURES_DIR, 'openapi-valid.yaml');
const CUSTOM_RULESET_PATH = path.join(FIXTURES_DIR, 'custom-ruleset.yaml');
const CUSTOM_FUNCTION_RULESET_PATH = path.join(FIXTURES_DIR, 'custom-function-ruleset.yaml');
const CUSTOM_FUNCTIONS_PATH = path.join(FIXTURES_DIR, 'custom-functions.js');
const CLI_PATH = path.join(ROOT_DIR, 'bin', 'wso2-spectral.js');
const TEMP_OUTPUT_PATH = path.join(__dirname, 'tmp-output.json');

const validSpecContent = fs.readFileSync(VALID_SPEC_PATH, 'utf8');
const runtimeDiagnostics = [];
const originalConsoleError = console.error;
const warningHandler = (warning) => {
  runtimeDiagnostics.push(`process warning: ${warning && warning.message ? warning.message : String(warning)}`);
};

const currentNodeMajor = Number((process.versions.node || '0.0.0').split('.')[0]);
if (!Number.isFinite(currentNodeMajor) || currentNodeMajor < 18) {
  process.stderr.write(
    `Tests require Node.js >=18 due strict runtime policy. Detected: ${process.versions.node}\n`,
  );
  process.exit(1);
}

console.error = (...args) => {
  runtimeDiagnostics.push(args.map((value) => String(value)).join(' '));
};
process.on('warning', warningHandler);

async function test(name, fn) {
  try {
    await fn();
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n${error.stack || error}\n`);
    process.exitCode = 1;
  }
}

function runCli(args) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
}

async function main() {
  await test('resolveBundledRuleset resolves case-insensitive ids', async () => {
    const resolved = resolveBundledRuleset('  AI-READINESS  ');
    assert.ok(resolved);
    assert.strictEqual(resolved.rulesetId, 'ai-readiness');
    assert.ok(resolved.rulesetFileUrl.endsWith('wso2_rest_api_ai_readiness_guidelines.yaml'));
  });

  await test('resolveBundledRuleset returns null for unknown id', async () => {
    assert.strictEqual(resolveBundledRuleset('does-not-exist'), null);
  });

  await test('runSpectralValidation throws for missing ruleset source', async () => {
    await assert.rejects(
      () => runSpectralValidation({ specContent: validSpecContent }),
      /rulesetId or rulesetFileUrl is required/,
    );
  });

  await test('runSpectralValidation throws for missing specContent', async () => {
    await assert.rejects(
      () => runSpectralValidation({ rulesetId: 'owasp' }),
      /specContent is required/,
    );
  });

  await test('runSpectralValidation throws for invalid outputFormat', async () => {
    await assert.rejects(
      () =>
        runSpectralValidation({
          rulesetFileUrl: CUSTOM_RULESET_PATH,
          specContent: validSpecContent,
          outputFormat: 'invalid',
        }),
      /outputFormat must be "summary" or "spectral"/,
    );
  });

  await test('runSpectralValidation returns spectral array for custom ruleset', async () => {
    const result = await runSpectralValidation({
      rulesetFileUrl: CUSTOM_RULESET_PATH,
      specContent: validSpecContent,
      outputFormat: 'spectral',
    });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  await test('runSpectralValidation returns summary without AI summary for non-ai ruleset', async () => {
    const result = await runSpectralValidation({
      rulesetFileUrl: CUSTOM_RULESET_PATH,
      specContent: validSpecContent,
      outputFormat: 'summary',
    });

    assert.strictEqual(typeof result, 'object');
    assert.strictEqual(result.outputSchemaVersion, '1.0.0');
    assert.strictEqual(result.totalRuleCount, 1);
    assert.strictEqual(result.failedRuleCount, 0);
    assert.ok(Array.isArray(result.passedRules));
    assert.strictEqual(result.aiReadinessSummary, undefined);
  });

  await test('runSpectralValidation supports third-party custom functions via path', async () => {
    const result = await runSpectralValidation({
      rulesetFileUrl: CUSTOM_FUNCTION_RULESET_PATH,
      customFunctionsPath: CUSTOM_FUNCTIONS_PATH,
      specContent: validSpecContent,
      outputFormat: 'spectral',
    });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  await test('runSpectralValidation auto-includes AI summary for ai-readiness id', async () => {
    const result = await runSpectralValidation({
      rulesetId: 'ai-readiness',
      specContent: validSpecContent,
      outputFormat: 'summary',
    });

    assert.strictEqual(typeof result, 'object');
    assert.ok(result.aiReadinessSummary);
    assert.strictEqual(typeof result.aiReadinessSummary.score, 'number');
  });

  await test('CLI help exits zero and shows usage', async () => {
    const outcome = runCli(['--help']);
    assert.strictEqual(outcome.status, 0);
    assert.strictEqual(outcome.stderr.trim(), '');
    assert.match(outcome.stdout, /wso2-spectral lint <document>/);
  });

  await test('CLI fails when required --ruleset is missing', async () => {
    const outcome = runCli(['lint', VALID_SPEC_PATH]);
    assert.strictEqual(outcome.status, 1);
    assert.match(outcome.stderr, /Missing required argument: --ruleset/);
  });

  await test('CLI fails on unknown option', async () => {
    const outcome = runCli(['lint', VALID_SPEC_PATH, '--ruleset', 'owasp', '--bad-option']);
    assert.strictEqual(outcome.status, 1);
    assert.match(outcome.stderr, /Unknown option: --bad-option/);
  });

  await test('CLI writes summary output file when --output is provided', async () => {
    if (fs.existsSync(TEMP_OUTPUT_PATH)) {
      fs.unlinkSync(TEMP_OUTPUT_PATH);
    }

    const outcome = runCli([
      'lint',
      VALID_SPEC_PATH,
      '--ruleset',
      'ai-readiness',
      '--summary',
      '--output',
      TEMP_OUTPUT_PATH,
      '--pretty',
    ]);

    assert.strictEqual(outcome.status, 0);
    assert.strictEqual(outcome.stderr.trim(), '');
    assert.strictEqual(fs.existsSync(TEMP_OUTPUT_PATH), true);

    const content = JSON.parse(fs.readFileSync(TEMP_OUTPUT_PATH, 'utf8'));
    assert.ok(content.aiReadinessSummary);
    assert.strictEqual(content.outputSchemaVersion, '1.0.0');

    fs.unlinkSync(TEMP_OUTPUT_PATH);
  });

  await test('CLI supports --functions for external custom functions', async () => {
    const outcome = runCli([
      'lint',
      VALID_SPEC_PATH,
      '--ruleset',
      CUSTOM_FUNCTION_RULESET_PATH,
      '--functions',
      CUSTOM_FUNCTIONS_PATH,
      '--pretty',
    ]);

    assert.strictEqual(outcome.status, 0);
    assert.strictEqual(outcome.stderr.trim(), '');
    const parsed = JSON.parse(outcome.stdout);
    assert.ok(Array.isArray(parsed));
    assert.strictEqual(parsed.length, 0);
  });

  await test('runtime has no unexpected stderr warnings', async () => {
    assert.deepStrictEqual(runtimeDiagnostics, []);
  });
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
}).finally(() => {
  console.error = originalConsoleError;
  process.off('warning', warningHandler);
});
