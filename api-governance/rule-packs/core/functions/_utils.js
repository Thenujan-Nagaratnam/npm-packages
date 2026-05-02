const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

const isObject = (value) => typeof value === 'object' && value !== null;

const isNonEmpty = (value, minLength) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return minLength ? trimmed.length >= minLength : trimmed.length > 0;
  }
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
};

const makeMessage = (context, fallback) =>
  (context && context.rule && context.rule.message) || fallback;

module.exports = { HTTP_METHODS, isObject, isNonEmpty, makeMessage };
