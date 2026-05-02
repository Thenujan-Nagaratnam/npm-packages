const fs = require('fs');
const path = require('path');
const { BUNDLED_RULESETS, resolveBundledRuleset } = require('./constants/bundled-rulesets');
const { runSpectralValidation: _runSpectralValidation } = require('./core/validate');
const { constructRulesetPath } = require('./core/ruleset-loader');
const { buildHtmlReport } = require('./reports/html-report');
const {
  generateReport: _generateReport,
  getReportKind,
  getReportKind: _getReportKind,
  OWASP_CATEGORIES,
  REST_COMPLIANCE_THEMES,
} = require('./reports/generate-report');

/**
 * Lint an OpenAPI document and return violations + passed rules.
 *
 * Simple usage with a built-in ruleset ID:
 *   const result = await runSpectralValidation('./openapi.yaml', 'owasp');
 *
 * Custom ruleset:
 *   const result = await runSpectralValidation('./openapi.yaml', {
 *     rulesetFileUrl: './my-rules.yaml',
 *     rulesetContentPath: 'rulesetContent',
 *   });
 */
async function runSpectralValidation(specPath, rulesetIdOrOptions) {
  if (!specPath || typeof specPath !== 'string') {
    throw new Error('specPath must be a non-empty string');
  }
  const absoluteSpecPath = path.resolve(specPath);
  if (!fs.existsSync(absoluteSpecPath)) {
    throw new Error(`OpenAPI document not found: ${absoluteSpecPath}`);
  }
  const specContent = fs.readFileSync(absoluteSpecPath, 'utf8');

  // Built-in shorthand: runSpectralValidation(specPath, 'owasp')
  if (typeof rulesetIdOrOptions === 'string') {
    const bundled = resolveBundledRuleset(rulesetIdOrOptions);
    if (!bundled) {
      throw new Error(
        `Unknown built-in ruleset ID "${rulesetIdOrOptions}". ` +
        `Valid IDs: ${Object.keys(BUNDLED_RULESETS).join(', ')}`
      );
    }
    const raw = await _runSpectralValidation({
      specContent,
      rulesetId: rulesetIdOrOptions,
      rulesetFileUrl: bundled.rulesetFileUrl,
      rulesetContentPath: bundled.rulesetContentPath,
      customFunctionsPath: bundled.customFunctionsPath,
      outputFormat: 'summary',
    });
    return _normalizeResults(raw);
  }

  // Full options object
  const opts = rulesetIdOrOptions || {};
  const outputFormat = opts.outputFormat || 'summary';
  const raw = await _runSpectralValidation({ specContent, ...opts, outputFormat });
  return _normalizeResults(raw);
}

function _normalizeResults(raw) {
  if (Array.isArray(raw)) {
    // Raw Spectral results (outputFormat:'spectral') → normalize without passedRules
    const violations = raw
      .filter((r) => r.severity !== undefined && r.severity <= 3)
      .map((r) => ({
        rule: typeof r.code === 'string' ? r.code : String(r.code ?? ''),
        message: r.message || '',
        severity: ['error', 'warn', 'info', 'hint'][r.severity] || 'info',
        path: r.path || [],
        range: r.range,
      }));
    return { violations, passedRules: [] };
  }
  // Governance summary format: { violations, passedRules, passedChecks, ... }
  if (raw && Array.isArray(raw.violations)) {
    return raw;
  }
  // report format: { reportId, report, metadata } — unwrap
  if (raw && raw.report) {
    return raw.report;
  }
  return raw;
}

/**
 * Build a structured governance report from validation results.
 *
 * Accepts a built-in ruleset ID or a full ruleset display name:
 *   generateReport('owasp', result)
 *   generateReport('OWASP API Security', result)
 */
function generateReport(rulesetNameOrId, input) {
  const bundled = resolveBundledRuleset(rulesetNameOrId);
  const title = bundled ? bundled.rulesetTitle : rulesetNameOrId;
  // If the input already carries a pre-built report with the same reportId
  // (produced by governance-summary.js), return it directly to avoid a second
  // full generate-report pass.
  const expectedId = bundled ? bundled.rulesetId : _getReportKind(title);
  if (input && input.report && input.report.reportId === expectedId &&
      input.report.overview && input.report.breakdown) {
    return input.report;
  }
  return _generateReport(title, input);
}

module.exports = {
  // High-level API (recommended)
  runSpectralValidation,
  generateReport,
  buildHtmlReport,

  // Lower-level / advanced
  resolveBundledRuleset,
  getReportKind,
  constructRulesetPath,
  BUNDLED_RULESETS,
  OWASP_CATEGORIES,
  REST_COMPLIANCE_THEMES,
};
