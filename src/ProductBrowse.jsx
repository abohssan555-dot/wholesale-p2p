import React, { useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient.js";
import { useIdleLogout } from "./useIdleLogout.js";
import {
  Package, Search, ShoppingCart, Plus, Minus, X, Loader2,
  Store, LogOut, Home, CheckCircle2, AlertTriangle, Wallet,
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
  const [qty, setQty] = useState(1);
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
      <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.paperDeep }}>
        <Package size={18} style={{ color: T.sealDeep }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: T.ink }}>{listing.product_catalog.name}</div>
        <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: T.sub }}>
          <Store size={11} /> {listing.profiles?.store_name || "متجر غير مسمّى"} · {listing.profiles?.city || ""}
        </div>
      </div>
      <div className="text-left shrink-0">
        <div className="text-sm font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.ink }}>
          {listing.wholesale_price} <span className="text-[11px] font-normal" style={{ color: T.sub }}>ر.س</span>
        </div>
        <div className="text-[10px]" style={{ color: T.sub }}>متوفر: {listing.quantity}</div>
      </div>

      {listing.quantity > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: T.paper, border: `1px solid ${T.line}` }}>
            <Minus size={11} />
          </button>
          <span className="text-xs w-6 text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{qty}</span>
          <button onClick={() => setQty((q) => Math.min(listing.quantity, q + 1))} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: T.paper, border: `1px solid ${T.line}` }}>
            <Plus size={11} />
          </button>
        </div>
      )}

      <button
        onClick={() => onAdd(listing, qty)}
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

