import { Mic, MicOff, Sparkles, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import type {
  AvailabilityForecast,
  Book,
  BookSummaryResponse,
  ExplainPageResponse,
  ImageSearchResponse,
  LeaderboardEntry,
  StudyMatch,
  StudyModeResponse,
  UserBadgeSummary,
} from "../types";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

const getSpeechRecognition = () => {
  const win = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

  return win.SpeechRecognition ?? win.webkitSpeechRecognition;
};

export const InnovationHubPage = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [bookOptions, setBookOptions] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [studyPrompt, setStudyPrompt] = useState("Create concise notes for exam revision");
  const [studyMode, setStudyMode] = useState<StudyModeResponse | null>(null);
  const [availability, setAvailability] = useState<AvailabilityForecast | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [studyMatches, setStudyMatches] = useState<StudyMatch[]>([]);
  const [myBadges, setMyBadges] = useState<UserBadgeSummary | null>(null);
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [readerNotes, setReaderNotes] = useState<string[]>([]);
  const [newReaderNote, setNewReaderNote] = useState("");
  const [readerPdfUrl, setReaderPdfUrl] = useState("https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf");
  const [summaryMode, setSummaryMode] = useState<"short" | "detailed" | "exam">("short");
  const [bookSummary, setBookSummary] = useState<BookSummaryResponse | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageHint, setImageHint] = useState("");
  const [imageSearchResult, setImageSearchResult] = useState<ImageSearchResponse | null>(null);
  const [explainText, setExplainText] = useState("");
  const [explainMode, setExplainMode] = useState<"simple" | "detailed" | "exam">("simple");
  const [explainResult, setExplainResult] = useState<ExplainPageResponse | null>(null);
  const [roomId, setRoomId] = useState("cs-ai-room");
  const [roomMessage, setRoomMessage] = useState("");
  const [roomHighlight, setRoomHighlight] = useState("");
  const [roomFeed, setRoomFeed] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [notice, setNotice] = useState("");

  const selectedBook = useMemo(
    () => bookOptions.find((book) => book.id === selectedBookId),
    [bookOptions, selectedBookId],
  );

  const loadCatalog = async () => {
    const res = await api.get<Book[]>("/books");
    const books = res.data ?? [];
    setBookOptions(books.slice(0, 150));

    if (!selectedBookId && books[0]) {
      setSelectedBookId(books[0].id);
    }
  };

  const loadEngagement = async () => {
    try {
      const [leaderboardRes, badgesRes, matchesRes] = await Promise.all([
        api.get<LeaderboardEntry[]>("/ai/leaderboard"),
        user ? api.get<UserBadgeSummary>("/ai/badges/me") : Promise.resolve({ data: null } as { data: null }),
        user ? api.get<StudyMatch[]>("/ai/study-matches") : Promise.resolve({ data: [] } as { data: StudyMatch[] }),
      ]);

      setLeaderboard(leaderboardRes.data ?? []);
      setMyBadges(badgesRes.data);
      setStudyMatches(matchesRes.data ?? []);
    } catch {
      setNotice("Engagement services are temporarily unavailable.");
    }
  };

  useEffect(() => {
    loadCatalog().catch(() => setNotice("Unable to load catalog for innovation hub."));
    loadEngagement().catch(() => setNotice("Unable to load engagement modules."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const key = `unilib_reader_notes_${selectedBookId || "global"}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setReaderNotes(JSON.parse(saved) as string[]);
      } catch {
        setReaderNotes([]);
      }
    } else {
      setReaderNotes([]);
    }
  }, [selectedBookId]);

  useEffect(() => {
    const key = `unilib_reader_notes_${selectedBookId || "global"}`;
    localStorage.setItem(key, JSON.stringify(readerNotes));
  }, [readerNotes, selectedBookId]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000");
    socketRef.current = socket;

    socket.on("reading-room:system", (payload: { message: string }) => {
      setRoomFeed((prev) => [`SYSTEM: ${payload.message}`, ...prev].slice(0, 40));
    });

    socket.on("reading-room:message", (payload: { userName: string; message: string }) => {
      setRoomFeed((prev) => [`${payload.userName}: ${payload.message}`, ...prev].slice(0, 40));
    });

    socket.on("reading-room:highlight", (payload: { userName: string; highlight: string }) => {
      setRoomFeed((prev) => [`HIGHLIGHT ${payload.userName}: ${payload.highlight}`, ...prev].slice(0, 40));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const generateStudyMode = async () => {
    if (!selectedBookId) {
      setNotice("Please select a book first.");
      return;
    }

    try {
      const [studyRes, forecastRes] = await Promise.all([
        api.post<StudyModeResponse>("/ai/study-mode", {
          bookId: selectedBookId,
          prompt: studyPrompt,
        }),
        api.get<AvailabilityForecast>(`/ai/availability-forecast/${selectedBookId}`),
      ]);

      setStudyMode(studyRes.data);
      setAvailability(forecastRes.data);
      setNotice("AI Study Mode generated successfully.");
    } catch {
      setNotice("AI Study Mode generation failed.");
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setNotice("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setVoiceText(transcript);
      setIsListening(false);
      if (transcript.trim()) {
        navigate(`/search?q=${encodeURIComponent(transcript)}&source=voice`);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setNotice("Voice capture failed. Please try again.");
    };

    setIsListening(true);
    recognition.start();

    window.setTimeout(() => {
      recognition.stop();
      setIsListening(false);
    }, 7000);
  };

  const addReaderNote = () => {
    if (!newReaderNote.trim()) return;
    setReaderNotes((prev) => [newReaderNote.trim(), ...prev].slice(0, 10));
    setNewReaderNote("");
  };

  const generateBookSummary = async () => {
    if (!selectedBookId) return;
    try {
      const res = await api.get<BookSummaryResponse>(`/ai/book-summary/${selectedBookId}?mode=${summaryMode}`);
      setBookSummary(res.data);
    } catch {
      setNotice("Unable to generate one-click summary right now.");
    }
  };

  const runImageSearch = async () => {
    if (!imageUrl.trim()) {
      setNotice("Image URL is required for image-based search.");
      return;
    }

    try {
      const res = await api.post<ImageSearchResponse>("/ai/image-search", { imageUrl, hint: imageHint || undefined });
      setImageSearchResult(res.data);
    } catch {
      setNotice("Image search failed. Try another image URL or hint.");
    }
  };

  const explainPage = async () => {
    if (!explainText.trim()) {
      setNotice("Paste page text first to explain.");
      return;
    }

    try {
      const res = await api.post<ExplainPageResponse>("/ai/explain-page", {
        text: explainText,
        mode: explainMode,
      });
      setExplainResult(res.data);
    } catch {
      setNotice("Explain Any Page is currently unavailable.");
    }
  };

  const joinReadingRoom = () => {
    if (!roomId.trim()) return;
    socketRef.current?.emit("reading-room:join", {
      roomId: roomId.trim(),
      userName: user?.name ?? "Guest Reader",
    });
  };

  const sendRoomMessage = () => {
    if (!roomMessage.trim() || !roomId.trim()) return;
    socketRef.current?.emit("reading-room:message", {
      roomId: roomId.trim(),
      userName: user?.name ?? "Guest Reader",
      message: roomMessage.trim(),
    });
    setRoomMessage("");
  };

  const sendHighlight = () => {
    if (!roomHighlight.trim() || !roomId.trim()) return;
    socketRef.current?.emit("reading-room:highlight", {
      roomId: roomId.trim(),
      userName: user?.name ?? "Guest Reader",
      highlight: roomHighlight.trim(),
    });
    setRoomHighlight("");
  };

  const exportNotesMarkdown = () => {
    const content = [
      `# Notes - ${selectedBook?.title ?? "General"}`,
      "",
      ...readerNotes.map((note) => `- ${note}`),
    ].join("\n");

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(selectedBook?.title ?? "reader-notes").replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportNotesPdf = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><body><h1>Notes - ${selectedBook?.title ?? "General"}</h1><ul>${readerNotes.map((n) => `<li>${n}</li>`).join("")}</ul></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/90">Innovation Hub</p>
        <h1 className="gradient-heading mt-2 text-3xl font-bold md:text-4xl">AI Study Lab, Voice Discovery, and Digital Reader</h1>
        <p className="mt-2 max-w-4xl text-sm opacity-80">
          Premium modules for smarter campus learning: one-click summaries, MCQs, wait-time prediction, peer study matchmaking,
          and gamified reading achievements.
        </p>
      </div>

      {notice ? <div className="glass p-3 text-sm">{notice}</div> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="glass space-y-3 p-4">
          <h2 className="text-lg font-semibold">AI Study Mode</h2>
          <select className="field w-full" value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)}>
            <option value="">Select a book</option>
            {bookOptions.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
          <textarea
            className="field min-h-20 w-full"
            value={studyPrompt}
            onChange={(e) => setStudyPrompt(e.target.value)}
            placeholder="Custom instruction for notes / MCQs"
          />
          <button onClick={generateStudyMode} className="action-btn bg-cyan-500/25">
            <Sparkles size={14} className="mr-2 inline" /> Generate Study Pack
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <select className="field" value={summaryMode} onChange={(e) => setSummaryMode(e.target.value as "short" | "detailed" | "exam")}>
              <option value="short">Summary: Short</option>
              <option value="detailed">Summary: Detailed</option>
              <option value="exam">Summary: Exam Mode</option>
            </select>
            <button onClick={generateBookSummary} className="action-btn bg-blue-500/25">One-Click Summary</button>
          </div>

          {bookSummary ? (
            <div className="rounded-2xl bg-black/20 p-3 text-sm">
              <p className="font-semibold">{bookSummary.title} ({bookSummary.mode})</p>
              <p className="opacity-85 whitespace-pre-line">{bookSummary.summary}</p>
            </div>
          ) : null}

          {studyMode ? (
            <div className="space-y-3 rounded-2xl bg-black/20 p-3 text-sm">
              <p className="font-semibold">Summary</p>
              <p className="opacity-85">{studyMode.summary}</p>
              <p className="font-semibold">Key Notes</p>
              <ul className="space-y-1 opacity-85">
                {studyMode.keyNotes.map((note) => (
                  <li key={note}>- {note}</li>
                ))}
              </ul>
              <p className="font-semibold">MCQs</p>
              <div className="space-y-2">
                {studyMode.mcqs.map((mcq) => (
                  <div key={mcq.question} className="rounded-xl bg-black/20 p-2">
                    <p className="font-medium">{mcq.question}</p>
                    {mcq.options.map((option) => (
                      <div key={option} className="opacity-80">- {option}</div>
                    ))}
                    <p className="mt-1 text-emerald-200">Answer: {mcq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {availability ? (
            <div className="rounded-2xl bg-black/20 p-3 text-sm">
              <p className="font-semibold">Predictive Availability</p>
              <p>{availability.title}</p>
              <p className="opacity-80">Expected availability in {availability.predictedAvailableInDays} day(s), confidence {availability.confidencePercent}%.</p>
              <p className="mt-1 text-cyan-100">{availability.recommendation}</p>
            </div>
          ) : null}
        </section>

        <section className="glass space-y-3 p-4">
          <h2 className="text-lg font-semibold">Voice Search + Digital Reader</h2>
          <button onClick={startVoiceSearch} className="action-btn bg-emerald-500/25">
            {isListening ? <MicOff size={14} className="mr-2 inline" /> : <Mic size={14} className="mr-2 inline" />}
            {isListening ? "Listening..." : "Start Voice Search"}
          </button>
          {voiceText ? <div className="rounded-xl bg-black/20 p-2 text-sm">Captured: {voiceText}</div> : null}

          <div className="rounded-2xl bg-black/20 p-3 text-sm">
            <p className="font-semibold">Digital Reader Simulation</p>
            <p className="opacity-80">{selectedBook ? `Reading: ${selectedBook.title}` : "Select a book to begin reading."}</p>
            <input
              className="field mt-2 w-full"
              value={readerPdfUrl}
              onChange={(e) => setReaderPdfUrl(e.target.value)}
              placeholder="PDF URL"
            />
            <iframe title="reader" src={readerPdfUrl} className="mt-2 h-48 w-full rounded-xl border border-white/15 bg-black/20" />
            <div className="mt-2 flex gap-2">
              <input
                className="field flex-1"
                value={newReaderNote}
                onChange={(e) => setNewReaderNote(e.target.value)}
                placeholder="Add highlight note"
              />
              <button onClick={addReaderNote} className="action-btn bg-white/10">Save</button>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={exportNotesMarkdown} className="action-btn bg-white/10">Export Markdown</button>
              <button onClick={exportNotesPdf} className="action-btn bg-white/10">Export PDF</button>
            </div>
            <div className="mt-2 space-y-1 text-xs">
              {readerNotes.map((note) => (
                <div key={note} className="rounded bg-black/20 px-2 py-1">{note}</div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="glass space-y-3 p-4">
          <h2 className="text-lg font-semibold">Explain Any Page AI</h2>
          <textarea
            className="field min-h-28 w-full"
            value={explainText}
            onChange={(e) => setExplainText(e.target.value)}
            placeholder="Paste scanned text or selected paragraph here"
          />
          <div className="flex items-center gap-2">
            <select className="field" value={explainMode} onChange={(e) => setExplainMode(e.target.value as "simple" | "detailed" | "exam")}>
              <option value="simple">Simple</option>
              <option value="detailed">Detailed</option>
              <option value="exam">Exam</option>
            </select>
            <button onClick={explainPage} className="action-btn bg-cyan-500/25">Explain</button>
          </div>
          {explainResult ? (
            <div className="rounded-2xl bg-black/20 p-3 text-sm">
              <p className="whitespace-pre-line opacity-90">{explainResult.explanation}</p>
              {explainResult.takeaway ? <p className="mt-2 text-cyan-100">{explainResult.takeaway}</p> : null}
              {explainResult.probableQuestions?.length ? (
                <div className="mt-2">
                  {explainResult.probableQuestions.map((item) => <div key={item}>- {item}</div>)}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="glass space-y-3 p-4">
          <h2 className="text-lg font-semibold">Image-Based Book Search</h2>
          <input className="field w-full" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL or file name hint" />
          <input className="field w-full" value={imageHint} onChange={(e) => setImageHint(e.target.value)} placeholder="Optional hint (title/author)" />
          <button onClick={runImageSearch} className="action-btn bg-emerald-500/25">Search by Image</button>

          {imageSearchResult ? (
            <div className="rounded-2xl bg-black/20 p-3 text-sm">
              <p className="mb-1 text-xs opacity-70">Source: {imageSearchResult.source}</p>
              {imageSearchResult.matches.length > 0 ? (
                <div className="space-y-1">
                  {imageSearchResult.matches.slice(0, 5).map((book) => <div key={book.id}>- {book.title} ({book.author})</div>)}
                </div>
              ) : (
                <div className="space-y-1">
                  {imageSearchResult.external.slice(0, 5).map((book) => <div key={`${book.title}-${book.author}`}>- {book.title} ({book.author})</div>)}
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="glass space-y-3 p-4">
          <h2 className="text-lg font-semibold">Collaborative Reading Room</h2>
          <div className="flex gap-2">
            <input className="field flex-1" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Room ID" />
            <button onClick={joinReadingRoom} className="action-btn bg-cyan-500/25">Join</button>
          </div>
          <div className="flex gap-2">
            <input className="field flex-1" value={roomMessage} onChange={(e) => setRoomMessage(e.target.value)} placeholder="Message" />
            <button onClick={sendRoomMessage} className="action-btn bg-white/10">Send</button>
          </div>
          <div className="flex gap-2">
            <input className="field flex-1" value={roomHighlight} onChange={(e) => setRoomHighlight(e.target.value)} placeholder="Highlight to share" />
            <button onClick={sendHighlight} className="action-btn bg-white/10">Highlight</button>
          </div>
          <div className="max-h-56 overflow-auto rounded-xl bg-black/20 p-2 text-xs">
            {roomFeed.map((entry, idx) => <div key={`${entry}-${idx}`} className="py-1">{entry}</div>)}
            {roomFeed.length === 0 ? <div className="opacity-70">Join a room to start live discussion.</div> : null}
          </div>
        </section>

        <section className="glass p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Users size={17} /> Study Matchmaking</h2>
          <div className="space-y-2 text-sm">
            {studyMatches.slice(0, 8).map((match) => (
              <div key={`${match.user.id}-${match.book.id}`} className="rounded-xl bg-black/20 p-3">
                <p className="font-medium">{match.user.name} ({match.user.role})</p>
                <p className="opacity-80">Common Book: {match.book.title}</p>
                <p className="text-cyan-100">{match.collaborationHint}</p>
              </div>
            ))}
            {studyMatches.length === 0 ? <div className="opacity-70">No study peers found yet. Issue/renew books to activate matching.</div> : null}
          </div>
        </section>

        <section className="glass p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Trophy size={17} /> Gamification Leaderboard</h2>
          {myBadges ? (
            <div className="mb-3 rounded-xl bg-black/20 p-3 text-sm">
              <p>Your Score: {myBadges.score}</p>
              <p>Your Rank: {myBadges.rank ?? "N/A"}</p>
              <p>Badges: {myBadges.badges.length ? myBadges.badges.join(", ") : "No badges yet"}</p>
            </div>
          ) : null}
          <div className="space-y-2 text-sm">
            {leaderboard.slice(0, 10).map((row, index) => (
              <div key={row.userId} className="flex items-center justify-between rounded-xl bg-black/20 p-3">
                <div>
                  <p className="font-medium">#{index + 1} {row.name}</p>
                  <p className="opacity-75">{row.role} {row.branch ? `| ${row.branch}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{row.score} pts</p>
                  <p className="text-xs opacity-80">{row.badges.join(", ") || "No badge"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
