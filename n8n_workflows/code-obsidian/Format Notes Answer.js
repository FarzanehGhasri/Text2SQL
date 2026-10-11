// ===== Format Notes Answer: جواب Qwen + فهرست یادداشت‌هایی که از آن‌ها استفاده شد، برای Open WebUI =====
// ورودی:  پاسخ «request to LLM» + sources (Build Notes Prompt)
// خروجی:  { answer } - همان شکلی که Open WebUI از Text2SQL می‌گیرد
// متن «فکر کردن» مدل (<think>...</think> در Qwen3) به کاربر نشان داده نمی‌شود.

const RESPONSE_KEYS = ['result', 'response', 'answer', 'text', 'output', 'message', 'content'];   // همان Security

// ---------- ۱. آداپتر n8n: تنها جایی که $input و $('...') خوانده می‌شود ----------
function readN8nInputs() {
  return {
    res: $input.first().json,
    sources: $('Build Notes Prompt').first().json.sources || [],
  };
}

// ---------- ۲. منطق ----------
function responseText(res) {
  if (typeof res === 'string') return res;
  for (const k of RESPONSE_KEYS) if (typeof res[k] === 'string' && res[k].trim()) return res[k];
  const s = Object.values(res || {}).find(v => typeof v === 'string' && v.trim().length > 5);
  if (!s) throw new Error('⛔ ساختار پاسخ API شناخته نشد: ' + JSON.stringify(res).slice(0, 300));
  return s;
}

const withoutThinking = text => text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*<\/think>/i, '').trim();

// فقط یادداشت‌هایی که در جواب به شماره‌شان ارجاع شده؛ اگر مدل ارجاع نداده، همه یادداشت‌هایی که به او داده شد
function citedSources(answer, sources) {
  const cited = sources.filter(s => answer.includes(`[${s.n}]`));
  return cited.length ? cited : sources;
}

function formatAnswer({ res, sources }) {
  const answer = withoutThinking(responseText(res));
  if (!answer) throw new Error('⛔ مدل جوابی نداد. لطفاً دوباره بپرسید.');
  const list = citedSources(answer, sources)
    .map(s => `- [${s.n}] ${s.note}${s.heading ? ` › ${s.heading}` : ''} — \`${s.path}\``);
  return { answer: `${answer}\n\n---\n**یادداشت‌های Obsidian:**\n${list.join('\n')}` };
}

// ---------- ۳. اجرا ----------
return [{ json: formatAnswer(readN8nInputs()) }];
