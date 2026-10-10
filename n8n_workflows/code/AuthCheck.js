// ===== AuthCheck: کاربر کیست و عضو کدام گروه‌های AD است؟ =====
// ورودی: نتیجه نود LDAP (جست‌وجوی ایمیل کاربر) + ایمیل و نام کاربر از بدنه درخواست (Webhook).
// خروجی: { username, email, groups } - groups نام گروه‌ها (CN) است، مثل «IT - Data» یا «NLSQL-sales»؛
//        Find Tables با همین نام‌ها و permissions کاتالوگ‌ها تعیین می‌کند کاربر کدام جدول‌ها را ببیند.
// ⚠️ ایمیل از بدنه درخواست خوانده می‌شود و به آن اعتماد می‌شود (ورود در OpenWebUI انجام شده). تا وقتی
//    Webhook با Header Auth بسته نشده، هر کسی که به آدرس webhook دسترسی دارد می‌تواند ایمیل دیگری بفرستد.
const wh = $('Webhook').first().json.body;
const identity    = (wh.email || '').trim().toLowerCase();
const displayName = wh.username || '';

if (!identity) {
  throw new Error('⛔ ایمیل کاربر دریافت نشد. ورود به OpenWebUI باید از طریق LDAP باشد.');
}

const entries = $input.all()
  .map(i => i.json)
  .filter(e => e && Object.keys(e).length > 0);

if (entries.length === 0) {
  throw new Error('⛔ کاربر در دایرکتوری یافت نشد: ' + identity);
}
if (entries.length > 1) {
  // چند رکورد برای یک ایمیل یعنی داده‌ی دایرکتوری مبهم است — نباید حدس بزنیم
  throw new Error('⛔ چند رکورد برای این کاربر در دایرکتوری یافت شد. با تیم IT تماس بگیرید.');
}

const e = entries[0];
let memberOf = e.memberOf || [];
if (typeof memberOf === 'string') memberOf = [memberOf];

const groups = memberOf
  .map(dn => (String(dn).match(/^CN=([^,]+)/i) || [])[1])
  .filter(Boolean);

return [{
  json: {
    username: e.sAMAccountName || displayName,
    email: identity,
    groups: groups
  }
}];
