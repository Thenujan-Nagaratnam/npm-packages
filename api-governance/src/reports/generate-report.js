/**
 * Turn Spectral-style validation output (violations + scores) into a full analyze report
 * (violations by id, overview, breakdown, issue explorer filters). Used by API Designer
 * and other consumers.
 *
 * Logic mirrors the api-designer extension's report-unifier.ts and rule-constants.ts.
 *
 * @module api-governance/reports/generate-report
 */

// ─── Severity penalty weights (mirrors AI_SEVERITY_PENALTY in api-designer) ──
const AI_SEVERITY_PENALTY = {
  error: 1,
  warn: 0.6,
  info: 0.3,
  hint: 0.15,
};

// ─── AI Readiness: rule → sub-bucket mapping ─────────────────────────────────
const AI_READINESS_RULE_CATEGORY_MAP = {
  // summaries
  'ai-readiness-operation-summary':              'summaries',
  'ai-readiness-callback-operation-summary':     'summaries',
  'ai-readiness-webhook-operation-summary':      'summaries',
  'ai-readiness-path-item-summary':              'summaries',
  'ai-readiness-llm-summary-imperative-verb':    'summaries',
  'ai-readiness-llm-summary-business-semantics': 'summaries',
  'ai-readiness-llm-agent-discovery-endpoints':  'summaries',
  // descriptions
  'ai-readiness-api-description':                'descriptions',
  'ai-readiness-server-description':             'descriptions',
  'ai-readiness-path-item-description':          'descriptions',
  'ai-readiness-operation-description':          'descriptions',
  'ai-readiness-operation-tags':                 'descriptions',
  'ai-readiness-parameter-description':          'descriptions',
  'ai-readiness-parameter-description-length':   'descriptions',
  'ai-readiness-request-body-description':       'descriptions',
  'ai-readiness-response-description':           'descriptions',
  'ai-readiness-error-response-description-length': 'descriptions',
  'ai-readiness-schema-description':             'descriptions',
  'ai-readiness-schema-description-length':      'descriptions',
  'ai-readiness-schema-title':                   'descriptions',
  'ai-readiness-schema-property-description':    'descriptions',
  'ai-readiness-schema-enum-description':        'descriptions',
  'ai-readiness-tags-description':               'descriptions',
  'ai-readiness-tags-external-docs':             'descriptions',
  'ai-readiness-deprecation-notice':             'descriptions',
  'ai-readiness-llm-description-preconditions':  'descriptions',
  'ai-readiness-llm-description-side-effects':   'descriptions',
  'ai-readiness-llm-description-draft-finalized':'descriptions',
  'ai-readiness-llm-description-required-scopes':'descriptions',
  'ai-readiness-llm-description-workflow-position': 'descriptions',
  'ai-readiness-llm-parameter-business-meaning': 'descriptions',
  'ai-readiness-llm-parameter-enum-value-explanations': 'descriptions',
  'ai-readiness-llm-parameter-id-sourcing':      'descriptions',
  'ai-readiness-llm-workflow-response-to-parameter-linkage': 'descriptions',
  'ai-readiness-llm-naming-ambiguous-properties':'descriptions',
  'ai-readiness-llm-general':                    'descriptions',
  // operationIds
  'ai-readiness-operation-id':                   'operationIds',
  'ai-readiness-operation-id-casing':            'operationIds',
  'ai-readiness-operation-id-unique':            'operationIds',
  'ai-readiness-llm-operation-id-verb-noun':     'operationIds',
  'ai-readiness-llm-operation-id-distinctiveness':'operationIds',
  'ai-readiness-llm-naming-singular-plural':     'operationIds',
  // examples
  'ai-readiness-parameter-example':              'examples',
  'ai-readiness-path-parameter-example':         'examples',
  'ai-readiness-parameter-content-example':      'examples',
  'ai-readiness-path-parameter-content-example': 'examples',
  'ai-readiness-request-body-example':           'examples',
  'ai-readiness-response-example':               'examples',
  'ai-readiness-response-header-example':        'examples',
  'ai-readiness-schema-example':                 'examples',
  'ai-readiness-schema-property-example':        'examples',
  'ai-readiness-component-header-example':       'examples',
  'ai-readiness-llm-workflow-hateoas-links':     'examples',
  // typing
  'ai-readiness-request-body-schema-typed':      'typing',
  'ai-readiness-request-body-schema-required':   'typing',
  'ai-readiness-response-schema-typed':          'typing',
  'ai-readiness-schema-property-type':           'typing',
  'ai-readiness-parameter-schema-type':          'typing',
  'ai-readiness-schema-string-format':           'typing',
  'ai-readiness-schema-no-empty-object':         'typing',
  'ai-readiness-schema-property-no-empty-object':'typing',
  'ai-readiness-array-items-defined':            'typing',
  'ai-readiness-array-property-items-defined':   'typing',
  'ai-readiness-schema-validation-constraints':  'typing',
  'ai-readiness-discriminator':                  'typing',
  'ai-readiness-llm-naming-property-casing':     'typing',
  // errors (responses)
  'ai-readiness-success-response':               'errors',
  'ai-readiness-success-response-content':       'errors',
  'ai-readiness-success-response-json-schema':   'errors',
  'ai-readiness-error-responses-4xx':            'errors',
  'ai-readiness-error-responses-5xx':            'errors',
  'ai-readiness-error-response-content':         'errors',
  'ai-readiness-error-response-json-schema':     'errors',
  'ai-readiness-response-content-type':          'errors',
  'ai-readiness-error-response-schema':          'errors',
  // errorSemantics
  'ai-readiness-error-schema-fields':            'errorSemantics',
  'ai-readiness-error-schema-rfc7807':           'errorSemantics',
  'ai-readiness-error-schema-details':           'errorSemantics',
  'ai-readiness-error-schema-actionable':        'errorSemantics',
  'ai-readiness-llm-errors-structured-4xx':      'errorSemantics',
  'ai-readiness-llm-errors-401-403-distinction': 'errorSemantics',
  // headers
  'ai-readiness-429-rate-limit-headers':         'headers',
  'ai-readiness-llm-errors-429-retry-guidance':  'headers',
  // pagination
  'ai-readiness-list-pagination-params':         'pagination',
  'ai-readiness-pagination-response-meta':       'pagination',
  'ai-readiness-llm-bulk-batch-operations':      'pagination',
  'ai-readiness-llm-sparse-fieldsets':           'pagination',
  // security
  'ai-readiness-api-contact':                    'security',
  'ai-readiness-no-interactive-auth':            'security',
  'ai-readiness-security-defined':               'security',
  'ai-readiness-security-description':           'security',
  'ai-readiness-security-on-mutating-ops':       'security',
  'ai-readiness-llm-destructive-irreversible-warning': 'security',
  'ai-readiness-llm-destructive-cascade-effects':'security',
  'ai-readiness-llm-destructive-reasoning-instructions': 'security',
  // idempotency
  'ai-readiness-idempotency-key':                'idempotency',
};