function CartDrawer({ cart, setCart, onClose, session, city }) {
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(null);
  const [vehicleType, setVehicleType] = useState("");
  const [deliverySpeed, setDeliverySpeed] = useState("standard");

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
  const SIZE_WEIGHT = { light: 1, medium: 2, bulky: 4 };
  const totalLoadUnits = cart.reduce((s, c) => s + (SIZE_WEIGHT[c.shipping_size] || 2) * c.quantity, 0);
  const feeTier = (() => {
    if (totalLoadUnits <= 6) return { base: 15, vehicle: "دراجة نارية" };
    if (totalLoadUnits <= 18) return { base: 25, vehicle: "سيارة صغيرة" };
    if (totalLoadUnits <= 35) return { base: 35, vehicle: "وانيت" };
    if (totalLoadUnits <= 70) return { base: 50, vehicle: "حافلة" };
    return { base: 80, vehicle: "دينا" };
  })();
  const deliveryFee = traderCount === 0 ? 0 : feeTier.base + Math.max(traderCount - 1, 0) * 10;

  const checkout = async () => {
    setErr("");
    setPlacing(true);
    const items = cart.map((c) => ({ catalog_id: c.catalog_id, trader_id: c.trader_id, quantity: c.quantity }));
    const { data, error } = await supabase.rpc("place_order", {
      p_items: items,
      p_delivery_mode: "single_driver",
      p_delivery_city: city || null,
      p_requested_vehicle_type: vehicleType || null,
      p_delivery_speed: deliverySpeed,
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
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: T.sub }}>سرعة التوصيل</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeliverySpeed("standard")}
                  className="flex-1 text-xs font-medium py-2 rounded-lg"
                  style={{ background: deliverySpeed === "standard" ? T.ink : T.paper, color: deliverySpeed === "standard" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
                >
                  عادي (قد يُجمَّع مع طلبات أخرى)
                </button>
                <button
                  onClick={() => setDeliverySpeed("express")}
                  className="flex-1 text-xs font-medium py-2 rounded-lg"
                  style={{ background: deliverySpeed === "express" ? T.ink : T.paper, color: deliverySpeed === "express" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
                >
                  سريع (توصيل منفرد فقط)
                </button>
              </div>
            </div>

            <div className="rounded-lg p-3 mt-2" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
              <label className="text-[11px] font-medium block mb-1" style={{ color: T.sub }}>نوع المركبة المفضّل للتوصيل (اختياري)</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full text-xs rounded-lg py-2 px-2 outline-none"
                style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}
              >
                <option value="">بدون تفضيل</option>
                <option value="motorcycle">دراجة نارية</option>
                <option value="small_car">سيارة صغيرة</option>
                <option value="pickup">وانيت</option>
                <option value="van">حافلة</option>
                <option value="truck">دينا</option>
              </select>
            </div>

            <div className="rounded-lg p-3 mt-2" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
              <div className="flex justify-between text-xs mb-1" style={{ color: T.sub }}>
                <span>المجموع الفرعي</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{subtotal.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-xs mb-1" style={{ color: T.sub }}>
                <span>رسوم التوصيل (تقديرية — يحتاج {feeTier.vehicle} تقريباً)</span>
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

const ORDER_STATUS_LABELS = {
  pending: "معلَّق",
  confirmed: "قيد التنفيذ",
  preparing: "قيد التحضير",
  out_for_delivery: "بالطريق إليك",
  delivered: "تم التسليم",
  cancelled: "ملغى",
};

function MyOrdersTab({ session }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("orders")
      .select("*, delivery_pin, order_items(product_name, quantity, unit_price, trader_id)")
      .eq("customer_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders(data || []);
        setLoading(false);
      });
  }, [session]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={18} style={{ color: T.sealDeep }} /></div>;
  if (orders.length === 0) {
    return (
      <div className="text-sm text-center py-10 rounded-xl" style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>
        لا توجد طلبات سابقة بعد.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((o) => (
        <div key={o.id} className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px]" style={{ color: T.sub, fontFamily: "'JetBrains Mono', monospace" }}>
              طلب #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("ar-SA")}
            </span>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: o.status === "delivered" ? T.goodBg : "#FBF1DD",
                color: o.status === "delivered" ? T.good : T.sealDeep,
              }}
            >
              {ORDER_STATUS_LABELS[o.status] || o.status}
            </span>
          </div>
          <div className="text-[11px] mb-2" style={{ color: T.sub }}>
            {(o.order_items || []).length} صنف · {[...new Set((o.order_items || []).map((i) => i.trader_id))].length} تاجر
          </div>
          {o.status !== "delivered" && o.status !== "cancelled" && o.delivery_pin && (
            <div className="rounded-lg p-2.5 mb-2 flex items-center justify-between" style={{ background: "#FBF1DD" }}>
              <span className="text-[11px]" style={{ color: T.sealDeep }}>رمز التسليم — أعطه للسائق عند الاستلام</span>
              <span className="text-base font-bold" style={{ color: T.sealDeep, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em" }}>{o.delivery_pin}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: T.sub }}>
            <span>المنتجات: {o.subtotal} ر.س</span>
            <span>التوصيل: {o.delivery_fee} ر.س</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.ink }}>
              الإجمالي: {o.total} ر.س
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomerWalletDrawer({ session, balance, onClose }) {
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("orders").select("id, subtotal, status, created_at").eq("customer_id", session.user.id).eq("status", "delivered").order("created_at", { ascending: false }),
      supabase.from("wallet_transactions").select("*").eq("customer_id", session.user.id).order("created_at", { ascending: false }),
    ]).then(([o, t]) => {
      setOrders(o.data || []);
      setTransactions(t.data || []);
      setLoading(false);
    });
  }, [session]);

  const totalSpent = orders.reduce((s, o) => s + Number(o.subtotal), 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(20,33,59,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-sm h-full overflow-y-auto p-5" style={{ background: T.paper }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: T.good }}><Wallet size={15} /> محفظتي</span>
          <button onClick={onClose}><X size={18} style={{ color: T.sub }} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={18} style={{ color: T.sealDeep }} /></div>
        ) : (
          <>
            <div className="rounded-xl p-4 mb-4" style={{ background: T.goodBg, border: "1px solid #BFE0CE" }}>
              <div className="text-[11px]" style={{ color: T.good }}>الرصيد الدائن الحالي</div>
              <div className="text-2xl font-semibold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.good }}>
                {balance || 0} <span className="text-xs font-normal">ر.س</span>
              </div>
              <div className="text-[10px] mt-1" style={{ color: T.good }}>يُستخدم من مرتجعات أو تعويضات، يعتمده المدير أو المشرف المالي</div>
            </div>

            <div className="rounded-xl p-4 mb-4" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
              <div className="text-[11px]" style={{ color: T.sub }}>إجمالي ما دفعته (طلبات مكتملة)</div>
              <div className="text-xl font-semibold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.ink }}>
                {totalSpent.toFixed(2)} <span className="text-xs font-normal" style={{ color: T.sub }}>ر.س</span>
              </div>
            </div>

            {transactions.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: T.ink }}>حركات الرصيد</div>
                <div className="flex flex-col gap-2">
                  {transactions.map((t) => (
                    <div key={t.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
                      <div>
                        <div className="text-xs" style={{ color: T.ink }}>{t.reason}</div>
                        <div className="text-[10px]" style={{ color: T.sub }}>{new Date(t.created_at).toLocaleDateString("ar-SA")}</div>
                      </div>
                      <span className="text-xs font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: t.amount >= 0 ? T.good : T.bad }}>
                        {t.amount >= 0 ? "+" : ""}{t.amount} ر.س
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
  const [tab, setTab] = useState("browse");
  const [profile, setProfile] = useState(null);
  const [showWallet, setShowWallet] = useState(false);

  useEffect(() => {
    if (session) {
      supabase.from("profiles").select("full_name, business_name, city, wallet_balance").eq("id", session.user.id).single()
        .then(({ data }) => setProfile(data));
    }
  }, [session]);

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
      .select("id, quantity, wholesale_price, trader_id, catalog_id, product_catalog!inner(name, category_id, status, shipping_size), profiles!trader_id(store_name, city)")
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

  const addToCart = (listing, chosenQty = 1) => {
    const key = `${listing.trader_id}-${listing.catalog_id}`;
    const existing = cart.find((c) => c.key === key);
    let updated;
    if (existing) {
      updated = cart.map((c) => (c.key === key ? { ...c, quantity: c.quantity + chosenQty } : c));
    } else {
      updated = [
        ...cart,
        {
          key,
          catalog_id: listing.catalog_id,
          trader_id: listing.trader_id,
          product_name: listing.product_catalog.name,
          store_name: listing.profiles?.store_name || "متجر غير مسمّى",
          wholesale_price: listing.wholesale_price,
          quantity: chosenQty,
          shipping_size: listing.product_catalog?.shipping_size || "medium",
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
        <Link to="/" className="flex items-center gap-2" style={{ textDecoration: "none" }} title="الصفحة الرئيسية">
          <div className="w-9 h-9 rounded-md flex items-center justify-center rotate-3" style={{ background: T.seal }}>
            <Package size={18} color={T.ink} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: T.ink }}>أصناف الجملة</div>
            <div className="text-[11px]" style={{ color: T.sub }}>
              {profile?.full_name ? `أهلاً بك، ${profile.full_name}` : "تصفّح المنتجات"}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowWallet(true)} className="relative flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: T.goodBg, color: T.good, border: `1px solid #BFE0CE` }}>
            <Wallet size={13} /> محفظتي
            {profile?.wallet_balance > 0 && (
              <span className="text-[10px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>({profile.wallet_balance} ر.س)</span>
            )}
          </button>
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
        <div className="rounded-xl p-4 mb-5 flex items-center gap-3" style={{ background: T.goodBg, border: `1px solid #BFE0CE` }}>
          <Package size={20} style={{ color: T.good }} />
          <div>
            <div className="text-sm font-semibold" style={{ color: T.ink }}>
              أهلاً بك، {profile?.full_name || "..."}
            </div>
            <div className="text-[11px]" style={{ color: T.sub }}>
              هذه لوحة التحكم الخاصة بالعميل <span className="font-bold" style={{ color: T.ink }}>{profile?.business_name || "..."}</span> على منصة أصناف الجملة
            </div>
          </div>
        </div>
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab("browse")}
            className="flex-1 text-xs font-medium py-2.5 rounded-lg"
            style={{ background: tab === "browse" ? T.ink : "#fff", color: tab === "browse" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
          >
            تصفّح المنتجات
          </button>
          <button
            onClick={() => setTab("orders")}
            className="flex-1 text-xs font-medium py-2.5 rounded-lg"
            style={{ background: tab === "orders" ? T.ink : "#fff", color: tab === "orders" ? "#fff" : T.sub, border: `1px solid ${T.line}` }}
          >
            طلباتي
          </button>
        </div>

        {tab === "orders" ? (
          <MyOrdersTab session={session} />
        ) : (
        <>
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
        </>
        )}
      </div>

      {showCart && <CartDrawer cart={cart} setCart={setCart} onClose={() => setShowCart(false)} session={session.user} city={profile?.city} />}
      {showWallet && <CustomerWalletDrawer session={session} balance={profile?.wallet_balance} onClose={() => setShowWallet(false)} />}
    </div>
  );
}
