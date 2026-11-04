import { secrets } from "base44:runtime";
import {
  buildPresenceVoiceTwiml,
  normalizePhoneNumber,
  placeTwilioVoiceCall,
} from "../../shared/voiceAlert.ts";
import { getEmployeesBatch } from "../../shared/vaultClient.ts";
import { tenantKeysForEmployee, tenantKeysForRead } from "../../shared/vaultIdentity.ts";

type VoiceIssuer =
  | { kind: "user"; user: any }
  | { kind: "portal"; emp: any }
  | null;

function readVoiceConfig() {
  const accountSid = String(secrets.get("TWILIO_ACCOUNT_SID") || "").trim();
  const authToken = String(secrets.get("TWILIO_AUTH_TOKEN") || "").trim();
  const apiKeySid = String(secrets.get("TWILIO_API_KEY") || "").trim();
  const apiKeySecret = String(secrets.get("TWILIO_API_SECRET") || "").trim();
  const callerId = String(secrets.get("TWILIO_CALLER_ID") || "").trim();
  const enabled = Boolean(accountSid && callerId && (authToken || (apiKeySid && apiKeySecret)));
  return { accountSid, authToken, apiKeySid, apiKeySecret, callerId, enabled };
}

async function voicePhonesByEmployee(base44: any, targets: any[], issuer: VoiceIssuer) {
  const phones = new Map<string, string>();
  for (const emp of targets || []) {
    const id = String(emp?.id || "").trim();
    if (!id) continue;
    const direct = normalizePhoneNumber(emp?.phone);
    if (direct) phones.set(id, direct);
  }

  const missingRefs = [...new Set(
    (targets || [])
      .map((emp: any) => ({ id: String(emp?.id || "").trim(), ref: String(emp?.emp_ref || "").trim() }))
      .filter((x) => x.id && x.ref && !phones.has(x.id))
      .map((x) => x.ref)
  )];
  if (!missingRefs.length) return phones;

  let keys: string[] = [];
  try {
    if (issuer?.kind === "user") keys = await tenantKeysForRead(base44, issuer.user);
    else if (issuer?.kind === "portal") keys = await tenantKeysForEmployee(issuer.emp);
  } catch {
    keys = [];
  }
  if (!keys.length) return phones;

  let rows: Record<string, any> = {};
  try {
    rows = await getEmployeesBatch(keys, missingRefs);
  } catch {
    return phones;
  }
  for (const emp of targets || []) {
    const id = String(emp?.id || "").trim();
    const ref = String(emp?.emp_ref || "").trim();
    if (!id || phones.has(id) || !ref) continue;
    const phone = normalizePhoneNumber(rows?.[ref]?.phone);
    if (phone) phones.set(id, phone);
  }
  return phones;
}

export async function callTargetsWithoutAppPush(
  base44: any,
  targets: any[],
  failedPushIds: Set<string>,
  issuer: VoiceIssuer,
  deadlineClock: string,
  companyName: string
) {
  const voice = {
    attempted: 0,
    called: 0,
    failed: 0,
    skipped: 0,
    status: "not_needed",
    enabled: false,
  };
  const config = readVoiceConfig();
  voice.enabled = config.enabled;

  const needVoice = (targets || []).filter((emp: any) => {
    const id = String(emp?.id || "").trim();
    if (!id) return false;
    return !String(emp?.user_id || "").trim() || failedPushIds.has(id);
  });
  if (!needVoice.length) return voice;
  if (!config.enabled) {
    voice.status = "disabled";
    voice.skipped = needVoice.length;
    return voice;
  }

  const phones = await voicePhonesByEmployee(base44, needVoice, issuer);
  const twiml = buildPresenceVoiceTwiml({ deadlineClock, companyName });
  for (const emp of needVoice) {
    const id = String(emp?.id || "").trim();
    voice.attempted += 1;
    const to = phones.get(id) || "";
    if (!to) {
      voice.skipped += 1;
      continue;
    }
    const result = await placeTwilioVoiceCall({ ...config, to, twiml });
    if (result.ok) voice.called += 1;
    else voice.failed += 1;
  }

  if (voice.called > 0 && voice.failed === 0) voice.status = "called";
  else if (voice.called > 0) voice.status = "partial";
  else if (voice.failed > 0) voice.status = "failed";
  else voice.status = "no_phone";
  return voice;
}
