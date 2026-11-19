import { secrets } from "base44:runtime";

/**
 * بصمة رقم الهوية — تسمح بإيجاد سجل الموظف فوراً دون تخزين الرقم نفسه
 * ودون مسح كل الموظفين. HMAC بمفتاح سري حتى لا يمكن استخراج الرقم من البصمة.
 */
const ARABIC = "٠١٢٣٤٥٦٧٨٩";

export function idDigits(value: any): string {
  return String(value || "")
    .replace(/[٠-٩]/g, (d) => String(ARABIC.indexOf(d)))
    .replace(/\D/g, "");
}

function pepper(): string {
  const key = String(secrets.get("VAULT_API_KEY") || "");
  return key || "jadara-portal-identity";
}

export async function nationalIdHash(raw: any): Promise<string> {
  const digits = idDigits(raw);
  if (!digits) return "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(pepper()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(digits));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}