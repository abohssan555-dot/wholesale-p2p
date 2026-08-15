import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient.js";
import { Upload, Loader2, CheckCircle2, AlertTriangle, Database, X } from "lucide-react";

const T = {
  ink: "#14213B",
  paper: "#F6F3EC",
  paperDeep: "#EFE9DA",
  line: "#DCD5C4",
  seal: "#B8862B",
  sealDeep: "#8C6018",
  good: "#2F6F4E",
  goodBg: "#E7F1EA",
  bad: "#A23B2E",
  badBg: "#F6E8E5",
  sub: "#5B5748",
};

const CHUNK_SIZE = 500;

// يقبل أعمدة مرنة نسبياً (بعض الملفات تسمي العمود "اسم المنتج" وبعضها "الاسم")
const NAME_KEYS = ["اسم المنتج", "الاسم", "product_name", "name"];
const BARCODE_KEYS = ["باركود المنتج", "الباركود", "barcode"];
const SIZE_KEYS = ["حجم الشحنة", "التصنيف", "shipping_size"];
const SIZE_AR_TO_EN = { "خفيف": "light", "خفيف الوزن": "light", "متوسط": "medium", "متوسط الوزن": "medium", "ثقيل": "bulky", "ثقيل / مكتنز": "bulky", "مكتنز": "bulky" };

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k];
  }
  return null;
}

