// The Obsidian vault as searchable pieces ("chunks") for the Obsidian assistant (n8n workflow
// "Obsidian assistant"): which notes are read, who may see each one, and how a note is cut into
// pieces small enough to send to Qwen. Pure functions apart from readVault().
//
//   readVault(dir)          -> [{ path: 'Catalog/sales/Fact_Sales.md', text }]   (Inbox/ and CLAUDE.md skipped)
//   noteAccess(path, props) -> who may see the note (see ACCESS below)
//   chunkNote(note)         -> [{ id, note, path, heading, text, access }]
//
// ACCESS - decided here, checked in the n8n node "Find Notes" against the user's AD groups:
//   { scope: 'table',  domain, entity }  a table note    -> users whose catalog permissions include that table
//   { scope: 'domain', domain }          a domain note   -> users with `*` on that domain
//   { scope: 'rules' }                   Rules for every question -> any user with access to any domain
//   { scope: 'project' }                 every other note (Home, How-to, Schema, ...) -> AuthCheck's can.projectNotes
// The same catalog permissions decide what Text2SQL shows, so the assistant never tells a user about a table
// they could not query. Columns marked `hidden` are removed before anything is embedded or sent.

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./catalog-notes');

const VAULT_DIR = path.join(__dirname, '..', '..', 'obsidian');
// Inbox/ holds real users' questions (n8n notes) and the system check; CLAUDE.md is instructions for an
// assistant, not knowledge - neither is ever sent to the model.
const SKIP_DIRS = new Set(['Inbox', 'Templates']);
const SKIP_FILES = new Set(['CLAUDE.md']);
const MAX_CHUNK_CHARS = 1800;

// [{ path, text }] sorted by path; paths use '/' on every OS
function readVault(dir = VAULT_DIR) {
  const out = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      if (f.name.startsWith('.')) continue;
      const p = path.join(d, f.name);
      const rel = path.relative(dir, p).split(path.sep).join('/');
      if (f.isDirectory()) { if (!SKIP_DIRS.has(f.name)) walk(p); }
      else if (f.name.endsWith('.md') && !SKIP_FILES.has(rel)) out.push({ path: rel, text: fs.readFileSync(p, 'utf8') });
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function noteAccess(relPath, props = {}) {
  if (!relPath.startsWith('Catalog/')) return { scope: 'project' };
  if (props.type === 'table' && props.domain) return { scope: 'table', domain: props.domain, entity: path.basename(relPath, '.md') };
  if (props.type === 'domain' && props.domain) return { scope: 'domain', domain: props.domain };
  if (props.type === 'rules') return { scope: 'rules' };
  return { scope: 'project' };   // an unknown note in Catalog/: only those who see the project notes
}

// A table note's column row whose Show cell is `hidden`: never sent to the model in Text2SQL, so not here either.
const isHiddenColumnRow = (line) => /^\|.*\|\s*hidden\s*\|\s*$/.test(line);

// '## Heading' sections outside ``` fences: [{ heading, lines }]; text before the first ## has heading ''
function sections(body) {
  const out = [{ heading: '', lines: [] }];
  let fenced = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const h = !fenced && line.match(/^##\s+(.+?)\s*$/);
    if (h) out.push({ heading: h[1], lines: [] });
    else out[out.length - 1].lines.push(line);
  }
  return out;
}

// Blocks that must stay whole when a long section is split: a ### sub-section, a ``` fence, a paragraph.
function blocks(lines) {
  const out = [];
  let cur = [];
  let fenced = false;
  const flush = () => { if (cur.some((l) => l.trim())) out.push(cur.join('\n').trim()); cur = []; };
  for (const line of lines) {
    if (!fenced && /^###\s/.test(line)) flush();
    cur.push(line);
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (!fenced && !line.trim()) flush();
  }
  flush();
  return out;
}

// Packs blocks into pieces of at most maxChars; a single longer block is cut at line ends.
function pack(parts, maxChars) {
  const out = [];
  let cur = '';
  const push = (s) => {
    if (cur && cur.length + 2 + s.length > maxChars) { out.push(cur); cur = ''; }
    cur = cur ? `${cur}\n\n${s}` : s;
  };
  for (const b of parts) {
    if (b.length <= maxChars) { push(b); continue; }
    let piece = '';
    for (const line of b.split('\n')) {
      if (piece && piece.length + 1 + line.length > maxChars) { push(piece); piece = ''; }
      piece = piece ? `${piece}\n${line}` : line.slice(0, maxChars);
    }
    if (piece) push(piece);
  }
  if (cur) out.push(cur);
  return out;
}

// One line that says which note a piece comes from; repeated in every piece of the note so a
// "Columns" piece still carries the table's description and synonyms.
function contextLine(title, props, lead) {
  const bits = [title];
  if (props.domain) bits.push(`domain: ${props.domain}`);
  if (lead) bits.push(lead);
  if (Array.isArray(props.synonyms) && props.synonyms.length) bits.push(`synonyms: ${props.synonyms.join('، ')}`);
  return bits.join(' | ');
}

// The note's first quote line ("> فروش") - its one-line description.
const leadOf = (lines) => ((lines.find((l) => /^>\s*\S/.test(l)) || '').replace(/^>\s*/, '').trim());

function chunkNote({ path: relPath, text }, { maxChars = MAX_CHUNK_CHARS } = {}) {
  const { props, body } = parseFrontmatter(text);
  const title = path.basename(relPath, '.md');
  const access = noteAccess(relPath, props);
  const parts = sections(body);
  const context = contextLine(title, props, leadOf(parts[0].lines));
  const chunks = [];
  for (const { heading, lines } of parts) {
    // the text before the first ## that is only the description quote is already in every piece's context line
    if (!heading && !lines.some((l) => l.trim() && !/^>\s*/.test(l)) && parts.length > 1) continue;
    const kept = access.scope === 'table' ? lines.filter((l) => !isHiddenColumnRow(l)) : lines;
    const pieces = pack(blocks(kept), maxChars);
    pieces.forEach((piece, i) => {
      chunks.push({
        id: `${relPath}#${heading}${pieces.length > 1 ? `#${i + 1}` : ''}`,
        note: title,
        path: relPath,
        heading,
        text: `${context}\n${heading ? `## ${heading}\n` : ''}${piece}`,
        access,
      });
    });
  }
  return chunks;
}

const chunkVault = (notes, options) => notes.flatMap((n) => chunkNote(n, options));

module.exports = { VAULT_DIR, MAX_CHUNK_CHARS, readVault, noteAccess, chunkNote, chunkVault, isHiddenColumnRow };
