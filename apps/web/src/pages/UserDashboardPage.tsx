import { Clock3, Receipt, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Reservation, Transaction } from "../types";

export const UserDashboardPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [notice, setNotice] = useState("");

  const loadData = async () => {
    try {
      const [txRes, reservationRes] = await Promise.all([
        api.get("/transactions/my"),
        api.get("/reservations/my"),
      ]);
      setTransactions(txRes.data ?? []);
      setReservations(reservationRes.data ?? []);
    } catch {
      setNotice("Please login to view personal dashboard data.");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const activeIssues = useMemo(
    () => transactions.filter((t) => t.type === "ISSUE" || t.type === "RENEWAL"),
    [transactions],
  );

  const pendingFine = useMemo(
    () => transactions.filter((t) => t.type === "RETURN").reduce((sum, t) => sum + (t.fineAmount ?? 0), 0),
    [transactions],
  );

  const returnBook = async (transactionId: string) => {
    try {
      await api.post("/transactions/return", { transactionId });
      setNotice("Book returned successfully.");
      await loadData();
    } catch {
      setNotice("Return failed. Try again.");
    }
  };

  const renewBook = async (transactionId: string) => {
    try {
      await api.post(`/transactions/renew/${transactionId}`);
      setNotice("Renewal successful (+7 days).");
      await loadData();
    } catch {
      setNotice("Renewal failed. Try again.");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">My Library Dashboard</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="metric-card"><Clock3 /><div><p>Issued Books</p><h3>{activeIssues.length}</h3></div></div>
        <div className="metric-card"><TimerReset /><div><p>Reservations</p><h3>{reservations.length}</h3></div></div>
        <div className="metric-card"><Receipt /><div><p>Pending Fine</p><h3>{pendingFine.toFixed(0)}</h3></div></div>
      </div>

      {notice ? <div className="glass p-3 text-sm">{notice}</div> : null}

      <section className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-lg">
        <h2 className="mb-3 text-lg font-semibold">Issued Books</h2>
        <div className="space-y-2 text-sm">
          {activeIssues.map((tx) => (
            <div key={tx.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/15 p-3">
              <span>{tx.book.title}</span>
              <span className="text-amber-200">Due: {tx.dueDate ? new Date(tx.dueDate).toLocaleDateString() : "N/A"}</span>
              <div className="flex gap-2">
                <button onClick={() => renewBook(tx.id)} className="action-btn bg-cyan-500/20">Renew</button>
                <button onClick={() => returnBook(tx.id)} className="action-btn bg-emerald-500/20">Return</button>
              </div>
            </div>
          ))}
          {activeIssues.length === 0 ? <div className="opacity-70">No active issued books.</div> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-lg">
        <h2 className="mb-3 text-lg font-semibold">Reservation Queue</h2>
        <div className="space-y-2 text-sm">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="flex items-center justify-between rounded-xl bg-black/15 p-3">
              <span>{reservation.book.title}</span>
              <span>Queue #{reservation.queuePosition} | {reservation.status}</span>
            </div>
          ))}
          {reservations.length === 0 ? <div className="opacity-70">No reservations yet.</div> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-lg">
        <h2 className="mb-3 text-lg font-semibold">Transaction History</h2>
        <div className="space-y-2 text-sm">
          {transactions.slice(0, 8).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-xl bg-black/15 p-3">
              <span>{tx.book.title}</span>
              <span>{tx.type} {tx.fineAmount ? `| Fine: ${tx.fineAmount}` : ""}</span>
            </div>
          ))}
          {transactions.length === 0 ? <div className="opacity-70">No transactions found.</div> : null}
        </div>
      </section>
    </div>
  );
};
