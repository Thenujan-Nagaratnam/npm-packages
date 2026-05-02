#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { resolveBundledRuleset } = require('../src/constants/bundled-rulesets');

function ensureSupportedNodeVersion() {
  const major = Number((process.versions.node || '0.0.0').split('.')[0]);
  if (!Number.isFinite(major) || major < 18) {
    throw new Error(`Node.js >=18 is required. Detected: ${process.versions.node}`);
  }
}

function printHelp() {
  console.log(`
Usage:
  api-governance lint <document> [options]

Required:
  <document>                    OpenAPI document path (YAML/JSON).
  --ruleset <value>             Bundled id or Spectral ruleset path/URL.

Options:
  --summary                     Return processed governance summary.
  --report [json|html]          Return generated report JSON or render HTML.
  --report-file <path>          Write report output to a file.
  --open                        Open generated HTML report in browser.
  --ruleset-content-path <path> Ruleset content key. Example: rulesetContent
  --functions <path>            Path to custom function map module.
  --git-root <path>             Root path for resolving relative ruleset paths.
  --auth-token <token>          Token for private remote ruleset fetch.
  --output <path>               Write JSON result to file (instead of stdout).
  --pretty                      Pretty-print output JSON.
  --help                        Show this help message.
`);
}

function parseArgs(argv) {
  const args = {
    outputFormat: 'spectral',
    pretty: false,
  };

  if (argv[0] === 'lint') {
    args.command = 'lint';
    if (argv[1] && !argv[1].startsWith('-')) {
      args.specPath = argv[1];
      argv = argv.slice(2);
    } else {
      argv = argv.slice(1);
    }
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--ruleset':
        args.ruleset = next;
        i += 1;
        break;
      case '--ruleset-content-path':
        args.rulesetContentPath = next;
        i += 1;
        break;
      case '--functions':
        args.customFunctionsPath = next;
        i += 1;
        break;
      case '--git-root':
        args.gitRootPath = next;
        i += 1;
        break;
      case '--auth-token':
        args.authToken = next;
        i += 1;
        break;
      case '--summary':
        args.outputFormat = 'summary';
        break;
      case '--report':
        if (next && !next.startsWith('-')) {
          args.reportFormat = next;
          i += 1;
        } else {
          args.reportFormat = 'json';
        }
        break;
      case '--report-file':
        args.reportFilePath = next;
        i += 1;
        break;
      case '--open':
        args.openReport = true;
        break;
      case '--output':
        args.outputPath = next;
        i += 1;
        break;
      case '--pretty':
        args.pretty = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        if (!arg.startsWith('-') && !args.specPath) {
          args.specPath = arg;
          break;
        }
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  return args;
}

async function openInBrowser(filePath) {
  const platform = process.platform;
  let command;
  let args;

  if (platform === 'darwin') {
    command = 'open';
    args = [filePath];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '""', filePath];
  } else {
    command = 'xdg-open';
    args = [filePath];
  }

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', reject);
    child.unref();
    resolve();
  });
}

async function run() {
  ensureSupportedNodeVersion();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const { runSpectralValidation, generateReport, buildHtmlReport } = require('../src');

  if (args.command && args.command !== 'lint') {
    throw new Error(`Unsupported command: ${args.command}`);
  }
  if (!args.ruleset) {
    throw new Error('Missing required argument: --ruleset');
  }
  if (!args.specPath) {
    throw new Error('Missing required argument: <document>');
  }

  const absoluteSpecPath = path.resolve(process.cwd(), args.specPath);
  const specContent = await fs.promises.readFile(absoluteSpecPath, 'utf8');

  if (args.reportFormat && !['html', 'json'].includes(args.reportFormat)) {
    throw new Error(`Unsupported report format: ${args.reportFormat}`);
  }
  if (args.openReport && args.reportFormat !== 'html') {
    throw new Error('--open can only be used with --report html');
  }

  // Determine ruleset arg: ID string for built-ins, options object for custom
  const bundled = resolveBundledRuleset(args.ruleset);
  const rulesetArg = bundled
    ? args.ruleset
    : {
        rulesetFileUrl:      args.ruleset,
        rulesetContentPath:  args.rulesetContentPath,
        customFunctionsPath: args.customFunctionsPath,
        gitRootPath:         args.gitRootPath,
        authToken:           args.authToken,
      };

  const result = await runSpectralValidation(absoluteSpecPath, rulesetArg);
  const report  = generateReport(args.ruleset, result);

  if (args.reportFormat === 'html') {
    const html = buildHtmlReport({ report }, { specContent });
    const requestedPath = args.reportFilePath || args.outputPath;
    const shouldWriteFile = Boolean(requestedPath || args.openReport);
    const outputPath = requestedPath || 'api-governance-report.html';

    if (shouldWriteFile) {
      const absoluteReportPath = path.resolve(process.cwd(), outputPath);
      await fs.promises.writeFile(absoluteReportPath, html, 'utf8');
      if (args.openReport) {
        await openInBrowser(absoluteReportPath);
      }
      return;
    }
    process.stdout.write(html);
    return;
  }

  // JSON report or raw spectral output.
  // --report json  → GovernanceSummary (has violations, passedRules, embedded report)
  // default        → GovernanceSummary as well (richest output)
  const output = JSON.stringify(
    args.reportFormat === 'json' ? result : result,
    null,
    args.pretty ? 2 : 0
  );
  const requestedPath = args.reportFilePath || args.outputPath;
  if (requestedPath) {
    const absoluteOutputPath = path.resolve(process.cwd(), requestedPath);
    await fs.promises.writeFile(absoluteOutputPath, `${output}\n`, 'utf8');
    return;
  }

  process.stdout.write(`${output}\n`);
}

run().catch((error) => {
  const details = [];
  if (error && error.message) {
    details.push(error.message);
  } else if (error) {
    details.push(String(error));
  }
  if (error && Array.isArray(error.errors) && error.errors.length > 0) {
    const formatted = error.errors.slice(0, 5).map((item) => {
      const code = item && item.code ? ` [${item.code}]` : '';
      const pathValue = item && Array.isArray(item.path) ? item.path.join('.') : '';
      const pathText = pathValue ? ` at ${pathValue}` : '';
      const message = item && item.message ? item.message : 'Unknown ruleset error';
      return `- ${message}${code}${pathText}`;
    });
    details.push(`Validation errors:\n${formatted.join('\n')}`);
    if (error.errors.length > 5) {
      details.push(`...and ${error.errors.length - 5} more errors.`);
    }
  }
  const message = details.length > 0 ? `\n${details.join('\n')}` : 'Unknown error';
  console.error(`api-governance: ${message}`);
  process.exit(1);
});