// Explicit rule list per sub-bucket — used for penalty-based bucket scoring.
const AI_READINESS_BUCKET_RULE_MAP = {
  summaries: [
    'ai-readiness-operation-summary',
    'ai-readiness-callback-operation-summary',
    'ai-readiness-webhook-operation-summary',
    'ai-readiness-path-item-summary',
    'ai-readiness-llm-summary-imperative-verb',
    'ai-readiness-llm-summary-business-semantics',
    'ai-readiness-llm-agent-discovery-endpoints',
  ],
  descriptions: [
    'ai-readiness-api-description',
    'ai-readiness-server-description',
    'ai-readiness-path-item-description',
    'ai-readiness-operation-description',
    'ai-readiness-operation-tags',
    'ai-readiness-parameter-description',
    'ai-readiness-parameter-description-length',
    'ai-readiness-request-body-description',
    'ai-readiness-response-description',
    'ai-readiness-error-response-description-length',
    'ai-readiness-schema-description',
    'ai-readiness-schema-description-length',
    'ai-readiness-schema-title',
    'ai-readiness-schema-property-description',
    'ai-readiness-schema-enum-description',
    'ai-readiness-tags-description',
    'ai-readiness-tags-external-docs',
    'ai-readiness-deprecation-notice',
    'ai-readiness-llm-description-preconditions',
    'ai-readiness-llm-description-side-effects',
    'ai-readiness-llm-description-draft-finalized',
    'ai-readiness-llm-description-required-scopes',
    'ai-readiness-llm-description-workflow-position',
    'ai-readiness-llm-parameter-business-meaning',
    'ai-readiness-llm-parameter-enum-value-explanations',
    'ai-readiness-llm-parameter-id-sourcing',
    'ai-readiness-llm-workflow-response-to-parameter-linkage',
    'ai-readiness-llm-naming-ambiguous-properties',
    'ai-readiness-llm-general',
  ],
  operationIds: [
    'ai-readiness-operation-id',
    'ai-readiness-operation-id-casing',
    'ai-readiness-operation-id-unique',
    'ai-readiness-llm-operation-id-verb-noun',
    'ai-readiness-llm-operation-id-distinctiveness',
    'ai-readiness-llm-naming-singular-plural',
  ],
  examples: [
    'ai-readiness-parameter-example',
    'ai-readiness-path-parameter-example',
    'ai-readiness-parameter-content-example',
    'ai-readiness-path-parameter-content-example',
    'ai-readiness-request-body-example',
    'ai-readiness-response-example',
    'ai-readiness-response-header-example',
    'ai-readiness-schema-example',
    'ai-readiness-schema-property-example',
    'ai-readiness-component-header-example',
    'ai-readiness-llm-workflow-hateoas-links',
  ],
  typing: [
    'ai-readiness-request-body-schema-typed',
    'ai-readiness-request-body-schema-required',
    'ai-readiness-response-schema-typed',
    'ai-readiness-schema-property-type',
    'ai-readiness-parameter-schema-type',
    'ai-readiness-schema-string-format',
    'ai-readiness-schema-no-empty-object',
    'ai-readiness-schema-property-no-empty-object',
    'ai-readiness-array-items-defined',
    'ai-readiness-array-property-items-defined',
    'ai-readiness-schema-validation-constraints',
    'ai-readiness-discriminator',
    'ai-readiness-llm-naming-property-casing',
  ],
  errors: [
    'ai-readiness-success-response',
    'ai-readiness-success-response-content',
    'ai-readiness-success-response-json-schema',
    'ai-readiness-error-responses-4xx',
    'ai-readiness-error-responses-5xx',
    'ai-readiness-error-response-content',
    'ai-readiness-error-response-json-schema',
    'ai-readiness-response-content-type',
    'ai-readiness-error-response-schema',
  ],
  errorSemantics: [
    'ai-readiness-error-schema-fields',
    'ai-readiness-error-schema-rfc7807',
    'ai-readiness-error-schema-details',
    'ai-readiness-error-schema-actionable',
    'ai-readiness-llm-errors-structured-4xx',
    'ai-readiness-llm-errors-401-403-distinction',
  ],
  headers: ['ai-readiness-429-rate-limit-headers', 'ai-readiness-llm-errors-429-retry-guidance'],
  pagination: [
    'ai-readiness-list-pagination-params',
    'ai-readiness-pagination-response-meta',
    'ai-readiness-llm-bulk-batch-operations',
    'ai-readiness-llm-sparse-fieldsets',
  ],
  security: [
    'ai-readiness-api-contact',
    'ai-readiness-no-interactive-auth',
    'ai-readiness-security-defined',
    'ai-readiness-security-description',
    'ai-readiness-security-on-mutating-ops',
    'ai-readiness-llm-destructive-irreversible-warning',
    'ai-readiness-llm-destructive-cascade-effects',
    'ai-readiness-llm-destructive-reasoning-instructions',
  ],
  idempotency: ['ai-readiness-idempotency-key'],
};

