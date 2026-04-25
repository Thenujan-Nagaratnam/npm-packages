const { oas } = require('@stoplight/spectral-rulesets');
const { createRequire } = require('module');
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

function loadCustomFunctionsModule(modulePath) {
  if (!modulePath || typeof modulePath !== 'string') {
    return undefined;
  }

  try {
    return require(modulePath);
  } catch (requireError) {
    try {
      const nodeRequire = createRequire(__filename);
      return nodeRequire(modulePath);
    } catch (nodeRequireError) {
      const primary = requireError && requireError.message ? requireError.message : String(requireError);
      const fallback = nodeRequireError && nodeRequireError.message ? nodeRequireError.message : String(nodeRequireError);
      throw new Error(`Failed to load custom functions module "${modulePath}": ${primary} | fallback: ${fallback}`);
    }
  }
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
  let resolvedCustomFunctions = customFunctions;

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

  // AI readiness relies on custom function names in the ruleset; inject them as an object
  // to avoid runtime/path resolution issues when loading through extension bundles.
  if (!resolvedCustomFunctions && normalizedRulesetId === 'ai-readiness' && resolvedCustomFunctionsPath) {
    const loaded = loadCustomFunctionsModule(resolvedCustomFunctionsPath);
    if (!loaded || typeof loaded !== 'object') {
      throw new Error(`Custom functions module must export an object: ${resolvedCustomFunctionsPath}`);
    }
    resolvedCustomFunctions = loaded;
    resolvedCustomFunctionsPath = undefined;
  }

  const resolvedOutputFormat = outputFormat || 'spectral';
  if (!['summary', 'spectral', 'report'].includes(resolvedOutputFormat)) {
    throw new Error('outputFormat must be "summary", "report" or "spectral"');
  }

  const { ruleset: parsedRuleset, rulesetMetadata } = await loadSpectralRuleset({
    filePathOrUrl: resolvedRulesetFileUrl,
    rulesetContentPath: resolvedRulesetContentPath,
    gitRootPath,
    authToken,
    oasRuleset: oas,
    customFunctions: resolvedCustomFunctions,
    customFunctionsPath: resolvedCustomFunctionsPath,
  });

  const ruleset = mergeAdditionalRules(parsedRuleset, additionalRules);
  const results = await runSpectralEngineValidation(specContent, ruleset);

  if (resolvedOutputFormat === 'spectral') {
    return results;
  }

  const inferredRulesetName =
    (rulesetMetadata && typeof rulesetMetadata.name === 'string' && rulesetMetadata.name) ||
    (typeof rulesetId === 'string' ? rulesetId : '');
  const lowerRulesetName = inferredRulesetName.toLowerCase();
  const shouldIncludeAiReadinessSummary =
    normalizedRulesetId === 'ai-readiness' || (lowerRulesetName.includes('ai') && lowerRulesetName.includes('readiness'));

  const summary = buildGovernanceSummary({
    results,
    ruleset,
    rulesetMetadata,
    buildAiReadinessSummary: shouldIncludeAiReadinessSummary ? buildAiReadinessSummary : undefined,
  });

  if (resolvedOutputFormat === 'report') {
    return {
      reportId: summary.reportId,
      report: summary.report,
      metadata: summary.rulesetMetadata,
    };
  }

  return summary;
}

module.exports = {
  runSpectralValidation,
};
