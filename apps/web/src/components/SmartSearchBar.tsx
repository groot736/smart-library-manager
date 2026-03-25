import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

export const SmartSearchBar = ({
  onSearch,
  initialQuery,
}: {
  onSearch: (query: string) => Promise<void> | void;
  initialQuery?: string;
}) => {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [isSearching, setIsSearching] = useState(false);

  // Keep local input in sync when parent pre-fills query from URL state.
  useEffect(() => {
    if (initialQuery !== undefined && !isSearching) {
      setQuery(initialQuery);
    }
  }, [initialQuery, isSearching]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      await onSearch(query);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-md">
      <Sparkles className="ml-2 text-cyan-300" size={18} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={isSearching}
        className="flex-1 bg-transparent p-2 text-sm outline-none"
        placeholder="Ask naturally: mujhe distributed systems pe top rated books dikhao"
      />
      <button disabled={isSearching} type="submit" className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {isSearching ? "Searching..." : "AI Search"}
      </button>
    </form>
  );
};
