const { isObject, makeMessage } = require('./_utils');

const responseCodeFromPath = (path) => {
  if (!Array.isArray(path)) return undefined;
  const idx = path.findIndex((segment) => String(segment) === 'responses');
  if (idx < 0 || idx + 1 >= path.length) return undefined;
  return String(path[idx + 1]);
};

exports.aiReadinessErrorResponseCoverage = (targetVal, rawOpts = {}, context = {}) => {
  const opts = rawOpts || {};
  const requiredCodes = Array.isArray(opts.requiredCodes) && opts.requiredCodes.length > 0
    ? opts.requiredCodes.map(String)
    : ['400', '401', '403', '404', '422', '429'];

  const responses = isObject(targetVal) && isObject(targetVal.responses) ? targetVal.responses : undefined;
  const hasRequired = !!responses && requiredCodes.some(
    (code) => Object.prototype.hasOwnProperty.call(responses, code)
  );

  if (hasRequired) return [];
  const basePath = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'Missing required error responses'), path: [...basePath, 'responses'] }];
};

exports.aiReadinessErrorSchemaStructure = (targetVal, rawOpts = {}, context = {}) => {
  const opts = rawOpts || {};
  if (opts.responseCodePattern) {
    const code = responseCodeFromPath(context.path);
    if (!code || !(new RegExp(opts.responseCodePattern).test(code))) return [];
  }

  const requiredFields = Array.isArray(opts.requiredFields) && opts.requiredFields.length > 0
    ? opts.requiredFields
    : ['message'];

  const schema = isObject(targetVal) ? targetVal : {};
  const properties = isObject(schema.properties) ? schema.properties : {};
  const missing = requiredFields.filter((f) => !Object.prototype.hasOwnProperty.call(properties, f));
  if (missing.length === 0) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, `Error schema missing fields: ${missing.join(', ')}`), path: [...path] }];
};
