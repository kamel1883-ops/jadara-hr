// بديل express للاختبار: يجمع معالجات المسارات في كائن
export function Router() {
  const routes = {};
  const router = {
    routes,
    post(path, ...handlers) { routes[`POST ${path}`] = handlers[handlers.length - 1]; return router; },
    get(path, ...handlers) { routes[`GET ${path}`] = handlers[handlers.length - 1]; return router; },
    put(path, ...handlers) { routes[`PUT ${path}`] = handlers[handlers.length - 1]; return router; },
    delete(path, ...handlers) { routes[`DELETE ${path}`] = handlers[handlers.length - 1]; return router; },
  };
  return router;
}
