const { isObject, makeMessage } = require('./_utils');

exports.aiReadinessPaginationParams = (targetVal, _rawOpts = {}, context = {}) => {
  const operation = isObject(targetVal) ? targetVal : {};
  const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
  const names = parameters.map((p) =>
    isObject(p) && typeof p.name === 'string' ? p.name.toLowerCase() : ''
  );
  const hasCursorOrPage = names.includes('cursor') || names.includes('page') || names.includes('offset');
  const hasLimit = names.includes('limit') || names.includes('page_size') ||
                   names.includes('pagesize') || names.includes('per_page');
  if (hasCursorOrPage && hasLimit) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{
    message: makeMessage(context, 'List endpoint should have pagination parameters (cursor/page and limit)'),
    path: [...path],
  }];
};

exports.aiReadinessPaginationMeta = (targetVal, _rawOpts = {}, context = {}) => {
  const schema = isObject(targetVal) ? targetVal : {};
  const props = isObject(schema.properties)
    ? Object.keys(schema.properties).map((k) => k.toLowerCase())
    : [];
  const hasMore = props.some((p) =>
    ['has_more', 'hasmore', 'has_next', 'hasnext', 'is_last', 'islast'].includes(p)
  );
  const hasCursor = props.some((p) =>
    ['next_cursor', 'nextcursor', 'next_page', 'nextpage', 'cursor', 'next',
     'page_token', 'nextpagetoken', 'continuation_token'].includes(p)
  );
  const hasTotal = props.some((p) =>
    ['total', 'total_count', 'totalcount', 'count', 'total_items', 'totalitems'].includes(p)
  );
  if (hasMore || hasCursor || hasTotal) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{
    message: makeMessage(context, 'List response schema should include pagination metadata (has_more, next_cursor, or total)'),
    path: [...path],
  }];
};

exports.aiReadinessRateLimitHeader = (targetVal, _rawOpts = {}, context = {}) => {
  const response = isObject(targetVal) ? targetVal : {};
  const headers = isObject(response.headers) ? response.headers : {};
  const names = Object.keys(headers).map((h) => h.toLowerCase());
  const passed = names.includes('retry-after') ||
                 names.some((h) => h.startsWith('x-ratelimit-') || h.startsWith('x-rate-limit-'));
  if (passed) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{
    message: makeMessage(context, '429 response must include Retry-After or X-RateLimit-* headers'),
    path: [...path],
  }];
};

exports.aiReadinessSecurityScheme = (targetVal, _rawOpts = {}, context = {}) => {
  const scheme = isObject(targetVal) ? targetVal : {};
  let hasInteractiveFlow = false;
  if (scheme.type === 'oauth2') {
    const flows = isObject(scheme.flows) ? scheme.flows : {};
    hasInteractiveFlow = Object.prototype.hasOwnProperty.call(flows, 'implicit') ||
                         Object.prototype.hasOwnProperty.call(flows, 'authorizationCode');
  }
  if (!hasInteractiveFlow) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{
    message: makeMessage(context, 'Security scheme uses interactive OAuth flow not suitable for AI agents'),
    path: [...path],
  }];
};

exports.aiReadinessIdempotency = (targetVal, _rawOpts = {}, context = {}) => {
  const operation = isObject(targetVal) ? targetVal : {};
  const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
  const passed = parameters.some(
    (p) => isObject(p) && p.in === 'header' &&
           typeof p.name === 'string' && p.name.toLowerCase() === 'idempotency-key'
  );
  if (passed) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{
    message: makeMessage(context, 'Mutating operation should support Idempotency-Key header for safe retries'),
    path: [...path],
  }];
};
