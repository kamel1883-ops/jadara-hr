import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { Loader2 } from "lucide-react";

export default function AffiliateEditDialog({ affiliate, isAr = true, session, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!affiliate) return;
    setF({
      status: affiliate.status || "pending",
      commission_percent: affiliate.commission_percent ?? 7,
      bank_name: affiliate.bank_name || "",
      bank_iban: affiliate.bank_iban || "",
      notes: affiliate.notes || "",
    });
  }, [affiliate?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("portalData", {
        token: session.token, employee_id: session.employee_id,
        action: "affiliate_save", id: affiliate.id, payload: f,
      });
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!affiliate} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isAr ? "إدارة الشريك" : "Manage partner"} — {affiliate?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{isAr ? "الحالة" : "Status"}</Label>
            <MobileSelect value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <MobileSelectItem value="pending">{isAr ? "طلب جديد" : "Pending"}</MobileSelectItem>
              <MobileSelectItem value="active">{isAr ? "نشط — رابط الإحالة يعمل" : "Active"}</MobileSelectItem>
              <MobileSelectItem value="suspended">{isAr ? "موقوف" : "Suspended"}</MobileSelectItem>
            </MobileSelect>
          </div>
          <div className="space-y-1.5">
            <Label>{isAr ? "نسبة العمولة %" : "Commission %"}</Label>
            <Input type="number" value={f.commission_percent} dir="ltr"
              onChange={(e) => setF({ ...f, commission_percent: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isAr ? "البنك" : "Bank"}</Label>
              <Input value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>IBAN</Label>
              <Input value={f.bank_iban} dir="ltr" onChange={(e) => setF({ ...f, bank_iban: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isAr ? "ملاحظات" : "Notes"}</Label>
            <Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isAr ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}{isAr ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}