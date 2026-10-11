// ===== Build Notes Prompt: نوشتن prompt برای Qwen از روی تکه‌هایی که Find Notes انتخاب کرده =====
// ورودی:  خروجی Find Notes ({ question, notes })
// خروجی:  { body: { string1, string2 } } برای «request to LLM» (همان شکل BuildPrompt در Text2SQL، همان /combine)
//         + sources (شماره، نام یادداشت، بخش، مسیر) برای Format Notes Answer
// برای تغییر متن prompt فقط renderPrompt را عوض کنید.

// ---------- ۱. آداپتر n8n: تنها جایی که $input و $('...') خوانده می‌شود ----------
function readN8nInputs() {
  return { plan: $input.first().json };
}

// ---------- ۲. منطق ----------
const NOT_FOUND = 'در یادداشت‌های Obsidian جوابی برای این سوال پیدا نکردم.';

function renderNote(n) {
  return `[${n.n}] ${n.note}${n.heading ? ` › ${n.heading}` : ''}  (${n.path})\n${n.text}`;
}

function renderPrompt({ question, notes }) {
  return `You are the assistant of the Text2SQL project. Answer the QUESTION using ONLY the NOTES below.
The notes come from the team's Obsidian vault: project notes (how-to, architecture, status) and the data catalog
(domains, tables, columns, metrics, example SQL of the SA_DataWarehouse).

RULES
- Answer in Persian (فارسی). Keep table, column, file, command and note names exactly as written in the notes.
- Use only facts that are in the notes. If the notes do not answer the question, reply exactly: ${NOT_FOUND}
- After each fact, cite the note it comes from by its number, like [1] or [2][3].
- You do not run queries and do not know any numbers from the database. For a question about data values
  (e.g. «فروش ماه گذشته چقدر بود»), say that the Text2SQL assistant answers it, and name the tables or metric
  from the notes that it would use.
- Be short and clear: a few sentences or a short list. Copy SQL or commands from the notes only when asked.

NOTES
${notes.map(renderNote).join('\n\n')}

QUESTION
${question}`;
}

const sourcesOf = notes => notes.map(({ n, note, heading, path }) => ({ n, note, heading, path }));

// ---------- ۳. اجرا ----------
const { plan } = readN8nInputs();
return [{ json: { body: { string1: '-', string2: renderPrompt(plan) }, sources: sourcesOf(plan.notes) } }];
