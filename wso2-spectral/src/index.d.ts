/**
 * Public API surface (see `index.js`). Where full typings are not yet declared, `any` is used.
 */
export * from './reports/generate-report';

export const BUNDLED_RULESETS: any;
export const resolveBundledRuleset: (...args: any[]) => any;
export const constructRulesetPath: (...args: any[]) => any;
export const runSpectralValidation: (...args: any[]) => any;
export const buildHtmlReport: (...args: any[]) => any;
