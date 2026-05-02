const { HTTP_METHODS, isObject } = require('./_utils');

const detectStyle = (operationId) => {
  if (/^[a-z][a-zA-Z0-9]*$/.test(operationId)) return 'camel';
  if (/^[A-Z][a-zA-Z0-9]*$/.test(operationId)) return 'pascal';
  if (/^[a-z][a-z0-9_]*$/.test(operationId)) return 'snake';
  if (/^[a-z][a-z0-9-]*$/.test(operationId)) return 'kebab';
  return 'other';
};

exports.aiReadinessOperationIdConsistency = (targetVal, rawOpts = {}) => {
  const opts = rawOpts || {};
  const doc = isObject(targetVal) ? targetVal : {};
  const paths = isObject(doc.paths) ? doc.paths : {};
  const allowed = new Set(
    Array.isArray(opts.allowedStyles) && opts.allowedStyles.length > 0
      ? opts.allowedStyles
      : ['camel', 'pascal', 'snake', 'kebab']
  );

  const operationIds = [];
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!isObject(pathItem)) continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !isObject(operation)) continue;
      const operationId = operation.operationId;
      if (typeof operationId !== 'string' || operationId.trim().length === 0) continue;
      operationIds.push({
        operationId,
        style: detectStyle(operationId),
        path: ['paths', pathKey, method, 'operationId'],
      });
    }
  }

  if (operationIds.length <= 1) return [];

  const counts = new Map();
  operationIds.forEach(({ style }) => {
    if (!allowed.has(style)) return;
    counts.set(style, (counts.get(style) || 0) + 1);
  });

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const dominant = sorted.length > 0 ? sorted[0][0] : undefined;
  if (!dominant) return [];

  const violations = [];
  operationIds.forEach((entry) => {
    const passed = entry.style === dominant || !allowed.has(entry.style);
    if (!passed) {
      violations.push({
        message: `operationId '${entry.operationId}' uses '${entry.style}' style while the API primarily uses '${dominant}' style`,
        path: entry.path,
      });
    }
  });
  return violations;
};

exports.aiReadinessOperationIdUnique = (targetVal) => {
  const root = isObject(targetVal) ? targetVal : {};
  const pathsObj = isObject(root.paths) ? root.paths : {};
  const occurrences = new Map();

  for (const [pathKey, pathItem] of Object.entries(pathsObj)) {
    if (!isObject(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isObject(operation)) continue;
      const opId = typeof operation.operationId === 'string' ? operation.operationId.trim() : '';
      if (!opId) continue;
      const opPath = ['paths', pathKey, method, 'operationId'];
      const list = occurrences.get(opId) || [];
      list.push(opPath);
      occurrences.set(opId, list);
    }
  }

  const violations = [];
  occurrences.forEach((paths, operationId) => {
    if (paths.length > 1) {
      paths.forEach((path) => {
        violations.push({
          message: `operationId '${operationId}' is duplicated across multiple operations`,
          path,
        });
      });
    }
  });
  return violations;
};
