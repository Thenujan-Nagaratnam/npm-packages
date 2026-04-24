const RULE_CATEGORY_MAP = {
  'ai-readiness-operation-summary': 'summaries',
  'ai-readiness-callback-operation-summary': 'summaries',
  'ai-readiness-webhook-operation-summary': 'summaries',
  'ai-readiness-path-item-summary': 'summaries',
  'ai-readiness-api-description': 'descriptions',
  'ai-readiness-server-description': 'descriptions',
  'ai-readiness-path-item-description': 'descriptions',
  'ai-readiness-operation-description': 'descriptions',
  'ai-readiness-operation-id': 'operationIds',
  'ai-readiness-operation-id-casing': 'operationIds',
  'ai-readiness-operation-id-unique': 'operationIds',
  'ai-readiness-operation-tags': 'descriptions',
  'ai-readiness-parameter-description': 'descriptions',
  'ai-readiness-parameter-description-length': 'descriptions',
  'ai-readiness-request-body-description': 'descriptions',
  'ai-readiness-response-description': 'descriptions',
  'ai-readiness-error-response-description-length': 'descriptions',
  'ai-readiness-schema-description': 'descriptions',
  'ai-readiness-schema-description-length': 'descriptions',
  'ai-readiness-schema-title': 'descriptions',
  'ai-readiness-schema-property-description': 'descriptions',
  'ai-readiness-schema-enum-description': 'descriptions',
  'ai-readiness-tags-description': 'descriptions',
  'ai-readiness-tags-external-docs': 'descriptions',
  'ai-readiness-deprecation-notice': 'descriptions',
  'ai-readiness-parameter-example': 'examples',
  'ai-readiness-path-parameter-example': 'examples',
  'ai-readiness-parameter-content-example': 'examples',
  'ai-readiness-path-parameter-content-example': 'examples',
  'ai-readiness-request-body-example': 'examples',
  'ai-readiness-response-example': 'examples',
  'ai-readiness-response-header-example': 'examples',
  'ai-readiness-schema-example': 'examples',
  'ai-readiness-schema-property-example': 'examples',
  'ai-readiness-component-header-example': 'examples',
  'ai-readiness-success-response': 'errors',
  'ai-readiness-success-response-content': 'errors',
  'ai-readiness-success-response-json-schema': 'errors',
  'ai-readiness-error-responses-4xx': 'errors',
  'ai-readiness-error-responses-5xx': 'errors',
  'ai-readiness-error-response-content': 'errors',
  'ai-readiness-error-response-json-schema': 'errors',
  'ai-readiness-response-content-type': 'errors',
  'ai-readiness-error-response-schema': 'errors',
  'ai-readiness-request-body-schema-typed': 'typing',
  'ai-readiness-request-body-schema-required': 'typing',
  'ai-readiness-response-schema-typed': 'typing',
  'ai-readiness-schema-property-type': 'typing',
  'ai-readiness-parameter-schema-type': 'typing',
  'ai-readiness-schema-string-format': 'typing',
  'ai-readiness-schema-no-empty-object': 'typing',
  'ai-readiness-schema-property-no-empty-object': 'typing',
  'ai-readiness-array-items-defined': 'typing',
  'ai-readiness-array-property-items-defined': 'typing',
  'ai-readiness-schema-validation-constraints': 'typing',
  'ai-readiness-discriminator': 'typing',
  'ai-readiness-error-schema-fields': 'errorSemantics',
  'ai-readiness-error-schema-rfc7807': 'errorSemantics',
  'ai-readiness-error-schema-details': 'errorSemantics',
  'ai-readiness-error-schema-actionable': 'errorSemantics',
  'ai-readiness-429-rate-limit-headers': 'headers',
  'ai-readiness-list-pagination-params': 'pagination',
  'ai-readiness-pagination-response-meta': 'pagination',
  'ai-readiness-api-contact': 'security',
  'ai-readiness-no-interactive-auth': 'security',
  'ai-readiness-security-defined': 'security',
  'ai-readiness-security-description': 'security',
  'ai-readiness-security-on-mutating-ops': 'security',
  'ai-readiness-idempotency-key': 'idempotency',
};

