import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { BookCard } from "../components/BookCard";
import { SectionHeader } from "../components/SectionHeader";
import { api } from "../lib/api";
import { demoBooks } from "../lib/mock";
import { useAuthStore } from "../store/auth";
import type { Book } from "../types";

export const BookDetailPage = () => {
  const { id } = useParams();
  const user = useAuthStore((state) => state.user);
  const [book, setBook] = useState<Book>(demoBooks[0]);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/books/${id}`)
      .then((res) => {
        setBook(res.data);
        setRecommendations(res.data.recommendations ?? []);
      })
      .catch(() => {
        const fallback = demoBooks.find((b) => b.id === id) ?? demoBooks[0];
        setBook(fallback);
        setRecommendations(demoBooks.filter((b) => b.id !== fallback.id && b.category === fallback.category).slice(0, 4));
      });
  }, [id]);

  const requireAuth = () => {
    if (user) return true;
    setMessage("Please login first to issue or reserve books.");
    return false;
  };

  const issueBook = async () => {
    if (!requireAuth()) return;
    setIsBusy(true);
    try {
      await api.post("/transactions/issue", { bookId: book.id, dueInDays: 14 });
      setMessage("Book issued successfully. Check your dashboard for due date.");
    } catch {
      setMessage("Issue failed. Book may be unavailable or request not allowed.");
    } finally {
      setIsBusy(false);
    }
  };

  const reserveBook = async () => {
    if (!requireAuth()) return;
    setIsBusy(true);
    try {
      await api.post("/reservations", { bookId: book.id });
      setMessage("Reservation placed. You are added to the queue.");
    } catch {
      setMessage("Reservation failed. Try again shortly.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-6 rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl md:grid-cols-[320px_1fr]">
        <img src={book.coverUrl ?? demoBooks[0].coverUrl} alt={book.title} className="h-80 w-full rounded-2xl object-cover" />
        <div className="space-y-3">
          <h1 className="gradient-heading text-3xl font-bold">{book.title}</h1>
          <p className="text-sm opacity-80">by {book.author}</p>
          <div className="inline-flex rounded-xl bg-white/10 px-3 py-1 text-sm">ISBN: {book.isbn}</div>
          <p className="text-sm leading-7 opacity-85">{book.description}</p>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="panel">Category: {book.category}</div>
            <div className="panel">Branch: {book.branch}</div>
            <div className="panel">Rating: {book.rating.toFixed(1)}</div>
            <div className="panel">Available: {book.availableCopies}/{book.totalCopies}</div>
          </div>

          <div className="flex flex-wrap gap-2 pt-3">
            <button disabled={isBusy} onClick={issueBook} className="action-btn bg-emerald-500/25">Issue Book</button>
            <button disabled={isBusy} onClick={reserveBook} className="action-btn bg-cyan-500/25">Reserve</button>
          </div>
          {message ? <div className="rounded-xl bg-black/20 p-2 text-sm opacity-85">{message}</div> : null}
        </div>
      </motion.div>

      <section className="space-y-3">
        <SectionHeader title="You may also like" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommendations.map((item, i) => <BookCard key={item.id} book={item} index={i} />)}
        </div>
      </section>
    </div>
  );
};
