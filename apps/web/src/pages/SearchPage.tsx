import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { BookCard } from "../components/BookCard";
import { SectionHeader } from "../components/SectionHeader";
import { SmartSearchBar } from "../components/SmartSearchBar";
import { api } from "../lib/api";
import { demoBooks } from "../lib/mock";
import type { Book } from "../types";

export const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>(demoBooks);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState("all");
  const [author, setAuthor] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const runAiSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const res = await api.post("/ai/smart-search", { query });
      const results = res.data.results ?? [];

      if (results.length) {
        setBooks(results);
        setNotice(`AI found ${results.length} relevant books for: "${query}"`);
      } else {
        const firstKeyword = query.trim().split(/\s+/)[0] ?? "";
        const fallback = await api.get(`/books?q=${encodeURIComponent(firstKeyword)}`);
        const fallbackResults = fallback.data ?? [];
        setBooks(fallbackResults);
        setNotice(
          fallbackResults.length
            ? `No semantic hit, keyword search found ${fallbackResults.length} books for: "${query}"`
            : `No books found for: "${query}"`,
        );
      }
    } catch {
      setNotice("AI search is unavailable right now. Please retry in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (category !== "all") params.set("category", category);
      if (author) params.set("author", author);
      if (availableOnly) params.set("available", "true");
      if (minRating > 0) params.set("minRating", String(minRating));

      const endpoint = params.toString() ? `/books?${params.toString()}` : "/books";
      const res = await api.get(endpoint);
      setBooks(res.data);
      setNotice("");
    } catch {
      setBooks(demoBooks);
      setNotice("Live search unavailable, showing fallback demo catalog.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get("q");
    setSearchQuery(q ?? "");

    if (q?.trim()) {
      runAiSearch(q);
      return;
    }

    fetchBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const categories = useMemo(() => [...new Set(books.map((b) => b.category))], [books]);

  return (
    <div className="space-y-6">
      <SectionHeader title="Advanced Search" subtitle="Natural language + multi-filter discovery powered by real APIs" />
      <SmartSearchBar
        onSearch={runAiSearch}
        initialQuery={searchQuery}
      />

      {notice ? <div className="glass p-3 text-sm">{notice}</div> : null}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-lg md:grid-cols-5">
        <input className="field" placeholder="Title or keyword" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="field" placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <select className="field" value={String(minRating)} onChange={(e) => setMinRating(Number(e.target.value))}>
          <option value="0">Any Rating</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="4.5">4.5+</option>
        </select>
        <label className="field inline-flex items-center gap-2">
          <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} /> Available Only
        </label>
      </motion.div>

      <div className="flex justify-end">
        <button onClick={fetchBooks} className="action-btn bg-white/10">Apply Filters</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? <div className="glass col-span-full p-4 text-sm opacity-75">Fetching books...</div> : null}
        {!isLoading && books.length === 0 ? <div className="glass col-span-full p-4 text-sm opacity-75">No books found for selected filters.</div> : null}
        {books.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
      </div>
    </div>
  );
};
