import React, { useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import {
  Package, Search, ShoppingCart, Plus, Minus, X, Loader2,
  Store, LogOut, Home, CheckCircle2, AlertTriangle,
} from "lucide-react";

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

const CATEGORIES = [
  { id: "", label: "كل الفئات" },
  { id: "beverages", label: "مشروبات وعصائر" },
  { id: "dairy", label: "ألبان وأجبان" },
  { id: "grains_rice", label: "أرز وحبوب" },
  { id: "canned_goods", label: "معلبات" },
  { id: "cleaning", label: "منظفات ومستلزمات منزلية" },
  { id: "snacks", label: "وجبات خفيفة وحلويات" },
  { id: "fresh_produce", label: "خضار وفواكه" },
  { id: "bakery", label: "مخابز" },
  { id: "personal_care", label: "عناية شخصية" },
  { id: "plastics", label: "بلاستيك ومستلزمات تعبئة" },
  { id: "hardware", label: "خردوات وأدوات" },
  { id: "other", label: "أخرى" },
];

const PAGE_SIZE = 20;
const CART_KEY = "asnaf-cart";

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function ProductRow({ listing, onAdd, inCart }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.paperDeep }}>
        <Package size={18} style={{ color: T.sealDeep }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: T.ink }}>{listing.product_catalog.name}</div>
        <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: T.sub }}>
          <Store size={11} /> {listing.profiles?.store_name || "متجر"} · {listing.profiles?.city || ""}
        </div>
      </div>
      <div className="text-left shrink-0">
        <div className="text-sm font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.ink }}>
          {listing.wholesale_price} <span className="text-[11px] font-normal" style={{ color: T.sub }}>ر.س</span>
        </div>
        <div className="text-[10px]" style={{ color: T.sub }}>متوفر: {listing.quantity}</div>
      </div>
      <button
        onClick={() => onAdd(listing)}
        disabled={listing.quantity <= 0}
        className="shrink-0 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1"
        style={{
          background: listing.quantity <= 0 ? T.paperDeep : inCart ? T.goodBg : T.ink,
          color: listing.quantity <= 0 ? T.sub : inCart ? T.good : "#fff",
        }}
      >
        {inCart ? <CheckCircle2 size={13} /> : <Plus size={13} />}
        {listing.quantity <= 0 ? "غير متوفر" : inCart ? "أُضيف" : "إضافة"}
      </button>
    </div>
  );
}

