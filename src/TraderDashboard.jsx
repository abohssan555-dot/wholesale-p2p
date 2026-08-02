import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import { Package, Upload, Loader2, CheckCircle2, LogOut, FileSpreadsheet, AlertTriangle, Home, Store, Eye, Trash2 } from "lucide-react";

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

const STORE_CATEGORY_LABELS = {
  general_food: "مواد غذائية متكاملة",
  sweets: "حلويات وشوكولاتة",
  household_plastics: "مستلزمات منزلية وبلاستيكات",
  produce: "خضار وفواكه",
  bakery: "مخابز",
  nuts_coffee: "محامص ومكسرات",
  other: "أخرى",
};

function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}

// خرائط أسماء أعمدة القالب → مفاتيح داخلية
const COLUMN_MAP = {
  "اسم المنتج": "name",
  "الباركود": "barcode",
  "الفئة": "category_name",
  "العلامة التجارية": "brand",
  "وحدة القياس": "unit",
  "الكمية المتوفرة": "quantity",
  "سعر التكلفة": "cost",
  "سعر الجملة": "wholesale_price",
  "سعر التجزئة": "retail_price",
  "الكود الداخلي (SKU)": "sku",
  "الوصف": "description",
};

function parseSheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const sheet = wb.Sheets["المنتجات"] || wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const mapped = rows
          .map((r) => {
            const row = {};
            for (const [ar, key] of Object.entries(COLUMN_MAP)) row[key] = r[ar];
            return row;
          })
          .filter((r) => r.name && String(r.name).trim() && !String(r.name).includes("أرز بسمتي فاخر")); // يستبعد صف المثال
        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function ManualAddForm({ session, categories, onAdded }) {
  const [form, setForm] = useState({
    name: "", barcode: "", category_id: "other", unit: "كرتون",
    quantity: "", cost: "", wholesale_price: "", retail_price: "", sku: "",
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [matched, setMatched] = useState(null); // null = لم يُفحص بعد، false = صنف جديد، object = صنف موجود
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (k === "barcode") setMatched(null);
  };

  const checkBarcode = async () => {
    if (!form.barcode.trim()) return;
    setChecking(true);
    const { data } = await supabase
      .from("product_catalog")
      .select("id, name")
      .eq("barcode", form.barcode.trim())
      .maybeSingle();
    setChecking(false);
    if (data) {
      setMatched(data);
      setForm((f) => ({ ...f, name: data.name }));
    } else {
      setMatched(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim() || !form.wholesale_price) {
      setErr("اسم المنتج وسعر الجملة حقلان إجباريان.");
      return;
    }
    setLoading(true);
    try {
      let catalogId = null;

      if (form.barcode.trim()) {
        const { data: existing } = await supabase
          .from("product_catalog")
          .select("id")
          .eq("barcode", form.barcode.trim())
          .maybeSingle();
        if (existing) catalogId = existing.id;
      }

      if (!catalogId) {
        const { data: newCat, error: catErr } = await supabase
          .from("product_catalog")
          .insert({
            barcode: form.barcode.trim() || null,
            name: form.name.trim(),
            category_id: form.category_id,
            created_by: session.user.id,
          })
          .select("id")
          .single();
        if (catErr) throw catErr;
        catalogId = newCat.id;
      }

      const { error: listErr } = await supabase.from("trader_listings").upsert(
        {
          trader_id: session.user.id,
          catalog_id: catalogId,
          sku: form.sku || null,
          quantity: Number(form.quantity) || 0,
          cost: form.cost ? Number(form.cost) : null,
          wholesale_price: Number(form.wholesale_price),
          retail_price: form.retail_price ? Number(form.retail_price) : null,
          active: true,
        },
        { onConflict: "trader_id,catalog_id" }
      );
      if (listErr) throw listErr;

      setSuccess(true);
      setForm({ name: "", barcode: "", category_id: "other", unit: "كرتون", quantity: "", cost: "", wholesale_price: "", retail_price: "", sku: "" });
      onAdded();
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      setErr(`حدث خطأ: ${e?.message || "غير معروف"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl p-6" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <div className="text-sm font-semibold mb-1" style={{ color: T.ink }}>إضافة منتج واحد</div>
      <div className="text-xs mb-4" style={{ color: T.sub }}>الطريقة الأسرع لو عندك منتجات قليلة — بدون ملفات.</div>

      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>اسم المنتج *</label>
          <input value={form.name} onChange={set("name")} className="w-full text-sm rounded-lg py-2 px-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </div>

        <div className="col-span-2">
          <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>الباركود (اختياري)</label>
          <div className="flex gap-1.5">
            <input value={form.barcode} onChange={set("barcode")} className="flex-1 text-sm rounded-lg py-2 px-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
            <button type="button" onClick={checkBarcode} disabled={checking || !form.barcode.trim()} className="text-xs font-medium px-3 rounded-lg" style={{ background: T.paperDeep, color: T.sealDeep }}>
              {checking ? <Loader2 size={13} className="animate-spin" /> : "تحقق"}
            </button>
          </div>
          {matched === false && (
            <div className="text-[11px] mt-1" style={{ color: T.sealDeep }}>صنف جديد كلياً — سيُضاف للمراجعة.</div>
          )}
          {matched && (
            <div className="text-[11px] mt-1 flex items-center gap-1" style={{ color: T.good }}>
              <CheckCircle2 size={11} /> منتج موجود مسبقاً باسم "{matched.name}" — سيُضاف سعرك فقط لنفس الصنف.
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>الفئة</label>
          <select value={form.category_id} onChange={set("category_id")} className="w-full text-sm rounded-lg py-2 px-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>الكمية المتوفرة</label>
          <input type="number" value={form.quantity} onChange={set("quantity")} className="w-full text-sm rounded-lg py-2 px-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>سعر الجملة *</label>
          <input type="number" step="0.01" value={form.wholesale_price} onChange={set("wholesale_price")} className="w-full text-sm rounded-lg py-2 px-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>سعر التكلفة (اختياري)</label>
          <input type="number" step="0.01" value={form.cost} onChange={set("cost")} className="w-full text-sm rounded-lg py-2 px-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>سعر التجزئة (اختياري)</label>
          <input type="number" step="0.01" value={form.retail_price} onChange={set("retail_price")} className="w-full text-sm rounded-lg py-2 px-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </div>

        {err && <div className="col-span-2 text-xs" style={{ color: T.bad }}>{err}</div>}
        {success && <div className="col-span-2 text-xs flex items-center gap-1.5" style={{ color: T.good }}><CheckCircle2 size={13} /> تمت إضافة المنتج بنجاح</div>}

        <button
          type="submit"
          disabled={loading}
          className="col-span-2 mt-1 text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
          style={{ background: T.ink, color: "#fff" }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          إضافة المنتج
        </button>
      </form>
    </div>
  );
}

function ImportPanel({ session, categories, onImported }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const catByName = Object.fromEntries(categories.map((c) => [c.name_ar, c.id]));

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = await parseSheet(file);
      if (!parsed.length) {
        setErr("ما لقيت صفوف صالحة في الملف — تأكد إنك استخدمت القالب الرسمي وعبّيت اسم المنتج على الأقل.");
        setRows(null);
        return;
      }
      setRows(parsed);
    } catch {
      setErr("تعذّر قراءة الملف — تأكد إنه بصيغة xlsx صحيحة.");
    }
  };

  const confirmImport = async () => {
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    let matched = 0, created = 0, failed = 0;
    const CHUNK = 400;

    // 1. جمع كل الباركودات الموجودة بالملف (بدون فراغ)، ونجيب أي منتج
    // مطابق موجود مسبقاً بالكتالوج المرجعي دفعة وحدة (بدل طلب لكل صف)
    const barcodes = [...new Set(rows.filter((r) => r.barcode).map((r) => String(r.barcode).trim()))];
    const existingByBarcode = {};
    for (let i = 0; i < barcodes.length; i += CHUNK) {
      const slice = barcodes.slice(i, i + CHUNK);
      const { data } = await supabase.from("product_catalog").select("id, barcode").in("barcode", slice);
      (data || []).forEach((d) => { existingByBarcode[d.barcode] = d.id; });
    }

    // 2. الصفوف اللي محتاجة صنف جديد بالكتالوج (باركود غير موجود، أو بدون باركود)
    const needsNewCatalog = rows.filter((r) => !r.barcode || !existingByBarcode[String(r.barcode).trim()]);
    const catalogIdByRowIndex = {};
    for (let i = 0; i < needsNewCatalog.length; i += CHUNK) {
      const slice = needsNewCatalog.slice(i, i + CHUNK);
      const payload = slice.map((r) => ({
        barcode: r.barcode ? String(r.barcode).trim() : null,
        name: String(r.name).trim(),
        category_id: catByName[r.category_name] || "other",
        brand: r.brand || null,
        description: r.description || null,
        created_by: session.user.id,
      }));
      const { data, error } = await supabase.from("product_catalog").insert(payload).select("id");
      if (!error && data) {
        slice.forEach((r, idx) => { catalogIdByRowIndex[rows.indexOf(r)] = data[idx]?.id; });
        created += data.length;
      } else {
        failed += slice.length;
      }
      setProgress({ done: Math.min(i + CHUNK, needsNewCatalog.length), total: rows.length });
    }

    // 3. بناء قوائم التاجر دفعة وحدة، والحفظ على شكل دفعات كبيرة
    const listingsPayload = [];
    rows.forEach((r, idx) => {
      const catalogId = (r.barcode && existingByBarcode[String(r.barcode).trim()]) || catalogIdByRowIndex[idx];
      if (!catalogId) return;
      if (r.barcode && existingByBarcode[String(r.barcode).trim()]) matched++;
      listingsPayload.push({
        trader_id: session.user.id,
        catalog_id: catalogId,
        sku: r.sku || null,
        quantity: Number(r.quantity) || 0,
        cost: r.cost ? Number(r.cost) : null,
        wholesale_price: Number(r.wholesale_price) || 0,
        retail_price: r.retail_price ? Number(r.retail_price) : null,
        active: true,
      });
    });

    for (let i = 0; i < listingsPayload.length; i += CHUNK) {
      const slice = listingsPayload.slice(i, i + CHUNK);
      const { error } = await supabase.from("trader_listings").upsert(slice, { onConflict: "trader_id,catalog_id" });
      if (error) failed += slice.length;
      setProgress({ done: rows.length, total: rows.length });
    }

    await supabase.from("product_import_batches").insert({
      trader_id: session.user.id,
      total_rows: rows.length,
      matched_existing: matched,
      created_new: created,
      failed_rows: failed,
    });

    setImporting(false);
    setResult({ matched, created, failed, total: rows.length });
    setRows(null);
    onImported();
  };

  if (result) {
    return (
      <div className="rounded-xl p-6" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
        <CheckCircle2 className="mb-3" size={26} style={{ color: T.good }} />
        <div className="text-sm font-semibold mb-1" style={{ color: T.ink }}>تم الاستيراد</div>
        <div className="text-xs" style={{ color: T.sub }}>
          {result.total} صف — {result.matched} انربط بصنف موجود، {result.created} صنف جديد (قيد المراجعة)، {result.failed} فشل.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-6" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <div className="flex items-center gap-2 mb-1">
        <FileSpreadsheet size={16} style={{ color: T.sealDeep }} />
        <span className="text-sm font-semibold" style={{ color: T.ink }}>استيراد منتجات من ملف Excel</span>
      </div>
      <div className="text-xs mb-4" style={{ color: T.sub }}>استخدم قالب المنصة الرسمي فقط.</div>

      {!rows && (
        <label
          className="flex flex-col items-center justify-center gap-2 rounded-lg p-8 cursor-pointer"
          style={{ background: T.paper, border: `1px dashed ${T.line}` }}
        >
          <Upload size={22} style={{ color: T.sealDeep }} />
          <span className="text-xs" style={{ color: T.sub }}>{fileName || "اختيار ملف .xlsx"}</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={pick} />
        </label>
      )}

      {err && (
        <div className="flex items-center gap-2 text-xs mt-3 p-3 rounded-lg" style={{ background: T.badBg, color: T.bad }}>
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {rows && (
        <div>
          <div className="text-xs mb-2" style={{ color: T.sub }}>معاينة — {rows.length} صف جاهز للاستيراد:</div>
          <div className="max-h-64 overflow-y-auto rounded-lg mb-4" style={{ border: `1px solid ${T.line}` }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: T.paper, color: T.sub }}>
                  <th className="p-2 text-start">الاسم</th>
                  <th className="p-2 text-start">الباركود</th>
                  <th className="p-2 text-start">الفئة</th>
                  <th className="p-2 text-start">سعر الجملة</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${T.line}` }}>
                    <td className="p-2" style={{ color: T.ink }}>{r.name}</td>
                    <td className="p-2" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>{r.barcode || "—"}</td>
                    <td className="p-2" style={{ color: T.sub }}>{r.category_name || "—"}</td>
                    <td className="p-2" style={{ color: T.sub }}>{r.wholesale_price || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importing && (
            <div className="mb-2">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: T.paper }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ background: T.seal, width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                />
              </div>
              <div className="text-[11px] mt-1 text-center" style={{ color: T.sub }}>
                {progress.done} / {progress.total} — قد يأخذ عدة دقائق لملفات كبيرة، لا تغلق الصفحة
              </div>
            </div>
          )}
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
              disabled={importing}
              className="flex-1 text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2"
              style={{ background: T.ink, color: "#fff" }}
            >
              {importing && <Loader2 size={14} className="animate-spin" />}
              تأكيد الاستيراد ({rows.length} منتج)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ListingsTable({ listings, loading }) {
  if (loading) return <div className="text-sm" style={{ color: T.sub }}>جارٍ التحميل...</div>;
  if (!listings.length) return <div className="text-sm p-6 text-center rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>لسه ما أضفت أي منتج.</div>;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: T.paper, color: T.sub }}>
            <th className="text-start font-medium px-4 py-3">المنتج</th>
            <th className="text-start font-medium px-4 py-3">الفئة</th>
            <th className="text-start font-medium px-4 py-3">الكمية</th>
            <th className="text-start font-medium px-4 py-3">سعر الجملة</th>
            <th className="text-start font-medium px-4 py-3">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l, i) => (
            <tr key={l.id} style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}>
              <td className="px-4 py-3 font-medium" style={{ color: T.ink }}>{l.product_catalog?.name}</td>
              <td className="px-4 py-3" style={{ color: T.sub }}>{l.product_catalog?.category_id || "—"}</td>
              <td className="px-4 py-3" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>{l.quantity}</td>
              <td className="px-4 py-3" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>{l.wholesale_price}</td>
              <td className="px-4 py-3">
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={
                    l.product_catalog?.status === "approved"
                      ? { background: T.goodBg, color: T.good }
                      : { background: "#FBF1DD", color: T.sealDeep }
                  }
                >
                  {l.product_catalog?.status === "approved" ? "معتمد" : "قيد المراجعة"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WalletPanel({ session }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [itemsCache, setItemsCache] = useState({});

  useEffect(() => {
    supabase
      .from("trader_invoices")
      .select("*, orders(customer_id, profiles!customer_id(business_name, full_name))")
      .eq("trader_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setInvoices(data || []);
        setLoading(false);
      });
  }, [session]);

  const toggleExpand = async (inv) => {
    if (expanded === inv.id) {
      setExpanded(null);
      return;
    }
    setExpanded(inv.id);
    if (!itemsCache[inv.id]) {
      const { data } = await supabase
        .from("order_items")
        .select("product_name, quantity, unit_price, line_total")
        .eq("order_id", inv.order_id)
        .eq("trader_id", session.user.id);
      setItemsCache((c) => ({ ...c, [inv.id]: data || [] }));
    }
  };

  if (loading) return <div className="text-sm text-center py-10" style={{ color: T.sub }}>جارٍ التحميل...</div>;

  const pending = invoices.filter((i) => i.status === "pending");
  const settled = invoices.filter((i) => i.status === "settled");
  const pendingTotal = pending.reduce((s, i) => s + Number(i.net_payable), 0);
  const settledTotal = settled.reduce((s, i) => s + Number(i.net_payable), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          <div className="text-[11px]" style={{ color: T.sub }}>مستحق قيد التحويل</div>
          <div className="text-xl font-semibold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.sealDeep }}>
            {pendingTotal.toFixed(2)} <span className="text-xs font-normal">ر.س</span>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          <div className="text-[11px]" style={{ color: T.sub }}>تم تحويله سابقاً</div>
          <div className="text-xl font-semibold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.good }}>
            {settledTotal.toFixed(2)} <span className="text-xs font-normal">ر.س</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {invoices.length === 0 ? (
          <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>
            لا توجد فواتير بعد.
          </div>
        ) : invoices.map((inv) => (
          <div key={inv.id} className="rounded-xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
            <button onClick={() => toggleExpand(inv)} className="w-full flex items-center gap-3 p-4 text-right">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium flex items-center gap-2" style={{ color: T.ink }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>طلب #{inv.order_id?.slice(0, 8)}</span>
                  <span style={{ color: T.sub, fontWeight: 400, fontSize: 11 }}>{new Date(inv.created_at).toLocaleDateString("ar-SA")}</span>
                </div>
                <div className="text-[11px] mt-1" style={{ color: T.sub }}>
                  هذه الفاتورة تخص منتجاتك فقط ضمن طلب من العميل {inv.orders?.profiles?.business_name || inv.orders?.profiles?.full_name || "—"}
                </div>
              </div>
              <div className="text-left shrink-0">
                <div className="text-sm font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.ink }}>{inv.net_payable} ر.س</div>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={inv.status === "settled" ? { background: T.goodBg, color: T.good } : { background: "#FBF1DD", color: T.sealDeep }}
                >
                  {inv.status === "settled" ? "تم التحويل" : "قيد الانتظار"}
                </span>
              </div>
            </button>

            {expanded === inv.id && (
              <div className="px-4 pb-4" style={{ borderTop: `1px solid ${T.line}` }}>
                <div className="text-[11px] pt-3 pb-2" style={{ color: T.sub }}>
                  إجمالي منتجاتك: {inv.subtotal} ر.س − عمولة المنصة ({inv.commission_rate}%): {inv.commission_amount} ر.س = صافي {inv.net_payable} ر.س
                </div>
                {(itemsCache[inv.id] || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5" style={{ borderTop: i ? `1px solid ${T.line}` : "none", color: T.ink }}>
                    <span>{item.product_name} × {item.quantity}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: T.sub }}>{item.line_total} ر.س</span>
                  </div>
                ))}
                {inv.settlement_reference && (
                  <div className="text-[11px] mt-2" style={{ color: T.good }}>مرجع التحويل: {inv.settlement_reference}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdsPanel({ session }) {
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState(null);
  const [contentType, setContentType] = useState("image");
  const [textContent, setTextContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  const [viewCounts, setViewCounts] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      supabase.from("ad_slots").select("*").eq("active", true),
      supabase.from("ad_bookings").select("*, ad_slots(name_ar)").eq("trader_id", session.user.id).order("created_at", { ascending: false }),
    ]).then(async ([s, b]) => {
      setSlots(s.data || []);
      setBookings(b.data || []);
      setLoading(false);
      if (s.data?.length && !selectedSlot) setSelectedSlot(s.data[0].id);

      const counts = {};
      for (const booking of b.data || []) {
        const { count } = await supabase.from("ad_impressions").select("id", { count: "exact", head: true }).eq("booking_id", booking.id);
        counts[booking.id] = count || 0;
      }
      setViewCounts(counts);
    });
  };

  const deleteBooking = async (id) => {
    setDeletingId(id);
    await supabase.from("ad_bookings").delete().eq("id", id);
    setDeletingId(null);
    load();
  };

  useEffect(load, [session]);

  const slot = slots.find((s) => s.id === selectedSlot);
  const days = startDate && endDate ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000)) : 0;
  const estimatedPrice = slot && days ? (slot.price_per_day * days).toFixed(2) : "0.00";
  const filePreviewUrl = file ? URL.createObjectURL(file) : null;
  const isVideo = file && file.type.startsWith("video");

  const isTickerSlot = selectedSlot === "ticker" || selectedSlot === "app_ticker";

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (contentType === "image" && !file) {
      setErr("يرجى اختيار صورة أو مقطع للإعلان.");
      return;
    }
    if (contentType === "text" && !textContent.trim()) {
      setErr("يرجى كتابة نص الإعلان.");
      return;
    }
    if (!startDate || !endDate || days < 1) {
      setErr("يرجى تحديد تاريخ بداية ونهاية صحيحين.");
      return;
    }
    setSubmitting(true);
    try {
      let path = null;
      if (contentType === "image") {
        const ext = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "");
        path = `${session.user.id}/${selectedSlot}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("ad-creatives").upload(path, file);
        if (upErr) throw upErr;
      }

      const { error: reqErr } = await supabase.rpc("request_ad_booking", {
        p_slot_id: selectedSlot,
        p_media_path: path,
        p_link_url: linkUrl || null,
        p_start_date: startDate,
        p_end_date: endDate,
        p_content_type: contentType,
        p_text_content: contentType === "text" ? textContent.trim() : null,
      });
      if (reqErr) throw reqErr;

      setSuccess(true);
      setFile(null);
      setTextContent("");
      setStartDate("");
      setEndDate("");
      setLinkUrl("");
      load();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setErr(`حدث خطأ: ${e?.message || "غير معروف"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_LABELS = {
    pending_payment: "بانتظار تأكيد السداد",
    pending_review: "قيد المراجعة",
    active: "نشط الآن",
    rejected: "مرفوض",
    expired: "منتهي",
  };

  if (loading) return <div className="text-sm text-center py-10" style={{ color: T.sub }}>جارٍ التحميل...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-6" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
        <div className="text-sm font-semibold mb-1" style={{ color: T.ink }}>طلب حجز مساحة إعلانية</div>
        <div className="text-xs mb-4" style={{ color: T.sub }}>اختر المساحة، ارفع الصورة أو المقطع، وحدد الفترة — يُنشر إعلانك بعد تأكيد سداد الرسوم من الإدارة.</div>

        <form onSubmit={submit}>
          <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>المساحة الإعلانية</label>
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="w-full text-sm rounded-lg py-2 px-3 mb-1 outline-none"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
          >
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_ar} — {s.price_per_day} ر.س/يوم ({s.placement === "landing_page" ? "الصفحة الرئيسية" : "داخل تطبيق العملاء"})
              </option>
            ))}
          </select>
          {slot && <div className="text-[11px] mb-3" style={{ color: T.sub }}>{slot.description_ar}</div>}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>تاريخ البداية</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full text-sm rounded-lg py-2 px-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>تاريخ النهاية</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full text-sm rounded-lg py-2 px-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
            </div>
          </div>

          <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>رابط الإعلان عند الضغط عليه (اختياري)</label>
          <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full text-sm rounded-lg py-2 px-3 mb-3 outline-none" style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />

          {isTickerSlot && (
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setContentType("image")}
                className="flex-1 text-xs font-medium py-2 rounded-lg"
                style={{ background: contentType === "image" ? T.ink : T.paper, color: contentType === "image" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
              >
                صورة
              </button>
              <button
                type="button"
                onClick={() => setContentType("text")}
                className="flex-1 text-xs font-medium py-2 rounded-lg"
                style={{ background: contentType === "text" ? T.ink : T.paper, color: contentType === "text" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
              >
                نص متحرك
              </button>
            </div>
          )}

          {contentType === "text" && isTickerSlot ? (
            <div className="mb-3">
              <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>نص الإعلان (حتى 120 حرف)</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value.slice(0, 120))}
                rows={2}
                placeholder="مثال: عروض هذا الأسبوع على المعلبات — تواصل معنا الآن!"
                className="w-full text-sm rounded-lg py-2 px-3 outline-none"
                style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
              />
              <div className="text-[11px] text-left mt-1" style={{ color: T.sub }}>{textContent.length} / 120</div>
            </div>
          ) : (
            <>
              <label className="text-xs font-medium block mb-1" style={{ color: T.sub }}>الصورة أو المقطع</label>
              {slot?.recommended_width && (
                <div className="text-[11px] mb-1.5" style={{ color: T.sealDeep }}>
                  المقاس الموصى به لهذه المساحة: {slot.recommended_width} × {slot.recommended_height} بكسل (نفس النسبة تقريباً حتى لا يظهر الإعلان مشوَّهاً أو مقصوصاً)
                </div>
              )}
              <label
                className="flex items-center gap-2 rounded-lg p-3 mb-3 cursor-pointer"
                style={{ background: T.paper, border: `1px dashed ${T.line}` }}
              >
                <Upload size={16} style={{ color: T.sealDeep }} />
                <span className="text-xs" style={{ color: T.sub }}>{file?.name || "اختيار ملف"}</span>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>

              {filePreviewUrl && slot && (
                <div className="mb-3">
                  <div className="text-[11px] font-medium mb-1" style={{ color: T.sub }}>معاينة كيف سيظهر الإعلان تقريباً:</div>
                  <div
                    className="rounded-lg overflow-hidden flex items-center justify-center"
                    style={{
                      background: T.paperDeep,
                      border: `1px solid ${T.line}`,
                      aspectRatio: `${slot.recommended_width || 16} / ${slot.recommended_height || 9}`,
                      maxHeight: 220,
                    }}
                  >
                    {isVideo ? (
                      <video src={filePreviewUrl} className="w-full h-full object-cover" muted autoPlay loop />
                    ) : (
                      <img src={filePreviewUrl} alt="معاينة" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="rounded-lg p-3 mb-3 flex items-center justify-between" style={{ background: "#FBF1DD" }}>
            <span className="text-xs" style={{ color: T.sealDeep }}>السعر التقديري ({days || 0} يوم)</span>
            <span className="text-sm font-semibold" style={{ color: T.sealDeep, fontFamily: "'JetBrains Mono', monospace" }}>{estimatedPrice} ر.س</span>
          </div>

          {err && <div className="text-xs mb-3" style={{ color: T.bad }}>{err}</div>}
          {success && <div className="text-xs mb-3 flex items-center gap-1.5" style={{ color: T.good }}><CheckCircle2 size={13} /> تم إرسال طلب الحجز، بانتظار تأكيد السداد من الإدارة.</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
            style={{ background: T.ink, color: "#fff" }}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            إرسال طلب الحجز
          </button>
        </form>
      </div>

      <div className="rounded-xl p-6" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
        <div className="text-sm font-semibold mb-3" style={{ color: T.ink }}>طلباتي الإعلانية ({bookings.length})</div>
        {bookings.length === 0 ? (
          <div className="text-xs text-center py-6" style={{ color: T.sub }}>لا توجد طلبات إعلانية بعد.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: T.paper, border: `1px solid ${T.line}` }}>
                <div>
                  <div className="text-xs font-medium" style={{ color: T.ink }}>{b.ad_slots?.name_ar}</div>
                  <div className="text-[11px]" style={{ color: T.sub }}>{b.start_date} → {b.end_date} · {b.total_price} ر.س</div>
                  {b.status === "active" && (
                    <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: T.sealDeep }}>
                      <Eye size={11} /> {viewCounts[b.id] ?? 0} مشاهدة
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={
                      b.status === "active" ? { background: T.goodBg, color: T.good }
                      : b.status === "rejected" ? { background: T.badBg, color: T.bad }
                      : { background: "#FBF1DD", color: T.sealDeep }
                    }
                  >
                    {STATUS_LABELS[b.status] || b.status}
                  </span>
                  <button
                    onClick={() => { if (window.confirm("هل تريد حذف هذا الإعلان نهائياً؟")) deleteBooking(b.id); }}
                    disabled={deletingId === b.id}
                    title="حذف الإعلان"
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: T.badBg, color: T.bad }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TraderDashboard() {
  useFonts();
  useIdleLogout(30);
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loadingListings, setLoadingListings] = useState(true);
  const [addMethod, setAddMethod] = useState("manual");
  const [view, setView] = useState("products");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadListings = useCallback(async () => {
    if (!session) return;
    setLoadingListings(true);
    let all = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await supabase
        .from("trader_listings")
        .select("*, product_catalog(name, category_id, status)")
        .eq("trader_id", session.user.id)
        .order("updated_at", { ascending: false })
        .range(from, from + PAGE - 1);
      all = all.concat(data || []);
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    setListings(all);
    setLoadingListings(false);
  }, [session]);

  const [authorized, setAuthorized] = useState(null); // null = يتحقق، true/false = النتيجة

  useEffect(() => {
    if (!session) return;
    supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", session.user.id)
      .eq("role_id", "trader")
      .maybeSingle()
      .then(({ data }) => setAuthorized(!!data));
  }, [session]);

  useEffect(() => {
    loadListings();
    supabase.from("product_categories").select("*").then(({ data }) => setCategories(data || []));
    if (session) {
      supabase.from("profiles").select("store_name, full_name, store_category").eq("id", session.user.id).single()
        .then(({ data }) => setProfile(data));
    }
  }, [loadListings, session]);

  if (checking) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: T.paper }}>
        <Loader2 className="animate-spin" style={{ color: T.sealDeep }} />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (authorized === null) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: T.paper }}>
        <Loader2 className="animate-spin" style={{ color: T.sealDeep }} />
      </div>
    );
  }
  if (authorized === false) return <Navigate to="/login" replace />;

  return (
    <div dir="rtl" className="w-full min-h-screen" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}>
      <header className="px-6 md:px-10 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.line}` }}>
        <Link to="/" className="flex items-center gap-2" style={{ textDecoration: "none" }} title="الصفحة الرئيسية">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>لوحة تحكم متجر {profile?.store_name || "التاجر"}</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => supabase.auth.signOut()} className="text-xs font-medium flex items-center gap-1.5" style={{ color: T.sub }}>
            <LogOut size={14} /> خروج
          </button>
        </div>
      </header>

      <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-6">
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: T.goodBg, border: `1px solid #BFE0CE` }}>
          <Store size={20} style={{ color: T.good }} />
          <div>
            <div className="text-sm font-semibold" style={{ color: T.ink }}>
              أهلاً بك، {profile?.full_name || "تاجرنا الكريم"}
            </div>
            <div className="text-[11px]" style={{ color: T.sub }}>
              هذه لوحة التحكم الخاصة بمتجر <span className="font-bold" style={{ color: T.ink }}>{profile?.store_name || "متجرك"}</span>
              {profile?.store_category ? ` (${STORE_CATEGORY_LABELS[profile.store_category] || ""})` : ""} على منصة أصناف الجملة
            </div>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setView("products")}
            className="flex-1 text-xs font-medium py-2.5 rounded-lg"
            style={{ background: view === "products" ? T.ink : "#fff", color: view === "products" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
          >
            المنتجات
          </button>
          <button
            onClick={() => setView("wallet")}
            className="flex-1 text-xs font-medium py-2.5 rounded-lg"
            style={{ background: view === "wallet" ? T.ink : "#fff", color: view === "wallet" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
          >
            المحفظة
          </button>
          <button
            onClick={() => setView("ads")}
            className="flex-1 text-xs font-medium py-2.5 rounded-lg"
            style={{ background: view === "ads" ? T.seal : "#FBF1DD", color: view === "ads" ? T.ink : T.sealDeep, border: "1px solid #E8D5A8" }}
          >
            الإعلانات
          </button>
        </div>

        {view === "wallet" ? (
          <WalletPanel session={session} />
        ) : view === "ads" ? (
          <AdsPanel session={session} />
        ) : (
        <>
        <div className="flex gap-2">
          <button
            onClick={() => setAddMethod("manual")}
            className="text-xs font-medium px-4 py-2 rounded-lg"
            style={{ background: addMethod === "manual" ? T.ink : "#fff", color: addMethod === "manual" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
          >
            إضافة منتج واحد
          </button>
          <button
            onClick={() => setAddMethod("import")}
            className="text-xs font-medium px-4 py-2 rounded-lg"
            style={{ background: addMethod === "import" ? T.ink : "#fff", color: addMethod === "import" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
          >
            استيراد من ملف Excel
          </button>
        </div>
        {addMethod === "manual" ? (
          <ManualAddForm session={session} categories={categories} onAdded={loadListings} />
        ) : (
          <ImportPanel session={session} categories={categories} onImported={loadListings} />
        )}
        <div>
          <div className="text-sm font-semibold mb-3" style={{ color: T.ink }}>منتجاتي ({listings.length})</div>
          <ListingsTable listings={listings} loading={loadingListings} />
        </div>
        </>
        )}
      </div>
    </div>
  );
}