function PendingCatalogReview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [sizeChoice, setSizeChoice] = useState({});
  const [totalPending, setTotalPending] = useState(0);

  const load = () => {
    setLoading(true);
    setSelected(new Set());
    supabase
      .from("product_catalog")
      .select("id, name, barcode, created_at, profiles!created_by(store_name, full_name)")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setItems(data || []);
        setSizeChoice(Object.fromEntries((data || []).map((it) => [it.id, "medium"])));
        setLoading(false);
      });
    supabase
      .from("product_catalog")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review")
      .then(({ count }) => setTotalPending(count || 0));
  };

  React.useEffect(load, []);

  const decide = async (id, status) => {
    setBusyId(id);
    const patch = { status };
    if (status === "approved") patch.shipping_size = sizeChoice[id] || "medium";
    await supabase.from("product_catalog").update(patch).eq("id", id);
    setBusyId(null);
    load();
  };

  const toggleSelect = (id) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((s) => (s.size === items.length ? new Set() : new Set(items.map((it) => it.id))));
  };

  const bulkDecide = async (status) => {
    setBulkBusy(true);
    if (status === "approved") {
      // نجمّع حسب التصنيف المختار، ونحدّث كل مجموعة بطلب واحد بدل طلب لكل صنف
      const groups = {};
      for (const id of selected) {
        const size = sizeChoice[id] || "medium";
        (groups[size] ||= []).push(id);
      }
      for (const [size, ids] of Object.entries(groups)) {
        await supabase.from("product_catalog").update({ status, shipping_size: size }).in("id", ids);
      }
    } else {
      await supabase.from("product_catalog").update({ status }).in("id", Array.from(selected));
    }
    setBulkBusy(false);
    load();
  };

  const approveAllPending = async () => {
    if (!window.confirm("سيتم اعتماد كل المنتجات قيد المراجعة دفعة واحدة بتصنيف \"متوسط الوزن\" افتراضياً. متأكد؟")) return;
    setBulkBusy(true);
    await supabase.from("product_catalog").update({ status: "approved", shipping_size: "medium" }).eq("status", "pending_review");
    setBulkBusy(false);
    load();
  };

  return (
    <div className="rounded-xl p-6 mt-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Database size={16} style={{ color: T.sealDeep }} />
          <span className="text-sm font-semibold" style={{ color: T.ink }}>منتجات قيد المراجعة ({totalPending})</span>
        </div>
        {items.length > 0 && (
          <button onClick={toggleSelectAll} className="text-xs font-medium" style={{ color: T.sealDeep }}>
            {selected.size === items.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </button>
        )}
      </div>
      <div className="text-xs mb-2" style={{ color: T.sub }}>
        أصناف جديدة كلياً أضافها التجّار (بدون باركود مطابق) — تحتاج تأكيد أنها ليست تكراراً لصنف موجود باسم مختلف، وتحديد تصنيف وزن الشحنة قبل الاعتماد. تأكد أيضاً من أن الاسم مكتوب بالتفصيل الكامل (الوزن والتفكيك، مثل "سنيكرز 200 جرام 1×10×24 حبة") لأن كل تاجر آخر يبيع نفس الباركود يرث لاحقاً نفس الاسم تلقائياً. (تُعرض أول 100 فقط بالقائمة أدناه)
      </div>
      {totalPending > 100 && (
        <button
          onClick={approveAllPending}
          disabled={bulkBusy}
          className="text-xs font-medium px-3 py-2 rounded-lg mb-4 flex items-center gap-1.5"
          style={{ background: T.goodBg, color: T.good, border: "1px solid #BFE0CE" }}
        >
          {bulkBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          اعتماد كل الـ{totalPending} صنف دفعة واحدة (تصنيف "متوسط الوزن" افتراضياً)
        </button>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg p-3 mb-3" style={{ background: T.paper, border: `1px solid ${T.line}` }}>
          <span className="text-xs font-medium" style={{ color: T.ink }}>محدَّد: {selected.size}</span>
          <div className="flex gap-2">
            <button
              onClick={() => bulkDecide("rejected")}
              disabled={bulkBusy}
              className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
              style={{ background: T.badBg, color: T.bad }}
            >
              <X size={12} /> رفض المحدَّد
            </button>
            <button
              onClick={() => bulkDecide("approved")}
              disabled={bulkBusy}
              className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
              style={{ background: T.goodBg, color: T.good }}
            >
              {bulkBusy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} اعتماد المحدَّد (بالتصنيف المختار لكل صنف)
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-center py-6" style={{ color: T.sub }}>جارٍ التحميل...</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-center py-6" style={{ color: T.sub }}>لا توجد منتجات بانتظار المراجعة حالياً.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: T.paper, border: `1px solid ${T.line}` }}>
              <input
                type="checkbox"
                checked={selected.has(it.id)}
                onChange={() => toggleSelect(it.id)}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: T.ink }}>{it.name}</div>
                <div className="text-[11px]" style={{ color: T.sub }}>
                  {it.profiles?.store_name || it.profiles?.full_name || "—"} · {it.barcode ? `باركود: ${it.barcode}` : "بدون باركود"}
                </div>
              </div>
              <select
                value={sizeChoice[it.id] || "medium"}
                onChange={(e) => setSizeChoice((s) => ({ ...s, [it.id]: e.target.value }))}
                className="text-[11px] rounded-lg py-1.5 px-2 outline-none shrink-0"
                style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}
                title="تصنيف وزن الشحنة (يُحفظ عند الاعتماد)"
              >
                <option value="light">خفيف الوزن</option>
                <option value="medium">متوسط الوزن</option>
                <option value="bulky">ثقيل / مكتنز</option>
              </select>
              <button
                onClick={() => decide(it.id, "rejected")}
                disabled={busyId === it.id}
                title="رفض هذا المنتج"
                className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
                style={{ background: T.badBg, color: T.bad }}
              >
                <X size={13} /> رفض
              </button>
              <button
                onClick={() => decide(it.id, "approved")}
                disabled={busyId === it.id}
                title="اعتماد هذا المنتج بالتصنيف المختار"
                className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
                style={{ background: T.goodBg, color: T.good }}
              >
                <CheckCircle2 size={13} /> اعتماد
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CatalogImportPanel({ session }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const seen = new Set();
        const parsed = [];
        for (const r of raw) {
          const name = pick(r, NAME_KEYS);
          const barcode = pick(r, BARCODE_KEYS);
          const sizeRaw = pick(r, SIZE_KEYS);
          if (!name) continue;
          const barcodeStr = barcode ? String(barcode).trim() : null;
          // تفادي تكرار نفس الباركود أكثر من مرة داخل الملف نفسه
          if (barcodeStr) {
            if (seen.has(barcodeStr)) continue;
            seen.add(barcodeStr);
          }
          const shippingSize = SIZE_AR_TO_EN[String(sizeRaw || "").trim()] || "medium";
          parsed.push({ name: String(name).trim(), barcode: barcodeStr, shipping_size: shippingSize });
        }

        if (!parsed.length) {
          setErr("لم يتم العثور على صفوف صالحة. تأكد من وجود عمود لاسم المنتج على الأقل.");
          setRows(null);
          return;
        }
        setRows(parsed);
      } catch {
        setErr("تعذّرت قراءة الملف — تأكد من أنه بصيغة xlsx أو xls صحيحة.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    setImporting(true);
    setErr("");
    let inserted = 0;
    let failed = 0;
    const errorSamples = [];

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE).map((r) => ({
        name: r.name,
        barcode: r.barcode,
        category_id: "other",
        shipping_size: r.shipping_size || "medium",
        status: "approved",
        created_by: session.user.id,
      }));

      const { error } = await supabase
        .from("product_catalog")
        .upsert(chunk, { onConflict: "barcode", ignoreDuplicates: true });

      if (error) {
        failed += chunk.length;
        if (errorSamples.length < 3) errorSamples.push(error.message || JSON.stringify(error));
      } else {
        inserted += chunk.length;
      }
      setProgress({ done: Math.min(i + CHUNK_SIZE, rows.length), total: rows.length });
    }

    setImporting(false);
    setResult({ inserted, failed, total: rows.length, errorSamples });
    setRows(null);
  };

  if (result) {
    return (
      <>
      <div className="rounded-xl p-6" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
        <CheckCircle2 className="mb-3" size={26} style={{ color: T.good }} />
        <div className="text-sm font-semibold mb-1" style={{ color: T.ink }}>تم استيراد الكتالوج المرجعي</div>
        <div className="text-xs" style={{ color: T.sub }}>
          من أصل {result.total} صف: {result.inserted} تمت معالجتها، {result.failed} فشلت.
        </div>
        {result.errorSamples && result.errorSamples.length > 0 && (
          <div className="mt-3 rounded-lg p-3" style={{ background: T.badBg }}>
            <div className="text-[11px] font-medium mb-1" style={{ color: T.bad }}>نص الخطأ (لتشخيص السبب):</div>
            {result.errorSamples.map((m, i) => (
              <div key={i} className="text-[11px] mb-1" style={{ color: T.bad, fontFamily: "'JetBrains Mono', monospace" }}>{m}</div>
            ))}
          </div>
        )}
        <button
          onClick={() => setResult(null)}
          className="text-xs font-medium px-4 py-2 rounded-lg mt-4"
          style={{ background: T.paper, color: T.sub, border: `1px solid ${T.line}` }}
        >
          استيراد ملف آخر
        </button>
      </div>
      <PendingCatalogReview />
      </>
    );
  }

  return (
    <>
    <div className="rounded-xl p-6" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <div className="flex items-center gap-2 mb-1">
        <Database size={16} style={{ color: T.sealDeep }} />
        <span className="text-sm font-semibold" style={{ color: T.ink }}>استيراد الكتالوج المرجعي (أسماء وباركودات فقط)</span>
      </div>
      <div className="text-xs mb-4" style={{ color: T.sub }}>
        يُستخدم لتعبئة قاعدة أسماء وباركودات المنتجات مسبقاً — لا يُنشئ أي عروض بيع فعلية، فقط يسهّل على التجّار ربط منتجاتهم بأصناف موحّدة عند الاستيراد لاحقاً.
      </div>

      {!rows && !importing && (
        <label
          className="flex flex-col items-center justify-center gap-2 rounded-lg p-8 cursor-pointer"
          style={{ background: T.paper, border: `1px dashed ${T.line}` }}
        >
          <Upload size={22} style={{ color: T.sealDeep }} />
          <span className="text-xs" style={{ color: T.sub }}>{fileName || "اختيار ملف Excel"}</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={pickFile} />
        </label>
      )}

      {err && (
        <div className="flex items-center gap-2 text-xs mt-3 p-3 rounded-lg" style={{ background: T.badBg, color: T.bad }}>
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {rows && !importing && (
        <div>
          <div className="text-xs mb-4" style={{ color: T.sub }}>
            تم العثور على <span style={{ fontFamily: "'JetBrains Mono', monospace", color: T.ink }}>{rows.length}</span> صنف فريد جاهز للاستيراد (سيُقسَّم لدفعات تلقائياً).
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setRows(null); setFileName(""); }}
              className="text-xs font-medium px-4 py-2 rounded-lg"
              style={{ background: T.paper, color: T.sub, border: `1px solid ${T.line}` }}
            >
              إلغاء
            </button>
            <button
              onClick={confirmImport}
              className="flex-1 text-sm font-medium py-2 rounded-lg"
              style={{ background: T.ink, color: "#fff" }}
            >
              بدء الاستيراد
            </button>
          </div>
        </div>
      )}

      {importing && (
        <div className="text-center py-4">
          <Loader2 className="mx-auto mb-2 animate-spin" size={20} style={{ color: T.sealDeep }} />
          <div className="text-xs" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>
            {progress.done} / {progress.total}
          </div>
        </div>
      )}
    </div>
    <PendingCatalogReview />
    </>
  );
}
