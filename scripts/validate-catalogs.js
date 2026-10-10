#!/usr/bin/env node
// Checks catalog/*.json before they are indexed or used by the n8n workflow.
//
// Usage (from the repo root):
//   node scripts/validate-catalogs.js
//   node scripts/validate-catalogs.js --schema path/to/script.sql   # also check against the real DB
//   node scripts/validate-catalogs.js --quiet                       # errors only, no warnings
//   node scripts/validate-catalogs.js --strict                      # warnings also fail
//
// catalog/query_bank.json (the verified-query bank) is checked too when present.
//
// --schema takes a SQL Server "Generate Scripts" file (UTF-16 or UTF-8) and
// verifies that every entity's source table and every catalog column exists.
//
// Exit code: 0 = no errors, 1 = errors (or warnings with --strict), 2 = bad usage.

const path = require('path');
const { loadCatalogs } = require('./lib/catalog-loader');
const { loadSchemaFile } = require('./lib/sql-schema-parser');
const { validateCatalogs } = require('./lib/catalog-validator');
const { loadQueryBank } = require('./lib/query-bank');

function parseArgs(argv) {
  const args = { catalogDir: path.join(__dirname, '..', 'catalog'), schema: null, strict: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--catalog-dir') args.catalogDir = argv[++i];
    else if (a === '--schema') args.schema = argv[++i];
    else if (a === '--strict') args.strict = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/validate-catalogs.js [--catalog-dir <dir>] [--schema <script.sql>] [--strict] [--quiet]');
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const catalogs = loadCatalogs(args.catalogDir);
  if (catalogs.length === 0) {
    console.error(`No catalog files found in ${args.catalogDir}`);
    process.exit(1);
  }
  const schema = args.schema ? loadSchemaFile(args.schema) : null;
  if (schema) console.log(`Database schema: ${Object.keys(schema).length} tables from ${args.schema}`);

  const queryBank = loadQueryBank(args.catalogDir);
  const { errors, warnings } = validateCatalogs(catalogs, { schema, queryBank });
  const print = (f) => console.log(`  ${f.severity.toUpperCase()} [${f.rule}] ${f.file}: ${f.message}`);
  errors.forEach(print);
  if (!args.quiet) warnings.forEach(print);

  const entityCount = catalogs.reduce((n, c) => n + ((c.data && c.data.entities) || []).length, 0);
  const bankSize = queryBank && queryBank.data && Array.isArray(queryBank.data.examples) ? queryBank.data.examples.length : 0;
  console.log(`Checked ${catalogs.length} catalogs, ${entityCount} entities, ${bankSize} query-bank examples: `
    + `${errors.length} errors, ${warnings.length} warnings`);
  if (errors.length || (args.strict && warnings.length)) process.exit(1);
}

main();
