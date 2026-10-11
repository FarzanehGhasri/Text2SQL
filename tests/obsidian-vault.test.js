const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VAULT = path.join(ROOT, 'obsidian');

function notes(dir, skip) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (!f.name.startsWith('.') && !skip.includes(f.name)) out.push(...notes(p, skip)); }
    else if (f.name.endsWith('.md')) out.push(p);
  }
  return out;
}

test('every note name is unique and every [[link]] resolves', () => {
  // Templates hold placeholders such as [[ ]]; n8n's Inbox notes are not in git.
  const all = notes(VAULT, ['Templates', 'n8n']);
  const byName = new Map();
  for (const p of all) {
    const name = path.basename(p, '.md');
    assert.ok(!byName.has(name), `two notes named "${name}": ${byName.get(name)} and ${p}`);
    byName.set(name, p);
  }
  for (const p of all) {
    const text = fs.readFileSync(p, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    for (const m of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) {
      assert.ok(byName.has(m[1].trim()), `${path.relative(VAULT, p)} links to missing note [[${m[1]}]]`);
    }
  }
});
