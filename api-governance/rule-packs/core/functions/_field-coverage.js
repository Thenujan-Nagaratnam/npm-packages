const { isObject, isNonEmpty, makeMessage } = require('./_utils');

exports.aiReadinessFieldCoverage = (targetVal, rawOpts = {}, context = {}) => {
  const opts = rawOpts || {};
  const fields = Array.isArray(opts.fields) && opts.fields.length > 0
    ? opts.fields
    : (opts.field ? [opts.field] : []);

  let passes = false;
  let selectedField;

  for (const field of fields) {
    const value = isObject(targetVal) ? targetVal[field] : undefined;
    if (isNonEmpty(value, opts.minLength)) {
      passes = true;
      selectedField = field;
      break;
    }
  }

  if (!passes && fields.length === 0) {
    passes = isNonEmpty(targetVal, opts.minLength);
  }

  if (passes) return [];
  const basePath = Array.isArray(context.path) ? context.path : [];
  const path = selectedField ? [...basePath, selectedField] : [...basePath];
  return [{ message: makeMessage(context, 'Field is missing or empty'), path }];
};
