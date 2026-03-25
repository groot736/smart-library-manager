import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Bot, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BookCard } from "../components/BookCard";
import { SectionHeader } from "../components/SectionHeader";
import { SmartSearchBar } from "../components/SmartSearchBar";
import { api } from "../lib/api";
import { demoBooks } from "../lib/mock";
import { useAuthStore } from "../store/auth";
import type { Book, HomeFeed } from "../types";

const BookRow = ({ title, books }: { title: string; books: Book[] }) => (
  <section className="space-y-3">
    <SectionHeader title={title} />
    <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {books.map((book, index) => (
        <div key={book.id} className="min-w-[260px] max-w-[260px] md:min-w-[280px] md:max-w-[280px]">
          <BookCard book={book} index={index} />
        </div>
      ))}
    </div>
  </section>
);

export const HomePage = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [feed, setFeed] = useState<HomeFeed>({
    trending: demoBooks,
    newlyAdded: demoBooks,
    recommended: demoBooks,
  });
  const [assistantQuery, setAssistantQuery] = useState("Mujhe AI category ki top books suggest karo");
  const [assistantReply, setAssistantReply] = useState("Hi! Main UniLib AI assistant hoon. Login ke baad personalized help dunga.");
  const [assistantBooks, setAssistantBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAskingAssistant, setIsAskingAssistant] = useState(false);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const feedRes = await api.get("/books/home-feed");
        const nextFeed: HomeFeed = feedRes.data;

        if (user) {
          try {
            const recommendationRes = await api.get("/ai/recommendations");
            const recBooks: Book[] = recommendationRes.data ?? [];
            setFeed({ ...nextFeed, recommended: recBooks.length ? recBooks : nextFeed.recommended });
          } catch {
            setFeed(nextFeed);
          }
        } else {
          setFeed(nextFeed);
        }
      } catch {
        setFeed({ trending: demoBooks, newlyAdded: demoBooks, recommended: demoBooks });
      } finally {
        setIsLoading(false);
      }
    };

    loadFeed();
  }, [user]);

  const onSmartSearch = async (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}&source=home-ai`);
  };

  const askAssistant = async () => {
    if (!assistantQuery.trim()) return;

    setIsAskingAssistant(true);
    try {
      const endpoint = user ? "/ai/chat" : "/ai/chat-public";
      const res = await api.post(endpoint, { question: assistantQuery });
      setAssistantReply(res.data.reply ?? "Assistant response received.");
      setAssistantBooks(res.data.data ?? []);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        setAssistantReply(message ?? "Assistant temporarily unavailable. Try again in a moment.");
      } else {
        setAssistantReply("Assistant temporarily unavailable. Try again in a moment.");
      }
    } finally {
      setIsAskingAssistant(false);
    }
  };

  const summary = useMemo(() => {
    const totalVisible = feed.trending.length + feed.newlyAdded.length + feed.recommended.length;
    return {
      totalVisible,
      uniqueCategories: new Set(feed.trending.map((b) => b.category)).size,
    };
  }, [feed]);

  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/90">AI Powered University Library</p>
            <h1 className="gradient-heading text-3xl font-extrabold md:text-5xl">Discover, reserve, and manage academic resources with intelligence.</h1>
            <p className="max-w-3xl text-sm opacity-80 md:text-base">Semantic search, predictive demand analytics, real-time admin insights, and recommendation engine - everything tuned for real university operations.</p>
            <div className="mt-5"><SmartSearchBar onSearch={onSmartSearch} /></div>
            <div className="flex flex-wrap gap-2 pt-2 text-xs opacity-85">
              <span className="panel">Visible Cards: {summary.totalVisible}</span>
              <span className="panel">Categories in Trend: {summary.uniqueCategories}</span>
              <span className="panel">Realtime Enabled</span>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot size={16} className="text-cyan-300" /> AI Library Concierge
            </div>
            <textarea
              value={assistantQuery}
              onChange={(e) => setAssistantQuery(e.target.value)}
              className="field min-h-24 w-full resize-none"
              placeholder="Ask: mere overdue books kitne hain? ya AI books recommend karo"
            />
            <button disabled={isAskingAssistant} onClick={askAssistant} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              <Sparkles size={14} /> {isAskingAssistant ? "Thinking..." : "Ask Assistant"}
            </button>
            <p className="text-sm opacity-80">{assistantReply}</p>
            {assistantBooks.length > 0 ? (
              <div className="space-y-1 text-xs opacity-85">
                {assistantBooks.slice(0, 3).map((book) => (
                  <div key={book.id} className="rounded-lg bg-black/20 px-2 py-1">{book.title}</div>
                ))}
              </div>
            ) : null}
          </motion.div>
        </div>
      </motion.section>

      {isLoading ? <div className="glass p-4 text-sm opacity-70">Loading live catalog...</div> : null}
      <BookRow title="Trending This Week" books={feed.trending} />
      <BookRow title="Recommended For You" books={feed.recommended} />
      <BookRow title="Newly Added" books={feed.newlyAdded} />
    </div>
  );
};
