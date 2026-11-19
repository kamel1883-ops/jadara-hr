import React from "react";
import AnimatedOutlet from "@/components/AnimatedOutlet";
import PublicWhatsAppFab from "@/components/PublicWhatsAppFab";

// غلاف صفحات الموقع العامة: الصفحة مع زر واتساب عائم ثابت في كل التنقلات.
export default function PublicLayout() {
  return (
    <>
      <AnimatedOutlet />
      <PublicWhatsAppFab />
    </>
  );
}