// ===== BuildPrompt: نوشتن متن prompt برای Qwen از روی طرحی که Find Tables ساخته =====
//
// ورودی:  خروجی نود Find Tables (جدول‌ها به ترتیب اهمیت، روابط، راهنماها، مثال‌ها، مقدارها، معیارها)
// خروجی:  body.string2 = متن prompt برای «request to LLM»؛ entityDefs برای Security؛
//         selectedEntities و retrieval برای Format Answer، ErrorFormat و یادداشت Obsidian
//
// مراحل (تابع buildPrompt در انتهای فایل):
//   ۱. جا دادن جدول‌ها   packPrompt     از بالای فهرست تا سقف MAX_PROMPT_CHARS؛ جدول اول همیشه
//   ۲. پاک‌سازی           packPrompt     مثال/مقدار/معیاری که جدولش جا نماند حذف می‌شود
//   ۳. متن نهایی          renderPrompt   قوانین + امروز + راهنماها + معیارها + مقدارها + مثال‌ها + جدول‌ها + سوال
//
// برای تغییر متن یا قوانین prompt فقط renderPrompt را عوض کنید؛ این نود به کاتالوگ دسترسی ندارد.

// ==================== تنظیمات ====================
const CFG = {
  MAX_PROMPT_CHARS:     24000   // بودجه اندازه کل prompt (قوانین + راهنماها + مثال‌ها + مقدارها + معیارها + DDL + روابط + سوال).
                                // برای Qwen 32B (پنجره ۳۲ هزار توکنی): DDL انگلیسی با توضیح فارسی حدود ۳ کاراکتر در هر
                                // توکن است، پس ۲۴۰۰۰ کاراکتر ≈ ۸ هزار توکن و جای کافی برای PLAN و SQL می‌ماند.
                                // جدولی که به prompt نرسد با هیچ مدلی جبران نمی‌شود. obsidian/How-to.md (LLM settings)
};

// ==================== ورودی n8n ====================
function readN8nInputs() {
  return { plan: $input.first().json, now: new Date() };
}

// ==================== تکه‌های متن prompt ====================
// ---------- تاریخ امروز (برای «امسال»، «ماه گذشته»، «سال ۱۴۰۳») ----------
// مدل تاریخ امروز را نمی‌داند و سال شمسی را با میلادی قاطی می‌کند. تاریخ به وقت تهران.
function todayLine(now) {
  let greg = now.toISOString().slice(0, 10);
  let persian = '';
  try {
    greg = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now).reduce((acc, x) => Object.assign(acc, { [x.type]: x.value }), {});
    if (/^\d{4}$/.test(parts.year)) persian = `${parts.year}/${parts.month}/${parts.day}`;
  } catch (e) { /* Intl بدون تقویم فارسی: فقط تاریخ میلادی */ }
  return `- TODAY is ${greg}${persian ? ` (Persian date ${persian})` : ''}. Resolve relative periods (امسال، ماه گذشته، this year, last month) from it.\n`
    + '- A year like 1403 / ۱۴۰۳ is a Persian (شمسی) year, 2024 is Gregorian (میلادی). Filter Persian years and months with the Persian columns of [Dim_Date] (or a Persian date column of the table itself); use YEAR()/MONTH() only for Gregorian periods.\n';
}

