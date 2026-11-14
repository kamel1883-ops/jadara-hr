// Only read-only navigation and opening existing forms. Never submit a form or approve a request.
export const lessonScenes = {
  intro: [{ path: '/app' }, { path: '/app', scroll: 220 }, { path: '/app', scroll: 480 }],
  recruitment: [{ path: '/recruitment' }, { path: '/recruitment', button: 'وظيفة جديدة' }, { path: '/recruitment', button: 'المتقدمون', optional: true }, { path: '/employees' }],
  employees: [{ path: '/employees' }, { path: '/employees', button: 'موظف جديد' }, { path: '/employees', selector: 'button[title="ملف الموظف"]' }, { path: '/employees', scroll: 350 }],
  termination: [{ path: '/employees', selector: 'button[title="ملف الموظف"]' }, { path: '/employees', selector: 'button[title="فسخ عقد"]' }, { path: '/end-of-service' }],
  attendance: [{ path: '/attendance' }, { path: '/attendance', scroll: 260 }, { path: '/attendance', scroll: 500 }, { path: '/payroll' }],
  'import-attendance': [{ path: '/import-attendance' }, { path: '/import-attendance', scroll: 240 }, { path: '/attendance' }],
  leaves: [{ path: '/leaves' }, { path: '/approvals' }, { path: '/approvals', scroll: 280 }, { path: '/leaves', scroll: 300 }],
  payroll: [{ path: '/payroll' }, { path: '/payroll', scroll: 280 }, { path: '/payroll', scroll: 520 }],
  loans: [{ path: '/approvals', tab: 'السلف' }, { path: '/approvals', tab: 'السلف', scroll: 250 }, { path: '/payroll', scroll: 300 }],
  fleet: [{ path: '/fleet' }, { path: '/fleet', button: 'مركبة جديدة' }, { path: '/vehicle-insurance' }, { path: '/fleet', scroll: 300 }],
  licenses: [{ path: '/licenses' }, { path: '/licenses', button: 'إضافة ترخيص' }, { path: '/platform-subscriptions' }],
  decisions: [{ path: '/decisions' }, { path: '/decisions', button: 'إصدار قرار جديد' }, { path: '/decisions', scroll: 280 }],
  performance: [{ path: '/performance' }, { path: '/performance', button: 'تقييم جديد' }, { path: '/incentives' }],
  exit: [{ path: '/exit-interviews' }, { path: '/exit-interviews', button: 'مقابلة جديدة' }, { path: '/end-of-service' }, { path: '/end-of-service', scroll: 300 }],
};

export async function showScene(page, send, targetSession, appUrl, scene) {
  const currentPath = await page.evaluate(() => location.pathname);
  if (currentPath !== scene.path) {
    await page.goto(`${appUrl}${scene.path}`, { waitUntil: 'load', timeoutMs: 40000 });
  } else {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, targetSession);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, targetSession);
    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('main')?.scrollTo(0, 0); });
  }
  await page.evaluate(async () => {
    const deadline = Date.now() + 35000;
    let stableSince = 0;
    while (Date.now() < deadline) {
      const main = document.querySelector('main');
      const loading = !main || /جار[ٍي]*\s*(?:التحميل|تحميل)|جاري التحميل/.test(main.innerText);
      if (loading) stableSince = 0;
      else if (!stableSince) stableSince = Date.now();
      else if (Date.now() - stableSince > 1200) return;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Course screen did not finish loading');
  });
  const state = await page.evaluate(() => ({ path: location.pathname, text: document.body.innerText.slice(0, 600) }));
  if (state.path !== scene.path || /بانتظار اعتماد المالك|تسجيل الدخول بحساب/.test(state.text)) throw new Error('Demo workspace is not accessible');
  let pointer = { x: 820, y: 360 };
  if (scene.button || scene.tab || scene.selector) {
    const point = await page.evaluate(({ button, tab, selector }) => {
      const elements = [...document.querySelectorAll(selector || (tab ? '[role="tab"]' : 'button'))];
      const target = elements.find(element => selector ? element.getBoundingClientRect().width > 0 : (tab ? element.textContent.trim().startsWith(tab) : element.textContent.trim() === button));
      if (!target) return null;
      target.scrollIntoView({ block: 'center' });
      const rect = target.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, scene);
    if (!point && !scene.optional) throw new Error(`Course action not found: ${scene.button || scene.tab || scene.selector}`);
    if (point) {
      pointer = point;
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y }, targetSession);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 }, targetSession);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 }, targetSession);
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
  }
  if (scene.scroll) await page.scroll(640, 420, 0, scene.scroll);
  return pointer;
}