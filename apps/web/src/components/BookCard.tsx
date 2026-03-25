import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { Book } from "../types";

export const BookCard = ({ book, index = 0 }: { book: Book; index?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35 }}
      className="group overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-xl"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={book.coverUrl ?? "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80"}
          alt={book.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="space-y-2 p-4">
        <div className="line-clamp-1 text-base font-semibold">{book.title}</div>
        <div className="text-sm opacity-75">{book.author}</div>
        <div className="flex items-center justify-between text-sm">
          <span>{book.category}</span>
          <span className="flex items-center gap-1"><Star size={14} className="text-amber-300" /> {book.rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 text-sm">
          <span className={book.availableCopies > 0 ? "text-emerald-300" : "text-rose-300"}>
            {book.availableCopies > 0 ? `${book.availableCopies} available` : "Waitlist only"}
          </span>
          <Link to={`/books/${book.id}`} className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
            View
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
