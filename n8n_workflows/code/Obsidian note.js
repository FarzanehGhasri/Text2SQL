// ===== Obsidian note: یک یادداشت در obsidian/Inbox/n8n برای بازبینی =====
// دو حالت (بعد از هر کدام اجرا می‌شود؛ شاخه کناری است و پاسخ کاربر را تغییر نمی‌دهد):
//   ۱. سوالی که جواب نگرفت (بعد از ErrorFormat)   ← برای همه کاربران؛ با فهرست کارهای لازم
//   ۲. سوالی که جواب گرفت (بعد از Format Answer)   ← فقط برای اعضای REVIEW_GROUPS؛ با دو گزینه ✅ / ❌
//      بازبین فقط تیک می‌زند و scripts/learn-from-inbox.js جواب‌های ✅ را به مثال تأییدشده و سوال
//      بنچمارک تبدیل می‌کند؛ لازم نیست کسی SQL بنویسد.
// نود «Write note» فایل را در پوشه mount‌شده می‌نویسد (docker-compose.yml). نام و ایمیل کاربر نوشته نمی‌شود.
// اجراهای بنچمارک (حالت ارزیابی) یادداشت نمی‌سازند.
const REVIEW_GROUPS = ['IT - Data', 'IT - Security'];

const out = $input.first().json;
if (out.error !== undefined || out.rows !== undefined) return [];   // حالت ارزیابی (بنچمارک)

const ran = name => { try { $(name).first(); return true; } catch (e) { return false; } };
const json = name => { try { return $(name).first().json || {}; } catch (e) { return {}; } };
const answered = ran('Format Answer');
const groups = json('AuthCheck').groups || [];
if (answered && !groups.some(g => REVIEW_GROUPS.includes(g))) return [];

const bp = json('BuildPrompt');
const sec = json('Security');
const question = String((json('Webhook').body || {}).question || '');
const r = bp.retrieval || {};
const why = r.why || {};
const now = new Date();
const stamp = now.toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '');   // 2026-10-10 142233
const title = question.replace(/\s+/g, ' ').slice(0, 120) || '(no question)';
const tables = (bp.selectedEntities || []).map(n => `- [[${n}]] - ${(why[n] || []).join('، ')}`).join('\n') || '- (none)';
const answerText = String(out.answer || '').replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();

let md;
if (answered) {
  // داده لازم برای learn-from-inbox.js، در یک کامنت Obsidian (در حالت خواندن دیده نمی‌شود)؛ base64 تا % یا
  // نویسه‌های دیگر SQL کامنت را نشکنند
  const data = {
    question,
    model_sql: sec.modelSql || '',
    sql: sec.sql || '',
    entities: bp.selectedEntities || [],
    used: sec.entities || [],
    domains: r.activeDomains || []
  };
  md = `---
type: answered-question
status: to-review
date: ${now.toISOString().slice(0, 10)}
domains: [${(r.activeDomains || []).join(', ')}]
---
# ${title}

Is this answer right? Tick ONE box. Then run \`node scripts/learn-from-inbox.js\` (How-to → Review answers).
- [ ] ✅ correct
- [ ] ❌ wrong

**Understood as:** ${sec.understood || '-'}

## Answer
${answerText.split('\n').slice(0, 25).join('\n')}

## Tables the model was given
${tables}

## If it is wrong
- A needed table is missing above? Add the user's word to \`synonyms_fa\` of that table.
- Wrong number (sum, filter, status)? Add or fix a metric in the catalog.

%% text2sql ${Buffer.from(JSON.stringify(data), 'utf8').toString('base64')} %%
`;
} else {
  md = `---
type: failed-question
status: open
date: ${now.toISOString().slice(0, 10)}
domains: [${(r.activeDomains || []).join(', ')}]
low_confidence: ${Boolean(r.lowConfidence)}
---
# ${title}

**Answer sent:** ${answerText.split('\n')[0]}

## Tables the model was given
${tables}

## What to do
- [ ] Wrong or missing table? Add the user's word to \`synonyms_fa\` of the right table
- [ ] Right table, wrong SQL? Add a metric, a hint or a query-bank example
- [ ] Really not answerable? Nothing to fix
- [ ] Then delete this note
`;
}

const name = `${stamp} ${answered ? 'answered' : 'failed'} question.md`;
return [{
  json: { path: `/home/node/.n8n-files/obsidian-inbox/${name}` },
  binary: {
    data: {
      data: Buffer.from(md, 'utf8').toString('base64'),
      mimeType: 'text/markdown',
      fileName: name
    }
  }
}];
