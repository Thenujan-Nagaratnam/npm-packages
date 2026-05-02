const { Spectral, Document } = require('@stoplight/spectral-core');
const Parsers = require('@stoplight/spectral-parsers');

function sanitizeRulesForEngine(ruleset) {
  if (!ruleset || !ruleset.rules || typeof ruleset.rules !== 'object') {
    return ruleset;
  }

  const rules = {};
  for (const [name, config] of Object.entries(ruleset.rules)) {
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      const { fixSuggestion: _ignored, ...rest } = config;
      rules[name] = rest;
      continue;
    }
    rules[name] = config;
  }

  return { ...ruleset, rules };
}

async function runSpectralValidation(specContent, ruleset) {
  if (!ruleset || typeof ruleset !== 'object' || !ruleset.rules || typeof ruleset.rules !== 'object') {
    throw new Error('Invalid ruleset: missing or invalid "rules" property');
  }

  const spectral = new Spectral();
  spectral.setRuleset(sanitizeRulesForEngine(ruleset));

  const document = new Document(specContent, Parsers.Yaml);
  return spectral.run(document);
}

module.exports = {
  runSpectralValidation,
};
