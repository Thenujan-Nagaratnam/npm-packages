const { oas } = require('@stoplight/spectral-rulesets');
const { resolveBundledRuleset } = require('../constants/bundled-rulesets');
const { loadSpectralRuleset } = require('./ruleset-loader');
const { runSpectralValidation: runSpectralEngineValidation } = require('./spectral-engine');
const { buildGovernanceSummary } = require('../formatters/governance-summary');
const { buildAiReadinessSummary } = require('../formatters/ai-readiness-summary');

function ensureSupportedNodeVersion() {
  const major = Number((process.versions.node || '0.0.0').split('.')[0]);
  if (!Number.isFinite(major) || major < 18) {
    throw new Error(`Node.js >=18 is required. Detected: ${process.versions.node}`);
  }
}

function mergeAdditionalRules(baseRuleset, additionalRules) {
  if (!additionalRules || typeof additionalRules !== 'object') {
    return baseRuleset;
  }

  const normalizedAdditionalRules =
    additionalRules.rules && typeof additionalRules.rules === 'object' ? additionalRules.rules : additionalRules;

  return {
    ...baseRuleset,
    rules: {
      ...(baseRuleset.rules || {}),
      ...normalizedAdditionalRules,
    },
  };
}

async function runSpectralValidation(options) {
  ensureSupportedNodeVersion();
  const {
    rulesetId,
    specContent,
    rulesetFileUrl,
    rulesetContentPath,
    gitRootPath,
    authToken,
    outputFormat,
    additionalRules,
    customFunctions,
    customFunctionsPath,
  } = options || {};

  const normalizedRulesetId = typeof rulesetId === 'string' ? rulesetId.trim().toLowerCase() : '';
  if (!normalizedRulesetId && (!rulesetFileUrl || typeof rulesetFileUrl !== 'string')) {
    throw new Error('rulesetId or rulesetFileUrl is required');
  }
  if (!specContent || typeof specContent !== 'string') {
    throw new Error('specContent is required');
  }

  let resolvedRulesetFileUrl = rulesetFileUrl;
  let resolvedRulesetContentPath = rulesetContentPath;
  let resolvedCustomFunctionsPath = customFunctionsPath;

  if (!resolvedRulesetFileUrl || typeof resolvedRulesetFileUrl !== 'string') {
    const bundled = resolveBundledRuleset(normalizedRulesetId);
    if (!bundled) {
      throw new Error('rulesetFileUrl is required (or use a supported rulesetId)');
    }
    resolvedRulesetFileUrl = bundled.rulesetFileUrl;
    if (!resolvedRulesetContentPath) {
      resolvedRulesetContentPath = bundled.rulesetContentPath;
    }
    if (!resolvedCustomFunctionsPath && bundled.customFunctionsPath) {
      resolvedCustomFunctionsPath = bundled.customFunctionsPath;
    }
  }

  const resolvedOutputFormat = outputFormat || 'spectral';
  if (!['summary', 'spectral'].includes(resolvedOutputFormat)) {
    throw new Error('outputFormat must be "summary" or "spectral"');
  }

  const { ruleset: parsedRuleset } = await loadSpectralRuleset({
    filePathOrUrl: resolvedRulesetFileUrl,
    rulesetContentPath: resolvedRulesetContentPath,
    gitRootPath,
    authToken,
    oasRuleset: oas,
    customFunctions,
    customFunctionsPath: resolvedCustomFunctionsPath,
  });

  const ruleset = mergeAdditionalRules(parsedRuleset, additionalRules);
  const results = await runSpectralEngineValidation(specContent, ruleset);

  if (resolvedOutputFormat === 'spectral') {
    return results;
  }

  const shouldIncludeAiReadinessSummary = normalizedRulesetId === 'ai-readiness';

  return buildGovernanceSummary({
    results,
    ruleset,
    buildAiReadinessSummary: shouldIncludeAiReadinessSummary ? buildAiReadinessSummary : undefined,
  });
}

module.exports = {
  runSpectralValidation,
};
