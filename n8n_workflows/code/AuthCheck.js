// ===== AuthCheck: کاربر کیست، عضو کدام گروه‌هاست و چه اجازه‌هایی دارد؟ =====
// ورودی:  نتیجه نود LDAP (جست‌وجوی ایمیل کاربر) + ایمیل، نام و هدرهای درخواست (Webhook)
// خروجی:  { username, email, groups, can: { seeDetails, evalMode, reviewNotes, projectNotes } }
//   groups - نام گروه‌ها (CN)، مثل «IT - Data» یا «NLSQL-sales». Find Tables با همین نام‌ها و permissions
//            کاتالوگ‌ها تعیین می‌کند کاربر کدام جدول‌ها را ببیند.
//   can    - اجازه‌های غیر از جدول‌ها، فقط همین‌جا تعیین می‌شوند (جدول RIGHTS پایین). نودهای بعدی
//            (ErrorFormat، Format Answer، Obsidian note، و catalog-service برای جست‌وجوی یادداشت‌ها) فقط can را می‌خوانند و نام هیچ گروهی را نمی‌دانند.
// ⚠️ ایمیل از بدنه درخواست خوانده می‌شود و به آن اعتماد می‌شود (ورود در OpenWebUI انجام شده). تا وقتی
//    Webhook با Header Auth بسته نشده، هر کسی که به آدرس webhook دسترسی دارد می‌تواند ایمیل دیگری بفرستد.

// ---------- تنظیمات: چه کسی چه کاری می‌تواند بکند ----------
// نام گروه‌ها باید دقیقاً مثل AD باشد (با فاصله‌ها).
const RIGHTS = {
  seeDetails:  ['IT - Data', 'IT - Security'],   // متن خطای فنی (SQL Server، نام جدول) را ببیند
  evalMode:    ['IT - Data'],                    // بنچمارک: با هدر x-eval-mode: true ردیف‌ها و SQL را هم بگیرد
  reviewNotes: ['IT - Data', 'IT - Security'],   // برای هر جوابش یادداشت ✅/❌ در Obsidian نوشته شود
  projectNotes: ['IT - Data', 'IT - Security'],  // مدل «Obsidian notes» از یادداشت‌های پروژه (Home، How-to، Schema، ...) هم جواب بدهد؛
                                                 // یادداشت‌های کاتالوگ را همه با همان permissions کاتالوگ می‌بینند
};

// ---------- ۱. آداپتر n8n: تنها جایی که $input و $('...') خوانده می‌شود ----------
function readN8nInputs() {
  const wh = $('Webhook').first().json;
  return {
    body: wh.body || {},
    headers: wh.headers || {},
    entries: $input.all().map(i => i.json).filter(e => e && Object.keys(e).length > 0),
  };
}

// ---------- ۲. منطق ----------
function directoryEntry(entries, identity) {
  if (entries.length === 0) throw new Error('⛔ کاربر در دایرکتوری یافت نشد: ' + identity);
  // چند رکورد برای یک ایمیل یعنی داده‌ی دایرکتوری مبهم است — نباید حدس بزنیم
  if (entries.length > 1) throw new Error('⛔ چند رکورد برای این کاربر در دایرکتوری یافت شد. با تیم IT تماس بگیرید.');
  return entries[0];
}

// «CN=IT - Data,OU=...» ← «IT - Data»
function groupNames(memberOf) {
  const list = typeof memberOf === 'string' ? [memberOf] : (memberOf || []);
  return list.map(dn => (String(dn).match(/^CN=([^,]+)/i) || [])[1]).filter(Boolean);
}

function rightsOf(groups, headers) {
  const inAny = names => groups.some(g => names.includes(g));
  return {
    seeDetails: inAny(RIGHTS.seeDetails),
    evalMode: String(headers['x-eval-mode'] || '').toLowerCase() === 'true' && inAny(RIGHTS.evalMode),
    reviewNotes: inAny(RIGHTS.reviewNotes),
    projectNotes: inAny(RIGHTS.projectNotes),
  };
}

function authCheck({ body, headers, entries }) {
  const identity = (body.email || '').trim().toLowerCase();
  if (!identity) throw new Error('⛔ ایمیل کاربر دریافت نشد. ورود به OpenWebUI باید از طریق LDAP باشد.');
  const e = directoryEntry(entries, identity);
  const groups = groupNames(e.memberOf);
  return { username: e.sAMAccountName || body.username || '', email: identity, groups, can: rightsOf(groups, headers) };
}

// ---------- ۳. اجرا ----------
return [{ json: authCheck(readN8nInputs()) }];
