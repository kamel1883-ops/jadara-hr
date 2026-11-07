import { createContext, useContext } from "react";

/**
 * هل الشاشة الجذرية المعروضة هي التبويب النشط حالياً؟
 * تُوفّره TabScreens لكل تبويب (تبقى كل التبويبات مثبّتة في الذاكرة حتى المخفية)،
 * ليُفعَّل السحب-للتحديث في الشاشة الظاهرة فقط بدل تحديث كل التبويبات المخفية معها.
 * خارج TabScreens (الشاشات العادية) القيمة الافتراضية true فلا يتغيّر أي سلوك.
 */
export const TabScreenActiveContext = createContext(true);

export const useTabScreenActive = () => useContext(TabScreenActiveContext);