import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { getPortalEntities, getPortalAuth } from '@/lib/portalEntityBridge';
import { installTenantScope, scopedEntities } from '@/lib/tenantScope';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// عندما يفتح موظف مُفوّض قسماً إدارياً من بوابته، تُوجَّه نداءات البيانات والمستخدم الحالي
// إلى جسر البوابة (portalData) بدل مسار Base44 المحمي — فتعمل شاشات لوحة الشركات كما هي.
export const base44 = new Proxy(client, {
  get(target, prop) {
    // بيانات المنشآت معزولة بالرقم الموحّد: كل كيان تشغيلي يمر عبر طبقة العزل قبل القراءة أو الكتابة
    if (prop === 'entities') return getPortalEntities() || scopedEntities(target.entities);
    if (prop === 'auth') return getPortalAuth() || target.auth;
    return target[prop];
  },
});

installTenantScope(client);