function CartDrawer({ cart, setCart, onClose, session }) {
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(null);

  const setQty = (key, qty) => {
    const updated = cart.map((c) => (c.key === key ? { ...c, quantity: Math.max(1, qty) } : c));
    setCart(updated);
    saveCart(updated);
  };

  const removeItem = (key) => {
    const updated = cart.filter((c) => c.key !== key);
    setCart(updated);
    saveCart(updated);
  };

  const byTrader = cart.reduce((acc, item) => {
    (acc[item.trader_id] ||= { store_name: item.store_name, items: [] }).items.push(item);
    return acc;
  }, {});

  const subtotal = cart.reduce((s, c) => s + c.wholesale_price * c.quantity, 0);
  const traderCount = Object.keys(byTrader).length;
  const deliveryFee = traderCount === 0 ? 0 : 15 + (traderCount - 1) * 8; // تقديري مبدئي، سيُستبدل بمحرك رسوم فعلي لاحقاً

  const checkout = async () => {
    setErr("");
    setPlacing(true);
    const items = cart.map((c) => ({ catalog_id: c.catalog_id, trader_id: c.trader_id, quantity: c.quantity }));
    const { data, error } = await supabase.rpc("place_order", {
      p_items: items,
      p_delivery_mode: "single_driver",
      p_delivery_city: session.city || null,
    });
    setPlacing(false);
    if (error) {
      setErr(error.message || "تعذّر إتمام الطلب.");
      return;
    }
    setSuccess(data);
    setCart([]);
    saveCart([]);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(20,33,59,0.55)" }}>
        <div className="w-full max-w-sm rounded-xl p-7 text-center" style={{ background: "#fff" }}>
          <CheckCircle2 className="mx-auto mb-3" size={30} style={{ color: T.good }} />
          <div className="text-sm font-semibold mb-1" style={{ color: T.ink }}>تم إنشاء الطلب بنجاح</div>
          <div className="text-xs mb-4" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>
            رقم الطلب: {success.slice(0, 8)}
          </div>
          <button onClick={onClose} className="text-xs font-medium px-4 py-2 rounded-lg" style={{ background: T.ink, color: "#fff" }}>
            متابعة التسوّق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(20,33,59,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-sm h-full overflow-y-auto p-5" style={{ background: T.paper }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: T.ink }}>سلة الطلب</span>
          <button onClick={onClose}><X size={18} style={{ color: T.sub }} /></button>
        </div>

        {cart.length === 0 ? (
          <div className="text-xs text-center py-10" style={{ color: T.sub }}>السلة فارغة حالياً.</div>
        ) : (
          <>
            {Object.entries(byTrader).map(([traderId, group]) => (
              <div key={traderId} className="mb-4">
                <div className="text-[11px] font-medium flex items-center gap-1 mb-2" style={{ color: T.sealDeep }}>
                  <Store size={11} /> {group.store_name}
                </div>
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center gap-2 mb-2 p-2.5 rounded-lg" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: T.ink }}>{item.product_name}</div>
                      <div className="text-[11px]" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>{item.wholesale_price} ر.س</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(item.key, item.quantity - 1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: T.paper }}>
                        <Minus size={11} />
                      </button>
                      <span className="text-xs w-5 text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.quantity}</span>
                      <button onClick={() => setQty(item.key, item.quantity + 1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: T.paper }}>
                        <Plus size={11} />
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.key)}><X size={14} style={{ color: T.bad }} /></button>
                  </div>
                ))}
              </div>
            ))}

            <div className="rounded-lg p-3 mt-2" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
              <div className="flex justify-between text-xs mb-1" style={{ color: T.sub }}>
                <span>المجموع الفرعي</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{subtotal.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-xs mb-1" style={{ color: T.sub }}>
                <span>رسوم التوصيل (تقديرية — {traderCount} تاجر)</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{deliveryFee} ر.س</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 mt-2" style={{ borderTop: `1px solid ${T.line}`, color: T.ink }}>
                <span>الإجمالي التقديري</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{(subtotal + deliveryFee).toFixed(2)} ر.س</span>
              </div>
            </div>

            {err && (
              <div className="flex items-center gap-2 text-xs mt-3 p-3 rounded-lg" style={{ background: T.badBg, color: T.bad }}>
                <AlertTriangle size={13} /> {err}
              </div>
            )}

            <button
              onClick={checkout}
              disabled={placing}
              className="w-full mt-4 text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
              style={{ background: T.ink, color: "#fff" }}
            >
              {placing && <Loader2 size={14} className="animate-spin" />}
              تأكيد الطلب
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProductBrowse() {
  useFonts();
  useIdleLogout(30);
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState(loadCart());
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchPage = useCallback(async (pageNum, reset) => {
    setLoading(true);
    let query = supabase
      .from("trader_listings")
      .select("id, quantity, wholesale_price, trader_id, catalog_id, product_catalog!inner(name, category_id, status), profiles!trader_id(store_name, city)")
      .eq("active", true)
      .eq("product_catalog.status", "approved")
      .order("id", { ascending: true })
      .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1);

    if (category) query = query.eq("product_catalog.category_id", category);
    if (search.trim()) query = query.ilike("product_catalog.name", `%${search.trim()}%`);

    const { data, error } = await query;
    if (!error) {
      setListings((prev) => (reset ? data : [...prev, ...data]));
      setHasMore((data || []).length === PAGE_SIZE);
    }
    setLoading(false);
  }, [category, search]);

  useEffect(() => {
    setPage(0);
    fetchPage(0, true);
  }, [category, search, fetchPage]);

  const addToCart = (listing) => {
    const key = `${listing.trader_id}-${listing.catalog_id}`;
    const existing = cart.find((c) => c.key === key);
    let updated;
    if (existing) {
      updated = cart.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      updated = [
        ...cart,
        {
          key,
          catalog_id: listing.catalog_id,
          trader_id: listing.trader_id,
          product_name: listing.product_catalog.name,
          store_name: listing.profiles?.store_name || "متجر",
          wholesale_price: listing.wholesale_price,
          quantity: 1,
        },
      ];
    }
    setCart(updated);
    saveCart(updated);
  };

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  if (checking) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: T.paper }}>
        <Loader2 className="animate-spin" style={{ color: T.sealDeep }} />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div dir="rtl" className="w-full min-h-screen" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", background: T.paper }}>
      <header className="px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-20" style={{ background: T.paper, borderBottom: `1px solid ${T.line}` }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>تصفّح المنتجات</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: T.sub, border: `1px solid ${T.line}`, textDecoration: "none" }}>
            <Home size={13} /> الرئيسية
          </Link>
          <button onClick={() => setShowCart(true)} className="relative flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: T.ink, color: "#fff" }}>
            <ShoppingCart size={13} /> السلة
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: T.seal, color: T.ink }}>
                {cartCount}
              </span>
            )}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="text-xs font-medium flex items-center gap-1.5" style={{ color: T.sub }}>
            <LogOut size={14} /> خروج
          </button>
        </div>
      </header>

      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute top-1/2 -translate-y-1/2 right-3" style={{ color: T.sub }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full text-sm rounded-lg py-2 pe-9 ps-3 outline-none"
              style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-sm rounded-lg px-3 outline-none"
            style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3">
          {listings.map((l) => (
            <ProductRow key={l.id} listing={l} onAdd={addToCart} inCart={cart.some((c) => c.key === `${l.trader_id}-${l.catalog_id}`)} />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin" size={18} style={{ color: T.sealDeep }} /></div>
        )}

        {!loading && listings.length === 0 && (
          <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>
            لا توجد منتجات مطابقة حالياً.
          </div>
        )}

        {!loading && hasMore && listings.length > 0 && (
          <button
            onClick={() => { const next = page + 1; setPage(next); fetchPage(next, false); }}
            className="w-full mt-4 text-xs font-medium py-2.5 rounded-lg"
            style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}
          >
            عرض المزيد
          </button>
        )}
      </div>

      {showCart && <CartDrawer cart={cart} setCart={setCart} onClose={() => setShowCart(false)} session={session.user} />}
    </div>
  );
}