// Per-sub-bucket importance weights (mirrors AI_READINESS_BUCKET_WEIGHTS in api-designer).
const AI_READINESS_BUCKET_WEIGHTS = {
  summaries:      1.2,
  descriptions:   1.0,
  operationIds:   1.3,
  examples:       1.0,
  errors:         1.25,
  typing:         1.1,
  errorSemantics: 1.35,
  headers:        1.15,
  pagination:     1.1,
  security:       1.5,
  idempotency:    1.4,
};

// ─── AI Readiness: 4 top-level dimensions ────────────────────────────────────
const AI_DIMENSIONS = [
  {
    key: 'discovery',
    label: 'Semantic Discovery',
    description: 'Ensures AI agents can find the right endpoint and understand intent using clear summaries, rich descriptions, and stable operation IDs so they avoid guesswork and incorrect calls.',
    subBucketKeys: ['summaries', 'descriptions', 'operationIds'],
    aggregationWeight: 0.26,
  },
  {
    key: 'contract',
    label: 'Contract Integrity',
    description: 'Ensures AI agents can construct valid requests and interpret responses confidently by relying on strong schemas, explicit typing, and practical examples instead of assumptions.',
    subBucketKeys: ['examples', 'typing', 'errors'],
    aggregationWeight: 0.26,
  },
  {
    key: 'resilience',
    label: 'Resilience & Recovery',
    description: 'Ensures AI agents can recover from failures and operate safely at scale through actionable error semantics, clear rate-limit signals, and pagination guidance.',
    subBucketKeys: ['errorSemantics', 'headers', 'pagination'],
    aggregationWeight: 0.24,
  },
  {
    key: 'security',
    label: 'Security & Integrity',
    description: 'Ensures autonomous agent access remains safe over time by defining non-interactive security requirements and idempotent mutation behavior that reduces unintended side effects.',
    subBucketKeys: ['security', 'idempotency'],
    aggregationWeight: 0.24,
  },
];

// Sub-bucket metadata keyed by bucket id.
const AI_BUCKET_DEFINITIONS = {
  summaries:      { label: 'Summaries',          description: 'Clear operation summaries help agents pick the right endpoint quickly.' },
  descriptions:   { label: 'Descriptions',        description: 'Detailed descriptions reduce ambiguity in agent execution flows.' },
  operationIds:   { label: 'Operation IDs',       description: 'Stable operation IDs improve deterministic tool calling for agents.' },
  examples:       { label: 'Examples',            description: 'Request and response examples help agents construct valid payloads.' },
  errors:         { label: 'Responses',           description: 'Defined success and error responses help agents interpret outcomes correctly and avoid invalid request/response handling.' },
  typing:         { label: 'Strict Typing',       description: 'Strong typing keeps agent-generated requests aligned with schema constraints.' },
  errorSemantics: { label: 'Error Semantics',     description: 'Consistent status semantics let agents reason about failures correctly.' },
  headers:        { label: 'Rate Limit Headers',  description: 'Rate limit and retry headers prevent unsafe autonomous request bursts.' },
  pagination:     { label: 'Pagination',          description: 'Pagination metadata helps agents iterate large datasets safely.' },
  security:       { label: 'Agent Auth',          description: 'Explicit security requirements reduce risk in autonomous access.' },
  idempotency:    { label: 'Idempotency',         description: 'Idempotency protection avoids duplicate side effects on retries.' },
};

