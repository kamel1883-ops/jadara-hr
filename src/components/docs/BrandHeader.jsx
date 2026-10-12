import React from "react";
import { Crown } from "lucide-react";
import { PRINT_MARK_PX, clientLogoStyle } from "@/lib/printBrand";

// شعار الشركة يميناً + شعار جداره يساراً — يظهر على كل مستند مُولّد
export default function BrandHeader({ org }) {
  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        borderBottom: "2px solid #0b1120",
        paddingBottom: 12,
        marginBottom: 18,
      }}
    >
      {/* يمين — المنشأة */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: 240 }}>
        {org?.logo_url ? (
          <img
            src={org.logo_url}
            crossOrigin="anonymous"
            alt="logo"
            style={clientLogoStyle}
          />
        ) : null}
        <div style={{ fontWeight: 700, fontSize: 13, color: "#0b1120", marginTop: 6, textAlign: "right" }}>
          {org?.name || "—"}
        </div>
        {org?.unified_number ? (
          <div style={{ fontSize: 10, color: "#666" }}>الرقم الموحد: {org.unified_number}</div>
        ) : null}
      </div>

      {/* يسار — جداره */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: PRINT_MARK_PX,
            height: PRINT_MARK_PX,
            borderRadius: 14,
            background: "#2d234a",
            boxShadow: "0 0 0 1px rgba(197,160,89,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Crown size={22} strokeWidth={1.8} style={{ color: "#c5a059" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e", fontFamily: "var(--font-display)" }}>جداره</div>
          <div style={{ fontSize: 10, color: "#1a1a2e", marginTop: 1, opacity: 0.75 }}>لإدارة الموارد البشرية</div>
        </div>
      </div>
    </div>
  );
}