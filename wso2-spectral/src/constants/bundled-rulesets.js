const path = require('path');
const fs = require('fs');

const BUNDLED_RULESETS = {
  'ai-readiness': {
    title: 'WSO2 REST API AI Readiness Guidelines',
    fileName: 'wso2_rest_api_ai_readiness_guidelines.yaml',
    rulesetContentPath: 'rulesetContent',
    customFunctionsFileName: 'functions/_shared.js',
  },
  owasp: {
    title: 'OWASP Top 10 Security',
    fileName: 'owasp_top_10.yaml',
    rulesetContentPath: 'rulesetContent',
  },
  'rest-api-readiness': {
    title: 'WSO2 REST API Design Guidelines',
    fileName: 'wso2_rest_api_design_guidelines.yaml',
    rulesetContentPath: 'rulesetContent',
  },
};

function getBundledRulesetPath(fileName) {
  return path.resolve(__dirname, '../../rule-packs/core', fileName);
}

function getBundledFunctionsPath(fileName) {
  return path.resolve(__dirname, '../../rule-packs/core', fileName);
}

function resolveBundledRuleset(rulesetId) {
  if (!rulesetId || typeof rulesetId !== 'string') {
    return null;
  }

  const normalizedId = rulesetId.trim().toLowerCase();
  const definition = BUNDLED_RULESETS[normalizedId];
  if (!definition) {
    return null;
  }

  const rulesetFileUrl = getBundledRulesetPath(definition.fileName);
  if (!fs.existsSync(rulesetFileUrl)) {
    return null;
  }

  return {
    rulesetId: normalizedId,
    rulesetTitle: definition.title,
    rulesetFileUrl,
    rulesetContentPath: definition.rulesetContentPath,
    customFunctionsPath: definition.customFunctionsFileName
      ? getBundledFunctionsPath(definition.customFunctionsFileName)
      : undefined,
  };
}

module.exports = {
  BUNDLED_RULESETS,
  resolveBundledRuleset,
};
