// Parses a SQL Server "Generate Scripts" output (CREATE TABLE statements) into
// { "[schema].[table]" (lower-cased): { name, columns: { lowerName: { name, type } } } }.
//
// Used only to check catalog sources against the real database. It is not a
// general T-SQL parser: it relies on the fixed layout SSMS emits (one column
// per line, "[name] [type]" or "[name] [schema].[type]").

const fs = require('fs');

// SSMS saves scripts as UTF-16 LE with a BOM by default; accept that or UTF-8.
function readSqlFile(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString('utf16le');
  const text = buf.toString('utf8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCreateTables(sqlText) {
  const text = sqlText.replace(/\r\n/g, '\n');
  const tables = {};
  const tableRe = /^CREATE TABLE \[([^\]]+)\]\.\[([^\]]+)\]\(\n([\s\S]*?)^\)(?: ON |\s*$)/gm;
  let m;
  while ((m = tableRe.exec(text)) !== null) {
    const [, schema, table, body] = m;
    const columns = {};
    const colRe = /^\s*\[([^\]]+)\]\s+(?:\[[^\]]+\]\.)?\[([^\]]+)\]/gm;
    let c;
    while ((c = colRe.exec(body)) !== null) {
      columns[c[1].toLowerCase()] = { name: c[1], type: c[2] };
    }
    tables[`[${schema}].[${table}]`.toLowerCase()] = { name: `[${schema}].[${table}]`, columns };
  }
  return tables;
}

function loadSchemaFile(filePath) {
  return parseCreateTables(readSqlFile(filePath));
}

module.exports = { parseCreateTables, loadSchemaFile, readSqlFile };
