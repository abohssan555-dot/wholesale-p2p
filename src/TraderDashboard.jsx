import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import { Package, Upload, Loader2, CheckCircle2, LogOut, FileSpreadsheet, AlertTriangle, Home, Store } from "lucide-react";

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
    let matched = 0, created = 0, failed = 0;

    for (const row of rows) {
      try {
        let catalogId = null;

        if (row.barcode) {
          const { data: existing } = await supabase
            .from("product_catalog")
            .select("id")
            .eq("barcode", String(row.barcode).trim())
            .maybeSingle();
          if (existing) catalogId = existing.id;
        }

        if (!catalogId) {
          const { data: newCat, error: catErr } = await supabase
            .from("product_catalog")
            .insert({
              barcode: row.barcode ? String(row.barcode).trim() : null,
              name: String(row.name).trim(),
              category_id: catByName[row.category_name] || "other",
              brand: row.brand || null,
              description: row.description || null,
              created_by: session.user.id,
            })
            .select("id")
            .single();
          if (catErr) throw catErr;
          catalogId = newCat.id;
          created++;
        } else {
          matched++;
        }

        const { error: listErr } = await supabase.from("trader_listings").upsert(
          {
            trader_id: session.user.id,
            catalog_id: catalogId,
            sku: row.sku || null,
            quantity: Number(row.quantity) || 0,
            cost: row.cost ? Number(row.cost) : null,
            wholesale_price: Number(row.wholesale_price) || 0,
            retail_price: row.retail_price ? Number(row.retail_price) : null,
            active: true,
          },
          { onConflict: "trader_id,catalog_id" }
        );
        if (listErr) throw listErr;
      } catch {
        failed++;
      }
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
    const { data } = await supabase
      .from("trader_listings")
      .select("*, product_catalog(name, category_id, status)")
      .eq("trader_id", session.user.id)
      .order("updated_at", { ascending: false });
    setListings(data || []);
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
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>لوحة تحكم متجر {profile?.store_name || "التاجر"}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ color: T.sub, border: `1px solid ${T.line}`, textDecoration: "none" }}
          >
            <Home size={13} /> الصفحة الرئيسية
          </Link>
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
      </div>
    </div>
  );
}