const BUCKET_DEFINITIONS = [
  { key: 'summaries', label: 'Summaries', icon: 'list-unordered' },
  { key: 'descriptions', label: 'Descriptions', icon: 'note' },
  { key: 'operationIds', label: 'Operation IDs', icon: 'symbol-method' },
  { key: 'examples', label: 'Examples', icon: 'symbol-field' },
  { key: 'errors', label: 'Responses', icon: 'error' },
  { key: 'typing', label: 'Strict Typing', icon: 'symbol-parameter' },
  { key: 'errorSemantics', label: 'Error Semantics', icon: 'feedback' },
  { key: 'headers', label: 'Rate Limit Headers', icon: 'server-process' },
  { key: 'pagination', label: 'Pagination', icon: 'list-flat' },
  { key: 'security', label: 'Agent Auth', icon: 'shield' },
  { key: 'idempotency', label: 'Idempotency', icon: 'sync' },
];

const SUB_BUCKET_WEIGHTS = {
  summaries: 1.2,
  descriptions: 1.0,
  operationIds: 1.3,
  examples: 1.0,
  typing: 1.1,
  errors: 1.25,
  errorSemantics: 1.35,
  headers: 1.15,
  pagination: 1.1,
  security: 1.5,
  idempotency: 1.4,
};

const AI_READINESS_DIMENSIONS = [
  {
    key: 'discovery',
    label: 'Semantic Discovery',
    description: 'Can AI agents find the right endpoint and understand its intent?',
    whyItMatters:
      'AI agents rely on summaries, descriptions, and stable operation identifiers to select the right tool for a task. Without them, agents must infer behavior through trial and error, leading to incorrect calls and hallucinated responses.',
    icon: 'search',
    subBucketKeys: ['summaries', 'descriptions', 'operationIds'],
    aggregationWeight: 0.26,
  },
  {
    key: 'contract',
    label: 'Contract Integrity',
    description: 'Can AI agents construct valid requests and interpret responses without guessing?',
    whyItMatters:
      'Agents generate payloads based on schemas and examples. Ambiguous types, missing required fields, or absent examples cause agents to produce invalid requests or misinterpret response data.',
    icon: 'symbol-interface',
    subBucketKeys: ['examples', 'typing', 'errors'],
    aggregationWeight: 0.26,
  },
  {
    key: 'resilience',
    label: 'Resilience & Recovery',
    description: 'Can AI agents handle failures, rate limits, and large datasets gracefully?',
    whyItMatters:
      'Autonomous agents operate without human supervision. Structured error schemas let agents self-correct, rate limit headers prevent hammering, and pagination metadata tells agents when to stop iterating.',
    icon: 'refresh',
    subBucketKeys: ['errorSemantics', 'headers', 'pagination'],
    aggregationWeight: 0.24,
  },
  {
    key: 'security',
    label: 'Security & Integrity',
    description: 'Is the API safe for autonomous agent access over the long term?',
    whyItMatters:
      'Agents cannot complete interactive browser-based OAuth flows. Undefined security requirements risk agents making unintended state changes. Idempotency support prevents duplicate side-effects when agents retry operations.',
    icon: 'shield',
    subBucketKeys: ['security', 'idempotency'],
    aggregationWeight: 0.24,
  },
];

const HARMONIC_EPSILON = 1e-6;

function weightedHarmonicMean(items) {
  let sumWeights = 0;
  let denominator = 0;

  for (const { value, weight } of items) {
    if (weight <= 0) {
      continue;
    }
    sumWeights += weight;
    denominator += weight / Math.max(HARMONIC_EPSILON, value + HARMONIC_EPSILON);
  }

  if (sumWeights <= 0 || denominator <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, sumWeights / denominator));
}

