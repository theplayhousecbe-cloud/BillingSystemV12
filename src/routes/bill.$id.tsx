import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppHeader } from "@/components/AppHeader";
import { RequireAuth } from "@/components/AuthGuard";
import { sessionsApi } from "@/lib/sessions";
import { computeBill, formatDuration, formatDurationMin, ensurePersons, chargeForPerson, fmtDuration } from "@/lib/billing";

export const Route = createFileRoute("/bill/$id")({
  component: () => (<RequireAuth><BillPage /></RequireAuth>),
});

const CAFE_NAME = "The PlayHouse";
const CAFE_TAGLINE = "Board Game Cafe";
const CAFE_ADDRESS_LINE_1 = "First Floor, Standard Towers";
const CAFE_ADDRESS_LINE_2 = "288 A, Periyar Nagar";
const CAFE_ADDRESS_LINE_3 = "Coimbatore, Tamil Nadu 641004";

// Pricing — ₹149/head for the first hour, ₹99/head per additional hour (pro-rated by minute).
const FIRST_HOUR_RATE = 149;
const EXTRA_HOUR_RATE = 99;




function BillPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const session = useMemo(() => sessionsApi.list().find((s) => s.id === id), [id]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background/50 animate-fade-in">
        <AppHeader />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="glass rounded-3xl p-12 shadow-2xl">
            <p className="text-lg font-medium text-muted-foreground">Bill not found.</p>
            <button 
              onClick={() => nav({ to: "/" })} 
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" /> Return to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const endedAt = session.endedAt ?? Date.now();
  const bill = computeBill(session, endedAt);
  const allPersons = ensurePersons(session);
  
  // Categorize lines
  const gamingLines = bill.lines.filter(l => l.label.startsWith("Person "));
  const cafeLines = bill.lines.filter(l => !l.label.startsWith("Person "));
  
  const gamingSubtotal = gamingLines.reduce((sum, l) => sum + l.amount, 0);
  const cafeSubtotal = cafeLines.reduce((sum, l) => sum + l.amount, 0);

  const charges = allPersons.map(p => chargeForPerson(p, endedAt, session.pricing.subsequentRate ?? 99));
  const totalFirstHourAmt = charges.reduce((acc, c) => acc + c.firstHourAmt, 0);
  const totalExtraAmt = charges.reduce((acc, c) => acc + c.extraAmt, 0);

  const firstHourGroups = charges.reduce((acc, c) => {
    if (c.firstHourAmt > 0) {
      if (!acc[c.person.firstHourRate]) acc[c.person.firstHourRate] = { count: 0, amt: 0 };
      acc[c.person.firstHourRate].count += 1;
      acc[c.person.firstHourRate].amt += c.firstHourAmt;
    }
    return acc;
  }, {} as Record<number, { count: number; amt: number }>);

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

  const formatTime = (date: number) => {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).toUpperCase();
  };


  // UPI QR Code Payload for "SCAN TO PAY"
  const upiId = "theplayhouse132@dib";
  const upiName = "THE PLAYHOUSE";
  const qrPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${bill.total.toFixed(2)}&cu=INR`;

  return (
    <div className="min-h-screen bg-slate-100 selection:bg-primary/20 pb-20 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap');
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        
        #thermal-receipt, #thermal-receipt * {
          font-family: 'Lora', serif !important;
        }

        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body { 
            background: #fff !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          body * { visibility: hidden !important; }
          #thermal-receipt, #thermal-receipt * { 
            visibility: visible !important; 
            color: #000 !important; 
            background: transparent !important;
            box-shadow: none !important;
            border-color: #000 !important;
          }
          #thermal-receipt {
            position: absolute; left: 0; top: 0;
            width: 80mm; padding: 4mm 4mm 20mm 4mm !important;
            background: #fff !important;
            border-radius: 0 !important;
          }
          .print-hidden { display: none !important; }
        }
      `}</style>

      <AppHeader />
      
      <main className="mx-auto max-w-2xl px-4 py-8 animate-reveal-up">
        <div className="mb-8 flex items-center justify-between print-hidden">
          <button 
            onClick={() => window.history.back()} 
            className="group flex items-center gap-3 text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition-colors group-hover:bg-indigo-50">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Dashboard
          </button>
          
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
          >
            <Printer className="h-4 w-4" /> 
            Print Receipt
          </button>
        </div>

        <article 
          id="thermal-receipt" 
          className="relative mx-auto w-full max-w-[340px] bg-white px-5 py-8 text-black shadow-2xl"
        >
          {/* Header */}
          <header className="flex flex-col items-center text-center">
            <div className="mb-2">
               <img src="/logo.png" alt="The PlayHouse Logo" className="h-[70px] w-[70px] object-contain grayscale contrast-150" />
            </div>
            
            <h1 className="mt-1 font-serif text-[22px] font-black tracking-tight text-black leading-none">
              The PlayHouse
            </h1>
            <p className="font-serif text-[13px] font-bold text-black mt-0.5">
              Board Game Cafe
            </p>
            
            <div className="mt-3 text-[12px] font-bold text-black leading-[1.3] font-serif">
              <p>1st Floor, Standard Towers,</p>
              <p>288 A, PeriyarNagar,Cbe,</p>
              <p>TN- 641004</p>
            </div>
            
            <div className="mt-3 inline-flex items-center justify-center rounded-full bg-gray-200 px-6 py-1">
              <span className="text-[12px] font-extrabold text-black uppercase tracking-widest">RECEIPT</span>
            </div>
          </header>

          <div className="mt-3 w-full border-t-[3px] border-black" />

          {/* Basic Info */}
          <div className="mt-3 space-y-1 text-[13px] font-bold text-black px-1 font-serif">
            <div className="flex justify-between items-center">
              <span className="uppercase">BILL ID</span>
              <span className="uppercase">{bill.sessionId.slice(-6).toUpperCase() || "NIL"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="uppercase">CUSTOMER</span>
              <span className="uppercase">{bill.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="uppercase">TABLE (S)</span>
              <span className="uppercase">TABLE {bill.tables.join(", ") || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="uppercase">DATE</span>
              <span className="uppercase">{formatDateOnly(bill.startedAt)}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center px-1 font-serif">
            <span className="self-start text-[13px] font-bold uppercase text-black">SESSION TIMING</span>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-[16px] font-black">{formatTime(bill.startedAt)} - {formatTime(bill.endedAt)}</span>
              <span className="text-[16px] font-black">({formatReceiptDuration(bill.endedAt - bill.startedAt)})</span>
            </div>
          </div>

          <div className="mt-3 w-full border-t-[3px] border-black" />

          {/* Gaming Charges */}
          <section className="mt-4 px-1">
            <div className="flex flex-col mb-4 font-serif">
              <h3 className="text-[18px] font-black uppercase text-black leading-none tracking-widest">GAMING CHARGES</h3>
              <p className="mt-1 text-[12px] font-bold uppercase tracking-wider text-black">FULL SESSIONS + EARLY DEPARTURE</p>
              <p className="mt-0.5 text-[11px] font-bold text-black uppercase tracking-wide">Flat 149(First Hour) and Nxt Hour ₹99 Pro Rata</p>
            </div>
            
            <div className="flex justify-between items-center text-[12px] font-bold uppercase mb-2 font-serif">
              <span className="flex-1"></span>
              <span className="w-[65px] text-center">TIME</span>
              <span className="w-[75px] text-right">RATE</span>
              <span className="w-[70px] text-right">AMOUNT</span>
            </div>

            <div className="space-y-3 font-serif">
              {allPersons.map((p: any, idx: number) => {
                const charge = chargeForPerson(p, endedAt, session.pricing.subsequentRate ?? 99);
                return (
                  <div key={p.id} className="flex justify-between items-center text-[13px] font-bold">
                    <span className="flex items-center gap-1.5 flex-1 max-w-[110px] truncate">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/5 text-[15px] font-black">{p.label}</span>
                      <span className="uppercase text-[14px]">{idx === 0 ? session.customerName : `GUEST`}</span>
                    </span>
                    <span className="w-[65px] text-center uppercase">({formatReceiptDuration(charge.presentMs)})</span>
                    <span className="w-[75px] text-right uppercase text-[12px] tracking-tighter">
                      (Rs.{p.firstHourRate}{charge.extraMin > 0 && p.firstHourRate > 0 ? `+${session.pricing.subsequentRate ?? 99}` : ''})
                    </span>
                    <span className="w-[70px] text-right text-[14px] font-black">₹{charge.total.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-end gap-4 border-t-[3px] border-black pt-3 font-serif">
              <span className="text-[14px] font-bold uppercase text-black">TOTAL:</span>
              <span className="text-[18px] font-black text-black">₹{charges.reduce((acc, c) => acc + c.total, 0).toFixed(2)}</span>
            </div>
          </section>

          {/* Cafe Subtotal (if exists) */}
          {cafeLines.length > 0 && (
            <section className="mt-4 px-1">
              <div className="mb-3 flex flex-col font-serif">
                <h3 className="text-[15px] font-bold uppercase text-black leading-none">CAFE ITEMS</h3>
              </div>
              <div className="space-y-2 font-serif">
                {cafeLines.map((l, i) => (
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

          {/* Grand Total - only show if there are cafe items, otherwise total is just gaming total */}
          {cafeLines.length > 0 && (
            <div className="mt-3 flex items-center justify-end gap-4 border-t-[2px] border-black pt-3 px-1 font-serif">
               <span className="text-[15px] font-black uppercase text-black">GRAND TOTAL:</span>
               <span className="text-[20px] font-black text-black">₹{bill.total.toFixed(2)}</span>
            </div>
          )}

          <div className="mt-4 w-full border-t-[3px] border-black" />

          {/* QR Section */}
          <div className="mt-4 flex flex-col items-center pb-2">
            <div className="p-1">
              <img src="/payment-qr.png" alt="Scan to Pay QR Code" className="h-[140px] w-[140px] object-contain grayscale contrast-150" />
            </div>
            <div className="mt-2 text-center font-serif">
               <p className="text-[12px] font-semibold tracking-wide text-black lowercase">
                 theplayhouse132@dib
               </p>
               <p className="mt-1 text-[14px] font-black uppercase tracking-widest text-black">
                 THE PLAYHOUSE
               </p>
            </div>
            <div className="mt-3 text-center">
              <p className="font-serif text-[15px] font-black uppercase text-black">
                SCAN TO PAY
              </p>
            </div>
          </div>

          <div className="mt-4 w-full border-t border-black" />

          <footer className="mt-4 pb-2 text-center font-serif text-[13px] font-extrabold uppercase leading-relaxed text-black">
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

