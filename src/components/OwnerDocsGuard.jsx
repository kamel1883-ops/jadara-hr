import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { portalSession } from "@/lib/portalSession";
import SplashScreen from "@/components/SplashScreen";

/**
 * بوابة مستندات المالك (البروشور، العينات، الخطة الاستراتيجية، تصاميم الإعلانات وأغلفة المتاجر).
 * لا تُعرض أي من هذه الصفحات قبل التحقق من جلسة مالك حقيقية مصدرها بوابة المالك،
 * ويُتحقق من الجلسة خادمياً (portalData / owner_check) لا من المتصفح فقط،
 * فأي جلسة مزيفة أو منتهية تُحذف ويُعاد الزائر لصفحة دخول بوابة المالك.
 */
export default function OwnerDocsGuard() {
  const [state, setState] = useState("checking");

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = portalSession.load();
      if (!session?.token || session.employee_id !== "owner") {
        if (alive) setState("denied");
        return;
      }
      try {
        const res = await base44.functions.invoke("portalData", {
          token: session.token,
          employee_id: "owner",
          action: "owner_check",
        });
        const data = res?.data || res;
        if (!alive) return;
        if (data?.ok) setState("ok");
        else {
          portalSession.clear();
          setState("denied");
        }
      } catch {
        if (!alive) return;
        portalSession.clear();
        setState("denied");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state === "checking") return <SplashScreen />;
  if (state === "denied") return <Navigate to="/owner-portal" replace />;
  return <Outlet />;
}