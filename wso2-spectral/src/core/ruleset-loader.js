const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');
const spectralFunctions = require('@stoplight/spectral-functions');
const spectralFormats = require('@stoplight/spectral-formats');

function convertSeverity(severity) {
  if (typeof severity === 'number') {
    return severity;
  }

  switch (severity) {
    case 'error':
      return 0;
    case 'warn':
      return 1;
    case 'hint':
      return 2;
    case 'info':
      return 3;
    default:
      return 1;
  }
}

function processFormats(formats) {
  if (!Array.isArray(formats)) {
    return formats;
  }

  return formats.map((format) => {
    if (typeof format === 'string' && spectralFormats[format]) {
      return spectralFormats[format];
    }
    return format;
  });
}

function processAliases(aliases) {
  if (!aliases || typeof aliases !== 'object') {
    return {};
  }

  const processedAliases = {};
  for (const [aliasName, aliasConfig] of Object.entries(aliases)) {
    const processedAlias = { ...aliasConfig };
    if (processedAlias.targets && Array.isArray(processedAlias.targets)) {
      processedAlias.targets = processedAlias.targets.map((target) => {
        const processedTarget = { ...target };
        if (target.formats) {
          processedTarget.formats = processFormats(target.formats);
        }
        return processedTarget;
      });
    }
    processedAliases[aliasName] = processedAlias;
  }
  return processedAliases;
}

function processExtends(extendsArray, oasRuleset) {
  if (!extendsArray || !Array.isArray(extendsArray)) {
    return [];
  }

  const processedExtends = [];
  for (const extendItem of extendsArray) {
    if (Array.isArray(extendItem)) {
      const [rulesetName, severity] = extendItem;
      if (rulesetName === 'spectral:oas') {
        processedExtends.push([oasRuleset, severity]);
      } else {
        processedExtends.push(extendItem);
      }
    } else if (typeof extendItem === 'string') {
      if (extendItem === 'spectral:oas') {
        processedExtends.push([oasRuleset, 'recommended']);
      } else {
        processedExtends.push(extendItem);
      }
    } else {
      processedExtends.push(extendItem);
    }
  }

  return processedExtends;
}

function buildFunctionRegistry(customFunctions) {
  const base = {
    ...spectralFunctions,
  };

  if (!customFunctions || typeof customFunctions !== 'object') {
    return base;
  }

  return {
    ...base,
    ...customFunctions,
  };
}

function resolveCustomFunctions({ customFunctionsPath, gitRootPath }) {
  if (!customFunctionsPath) {
    return undefined;
  }

  const paths = Array.isArray(customFunctionsPath) ? customFunctionsPath : [customFunctionsPath];
  const merged = {};

  for (const modulePath of paths) {
    if (typeof modulePath !== 'string' || modulePath.trim() === '') {
      throw new Error('customFunctionsPath entries must be non-empty strings');
    }

    const resolvedPath = path.isAbsolute(modulePath)
      ? modulePath
      : path.resolve(gitRootPath || process.cwd(), modulePath);
    const loaded = require(resolvedPath);
    if (!loaded || typeof loaded !== 'object') {
      throw new Error(`Custom functions module must export an object: ${resolvedPath}`);
    }
    Object.assign(merged, loaded);
  }

  return merged;
}

function processThenClause(thenClause, functionRegistry) {
  if (!thenClause || typeof thenClause !== 'object') {
    return thenClause;
  }

  const processed = { ...thenClause };
  if (thenClause.function && typeof thenClause.function === 'string') {
    const functionName = thenClause.function;
    if (functionRegistry[functionName]) {
      processed.function = functionRegistry[functionName];
    }
  }
  return processed;
}

function normalizeRules(rules, functionRegistry) {
  if (!rules || typeof rules !== 'object') {
    return {};
  }

  const processedRules = {};
  for (const [ruleName, ruleConfig] of Object.entries(rules)) {
    const rule = ruleConfig;
    const processedRule = {
      description: rule.description,
      message: rule.message,
      given: rule.given,
      severity: convertSeverity(rule.severity),
    };

    if (rule.resolved !== undefined) {
      processedRule.resolved = rule.resolved;
    }
    if (rule.formats) {
      processedRule.formats = processFormats(rule.formats);
    }
    if (rule.recommended !== undefined) {
      processedRule.recommended = rule.recommended;
    }
    if (typeof rule.fixSuggestion === 'string' && rule.fixSuggestion.trim() !== '') {
      processedRule.fixSuggestion = rule.fixSuggestion;
    }

    if (Array.isArray(rule.then)) {
      processedRule.then = rule.then.map((thenItem) => processThenClause(thenItem, functionRegistry));
    } else if (rule.then) {
      processedRule.then = processThenClause(rule.then, functionRegistry);
    }

    processedRules[ruleName] = processedRule;
  }

  return processedRules;
}