const sqlLit = v => "N'" + String(v).replace(/'/g, "''") + "'";
function valueLine(l) {
  const ref = `[${l.entity}].[${l.column}]`;
  const key = l.key && l.keyValue != null ? `  (key: [${l.entity}].[${l.key}] = ${l.keyValue})` : '';
  if (l.exact) return `- ${ref} = ${sqlLit(l.value)}${key}\n`;
  if (l.count === 1) return `- ${ref}: the only stored value containing ${sqlLit(l.phrase)} is ${sqlLit(l.samples[0])}${key}\n`;
  return `- ${ref}: ${l.count} stored values contain ${sqlLit(l.phrase)}, e.g. ${l.samples.map(sqlLit).join(', ')}`
    + ` -> LIKE ${sqlLit('%' + l.phrase + '%')} if the question means all of them\n`;
}
const VALUES_HEADER = '\nVALUES FROM THE QUESTION (spelled exactly as stored in the database; filter with these, not with your own spelling):\n';

const metricLine = m => `- ${m.name_fa} = ${m.sql}`
  + (m.filter ? `   (always filter: ${m.filter})` : '')
  + (m.note_fa ? `   -- ${m.note_fa}` : '') + '\n';
const METRICS_HEADER = '\nMETRICS (when the question asks for one of these, use exactly this definition):\n';

// ---------- تعریف یک جدول (CREATE TABLE) با توضیح فارسی و نمونه مقدار ستون‌ها ----------
function ddlOf(ent) {
  const cols = ent.columns;
  const lines = cols.map((c, idx) => {
    const nm   = c.alias || c.name;
    const last = idx === cols.length - 1;
    const ex   = c.samples;
    const vals = ex ? `${c.description_fa ? '; ' : ''}values: ${ex.map(v => sqlLit(String(v).slice(0, 30))).join(', ')}` : '';
    const d    = c.description_fa || vals ? `   -- ${c.description_fa || ''}${vals}` : '';
    return `  [${nm}] ${c.type || 'nvarchar'}${last ? '' : ','}${d}`;
  });
  const head = ent.description_fa
    ? `CREATE TABLE [${ent.name}] (   -- ${ent.description_fa}`
    : `CREATE TABLE [${ent.name}] (`;
  return `${head}\n${lines.join('\n')}\n);\n`;
}

const relLine      = j => `-- [${j.from}].[${j.from_column}] = [${j.to}].[${j.to_column}]\n`;
const hintLine     = h => '- ' + h + '\n';
const HINTS_HEADER = '\nDOMAIN NOTES:\n';

// ---------- متن کامل prompt ----------
// برای تغییر قوانین یا متن prompt فقط همین تابع را عوض کنید. متن فقط اینجا ساخته می‌شود؛ هم برای
// اندازه‌گیری بخش ثابت و هم برای خروجی نهایی، پس بودجه دقیقاً همان چیزی را می‌شمارد که به مدل می‌رسد.
function renderPrompt({ question, lowConfidence, hints, examples, schema, rels, values = [], metrics = [], today = '' }) {
  return `You are a Microsoft SQL Server (T-SQL) expert.

Your response must have EXACTLY this shape and nothing else:
UNDERSTOOD: <one concise English sentence restating what the question is asking for - always in English, even though the question may be in Persian>
PLAN:
- tables: <the entities needed and the relationship used to join each one>
- filters: <the WHERE conditions, using the exact values/keys from VALUES and the filters from METRICS>
- result: <what is selected and aggregated, GROUP BY, ORDER BY, TOP N>
SQL:
<a single T-SQL SELECT query that follows the PLAN - no markdown fences, no explanation>

RULES:
- Microsoft SQL Server. Use SELECT TOP N. NEVER use LIMIT.
- TOP comes immediately after SELECT.
- The entities below are ready-made views. Query them directly.
- Use ONLY these entities, columns and relationships. Names EXACTLY as listed, in [square brackets].
- Write every Persian (or any non-English) string literal with the N prefix: N'تهران', never 'تهران'.
${today}- The question may be written in Persian. Understand it, but respond only with SQL.
- Write the PLAN first and check it against the entities, relationships and notes below; then write SQL that does exactly what the PLAN says. Keep the PLAN to the three short lines.
- If the question needs a table, column or business concept that is NOT among the entities/columns below, do NOT substitute a similar-looking one and do NOT guess. Respond instead with exactly this shape (no PLAN needed):
UNDERSTOOD: <state in English what data would be needed and that it is not available>
SQL:
SELECT 'NOT_SUPPORTED' AS Status, 'briefly say in English what is missing' AS Reason
${lowConfidence ? '\nNOTE: none of the available entities scored as a strong semantic/keyword match for this question, so it is likely NOT answerable with the schema below. Prefer the NOT_SUPPORTED response above unless one of these entities genuinely answers the question.\n' : ''}${hints.length ? HINTS_HEADER + hints.map(hintLine).join('') : ''}${metrics.length ? METRICS_HEADER + metrics.map(metricLine).join('') : ''}${values.length ? VALUES_HEADER + values.map(valueLine).join('') : ''}
${examples.length ? 'Examples of correct SQL for similar questions (only the SQL part is shown):\n' : ''}${examples.map((ex, i) => `Example ${i + 1}:\nQ: ${ex.q}\nSQL: ${ex.sql}`).join('\n\n')}

Available entities:
${schema}Relationships:
${rels}
Q: ${question}
A:`;
}

// ---------- مرحله ۱. جا دادن جدول‌ها در بودجه ----------
// هزینه هر جدول = DDL خودش + خطوط رابطه‌ای که با جدول‌های قبلاً پذیرفته‌شده اضافه می‌کند
// + راهنماهای مخصوص آن جدول. بخش ثابت (قوانین، راهنماهای حوزه، مثال‌ها، سوال) یک‌بار از
// بودجه کم می‌شود؛ اگر راهنمای حوزه‌ای نباشد، جای سرتیتر DOMAIN NOTES برای راهنماهای مخصوص
// جدول‌ها رزرو می‌شود. جدول‌ها به ترتیب امتیاز پذیرفته می‌شوند و اولین جدول همیشه (حتی اگر
// به‌تنهایی از بودجه بزرگ‌تر باشد).
function packPrompt(plan, today) {
  const { question, lowConfidence, joins, examples, values, metrics } = plan;
  const fixed = renderPrompt({ question, lowConfidence, hints: plan.hints.domain, today,
                               examples, values, metrics, schema: '', rels: '' });
  let budget = CFG.MAX_PROMPT_CHARS - fixed.length - (plan.hints.domain.length ? 0 : HINTS_HEADER.length);

  const finalTables = [];
  const nameSet    = new Set();
  const seenRel    = new Set();
  const hintSet    = new Set();
  const hints      = [...plan.hints.domain];
  let schema = '', rels = '';

  for (const table of plan.tables) {
    const name = table.name;
    const ddl = ddlOf(table) + '\n';
    const newRels = [];
    for (const j of joins) {
      const touches = (j.from === name && (nameSet.has(j.to) || j.to === name))
                   || (j.to === name && nameSet.has(j.from));
      if (!touches) continue;
      const line = relLine(j);
      if (!seenRel.has(line) && !newRels.includes(line)) newRels.push(line);
    }
    const newHints = plan.hints.scoped.filter(h => !hintSet.has(h) && (h.entities || []).includes(name));
    const cost = ddl.length + newRels.join('').length + newHints.map(h => hintLine(h.text)).join('').length;
    if (cost > budget && finalTables.length > 0) continue;

    budget -= cost;
    schema += ddl;
    newRels.forEach(l => { seenRel.add(l); rels += l; });
    newHints.forEach(h => { hintSet.add(h); hints.push(h.text); });
    nameSet.add(name);
    finalTables.push(table);
  }

  // ---------- مرحله ۲. مثال/مقدار/معیاری که جدولش جا نماند حذف می‌شود (فقط جا آزاد می‌کند) ----------
  const kept = examples.filter(e => e.entities.every(n => nameSet.has(n)));
  const keptValues = values.filter(l => nameSet.has(l.entity));
  const keptMetrics = metrics.filter(m => m.entities.every(n => nameSet.has(n)));
  const prompt = renderPrompt({ question, lowConfidence, hints, today, examples: kept,
                                values: keptValues, metrics: keptMetrics, schema, rels });
  return { finalTables, prompt, examples: kept, values: keptValues, metrics: keptMetrics };
}

// ---------- مرحله ۳. تعریف جدول‌ها برای Security ----------
// Security از روی همین فهرست CTE می‌سازد؛ فقط ستون‌های قابل نمایش (همان‌هایی که مدل دیده).
function toEntityDefs(tables) {
  const defs = {};
  for (const t of tables) {
    defs[t.name] = {
      name:    t.name,
      kind:    t.kind || 'table',
      source:  t.source || null,
      sql:     t.sql || null,
      columns: t.columns.map(c => ({ name: c.name, alias: c.alias || null }))
    };
  }
  return defs;
}

// ==================== اجرای مراحل ====================
function buildPrompt({ plan, now }, log) {
  const packed = packPrompt(plan, todayLine(now || new Date()));
  const { finalTables, prompt } = packed;
  const finalNames = finalTables.map(t => t.name);
  const r = plan.retrieval || {};

  log('EXAMPLES | ' + (packed.examples.map(e => `${e.id}(lex ${e.lex.toFixed(2)}`
    + (e.sem === null ? '' : ` sem ${e.sem.toFixed(2)}`) + ')').join(' | ') || 'none'));
  if (prompt.length > CFG.MAX_PROMPT_CHARS) {
    // فقط وقتی رخ می‌دهد که اولین جدول به‌تنهایی از بودجه بزرگ‌تر باشد
    log('PROMPT OVER BUDGET | chars=' + prompt.length + ' | max=' + CFG.MAX_PROMPT_CHARS);
  }
  log('SELECTED | ' + finalNames.join(', ') + ' | promptChars=' + prompt.length
    + ' | semanticUsed=' + Boolean(r.semanticUsed)
    + ' | topScore=' + Number(r.topScore || 0).toFixed(2)
    + ' | lowConfidence=' + Boolean(plan.lowConfidence));

  return {
    body: { string1: '-', string2: prompt },
    question: plan.question,
    selectedEntities: finalNames,
    entityDefs: toEntityDefs(finalTables),
    promptChars: prompt.length,
    retrieval: Object.assign({}, r, {
      examples: packed.examples.map(e => ({ id: e.id, sem: e.sem, lex: e.lex })),
      metrics: packed.metrics.map(m => m.name_fa),
      values: packed.values.map(l => ({ entity: l.entity, column: l.column, exact: l.exact,
                                        value: l.exact ? l.value : null, phrase: l.exact ? null : l.phrase }))
    })
  };
}

// ==================== خروجی n8n ====================
return [{ json: buildPrompt(readN8nInputs(), msg => console.log(msg)) }];
