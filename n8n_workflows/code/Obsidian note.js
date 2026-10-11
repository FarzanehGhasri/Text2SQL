// ===== Obsidian note: یک یادداشت در obsidian/Inbox/n8n برای بازبینی =====
// این نود و «Save to Obsidian Inbox» تنها جای workflow هستند که با Obsidian کار دارند. n8n از Obsidian چیزی
// نمی‌خواند؛ فقط یک فایل Markdown در پوشه‌ای می‌نویسد که در docker-compose.yml به obsidian/Inbox/n8n وصل است.
// دو حالت (شاخه کناری است، بعد از جواب کاربر اجرا می‌شود و جواب را تغییر نمی‌دهد):
//   ۱. سوالی که جواب نگرفت (بعد از ErrorFormat)   ← برای همه کاربران؛ با فهرست کارهای لازم
//   ۲. سوالی که جواب گرفت (بعد از Format Answer)   ← فقط برای کسی که اجازه reviewNotes دارد (AuthCheck)؛
//      با دو گزینه ✅ / ❌. بازبین فقط تیک می‌زند و scripts/learn-from-inbox.js جواب‌های ✅ را به مثال
//      تأییدشده و سوال بنچمارک تبدیل می‌کند؛ لازم نیست کسی SQL بنویسد.
// نام و ایمیل کاربر نوشته نمی‌شود. اجراهای بنچمارک (حالت ارزیابی) یادداشت نمی‌سازند.

const INBOX = '/home/node/.n8n-files/obsidian-inbox';   // داخل کانتینر n8n = obsidian/Inbox/n8n روی سرور
const ANSWER_LINES = 25;                                 // چند خط از جواب در یادداشت بیاید

// ---------- ۱. آداپتر n8n: تنها جایی که $input و $('...') خوانده می‌شود ----------
function readN8nInputs() {
  const ran = name => { try { $(name).first(); return true; } catch (e) { return false; } };
  const json = name => { try { return $(name).first().json || {}; } catch (e) { return {}; } };
  return {
    out: $input.first().json,
    answered: ran('Format Answer'),
    can: json('AuthCheck').can || {},
    question: String((json('Webhook').body || {}).question || ''),
    bp: json('BuildPrompt'),
    sec: json('Security'),
    now: new Date(),
  };
}

// ---------- ۲. منطق ----------
function wantsNote({ out, answered, can }) {
  if (out.error !== undefined || out.rows !== undefined) return false;   // حالت ارزیابی (بنچمارک)
  return !answered || Boolean(can.reviewNotes);
}

// بخش‌های مشترک هر دو نوع یادداشت
function noteParts({ out, question, bp }) {
  const r = bp.retrieval || {};
  const why = r.why || {};
  return {
    r,
    title: question.replace(/\s+/g, ' ').slice(0, 120) || '(no question)',
    tables: (bp.selectedEntities || []).map(n => `- [[${n}]] - ${(why[n] || []).join('، ')}`).join('\n') || '- (none)',
    answerText: String(out.answer || '').replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim(),
  };
}

function answeredNote(input) {
  const { question, bp, sec, now } = input;
  const { r, title, tables, answerText } = noteParts(input);
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
  return `---
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
${answerText.split('\n').slice(0, ANSWER_LINES).join('\n')}

## Tables the model was given
${tables}

## If it is wrong
- A needed table is missing above? Add the user's word to \`synonyms_fa\` of that table.
- Wrong number (sum, filter, status)? Add or fix a metric in the catalog.

%% text2sql ${Buffer.from(JSON.stringify(data), 'utf8').toString('base64')} %%
`;
}

function failedNote(input) {
  const { now } = input;
  const { r, title, tables, answerText } = noteParts(input);
  return `---
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

// آیتم n8n برای نود «Save to Obsidian Inbox»: مسیر فایل + محتوای آن به شکل binary
function noteFile(input) {
  const stamp = input.now.toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '');   // 2026-10-10 142233
  const name = `${stamp} ${input.answered ? 'answered' : 'failed'} question.md`;
  const md = input.answered ? answeredNote(input) : failedNote(input);
  return {
    json: { path: `${INBOX}/${name}` },
    binary: { data: { data: Buffer.from(md, 'utf8').toString('base64'), mimeType: 'text/markdown', fileName: name } }
  };
}

// ---------- ۳. اجرا ----------
const input = readN8nInputs();
return wantsNote(input) ? [noteFile(input)] : [];