function normalizeRuleset(rulesetObject, oasRuleset, functionRegistry) {
  const rawRuleset = rulesetObject.rulesetContent ? rulesetObject.rulesetContent : rulesetObject;

  if (!rawRuleset.rules || typeof rawRuleset.rules !== 'object') {
    throw new Error('Ruleset must contain a "rules" property');
  }

  const normalized = { rules: normalizeRules(rawRuleset.rules, functionRegistry) };
  if (rawRuleset.aliases) {
    const aliases = processAliases(rawRuleset.aliases);
    if (Object.keys(aliases).length > 0) {
      normalized.aliases = aliases;
    }
  }
  if (rawRuleset.extends) {
    const ext = processExtends(rawRuleset.extends, oasRuleset);
    if (ext.length > 0) {
      normalized.extends = ext;
    }
  }

  return normalized;
}

function isUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') {
    return false;
  }

  const trimmed = pathOrUrl.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('https:/');
}

function extractRulesetContent(yamlText, rulesetContentPath) {
  const doc = yaml.load(yamlText);
  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid ruleset format');
  }

  if (rulesetContentPath && doc[rulesetContentPath]) {
    return yaml.dump(doc[rulesetContentPath], { noRefs: true });
  }

  if (doc.rules && typeof doc.rules === 'object') {
    return yaml.dump(doc, { noRefs: true });
  }

  if (rulesetContentPath) {
    throw new Error(`Ruleset content not found at path: ${rulesetContentPath}`);
  }
  throw new Error('Ruleset must define root-level "rules" or provide rulesetContentPath');
}

async function downloadRulesetContent(url, authToken) {
  const rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  let headers = {};
  let response = await fetch(rawUrl, { headers });

  if (!response.ok && (response.status === 401 || response.status === 403) && authToken) {
    headers = { Authorization: `token ${authToken}` };
    response = await fetch(rawUrl, { headers });
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch from ${rawUrl}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function constructRulesetPath(sourceFolder, fileName) {
  if (!sourceFolder || !fileName) {
    throw new Error(`Invalid ruleset configuration: sourceFolder="${sourceFolder}", fileName="${fileName}"`);
  }

  if (sourceFolder.includes('github.com')) {
    let rawFolder = sourceFolder;
    if (rawFolder.includes('/blob/') || rawFolder.includes('/tree/')) {
      const parsed = sourceFolder.match(/github\.com\/([^/]+)\/([^/]+)\/(blob|tree)\/([^/]+)(?:\/(.+))?/);
      if (parsed) {
        const [, owner, repo, , branch, folderPath] = parsed;
        rawFolder = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}${folderPath ? `/${folderPath}` : ''}`;
      }
    }
    return `${rawFolder}/${fileName}`;
  }

  return path.posix.join(sourceFolder, fileName);
}

async function loadSpectralRuleset({
  filePathOrUrl,
  rulesetContentPath,
  gitRootPath,
  authToken,
  oasRuleset,
  customFunctions,
  customFunctionsPath,
}) {
  let cleanedPathOrUrl = filePathOrUrl;
  if (filePathOrUrl.includes('https:/') && !filePathOrUrl.includes('https://')) {
    cleanedPathOrUrl = filePathOrUrl.replace(/https:\//g, 'https://');
  }

  let rulesetContent;
  if (isUrl(cleanedPathOrUrl)) {
    rulesetContent = await downloadRulesetContent(cleanedPathOrUrl, authToken);
  } else {
    let rulesetPath = cleanedPathOrUrl;
    if (gitRootPath && !cleanedPathOrUrl.startsWith('/')) {
      rulesetPath = path.join(gitRootPath, cleanedPathOrUrl);
    }
    rulesetContent = await fs.promises.readFile(rulesetPath, 'utf8');
  }

  rulesetContent = extractRulesetContent(rulesetContent, rulesetContentPath);
  const rulesetObject = yaml.load(rulesetContent);
  if (!rulesetObject || typeof rulesetObject !== 'object') {
    throw new Error('Invalid ruleset format');
  }

  const loadedCustomFunctions = resolveCustomFunctions({ customFunctionsPath, gitRootPath });
  const functionRegistry = buildFunctionRegistry(customFunctions || loadedCustomFunctions);

  return { ruleset: normalizeRuleset(rulesetObject, oasRuleset, functionRegistry) };
}

module.exports = {
  constructRulesetPath,
  loadSpectralRuleset,
};
