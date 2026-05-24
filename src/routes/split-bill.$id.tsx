import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Printer, User, Users, Clock, CreditCard } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppHeader } from "@/components/AppHeader";
import { RequireAuth } from "@/components/AuthGuard";
import { sessionsApi } from "@/lib/sessions";
import { ensurePersons, chargeForPerson, fmtDuration, formatDurationMin, computeBill } from "@/lib/billing";

export const Route = createFileRoute("/split-bill/$id")({
  component: () => (<RequireAuth><SplitBillPage /></RequireAuth>),
});

const CAFE_NAME = "The PlayHouse";
const CAFE_TAGLINE = "BOARD GAME CAFE";
const CAFE_ADDRESS_LINE_1 = "1st Floor, Standard Towers,";
const CAFE_ADDRESS_LINE_2 = "288 A, PeriyarNagar,Che,";
const CAFE_ADDRESS_LINE_3 = "TN- 641004";

function SplitBillPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const session = useMemo(() => sessionsApi.list().find((s: any) => s.id === id), [id]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background/50">
        <AppHeader />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="glass rounded-3xl p-12 shadow-2xl">
            <p className="text-lg font-medium text-muted-foreground">Bill not found.</p>
            <button onClick={() => nav({ to: "/history" })} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
              <ArrowLeft className="h-4 w-4" /> Return to History
            </button>
          </div>
        </main>
      </div>
    );
  }

  const endedAt = session.endedAt ?? Date.now();
  const allPersons = ensurePersons(session);
  const subsequentRate = session.pricing.subsequentRate ?? 99;

  const bill = computeBill(session, endedAt);
  const cafeLines = bill.lines.filter((l: any) => !l.label.startsWith("Person "));
  const cafeSubtotal = cafeLines.reduce((sum: number, l: any) => sum + l.amount, 0);

  const formatTime = (date: number) => {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).toUpperCase();
  };

  const formatDate = (date: number) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const gamingTotal = allPersons.reduce((acc: number, p: any) => acc + chargeForPerson(p, endedAt, subsequentRate).total, 0);
  const grandTotal = gamingTotal + cafeSubtotal;

  const formatReceiptDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}.${mins.toString().padStart(2, '0')}HR`;
  };

  const formatDateOnly = (date: number) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  const formatTimeStr = (date: number) => {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).toUpperCase();
  };

  const upiId = "theplayhouse132@dib";
  const upiName = "THE PLAYHOUSE";
  const qrPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${grandTotal.toFixed(2)}&cu=INR`;

  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap');
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        
        #thermal-receipt, #thermal-receipt * {
          font-family: 'Lora', serif !important;
        }

        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          #thermal-receipt, #thermal-receipt * { visibility: visible !important; color: #000 !important; background: transparent !important; box-shadow: none !important; border-color: #000 !important; }
          #thermal-receipt { position: absolute; left: 0; top: 0; width: 80mm; padding: 4mm 4mm 20mm 4mm !important; background: #fff !important; border-radius: 0 !important; }
          .print-hidden { display: none !important; }
        }
      `}</style>
      <div className="mx-auto max-w-2xl px-4 py-8 flex items-center justify-between print-hidden">
        <button 
          onClick={() => window.history.back()} 
          className="group flex items-center gap-3 text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition-colors group-hover:bg-indigo-50">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to History
        </button>

        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-black text-white hover:bg-slate-800 transition-all hover:scale-105 active:scale-95">
          <Printer className="h-4 w-4" /> Print Receipt
        </button>
      </div>

      <main className="mx-auto w-full max-w-[340px]">
        <article id="thermal-receipt" className="relative mx-auto w-full bg-white px-5 py-8 text-black shadow-2xl">
          <header className="flex flex-col items-center text-center">
            <div className="mb-2">
               <img src="/logo.png" alt="The PlayHouse Logo" className="h-[70px] w-[70px] object-contain grayscale contrast-150" />
            </div>
            <h1 className="mt-1 font-serif text-[22px] font-black tracking-tight text-black leading-none">The PlayHouse</h1>
            <p className="font-serif text-[13px] font-bold text-black mt-0.5">Board Game Cafe</p>
            <div className="mt-3 text-[12px] font-bold text-black leading-[1.3] font-serif">
              <p>1st Floor, Standard Towers,</p>
              <p>288 A, PeriyarNagar,Cbe,</p>
              <p>TN- 641004</p>
            </div>
            <div className="mt-3 inline-flex items-center justify-center rounded-full bg-gray-200 px-6 py-1">
              <span className="text-[12px] font-extrabold text-black uppercase tracking-widest">SPLIT BILL</span>
            </div>
          </header>

          <div className="mt-3 w-full border-t-[3px] border-black" />

          <div className="mt-3 space-y-1 text-[13px] font-bold text-black px-1 font-serif">
            <div className="flex justify-between items-center">
              <span className="uppercase">BILL ID</span>
              <span className="uppercase">{session.id.slice(-6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="uppercase">CUSTOMER</span>
              <span className="uppercase">{session.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="uppercase">TABLE (S)</span>
              <span className="uppercase">TABLE {session.tableIds?.join(", ") || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="uppercase">DATE</span>
              <span className="uppercase">{formatDateOnly(session.startedAt)}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center px-1 font-serif">
            <span className="self-start text-[13px] font-bold uppercase text-black">SESSION TIMING</span>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-[16px] font-black">{formatTimeStr(session.startedAt)} - {formatTimeStr(endedAt)}</span>
              <span className="text-[16px] font-black">({formatReceiptDuration(endedAt - session.startedAt)})</span>
            </div>
          </div>

          <div className="mt-3 w-full border-t-[3px] border-black" />

          <section className="mt-3 px-1">
            <div className="flex flex-col mb-4 font-serif">
              <h3 className="text-[18px] font-black uppercase text-black leading-none tracking-widest">GAMING BREAKDOWN</h3>
              <p className="mt-1 text-[13px] font-bold uppercase tracking-wider text-black">DETAILED HOURLY SPLIT</p>
              <p className="mt-0.5 text-[11px] font-bold text-black uppercase tracking-wide">Flat 149(First Hour) and Nxt Hour ₹99 Pro Rata</p>
            </div>
            <div className="space-y-4 font-serif">
              {allPersons.map((p: any, index: number) => (
                <div key={p.id} className="border-b border-black/10 pb-4 last:border-0 last:pb-0">
                  <PersonBreakdown p={p} endedAt={endedAt} subsequentRate={subsequentRate} index={index} customerName={session.customerName} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-4 border-t border-black border-dashed pt-3 font-serif">
              <span className="text-[14px] font-bold uppercase text-black">TOTAL GAMING:</span>
              <span className="text-[17px] font-black text-black">₹{gamingTotal.toFixed(2)}</span>
            </div>
          </section>

          {cafeLines.length > 0 && (
            <section className="mt-4 px-1">
              <div className="mb-3 flex flex-col font-serif">
                <h3 className="text-[15px] font-bold uppercase text-black leading-none">CAFE ITEMS</h3>
              </div>
              <div className="space-y-2 font-serif">
                {cafeLines.map((l: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[14px] font-bold">
                    <span className="flex-1 truncate pr-2 uppercase">{l.label}</span>
                    <span className="w-12 text-right">x{l.qty}</span>
                    <span className="w-[70px] text-right">₹{l.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-end gap-4 border-t border-black border-dashed pt-3 font-serif">
                <span className="text-[14px] font-bold uppercase text-black">CAFE TOTAL:</span>
                <span className="text-[17px] font-black text-black">₹{cafeSubtotal.toFixed(2)}</span>
              </div>
            </section>
          )}

          <div className="mt-4 w-full border-t-[3px] border-black" />

          <section className="mt-4 px-1">
            <h3 className="text-[14px] font-bold uppercase tracking-widest text-black mb-3 font-serif">PER PERSON SUMMARY</h3>
            <div className="flex justify-between items-center text-[12px] font-bold uppercase mb-2 font-serif px-1">
              <span className="flex-1"></span>
              <span className="w-[60px] text-center">TIME</span>
              <span className="w-[75px] text-right">RATE</span>
              <span className="w-[70px] text-right">AMOUNT</span>
            </div>
            <div className="space-y-2 font-serif">
              {allPersons.map((p: any, idx: number) => {
                const charge = chargeForPerson(p, endedAt, subsequentRate);
                const dispName = idx === 0 ? session.customerName : p.label.length === 1 ? `GUEST` : ``;
                return (
                  <div key={p.id} className="flex justify-between items-center text-[13px] font-bold px-1">
                    <span className="truncate pr-2 uppercase flex-1 max-w-[100px]">
                      {p.label} {dispName}
                    </span>
                    <span className="w-[60px] text-center uppercase">({formatReceiptDuration(charge.presentMs)})</span>
                    <span className="w-[75px] text-right uppercase text-[12px] tracking-tighter">
                      (Rs.{p.firstHourRate}{charge.extraMin > 0 && p.firstHourRate > 0 ? `+${subsequentRate ?? 99}` : ''})
                    </span>
                    <span className="w-[70px] text-right text-[14px] font-black">₹{charge.total.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-4 flex items-center justify-end gap-4 border-t-[2px] border-black pt-3 px-1 font-serif">
             <span className="text-[15px] font-black uppercase text-black">GRAND TOTAL:</span>
             <span className="text-[20px] font-black text-black">₹{grandTotal.toFixed(2)}</span>
          </div>

          <div className="mt-4 w-full border-t-[3px] border-black" />

          <div className="mt-4 flex flex-col items-center pb-2">
            <div className="p-1">
              <img src="/payment-qr.png" alt="Scan to Pay QR Code" className="h-[140px] w-[140px] object-contain grayscale contrast-150" />
            </div>
            <div className="mt-2 text-center font-serif">
               <p className="text-[12px] font-semibold tracking-wide text-black lowercase">theplayhouse132@dib</p>
               <p className="mt-1 text-[14px] font-black uppercase tracking-widest text-black">THE PLAYHOUSE</p>
            </div>
            <div className="mt-3 text-center">
              <p className="font-serif text-[15px] font-black uppercase text-black">SCAN TO PAY</p>
            </div>
          </div>

          <div className="mt-4 w-full border-t border-black" />

          <footer className="mt-4 pb-2 text-center font-serif text-[11px] font-extrabold uppercase leading-relaxed text-black">
            <p>THANK YOU FOR VISITING</p>
            <p>THE PLAYHOUSE</p>
            <p>COME BACK AND PLAY</p>
            <p>AGAIN SOON</p>
          </footer>
        </article>
      </main>
    </div>
  );
}

function PersonBreakdown({ p, endedAt, subsequentRate, index, customerName }: { p: any, endedAt: number, subsequentRate: number, index: number, customerName: string }) {
  const charge = chargeForPerson(p, endedAt, subsequentRate);
  const personType = p.kind === "adult" ? "ADULT" : p.kind === "kid_above_10" ? "KID >10" : p.kind === "games_only" ? "GAMES ONLY" : p.kind === "cafe_only" ? "CAFE ONLY" : "KID <10";
  const nameLabel = index === 0 ? customerName : `GUEST ${p.label} (${personType})`;

  const formatTime = (date: number) => {
    return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
  };

  const end = Math.min(p.leftAt ?? endedAt, endedAt);
  const rows = [];
  const formatDur = (min: number) => (min === 60 ? "1h" : `${min}m`);

  rows.push({
    label: "1ST HOUR",
    timeRange: `${formatTime(p.joinedAt)} - ${formatTime(Math.min(end, p.joinedAt + 3600000))}`,
    duration: formatDur(charge.firstHourMin),
    rate: `₹${p.firstHourRate}/hr`,
    amount: charge.firstHourAmt,
  });

  if (charge.extraMin > 0 && p.firstHourRate > 0) {
    let remainingMin = charge.extraMin;
    let hourCount = 2;
    while (remainingMin > 0) {
      const chunkMin = Math.min(60, remainingMin);
      rows.push({
        label: `${hourCount}HR EXT.`,
        duration: formatDur(chunkMin),
        rate: `₹${subsequentRate}/hr`,
        amount: (chunkMin / 60) * subsequentRate,
      });
      remainingMin -= chunkMin;
      hourCount++;
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[18px] font-black uppercase text-black">{p.label}</span>
        <span className="text-[14px] font-bold uppercase truncate max-w-[200px] text-black">
          {nameLabel}
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2 items-center text-[12px] font-bold text-black uppercase">
            <div className="w-[75px]">{r.label}</div>
            <div className="flex-1 text-center">{r.duration}</div>
            <div className="w-[60px] text-center">{r.rate}</div>
            <div className="w-[65px] text-right font-black text-[13px]">₹{r.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
