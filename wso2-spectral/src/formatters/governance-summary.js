function mapSeverity(severityIndex) {
  return ['error', 'warn', 'info', 'hint'][severityIndex] || 'info';
}

function buildGovernanceSummary({ results, ruleset, buildAiReadinessSummary }) {
  const severityRuleSets = {
    error: new Set(),
    warn: new Set(),
    info: new Set(),
    hint: new Set(),
  };
  const severityViolationCounts = { error: 0, warn: 0, info: 0, hint: 0 };

  for (const result of results) {
    const severity = mapSeverity(typeof result.severity === 'number' ? result.severity : 2);
    const ruleCode = result.code;

    severityViolationCounts[severity] += 1;
    if (ruleCode) {
      severityRuleSets[severity].add(ruleCode);
    }
  }

  const failedRuleCodes = new Set([
    ...severityRuleSets.error,
    ...severityRuleSets.warn,
    ...severityRuleSets.info,
    ...severityRuleSets.hint,
  ]);

  const totalRules = Object.keys(ruleset.rules || {}).length || 1;
  const failedRuleCount = Math.min(totalRules, failedRuleCodes.size);
  const passedRuleCount = Math.max(0, totalRules - failedRuleCount);
  const score = Math.round((passedRuleCount / totalRules) * 100);

  const violations = results.map((result) => {
    const ruleName = result.code || 'unknown';
    const ruleDefinition = ruleset.rules ? ruleset.rules[ruleName] : undefined;
    const description =
      ruleDefinition && typeof ruleDefinition === 'object' && ruleDefinition.description !== undefined
        ? ruleDefinition.description
        : undefined;
    const fixSuggestion =
      ruleDefinition && typeof ruleDefinition === 'object' && typeof ruleDefinition.fixSuggestion === 'string'
        ? ruleDefinition.fixSuggestion
        : undefined;

    return {
      rule: ruleName,
      message: result.message || 'No message provided',
      ...(description ? { description } : {}),
      ...(fixSuggestion ? { fixSuggestion } : {}),
      severity: mapSeverity(result.severity),
      path: result.path || [],
      ...(result.range
        ? {
            range: {
              start: { line: result.range.start.line, character: result.range.start.character },
              end: { line: result.range.end.line, character: result.range.end.character },
            },
          }
        : {}),
    };
  });

  const violationSummary = {
    totalViolations: results.length,
    errorRules: severityRuleSets.error.size,
    warningRules: severityRuleSets.warn.size,
    infoRules: severityRuleSets.info.size,
    hintRules: severityRuleSets.hint.size,
    errorViolations: severityViolationCounts.error,
    warningViolations: severityViolationCounts.warn,
    infoViolations: severityViolationCounts.info,
    hintViolations: severityViolationCounts.hint,
  };

  const passedRules = Object.entries(ruleset.rules || {}).reduce((acc, [ruleName, ruleConfig]) => {
    if (failedRuleCodes.has(ruleName)) {
      return acc;
    }

    const ruleDefinition = ruleConfig && typeof ruleConfig === 'object' ? ruleConfig : null;
    const description = ruleDefinition && typeof ruleDefinition.description === 'string' ? ruleDefinition.description : undefined;
    const yamlMessage = ruleDefinition && typeof ruleDefinition.message === 'string' ? ruleDefinition.message : undefined;
    const fixSuggestion = ruleDefinition && typeof ruleDefinition.fixSuggestion === 'string' ? ruleDefinition.fixSuggestion : undefined;

    acc.push({
      rule: ruleName,
      message: yamlMessage !== undefined ? yamlMessage : 'This rule passed - no matching issues in your API.',
      ...(description ? { description } : {}),
      ...(fixSuggestion ? { fixSuggestion } : {}),
      severity: 'passed',
    });
    return acc;
  }, []);

  const response = {
    outputSchemaVersion: '1.0.0',
    score,
    totalRuleCount: totalRules,
    passedRuleCount,
    failedRuleCount,
    violationSummary,
    violations,
    passedRules,
  };

  if (typeof buildAiReadinessSummary === 'function') {
    const summary = buildAiReadinessSummary(response);
    if (summary) {
      response.aiReadinessSummary = summary;
    }
  }

  return response;
}

module.exports = {
  buildGovernanceSummary,
};
