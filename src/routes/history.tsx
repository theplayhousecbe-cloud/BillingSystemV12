import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { RequireAuth } from "@/components/AuthGuard";
import { useEffect, useState } from "react";
import { sessionsApi } from "@/lib/sessions";
import type { Session } from "@/lib/types";
import { computeBill } from "@/lib/billing";
import { ArrowLeft, Clock } from "lucide-react";

export const Route = createFileRoute("/history")({
  component: () => (<RequireAuth><HistoryPage /></RequireAuth>),
});

function HistoryPage() {
  const [completed, setCompleted] = useState<Session[]>([]);
  const [view, setView] = useState<"all" | "split">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "name_asc">("date_desc");
  const [filterBy, setFilterBy] = useState<"all" | "today" | "yesterday" | "week" | "month">("all");
  
  useEffect(() => {
    const refresh = () => {
      const all = sessionsApi.list();
      let filtered = all.filter((s) => s.status === "completed" || s.status === "cancelled");

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterdayStart = todayStart - 86400000;
      const weekStart = todayStart - 86400000 * 6;
      const monthStart = todayStart - 86400000 * 29;

      if (filterBy === "today") filtered = filtered.filter(s => s.startedAt >= todayStart);
      else if (filterBy === "yesterday") filtered = filtered.filter(s => s.startedAt >= yesterdayStart && s.startedAt < todayStart);
      else if (filterBy === "week") filtered = filtered.filter(s => s.startedAt >= weekStart);
      else if (filterBy === "month") filtered = filtered.filter(s => s.startedAt >= monthStart);


      filtered.sort((a, b) => {
        if (sortBy === "date_desc") return (b.endedAt || 0) - (a.endedAt || 0);
        if (sortBy === "date_asc") return (a.endedAt || 0) - (b.endedAt || 0);
        if (sortBy === "amount_desc") {
          const billA = computeBill(a, a.endedAt || Date.now());
          const billB = computeBill(b, b.endedAt || Date.now());
          return billB.total - billA.total;
        }
        if (sortBy === "name_asc") {
          return a.customerName.localeCompare(b.customerName);
        }
        return 0;
      });

      setCompleted([...filtered]);
    };
    refresh();
    window.addEventListener("ph_sessions_changed", refresh);
    return () => window.removeEventListener("ph_sessions_changed", refresh);
  }, [sortBy, filterBy]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex bg-muted/50 p-1 rounded-xl">
            <button 
              onClick={() => setView("all")}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === "all" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              All Sessions
            </button>
            <button 
              onClick={() => setView("split")}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === "split" ? "bg-white shadow-sm text-indigo-600" : "text-muted-foreground hover:text-foreground"}`}
            >
              Split Bills
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={filterBy}
              onChange={(e: any) => setFilterBy(e.target.value)}
              className="rounded-lg border-border bg-white px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-lg border-border bg-white px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="date_desc">Latest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {completed.length === 0 ? (
          <div className="glass mx-auto max-w-md rounded-2xl p-12 text-center text-muted-foreground">
            <Clock className="mx-auto mb-4 h-12 w-12 opacity-40" />
            <p className="text-lg font-semibold">No completed sessions yet</p>
            <p className="mt-1 text-sm">Past bills and records will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {completed
              .filter(s => view === "all" || (s.adults + s.kids + (s.kidsAbove10 || 0)) > 1)
              .map((s) => {
              const bill = computeBill(s, s.endedAt || Date.now());
              const durMs = (s.endedAt || Date.now()) - s.startedAt;
              return (
                <div key={s.id} className="glass flex flex-col justify-between rounded-2xl p-5 transition hover:scale-[1.02] hover:shadow-xl group">
                  <Link to="/bill/$id" params={{ id: s.id }}>
                    <div className="flex items-center justify-between">
                      <div className="font-display text-lg font-bold truncate">{s.customerName}</div>
                      {s.status === "cancelled" ? (
                        <div className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive uppercase tracking-widest border border-destructive/20">
                          Cancelled
                        </div>
                      ) : (s.tableIds && s.tableIds.length > 0 && (
                        <div className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          T: {s.tableIds.join(",")}
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(s.startedAt).toLocaleDateString()}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <Clock className="mb-0.5 mr-1 inline-block h-3 w-3" />
                      {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {" - "}
                      {s.endedAt ? new Date(s.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                      {" "}({Math.round(durMs / 60000)}m)
                    </div>
                    <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                      <div className="text-xs text-muted-foreground">{s.adults + s.kids + (s.kidsAbove10 || 0)} heads</div>
                      <div className="font-display text-xl font-bold text-success tabular-nums">₹{bill.total.toFixed(2)}</div>
                    </div>
                  </Link>
                  
                  <div className="mt-4 pt-3 border-t border-border/50 flex gap-2">
                    {view === "all" && (
                      <Link
                        to="/bill/$id"
                        params={{ id: s.id }} 
                        className="flex-1 text-center py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                      >
                        Regular Bill
                      </Link>
                    )}
                    {view === "split" && (
                      <Link
                        to="/split-bill/$id"
                        params={{ id: s.id }} 
                        className="flex-1 text-center py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md hover:bg-indigo-700 transition-colors"
                      >
                        Split Bill
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
