// ===== یادداشت Obsidian برای هر سوالی که جواب نگرفت =====
// بعد از ErrorFormat اجرا می‌شود (شاخه کناری؛ پاسخ کاربر را تغییر نمی‌دهد). یک فایل Markdown می‌سازد که
// نود «Write note» در پوشه obsidian/Inbox/n8n می‌نویسد (volume در docker-compose.yml).
// هویت کاربر (نام، ایمیل) نوشته نمی‌شود. اجراهای بنچمارک (حالت ارزیابی: فیلد error) یادداشت نمی‌سازند.
const out = $input.first().json;
if (out.error !== undefined) return [];

let bp = {};
try { bp = $('BuildPrompt').first().json; } catch (e) { /* خطا پیش از BuildPrompt رخ داده */ }
let question = '';
try { question = String($('Webhook').first().json.body.question || ''); } catch (e) {}

const r = bp.retrieval || {};
const now = new Date();
const stamp = now.toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '');   // 2026-10-10 142233
const list = (items, fmt) => (items && items.length ? items.map(fmt).join('\n') : '- (none)');

const md = `---
type: failed-question
status: open
date: ${now.toISOString().slice(0, 10)}
domains: [${(r.activeDomains || []).join(', ')}]
low_confidence: ${Boolean(r.lowConfidence)}
---
# ${question.replace(/\s+/g, ' ').slice(0, 120) || '(no question)'}

**Answer sent:** ${String(out.answer || '').split('\n')[0]}

## Tables in the prompt
${list(bp.selectedEntities, n => `- [[${n}]]`)}

## Top scores
${list(r.scores, s => `- [[${s.entity}]] ${Number(s.score).toFixed(2)}`)}

## What to do
- [ ] Wrong or missing table? Add the user's word to \`synonyms_fa\` of the right table
- [ ] Right table, wrong SQL? Add a metric, a hint or a query-bank example
- [ ] Really not answerable? Nothing to fix
- [ ] Then delete this note
`;

return [{
  json: { path: `/home/node/.n8n-files/obsidian-inbox/${stamp} failed question.md` },
  binary: {
    data: {
      data: Buffer.from(md, 'utf8').toString('base64'),
      mimeType: 'text/markdown',
      fileName: `${stamp} failed question.md`
    }
  }
}];
