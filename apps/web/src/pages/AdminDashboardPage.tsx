import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { io } from "socket.io-client";
import { api } from "../lib/api";
import type { AnalyticsResponse, Reservation, User } from "../types";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export const AdminDashboardPage = () => {
  const [totals, setTotals] = useState({ booksCount: 0, usersCount: 0, activeReservations: 0 });
  const [topIssued, setTopIssued] = useState<Array<{ title: string; issueCount: number }>>([]);
  const [liveEvents, setLiveEvents] = useState(0);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notice, setNotice] = useState("");
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    description: "",
    category: "Computer Science",
    totalCopies: 5,
  });

  const loadAdminData = async () => {
    try {
      const [analyticsRes, reservationsRes, usersRes] = await Promise.all([
        api.get<AnalyticsResponse>("/analytics/dashboard"),
        api.get<Reservation[]>("/reservations"),
        api.get<User[]>("/users"),
      ]);

      setTotals(analyticsRes.data.totals);
      setTopIssued(analyticsRes.data.topIssued);
      setReservations(reservationsRes.data);
      setUsers(usersRes.data);
    } catch {
      setTotals({ booksCount: 250, usersCount: 1300, activeReservations: 42 });
      setTopIssued([
        { title: "DDIA", issueCount: 120 },
        { title: "Deep Learning with Python", issueCount: 98 },
        { title: "Modern OS", issueCount: 76 },
      ]);
      setNotice("Admin APIs unavailable or unauthorized. Login as admin to use controls.");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAdminData();
    }, 0);

    const socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000");
    socket.on("analytics:update", () => setLiveEvents((prev) => prev + 1));
    return () => {
      clearTimeout(timer);
      socket.disconnect();
    };
  }, []);

  const barData = {
    labels: topIssued.map((item) => item.title),
    datasets: [
      {
        label: "Issue Count",
        data: topIssued.map((item) => item.issueCount),
        backgroundColor: "rgba(66, 153, 225, 0.7)",
        borderRadius: 10,
      },
    ],
  };

  const donutData = {
    labels: ["Books", "Users", "Active Reservations"],
    datasets: [
      {
        data: [totals.booksCount, totals.usersCount, totals.activeReservations],
        backgroundColor: ["#38bdf8", "#fb923c", "#4ade80"],
      },
    ],
  };

  const reviewReservation = async (id: string, action: "approve" | "reject") => {
    try {
      await api.post(`/reservations/${id}/${action}`);
      setNotice(`Reservation ${action}d successfully.`);
      await loadAdminData();
    } catch {
      setNotice(`Unable to ${action} reservation.`);
    }
  };

  const createBook = async () => {
    try {
      await api.post("/books", {
        ...bookForm,
        availableCopies: bookForm.totalCopies,
      });
      setNotice("Book added successfully.");
      setBookForm({
        title: "",
        author: "",
        isbn: "",
        description: "",
        category: "Computer Science",
        totalCopies: 5,
      });
      await loadAdminData();
    } catch {
      setNotice("Book creation failed. Check admin login and form values.");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Admin Control Center</h1>
      {notice ? <div className="glass p-3 text-sm">{notice}</div> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="metric-card"><div><p>Total Books</p><h3>{totals.booksCount}</h3></div></div>
        <div className="metric-card"><div><p>Active Users</p><h3>{totals.usersCount}</h3></div></div>
        <div className="metric-card"><div><p>Reservations</p><h3>{totals.activeReservations}</h3></div></div>
        <div className="metric-card"><div><p>Live Events</p><h3>{liveEvents}</h3></div></div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-lg">
          <h2 className="mb-2 text-lg font-semibold">Most Issued Books</h2>
          <Bar data={barData} />
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-lg">
          <h2 className="mb-2 text-lg font-semibold">Platform Snapshot</h2>
          <Doughnut data={donutData} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-lg">
          <h2 className="mb-2 text-lg font-semibold">Pending Reservations</h2>
          <div className="space-y-2 text-sm">
            {reservations.filter((r) => r.status === "PENDING").slice(0, 8).map((reservation) => (
              <div key={reservation.id} className="rounded-xl bg-black/15 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span>{reservation.book.title}</span>
                  <span>Queue #{reservation.queuePosition}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => reviewReservation(reservation.id, "approve")} className="action-btn bg-emerald-500/20">Approve</button>
                  <button onClick={() => reviewReservation(reservation.id, "reject")} className="action-btn bg-rose-500/20">Reject</button>
                </div>
              </div>
            ))}
            {reservations.filter((r) => r.status === "PENDING").length === 0 ? <div className="opacity-70">No pending reservations.</div> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-lg">
          <h2 className="mb-2 text-lg font-semibold">Add New Book</h2>
          <div className="grid grid-cols-1 gap-2">
            <input className="field" placeholder="Title" value={bookForm.title} onChange={(e) => setBookForm((p) => ({ ...p, title: e.target.value }))} />
            <input className="field" placeholder="Author" value={bookForm.author} onChange={(e) => setBookForm((p) => ({ ...p, author: e.target.value }))} />
            <input className="field" placeholder="ISBN" value={bookForm.isbn} onChange={(e) => setBookForm((p) => ({ ...p, isbn: e.target.value }))} />
            <textarea className="field min-h-20" placeholder="Description" value={bookForm.description} onChange={(e) => setBookForm((p) => ({ ...p, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="field" placeholder="Category" value={bookForm.category} onChange={(e) => setBookForm((p) => ({ ...p, category: e.target.value }))} />
              <input className="field" type="number" placeholder="Total Copies" value={bookForm.totalCopies} onChange={(e) => setBookForm((p) => ({ ...p, totalCopies: Number(e.target.value || 1) }))} />
            </div>
            <button onClick={createBook} className="action-btn bg-cyan-500/25">Create Book</button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-lg">
        <h2 className="mb-2 text-lg font-semibold">Recent Users</h2>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
          {users.slice(0, 9).map((user) => (
            <div key={user.id} className="rounded-xl bg-black/15 p-3">
              <div className="font-medium">{user.name}</div>
              <div className="opacity-75">{user.email}</div>
              <div className="mt-1 text-xs opacity-70">{user.role}{user.branch ? ` | ${user.branch}` : ""}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
