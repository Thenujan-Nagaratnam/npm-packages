const path = require('path');
const fs = require('fs');

const CORE_RULEPACK_DIR = path.resolve(__dirname, '../../rule-packs/core');

/**
 * Picks the first matching ruleset file (lexicographic order prefers neutral `rest_api_*`
 * names over any legacy prefixed copies).
 */
function pickBundledYaml(matchFn) {
  let names;
  try {
    names = fs.readdirSync(CORE_RULEPACK_DIR).filter((f) => f.endsWith('.yaml') && matchFn(f));
  } catch {
    return null;
  }
  names.sort();
  return names[0] || null;
}

const BUNDLED_RULESETS = {
  'ai-readiness': {
    title: 'REST API AI Readiness Guidelines',
    pickFile: () => pickBundledYaml((f) => /ai_readiness_guidelines\.yaml$/.test(f)),
    rulesetContentPath: 'rulesetContent',
    customFunctionsFileName: 'functions/_shared.js',
  },
  owasp: {
    title: 'OWASP Top 10 Security',
    pickFile: () => pickBundledYaml((f) => /^owasp.*\.yaml$/.test(f)),
    rulesetContentPath: 'rulesetContent',
  },
  'rest-api-readiness': {
    title: 'REST API Design Guidelines',
    pickFile: () =>
      pickBundledYaml(
        (f) =>
          /design_guidelines\.yaml$/.test(f) &&
          !/^owasp/i.test(f),
      ),
    rulesetContentPath: 'rulesetContent',
  },
};

function getBundledRulesetPath(fileName) {
  return path.resolve(CORE_RULEPACK_DIR, fileName);
}

function getBundledFunctionsPath(fileName) {
  return path.resolve(CORE_RULEPACK_DIR, fileName);
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

  const picked = typeof definition.pickFile === 'function' ? definition.pickFile() : null;
  if (!picked) {
    return null;
  }

  const rulesetFileUrl = getBundledRulesetPath(picked);
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