// ─── OWASP categories ─────────────────────────────────────────────────────────
const OWASP_DIMENSIONS = [
  { key: 'api1:2023',  label: 'Broken Object Level Authorization',               description: 'Ensures object-level access controls are enforced so users cannot read or modify resources they do not own.',                                          docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/',          aggregationWeight: 1 },
  { key: 'api2:2023',  label: 'Broken Authentication',                           description: 'Validates authentication flows and token handling to prevent account takeover and credential abuse.',                                                   docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/',                      aggregationWeight: 1 },
  { key: 'api3:2023',  label: 'Broken Object Property Level Authorization',      description: 'Checks that sensitive object properties are protected from overexposure, mass assignment, and unauthorized updates.',                                   docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/', aggregationWeight: 1 },
  { key: 'api4:2023',  label: 'Unrestricted Resource Consumption',               description: 'Identifies missing limits and throttling controls that can allow denial of service through excessive consumption.',                                     docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/',          aggregationWeight: 1 },
  { key: 'api5:2023',  label: 'Broken Function Level Authorization',             description: 'Verifies that privileged operations are properly restricted and cannot be invoked by lower-privilege users.',                                           docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/',        aggregationWeight: 1 },
  { key: 'api6:2023',  label: 'Unrestricted Access to Sensitive Business Flows', description: 'Highlights business-critical workflows that need stronger anti-abuse controls and transaction safeguards.',                                             docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/', aggregationWeight: 1 },
  { key: 'api7:2023',  label: 'Server Side Request Forgery',                     description: 'Detects opportunities for untrusted input to trigger server-side outbound requests to internal or protected systems.',                                  docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa7-server-side-request-forgery/',                aggregationWeight: 1 },
  { key: 'api8:2023',  label: 'Security Misconfiguration',                       description: 'Flags insecure defaults, weak transport/security settings, and missing hardening controls across API surfaces.',                                        docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/',                  aggregationWeight: 1 },
  { key: 'api9:2023',  label: 'Improper Inventory Management',                   description: 'Ensures API assets, versions, and environments are properly documented and governed to avoid unmanaged exposure.',                                      docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/',              aggregationWeight: 1 },
  { key: 'api10:2023', label: 'Unsafe Consumption of APIs',                      description: 'Evaluates trust boundaries and validation when integrating third-party or downstream APIs and services.',                                               docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xaa-unsafe-consumption-of-apis/',                 aggregationWeight: 1 },
];

const OWASP_DIMENSION_WEIGHTS = {
  'api1:2023':  1.4,
  'api2:2023':  1.3,
  'api3:2023':  1.2,
  'api4:2023':  1.1,
  'api5:2023':  1.3,
  'api6:2023':  1.1,
  'api7:2023':  1.2,
  'api8:2023':  1.0,
  'api9:2023':  0.8,
  'api10:2023': 0.9,
};

// ─── REST API Readiness ───────────────────────────────────────────────────────
// Explicit rule → category mapping (mirrors REST_API_READINESS_RULE_CATEGORY_MAP).
const REST_API_READINESS_RULE_CATEGORY_MAP = {
  'contact-url':                       'documentation',
  'contact-email':                     'documentation',
  'contact-name':                      'documentation',
  'info-contact':                      'documentation',
  'info-description':                  'documentation',
  'info-license':                      'documentation',
  'license-url':                       'documentation',
  'no-eval-in-markdown':               'security-governance',
  'no-script-tags-in-markdown':        'security-governance',
  'openapi-tags-alphabetical':         'documentation',
  'openapi-tags':                      'documentation',
  'tag-description':                   'documentation',
  'parameter-description':             'documentation',
  'operation-description':             'documentation',
  'operation-operationid':             'operations-methods',
  'operation-operationid-valid-in-url':'operations-methods',
  'operation-tags':                    'documentation',
  'path-declarations-must-exist':      'resource-design',
  'paths-no-trailing-slash':           'resource-design',
  'path-not-include-query':            'resource-design',
  'path-parameters-on-path-only':      'contracts-responses',
  'paths-no-query-params':             'resource-design',
  'path-casing':                       'resource-design',
  'resource-names-plural':             'resource-design',
  'paths-no-http-verbs':               'resource-design',
  'paths-avoid-special-characters':    'resource-design',
  'oas3-examples-value-or-externalvalue': 'contracts-responses',
  'array-items':                       'contracts-responses',
};

const REST_API_READINESS_DIMENSIONS = [
  { key: 'resource-design',    label: 'Resource Design',        description: 'Resource paths, naming, and URL structure quality.',                   aggregationWeight: 1 },
  { key: 'operations-methods', label: 'Operations & Methods',   description: 'Operation metadata and method semantics consistency.',                  aggregationWeight: 1 },
  { key: 'contracts-responses',label: 'Contracts & Responses',  description: 'Request/response schema and contract correctness checks.',              aggregationWeight: 1 },
  { key: 'documentation',      label: 'Documentation Quality',  description: 'API documentation completeness and usability checks.',                  aggregationWeight: 1 },
  { key: 'security-governance',label: 'Security & Governance',  description: 'Basic security and governance hygiene checks.',                         aggregationWeight: 1 },
  { key: 'other',              label: 'Others',                  description: 'Other checks.',                                                         aggregationWeight: 1 },
];

const REPORT_TITLE_BY_ID = {
  'ai-readiness':     'AI Readiness',
  'owasp':            'Security (OWASP)',
  'rest-api-readiness':'REST Compliance',
};

const REPORT_BREAKDOWN_META = {
  'ai-readiness':      { title: 'AI Readiness Breakdown',       subtitle: 'Evaluate how well your API is prepared for AI agent consumption' },
  'owasp':             { title: 'Security (OWASP) Breakdown',   subtitle: 'OWASP API Security themes for which this analysis found issues.' },
  'rest-api-readiness':{ title: 'REST Compliance Breakdown',    subtitle: 'Compliance with REST API design guidelines' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

function getReportKind(rulesetName) {
  const lower = String(rulesetName).toLowerCase();
  if (lower.includes('ai') && lower.includes('readiness')) return 'ai-readiness';
  if (lower.includes('owasp') || lower.includes('security')) return 'owasp';
  return 'rest-api-readiness';
}

function normalizeRuleId(rule) {
  return (rule || '').trim().toLowerCase();
}

function normalizePath(path) {
  if (Array.isArray(path)) return path.map((segment) => String(segment));
  if (typeof path === 'string') return path.split('>').map((segment) => segment.trim()).filter(Boolean);
  return [];
}

function extractEndpoint(pathSegments) {
  const pathsIndex = pathSegments.indexOf('paths');
  if (pathsIndex >= 0) {
    const endpoint = pathSegments[pathsIndex + 1] || 'global';
    const methodRaw = (pathSegments[pathsIndex + 2] || '').toLowerCase();
    const method = HTTP_METHODS.has(methodRaw) ? methodRaw.toUpperCase() : 'GLOBAL';
    return { endpoint, method };
  }
  return { endpoint: 'global', method: 'GLOBAL' };
}

function deriveOwaspCategoryKeyFromRule(rule) {
  const raw = (rule || '').toUpperCase().match(/API\d+(?::\d{4})?/);
  const key = (raw && raw[0]) || 'GENERAL';
  return key.includes(':') ? key.toLowerCase() : `${key.toLowerCase()}:2023`;
}

function pickRestThemeKey(rule) {
  return REST_API_READINESS_RULE_CATEGORY_MAP[normalizeRuleId(rule)] || 'other';
}

function getBucketKeyForRule(reportId, rule) {
  if (reportId === 'owasp') return deriveOwaspCategoryKeyFromRule(rule);
  if (reportId === 'rest-api-readiness') return pickRestThemeKey(rule);
  return '';
}

// Penalty-based bucket score: each rule contributes a penalty proportional to
// its worst-severity violation. A rule with no violation contributes 0 penalty.
function computeAiBucketScore(rulesInBucket, rulePenaltyByRule) {
  const totalRules = rulesInBucket.length;
  if (totalRules <= 0) return 100;
  const bucketPenalty = rulesInBucket.reduce((sum, ruleId) => {
    return sum + (rulePenaltyByRule.get(normalizeRuleId(ruleId)) || 0);
  }, 0);
  return Math.max(0, Math.min(100, ((totalRules - bucketPenalty) / totalRules) * 100));
}

// Overall weighted score — mirrors computeWeightedScore() in report-unifier.ts.
function computeWeightedScore(reportId, input) {
  const violations = input.violations || [];
  const passedRules = input.passedRules || [];

  if (reportId === 'ai-readiness') {
    const rulePenaltyByRule = new Map();
    violations.forEach((violation) => {
      const ruleId = normalizeRuleId(violation.rule || violation.code || '');
      if (!ruleId) return;
      const sev = (violation.severity === 'error' || violation.severity === 'warn' || violation.severity === 'info' || violation.severity === 'hint') ? violation.severity : 'info';
      const penalty = AI_SEVERITY_PENALTY[sev];
      if ((rulePenaltyByRule.get(ruleId) || 0) < penalty) rulePenaltyByRule.set(ruleId, penalty);
    });
    let weightedSum = 0;
    let totalWeight = 0;
    Object.entries(AI_READINESS_BUCKET_RULE_MAP).forEach(([bucketKey, rulesInBucket]) => {
      const bucketScore = computeAiBucketScore(rulesInBucket, rulePenaltyByRule);
      const weight = AI_READINESS_BUCKET_WEIGHTS[bucketKey] || 1;
      weightedSum += bucketScore * weight;
      totalWeight += weight;
    });
    if (totalWeight > 0) return Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight)));
    return Math.max(0, Math.min(100, Math.round(input.score || 0)));
  }

  // OWASP / REST: collect all rules (violated + passed), compute per-bucket penalty.
  const allRules = new Set();
  const rulePenaltyByRule = new Map();
  violations.forEach((violation) => {
    const ruleId = normalizeRuleId(violation.rule || violation.code || '');
    if (!ruleId) return;
    allRules.add(ruleId);
    const sev = (violation.severity === 'error' || violation.severity === 'warn' || violation.severity === 'info' || violation.severity === 'hint') ? violation.severity : 'info';
    const penalty = AI_SEVERITY_PENALTY[sev];
    if ((rulePenaltyByRule.get(ruleId) || 0) < penalty) rulePenaltyByRule.set(ruleId, penalty);
  });
  passedRules.forEach((entry) => {
    const ruleId = normalizeRuleId(entry.rule || '');
    if (ruleId) allRules.add(ruleId);
  });
  if (allRules.size === 0) return Math.max(0, Math.min(100, Math.round(input.score || 0)));

  const bucketStats = new Map();
  allRules.forEach((ruleId) => {
    const bucketKey = getBucketKeyForRule(reportId, ruleId);
    let stats = bucketStats.get(bucketKey);
    if (!stats) { stats = { total: 0, penalty: 0 }; bucketStats.set(bucketKey, stats); }
    stats.total += 1;
    stats.penalty += rulePenaltyByRule.get(ruleId) || 0;
  });

  let weightedSum = 0;
  let totalWeight = 0;
  bucketStats.forEach((stats, bucketKey) => {
    if (stats.total <= 0) return;
    const bucketScore = ((stats.total - stats.penalty) / stats.total) * 100;
    const weight = reportId === 'owasp' ? (OWASP_DIMENSION_WEIGHTS[bucketKey] || 1) : 1;
    weightedSum += bucketScore * weight;
    totalWeight += weight;
  });
  if (totalWeight <= 0) return Math.max(0, Math.min(100, Math.round(input.score || 0)));
  return Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight)));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
/**
 * Build a full governance/analyze report from raw Spectral (or similar) results.
 * @param {string} rulesetName  Display name; drives report type (OWASP / AI / REST).
 * @param {{ violations?: Array, passedRules?: Array, score?: number, passedChecks?: number, totalChecks?: number }} input
 * @returns {object}  Unified report — see generate-report.d.ts for full type.
 */
function generateReport(rulesetName, input) {
  const reportId = getReportKind(rulesetName);
  const rawViolations = (input && input.violations) || [];
  const passedRules = (input && input.passedRules) || [];

  const violationsById = {};
  const categoryBuckets = new Map();   // dimensionKey → { label, description, docsUrl, violationIds[] }
  const aiRulePenaltyByRule = new Map(); // for AI per-bucket scoring
  const rulePenaltyByRule = new Map();   // for OWASP/REST per-bucket scoring
  const failedRulesByBucket = new Map();
  const allRulesByBucket = new Map();

  const ensureRuleBucket = (bucketKey) => {
    if (!failedRulesByBucket.has(bucketKey)) failedRulesByBucket.set(bucketKey, new Set());
    if (!allRulesByBucket.has(bucketKey))    allRulesByBucket.set(bucketKey, new Set());
    return { failed: failedRulesByBucket.get(bucketKey), all: allRulesByBucket.get(bucketKey) };
  };

  // Build a map from sub-bucket key → dimension key for quick lookup.
  const subBucketToDimension = new Map();
  const dimensionMetaByKey = new Map();
  const configuredDimensions = reportId === 'ai-readiness' ? AI_DIMENSIONS
    : reportId === 'owasp' ? OWASP_DIMENSIONS
    : REST_API_READINESS_DIMENSIONS;

  configuredDimensions.forEach((dim) => {
    dimensionMetaByKey.set(dim.key, { label: dim.label, description: dim.description, docsUrl: dim.docsUrl });
    (dim.subBucketKeys || [dim.key]).forEach((sbKey) => subBucketToDimension.set(sbKey, dim.key));
  });

  rawViolations.forEach((violation, index) => {
    const pathSegments = normalizePath(violation.path);
    const displayPath = pathSegments.length > 0 ? pathSegments.join(' > ') : 'Unknown path';
    const { endpoint, method } = extractEndpoint(pathSegments);
    const id = `${violation.rule || violation.code || 'unknown'}:${index}`;
    const normalizedSeverity = (violation.severity === 'error' || violation.severity === 'warn' || violation.severity === 'hint' || violation.severity === 'info')
      ? violation.severity : 'info';
    const normalizedRule = normalizeRuleId(violation.rule || violation.code || '');

    // Track bucket membership for scoring.
    const bucketKeyForRule = getBucketKeyForRule(reportId, normalizedRule);
    if (bucketKeyForRule && normalizedRule) {
      const rb = ensureRuleBucket(bucketKeyForRule);
      rb.failed.add(normalizedRule);
      rb.all.add(normalizedRule);
    }

    // Penalty tracking.
    if (reportId === 'ai-readiness' && normalizedRule) {
      const p = AI_SEVERITY_PENALTY[normalizedSeverity];
      if ((aiRulePenaltyByRule.get(normalizedRule) || 0) < p) aiRulePenaltyByRule.set(normalizedRule, p);
    }
    if (normalizedRule) {
      const p = AI_SEVERITY_PENALTY[normalizedSeverity];
      if ((rulePenaltyByRule.get(normalizedRule) || 0) < p) rulePenaltyByRule.set(normalizedRule, p);
    }

    // Determine sub-bucket key and dimension key for this violation.
    let subBucketKey;
    if (reportId === 'ai-readiness') {
      subBucketKey = AI_READINESS_RULE_CATEGORY_MAP[normalizedRule];
    } else if (reportId === 'owasp') {
      subBucketKey = deriveOwaspCategoryKeyFromRule(normalizedRule);
    } else {
      subBucketKey = REST_API_READINESS_RULE_CATEGORY_MAP[normalizedRule];
    }

    const dimensionKey = subBucketKey ? subBucketToDimension.get(subBucketKey) : undefined;
    if (dimensionKey) {
      if (!categoryBuckets.has(dimensionKey)) {
        const meta = dimensionMetaByKey.get(dimensionKey);
        categoryBuckets.set(dimensionKey, { label: (meta && meta.label) || dimensionKey, description: meta && meta.description, docsUrl: meta && meta.docsUrl, violationIds: [] });
      }
      categoryBuckets.get(dimensionKey).violationIds.push(id);
    }

    violationsById[id] = {
      id,
      rule: violation.rule || violation.code || 'unknown-rule',
      message: violation.message || 'No message provided',
      description: violation.description,
      fixSuggestion: violation.fixSuggestion,
      severity: normalizedSeverity,
      code: violation.code,
      pathSegments,
      displayPath,
      endpoint,
      method,
      line: ((violation.range && violation.range.start ? violation.range.start.line : -1) + 1),
      range: violation.range,
      breakdownKeys: [dimensionKey, subBucketKey].filter((k) => !!k),
    };
  });

  // Add passed rules to bucket tracking (for OWASP/REST scoring denominator).
  passedRules.forEach((entry) => {
    const normalizedRule = normalizeRuleId(entry.rule || '');
    if (!normalizedRule) return;
    const bucketKey = getBucketKeyForRule(reportId, normalizedRule);
    if (!bucketKey) return;
    const rb = ensureRuleBucket(bucketKey);
    rb.all.add(normalizedRule);
  });

  const vList = Object.values(violationsById);
  const endpointCount = new Set(
    vList.filter((v) => v.endpoint !== 'global' && v.method !== 'GLOBAL').map((v) => `${v.method}:${v.endpoint}`)
  ).size;
  const errors   = vList.filter((v) => v.severity === 'error').length;
  const warnings = vList.filter((v) => v.severity === 'warn').length;
  const infos    = vList.filter((v) => v.severity === 'info' || v.severity === 'hint').length;

  const countFromIds = (ids) => ({
    total:    ids.length,
    errors:   ids.filter((id) => violationsById[id] && violationsById[id].severity === 'error').length,
    warnings: ids.filter((id) => violationsById[id] && violationsById[id].severity === 'warn').length,
    infos:    ids.filter((id) => { const s = violationsById[id] && violationsById[id].severity; return s === 'info' || s === 'hint'; }).length,
  });

  const affectedEndpoints = (ids) => new Set(
    ids.map((id) => violationsById[id]).filter((v) => v && v.endpoint !== 'global' && v.method !== 'GLOBAL').map((v) => `${v.method} ${v.endpoint}`)
  ).size;

  // ── Build categories ─────────────────────────────────────────────────────
  const categories = configuredDimensions
    .filter((dim) => {
      if (reportId === 'owasp') {
        return allRulesByBucket.has(dim.key) || failedRulesByBucket.has(dim.key);
      }
      if (reportId === 'rest-api-readiness' && dim.key === 'other') {
        return allRulesByBucket.has('other') || failedRulesByBucket.has('other');
      }
      return true;
    })
    .map((dim) => {
      const ids = (categoryBuckets.get(dim.key) && categoryBuckets.get(dim.key).violationIds) || [];
      const counts = countFromIds(ids);

      // Compute category-level percentage score.
      let categoryPercentage;
      if (reportId === 'ai-readiness') {
        const subBuckets = (dim.subBucketKeys || []).map((sbKey) => {
          const rulesInBucket = AI_READINESS_BUCKET_RULE_MAP[sbKey] || [];
          return {
            key:        sbKey,
            percentage: computeAiBucketScore(rulesInBucket, aiRulePenaltyByRule),
            weight:     AI_READINESS_BUCKET_WEIGHTS[sbKey] || 1,
          };
        });
        const totalW = subBuckets.reduce((s, b) => s + b.weight, 0);
        categoryPercentage = totalW <= 0 ? 100 : Math.max(0, Math.min(100, Math.round(
          subBuckets.reduce((s, b) => s + b.percentage * b.weight, 0) / totalW
        )));
      } else {
        const normalizedBucketKey = reportId === 'owasp' ? dim.key : dim.key;
        const ruleSet = allRulesByBucket.get(normalizedBucketKey);
        const totalRules = ruleSet ? ruleSet.size : 0;
        if (totalRules > 0) {
          const bucketPenalty = Array.from(ruleSet).reduce((s, ruleId) => s + (rulePenaltyByRule.get(ruleId) || 0), 0);
          categoryPercentage = Math.max(0, Math.min(100, Math.round(((totalRules - bucketPenalty) / totalRules) * 100)));
        } else {
          // Fallback: derive from violation counts.
          if (counts.total <= 0) {
            categoryPercentage = 100;
          } else {
            const wf = counts.errors * 1 + counts.warnings * 0.5 + counts.infos * 0.25;
            categoryPercentage = Math.max(0, Math.min(100, Math.round(100 - (wf / counts.total) * 100)));
          }
        }
      }

      // AI: build sub-bucket rows.
      let subBuckets;
      if (reportId === 'ai-readiness') {
        subBuckets = (dim.subBucketKeys || []).map((sbKey) => {
          const rulesInBucket = AI_READINESS_BUCKET_RULE_MAP[sbKey] || [];
          const pct = Math.max(0, Math.min(100, Math.round(computeAiBucketScore(rulesInBucket, aiRulePenaltyByRule))));
          const sbMeta = AI_BUCKET_DEFINITIONS[sbKey] || { label: sbKey, description: '' };
          // Collect violation ids for this sub-bucket.
          const sbIds = vList.filter((v) => Array.isArray(v.breakdownKeys) && v.breakdownKeys.includes(sbKey)).map((v) => v.id);
          const sbCounts = countFromIds(sbIds);
          return {
            id:          sbKey,
            label:       sbMeta.label,
            description: sbMeta.description,
            percentage:  pct,
            total:       sbCounts.total,
            errors:      sbCounts.errors,
            warnings:    sbCounts.warnings,
            infos:       sbCounts.infos,
            viewIssuesFilter: { key: sbKey, label: sbMeta.label },
          };
        });
      } else {
        // For OWASP/REST, single sub-bucket per dimension.
        subBuckets = (dim.subBucketKeys || [dim.key]).map((sbKey) => ({
          id:          sbKey,
          label:       dim.label,
          description: dim.description,
          percentage:  categoryPercentage,
          viewIssuesFilter: { key: sbKey, label: dim.label },
        }));
      }

      // Top rules for REST.
      const ruleCounts = new Map();
      ids.forEach((id) => {
        const rule = (violationsById[id] && violationsById[id].rule) || '';
        if (rule) ruleCounts.set(rule, (ruleCounts.get(rule) || 0) + 1);
      });

      return {
        id:          dim.key,
        label:       dim.label,
        description: dim.description || '',
        status:      counts.total > 0 ? 'failed' : 'passed',
        total:       counts.total,
        errors:      counts.errors,
        warnings:    counts.warnings,
        infos:       counts.infos,
        percentage:  categoryPercentage,
        affectedEndpoints: affectedEndpoints(ids),
        docsUrl:     dim.docsUrl,
        viewIssuesFilter: { key: dim.key, label: dim.label },
        subBuckets,
        ...(reportId === 'rest-api-readiness'
          ? { topRules: Array.from(ruleCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([rule]) => rule) }
          : {}),
      };
    });

  const computedScore = computeWeightedScore(reportId, input || {});
  const breakdownMeta = REPORT_BREAKDOWN_META[reportId];

  return {
    schemaVersion: '1',
    reportId,
    title: REPORT_TITLE_BY_ID[reportId] || rulesetName,
    violationsById,
    overview: {
      score:        computedScore,
      passedChecks: (input && input.passedChecks != null) ? input.passedChecks : passedRules.length,
      totalChecks:  (input && input.totalChecks  != null) ? input.totalChecks  : passedRules.length + new Set(vList.map((v) => v.rule)).size,
      metrics: [
        { id: 'errors',     label: 'Errors',               value: errors,         accent: 'error'   },
        { id: 'warnings',   label: 'Warnings',             value: warnings,       accent: 'warning' },
        { id: 'info',       label: 'Info',                 value: infos,          accent: 'info'    },
        { id: 'endpoints',  label: 'Operations affected',  value: endpointCount,  accent: 'info'    },
      ],
    },
    breakdown: {
      title:      breakdownMeta.title,
      subtitle:   breakdownMeta.subtitle,
      categories,
    },
    issueExplorer: {
      title:    'Issue Explorer',
      subtitle: 'Browse, filter and inspect all violations in detail',
      breakdownFilterOptions: reportId === 'ai-readiness'
        ? categories.flatMap((dim) => (dim.subBuckets || []).map((sub) => ({
            key:   sub.viewIssuesFilter.key,
            label: sub.viewIssuesFilter.label,
          })))
        : categories.map((cat) => ({
            key:   cat.viewIssuesFilter.key,
            label: cat.viewIssuesFilter.label,
          })),
    },
  };
}

module.exports = {
  generateReport,
  getReportKind
};
