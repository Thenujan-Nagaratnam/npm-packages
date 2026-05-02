const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveBundledRuleset, generateReport, getReportKind } = require('../src');
const { runSpectralValidation } = require('../src/core/validate');

const ROOT_DIR = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const VALID_SPEC_PATH = path.join(FIXTURES_DIR, 'openapi-valid.yaml');
const CUSTOM_RULESET_PATH = path.join(FIXTURES_DIR, 'custom-ruleset.yaml');
const CUSTOM_FUNCTION_RULESET_PATH = path.join(FIXTURES_DIR, 'custom-function-ruleset.yaml');
const CUSTOM_FUNCTIONS_PATH = path.join(FIXTURES_DIR, 'custom-functions.js');
const CLI_PATH = path.join(ROOT_DIR, 'bin', 'api-governance.js');
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
  await test('generateReport maps OWASP violations to breakdown and violationsById', async () => {
    const payload = {
      score: 50,
      passedChecks: 2,
      totalChecks: 10,
      violations: [
        {
          rule: 'API1:2023-foo',
          message: 'test',
          severity: 'error',
          path: ['paths', '/pets', 'get', '200'],
        },
      ],
    };
    const report = generateReport('owasp', payload);
    assert.strictEqual(getReportKind('OWASP'), 'owasp');
    assert.strictEqual(report.reportId, 'owasp');
    const byId = report.violationsById;
    const keys = Object.keys(byId);
    assert.strictEqual(keys.length, 1);
    const v = byId[keys[0]];
    assert.ok(v.breakdownKeys && v.breakdownKeys.includes('api1:2023'), `breakdown: ${v.breakdownKeys}`);
    const cat1 = report.breakdown.categories.find((c) => c.id === 'api1:2023');
    assert.ok(cat1, 'OWASP category row');
    assert.strictEqual(cat1.total, 1);
  });

  await test('getReportKind for AI and REST', async () => {
    assert.strictEqual(getReportKind('REST API AI Readiness'), 'ai-readiness');
    assert.strictEqual(getReportKind('rest-style-bundle'), 'rest-api-readiness');
  });

  await test('resolveBundledRuleset resolves case-insensitive ids', async () => {
    const resolved = resolveBundledRuleset('  AI-READINESS  ');
    assert.ok(resolved);
    assert.strictEqual(resolved.rulesetId, 'ai-readiness');
    assert.ok(/ai_readiness_guidelines\.yaml$/.test(resolved.rulesetFileUrl));
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
      /outputFormat must be "summary", "report" or "spectral"/,
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
    assert.ok(result.rulesetMetadata);
    assert.strictEqual(result.rulesetMetadata.name, 'REST API AI Readiness Guidelines');
  });

  await test('runSpectralValidation supports report output directly', async () => {
    const result = await runSpectralValidation({
      rulesetId: 'owasp',
      specContent: validSpecContent,
      outputFormat: 'report',
    });

    assert.strictEqual(typeof result, 'object');
    assert.strictEqual(result.reportId, 'owasp');
    assert.ok(result.report);
    assert.strictEqual(result.report.reportId, 'owasp');
    assert.ok(result.metadata);
  });

  await test('CLI help exits zero and shows usage', async () => {
    const outcome = runCli(['--help']);
    assert.strictEqual(outcome.status, 0);
    assert.strictEqual(outcome.stderr.trim(), '');
    assert.match(outcome.stdout, /api-governance lint <document>/);
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

  await test('CLI writes report output file when --report json and --report-file are provided', async () => {
    if (fs.existsSync(TEMP_OUTPUT_PATH)) {
      fs.unlinkSync(TEMP_OUTPUT_PATH);
    }

    const outcome = runCli([
      'lint',
      VALID_SPEC_PATH,
      '--ruleset',
      'owasp',
      '--report',
      'json',
      '--report-file',
      TEMP_OUTPUT_PATH,
      '--pretty',
    ]);

    assert.strictEqual(outcome.status, 0);
    assert.strictEqual(outcome.stderr.trim(), '');
    assert.strictEqual(fs.existsSync(TEMP_OUTPUT_PATH), true);

    const content = JSON.parse(fs.readFileSync(TEMP_OUTPUT_PATH, 'utf8'));
    assert.strictEqual(content.reportId, 'owasp');
    assert.ok(content.report);

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
    assert.ok(Array.isArray(parsed.violations));
    assert.strictEqual(parsed.violations.length, 0);
  });

  await test('CLI rejects --open without html report mode', async () => {
    const outcome = runCli([
      'lint',
      VALID_SPEC_PATH,
      '--ruleset',
      'owasp',
      '--open',
    ]);

    assert.strictEqual(outcome.status, 1);
    assert.match(outcome.stderr, /--open can only be used with --report html/);
  });

  await test('CLI --report returns JSON report payload by default', async () => {
    const outcome = runCli([
      'lint',
      VALID_SPEC_PATH,
      '--ruleset',
      'owasp',
      '--report',
      '--pretty',
    ]);

    assert.strictEqual(outcome.status, 0);
    assert.strictEqual(outcome.stderr.trim(), '');
    const parsed = JSON.parse(outcome.stdout);
    assert.strictEqual(parsed.reportId, 'owasp');
    assert.ok(parsed.report);
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
