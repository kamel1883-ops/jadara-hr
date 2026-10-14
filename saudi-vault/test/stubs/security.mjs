// بديل security.js للاختبار: تشفير قابل للعكس بلا مفاتيح
export function encrypt(value) {
  return 'enc:' + Buffer.from(String(value), 'utf8').toString('base64');
}

export function decrypt(value) {
  const s = String(value == null ? '' : value);
  if (!s.startsWith('enc:')) return s;
  return Buffer.from(s.slice(4), 'base64').toString('utf8');
}

export function generateRef(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
