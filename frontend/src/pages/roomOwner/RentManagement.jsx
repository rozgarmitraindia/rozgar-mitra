import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarDays, IndianRupee, ReceiptText, RefreshCw, UserRound } from "lucide-react";
import { Button } from "../../components/ui/button.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { fetchRentManagement, recordRentPayment, sendRentReminder } from "./roomOwnerApi.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const dateText = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN") : "-";

function currentCycle(item) {
  const today = new Date();
  const dueDay = Math.min(28, Math.max(1, Number(item.rentDueDay || String(item.rentStartDate || "").slice(-2) || 1)));
  let year = today.getFullYear();
  let month = today.getMonth();
  if (today.getDate() < dueDay) {
    month -= 1;
    if (month < 0) { month = 11; year -= 1; }
  }
  const start = new Date(year, month, dueDay);
  const end = new Date(year, month + 1, dueDay - 1);
  const billingMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
  const paid = (item.rentPayments || []).filter((payment) => payment.billingMonth === billingMonth).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const charge = Number(item.monthlyRent || 0) + Number(item.monthlyMaintenance || 0);
  return { billingMonth, start, end, paid, charge, due: Math.max(0, charge - paid), dueDate: `${billingMonth}-${String(dueDay).padStart(2, "0")}` };
}

export default function RentManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError("");
    try { setItems(await fetchRentManagement()); }
    catch (err) { setError(err.message || "Unable to load rent records"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => items.reduce((result, item) => {
    const cycle = currentCycle(item);
    result.due += cycle.due;
    result.received += (item.rentPayments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return result;
  }, { due: 0, received: 0 }), [items]);

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Rent Management</div>
          <h1 className="section-title">Booked Rooms & Monthly Rent</h1>
          <p className="section-desc">Tenant, booking, billing cycle, due rent, payment history aur email reminders ek jagah manage karein.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="size-4" />Refresh</Button>
      </div>

      {error ? <div className="login-error">{error}</div> : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Metric icon={UserRound} label="Booked tenants" value={items.length} />
        <Metric icon={IndianRupee} label="Current rent due" value={money(totals.due)} />
        <Metric icon={ReceiptText} label="Total rent received" value={money(totals.received)} />
      </div>

      <div className="grid gap-5">
        {loading ? <div className="form-card">Loading booked room rent records...</div> : null}
        {!loading && items.map((item) => <RentCard key={item._id} item={item} onUpdated={load} />)}
        {!loading && !items.length ? <div className="form-card text-center"><h2 className="form-title">No booked rooms yet</h2><p className="section-desc">Visit complete karke booking confirm hone ke baad rent details yahan दिखाई देंगी.</p></div> : null}
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="form-card"><Icon className="size-5 text-signal" /><span className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span><strong className="mt-2 block font-display text-2xl">{value}</strong></div>;
}

function RentCard({ item, onUpdated }) {
  const cycle = currentCycle(item);
  const toast = useToast();
  const [amount, setAmount] = useState(cycle.due || cycle.charge);
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const tenant = item.user || {};
  const room = item.room || {};

  async function addPayment(event) {
    event.preventDefault();
    setBusy("payment");
    try {
      await recordRentPayment(item._id, { billingMonth: cycle.billingMonth, amount: Number(amount), method, note });
      toast.show("Rent payment recorded", "success");
      await onUpdated();
    } catch (err) { toast.show(err.message || "Unable to record payment", "error"); }
    finally { setBusy(""); }
  }

  async function remind() {
    if (!window.confirm(`Send rent reminder to ${tenant.email || "tenant"}?`)) return;
    setBusy("reminder");
    try {
      const result = await sendRentReminder(item._id, { billingMonth: cycle.billingMonth, amount: cycle.due, dueDate: cycle.dueDate });
      toast.show(result.message || "Rent reminder sent", "success");
      await onUpdated();
    } catch (err) { toast.show(err.message || "Unable to send reminder", "error"); }
    finally { setBusy(""); }
  }

  return (
    <article className="form-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-label">{room.publicId || room.roomId || "Booked Room"}</div>
          <h2 className="mt-3 font-display text-2xl font-bold">{room.title || room.propertyName || "Room"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{[room.locality, room.city, room.address].filter(Boolean).join(", ") || "Address not available"}</p>
        </div>
        <span className="rounded-full bg-verified/10 px-3 py-1.5 text-xs font-bold uppercase text-foreground">{item.rentStatus || "active"}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Tenant" value={tenant.fullName || tenant.email || "Candidate"} />
        <Detail label="Tenant contact" value={tenant.mobile || tenant.phone || tenant.email || "-"} />
        <Detail label="Assigned room / bed" value={[item.assignedUnit, item.assignedBed].filter(Boolean).join(" / ") || "-"} />
        <Detail label="Rent started" value={dateText(item.rentStartDate)} />
        <Detail label="Monthly rent" value={money(item.monthlyRent)} />
        <Detail label="Maintenance" value={money(item.monthlyMaintenance)} />
        <Detail label="Security deposit" value={money(item.securityDeposit)} />
        <Detail label="Monthly total" value={money(cycle.charge)} />
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><CalendarDays className="size-4" />Current billing cycle</span><strong className="mt-1 block">{cycle.start.toLocaleDateString("en-IN")} – {cycle.end.toLocaleDateString("en-IN")}</strong></div>
          <div className="text-right"><span className="text-xs font-semibold text-muted-foreground">Balance due</span><strong className="block text-2xl text-signal">{money(cycle.due)}</strong></div>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">Paid this cycle: <strong className="text-foreground">{money(cycle.paid)}</strong> · Due day: {item.rentDueDay || 1}</div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form className="rounded-2xl border border-border p-4" onSubmit={addPayment}>
          <h3 className="font-display text-lg font-semibold">Record rent payment</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input className="form-input" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" required />
            <select className="form-select" value={method} onChange={(event) => setMethod(event.target.value)}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank transfer</option><option value="other">Other</option></select>
            <input className="form-input sm:col-span-2" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Receipt / transaction note (optional)" />
          </div>
          <Button className="mt-3" variant="signal" disabled={busy === "payment"}>{busy === "payment" ? "Saving..." : "Save payment"}</Button>
        </form>

        <div className="rounded-2xl border border-border p-4">
          <h3 className="font-display text-lg font-semibold">Rent reminder</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Tenant ko {money(cycle.due)} ka reminder email aur in-app notification भेजें.</p>
          <Button className="mt-3" variant="outline" disabled={!cycle.due || busy === "reminder" || !tenant.email} onClick={remind}><BellRing className="size-4" />{busy === "reminder" ? "Sending..." : "Send email reminder"}</Button>
          {!tenant.email ? <p className="mt-2 text-xs text-destructive">Tenant email unavailable.</p> : null}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="font-display text-lg font-semibold">Payment history</h3>
        <div className="mt-3 grid gap-2">
          {(item.rentPayments || []).length ? [...item.rentPayments].reverse().map((payment) => <div key={payment._id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-muted px-4 py-3 text-sm"><span><strong>{payment.billingMonth}</strong> · {payment.method}</span><span>{money(payment.amount)} · {new Date(payment.paidOn).toLocaleDateString("en-IN")}</span></div>) : <p className="text-sm text-muted-foreground">No rent payment recorded yet.</p>}
        </div>
      </div>
    </article>
  );
}

function Detail({ label, value }) {
  return <div className="rounded-xl bg-muted p-3"><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>;
}
