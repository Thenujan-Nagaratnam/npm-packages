const { BUNDLED_RULESETS, resolveBundledRuleset } = require('./constants/bundled-rulesets');
const { runSpectralValidation } = require('./core/validate');
const { constructRulesetPath } = require('./core/ruleset-loader');
const { buildHtmlReport } = require('./reports/html-report');
const {
  generateReport,
  getReportKind,
  OWASP_CATEGORIES,
  WSO2_THEMES,
} = require('./reports/generate-report');

module.exports = {
  BUNDLED_RULESETS,
  resolveBundledRuleset,
  constructRulesetPath,
  runSpectralValidation,
  buildHtmlReport,
  generateReport,
  getReportKind,
  OWASP_CATEGORIES,
  WSO2_THEMES,
};
