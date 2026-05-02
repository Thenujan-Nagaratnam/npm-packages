const { isObject, makeMessage } = require('./_utils');

exports.aiReadinessSchemaTyping = (targetVal, _opts = {}, context = {}) => {
  const schema = isObject(targetVal) ? targetVal : {};
  const hasType = typeof schema.type === 'string' && schema.type.trim().length > 0;
  const hasRef = typeof schema.$ref === 'string';
  if (hasType || hasRef) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'Schema must have an explicit type defined'), path: [...path] }];
};

exports.aiReadinessSchemaNoEmptyObject = (targetVal, _rawOpts = {}, context = {}) => {
  const schema = isObject(targetVal) ? targetVal : {};
  if (schema.type !== 'object') return [];
  const hasRef = typeof schema.$ref === 'string';
  const hasComposition = Array.isArray(schema.allOf) || Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf);
  const hasProperties = isObject(schema.properties) && Object.keys(schema.properties).length > 0;
  const hasAdditional = schema.additionalProperties !== undefined;
  if (hasRef || hasComposition || hasProperties || hasAdditional) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'Object schema must define properties or additionalProperties - empty object types are ambiguous for AI'), path: [...path] }];
};

exports.aiReadinessArrayItemsDefined = (targetVal, _rawOpts = {}, context = {}) => {
  const schema = isObject(targetVal) ? targetVal : {};
  if (schema.type !== 'array') return [];
  if (schema.items !== undefined && schema.items !== null) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{ message: makeMessage(context, 'Array schema must define an items schema - untyped arrays are ambiguous for AI'), path: [...path] }];
};

exports.aiReadinessSchemaHasConstraints = (targetVal, _rawOpts = {}, context = {}) => {
  const schema = isObject(targetVal) ? targetVal : {};
  const schemaType = typeof schema.type === 'string' ? schema.type : undefined;

  let passed = true;
  if (schemaType === 'string') {
    passed = schema.pattern !== undefined || schema.minLength !== undefined || schema.maxLength !== undefined;
  } else if (schemaType === 'number' || schemaType === 'integer') {
    passed = schema.minimum !== undefined || schema.maximum !== undefined;
  }

  if (passed) return [];
  const path = Array.isArray(context.path) ? context.path : [];
  return [{
    message: makeMessage(context, 'Scalar schema should define validation constraints for deterministic AI generation'),
    path: [...path],
  }];
};