function calculateDimensionScore(subBuckets) {
  const active = subBuckets.filter((bucket) => bucket.total > 0);
  if (active.length === 0) {
    return 100;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const bucket of active) {
    const weight = SUB_BUCKET_WEIGHTS[bucket.key] || 1;
    weightedSum += bucket.percentage * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function buildAiReadinessSummary(governanceResult) {
  const allViolations = [];
  const buckets = BUCKET_DEFINITIONS.reduce((acc, def) => {
    acc[def.key] = { violations: [], seen: new Set() };
    return acc;
  }, {});

  const violationEntries = governanceResult.violations || [];
  violationEntries.forEach((violation) => {
    const rawSegments = Array.isArray(violation.path)
      ? violation.path.map((segment) => String(segment))
      : typeof violation.path === 'string'
        ? violation.path.split('>').map((segment) => segment.trim()).filter(Boolean)
        : [];
    const displayPath =
      rawSegments.length > 0
        ? rawSegments.join(' > ')
        : Array.isArray(violation.path)
          ? violation.path.join(' > ')
          : violation.path || 'Unknown path';

    const ruleCode = (violation.rule || violation.code || '').toLowerCase();
    const key = `${ruleCode}|${rawSegments.join('|')}`;
    const item = { pathSegments: rawSegments, displayPath, message: violation.message || 'Missing information' };
    allViolations.push(item);

    const bucketKey = RULE_CATEGORY_MAP[ruleCode];
    if (bucketKey && buckets[bucketKey] && !buckets[bucketKey].seen.has(key)) {
      buckets[bucketKey].seen.add(key);
      buckets[bucketKey].violations.push(item);
    }
  });

  const ruleViolationCounts = new Map();
  violationEntries.forEach((violation) => {
    const ruleCode = (violation.rule || violation.code || '').toLowerCase();
    ruleViolationCounts.set(ruleCode, (ruleViolationCounts.get(ruleCode) || 0) + 1);
  });

  const bucketSummaries = BUCKET_DEFINITIONS.map((definition) => {
    const rulesInBucket = Object.keys(RULE_CATEGORY_MAP).filter((rule) => RULE_CATEGORY_MAP[rule] === definition.key);
    const rules = rulesInBucket.map((ruleKey) => {
      const failed = (ruleViolationCounts.get(ruleKey) || 0) > 0;
      const label = ruleKey
        .replace(/^ai-readiness-/, '')
        .replace(/-/g, ' ')
        .replace(/^\w/, (character) => character.toUpperCase());
      return { key: ruleKey, label, total: 1, filled: failed ? 0 : 1, percentage: failed ? 0 : 100 };
    });

    const total = rulesInBucket.length;
    const filled = rules.reduce((sum, rule) => sum + (rule.filled > 0 ? 1 : 0), 0);
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 100;

    return {
      key: definition.key,
      label: definition.label,
      icon: definition.icon,
      total,
      filled,
      percentage: Math.max(0, Math.min(100, percentage)),
      missing: buckets[definition.key].violations,
      rules,
    };
  });

  const bucketByKey = new Map(bucketSummaries.map((bucket) => [bucket.key, bucket]));
  const dimensions = AI_READINESS_DIMENSIONS.map((dimension) => {
    const subBuckets = dimension.subBucketKeys.map((key) => bucketByKey.get(key)).filter(Boolean);
    const rawScore = calculateDimensionScore(subBuckets);
    const score = Math.round(Math.max(0, Math.min(100, rawScore)));
    return {
      key: dimension.key,
      label: dimension.label,
      description: dimension.description,
      whyItMatters: dimension.whyItMatters,
      icon: dimension.icon,
      score,
      aggregationWeight: dimension.aggregationWeight,
      subBuckets,
    };
  });

  const score = Math.round(
    weightedHarmonicMean(dimensions.map((dimension) => ({ value: dimension.score, weight: dimension.aggregationWeight }))),
  );

  return {
    score,
    aggregation: 'weighted_harmonic_mean',
    dimensions,
    buckets: bucketSummaries,
    validation: allViolations.length > 0 ? { violations: allViolations } : undefined,
  };
}

module.exports = {
  buildAiReadinessSummary,
};
