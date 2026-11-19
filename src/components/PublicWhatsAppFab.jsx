import React from "react";
import { useLocation } from "react-router-dom";
import WhatsAppIcon from "@/components/WhatsAppIcon";

// زر واتساب عائم ثابت — يظهر في كل الصفحات العامة للموقع (الهبوط، المدونة، الصفحات التعريفية…)
// ويُخفى في بوابات الدخول: بوابة الشركات، بوابة الموظف، بوابة المالك.
const WA_NUMBER = "966594700782";
const WA_MESSAGE = "السلام عليكم، أرغب بالاستفسار عن نظام جدارة لإدارة الموارد البشرية وعن أسعار الباقات.";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;

const HIDDEN_PATHS = [
  "/company-login",
  "/company-forgot-password",
  "/company-register",
  "/owner-portal",
  "/portal",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/mfa",
];

export default function PublicWhatsAppFab() {
  const { pathname } = useLocation();
  const hidden = HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;

  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noreferrer"
      aria-label="تواصل معنا على واتساب"
      title="تواصل معنا على واتساب"
      className="fixed z-40 bottom-6 right-5 h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#1FBF5B] text-white shadow-xl shadow-emerald-600/35 flex items-center justify-center transition active:scale-95"
    >
      <WhatsAppIcon size={30} />
    </a>
  );
}