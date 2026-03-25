import { Book, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const tokenize = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const titleAcronym = (title: string) =>
  title
    .split(/[^a-z0-9]+/gi)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toLowerCase();

type SearchFilters = {
  availableOnly: boolean;
  minRating?: number;
  category?: string;
  branch?: string;
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  AI: ["ai", "artificial", "ml", "machine", "learning", "deep"],
  "Computer Science": ["computer", "cs", "distributed", "systems", "database", "network"],
  Physics: ["physics", "quantum"],
};

const extractFilters = (query: string): SearchFilters => {
  const text = query.toLowerCase();
  const tokens = tokenize(text);

  const availableOnly =
    text.includes("available") ||
    text.includes("in stock") ||
    text.includes("only available") ||
    text.includes("available books");

  const ratingMatch = text.match(/(above|over|>=|greater than|at least)\s*(\d(?:\.\d)?)/);
  const topRated = text.includes("top rated") || text.includes("best rated") || text.includes("high rated");
  const minRating = ratingMatch ? Number(ratingMatch[2]) : topRated ? 4 : undefined;

  let category: string | undefined;
  for (const [name, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((word) => tokens.includes(word))) {
      category = name;
      break;
    }
  }

  let branch: string | undefined;
  if (text.includes("engineering")) branch = "Engineering";
  if (text.includes("science")) branch = "Science";
  if (text.includes("main")) branch = "Main";

  return { availableOnly, minRating, category, branch };
};

export const semanticSearchBooks = async (query: string) => {
  const tokens = tokenize(query);
  const compactQuery = query.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const filters = extractFilters(query);
  const primaryWhere: Prisma.BookWhereInput = {
    AND: [
      {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { author: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          ...tokens.map((token) => ({ tags: { has: token } })),
        ],
      },
      filters.availableOnly ? { availableCopies: { gt: 0 } } : {},
      filters.minRating ? { rating: { gte: filters.minRating } } : {},
      filters.category ? { category: { contains: filters.category, mode: "insensitive" } } : {},
      filters.branch ? { branch: { equals: filters.branch, mode: "insensitive" } } : {},
    ],
  };

  const books = await prisma.book.findMany({
    where: primaryWhere,
    take: 30,
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
  });

  if (books.length > 0) return books;

  const fallbackTerms = [query, ...tokens].filter(Boolean);
  const fallbackBooks = await prisma.book.findMany({
    where: {
      AND: [
        fallbackTerms.length
          ? {
              OR: fallbackTerms.flatMap((term) => [
                { title: { contains: term, mode: "insensitive" } },
                { author: { contains: term, mode: "insensitive" } },
                { category: { contains: term, mode: "insensitive" } },
                { tags: { has: term.toLowerCase() } },
              ]),
            }
          : {},
        filters.availableOnly ? { availableCopies: { gt: 0 } } : {},
        filters.minRating ? { rating: { gte: filters.minRating } } : {},
        filters.category ? { category: { contains: filters.category, mode: "insensitive" } } : {},
        filters.branch ? { branch: { equals: filters.branch, mode: "insensitive" } } : {},
      ],
    },
    take: 30,
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
  });

  if (fallbackBooks.length > 0) return fallbackBooks;

  const broadCandidates = await prisma.book.findMany({
    where: {
      AND: [
        filters.availableOnly ? { availableCopies: { gt: 0 } } : {},
        filters.minRating ? { rating: { gte: filters.minRating } } : {},
        filters.category ? { category: { contains: filters.category, mode: "insensitive" } } : {},
        filters.branch ? { branch: { equals: filters.branch, mode: "insensitive" } } : {},
      ],
    },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const acronymOrTokenMatches = broadCandidates.filter((book) => {
    const normalizedTitle = book.title.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const acronym = titleAcronym(book.title);
    const titleTokens = tokenize(book.title);

    const acronymHit = Boolean(compactQuery) && (acronym === compactQuery || normalizedTitle.includes(compactQuery));
    const tokenHit = tokens.length > 0 && tokens.every((token) => titleTokens.some((titleToken) => titleToken.startsWith(token)));

    return acronymHit || tokenHit;
  });

  return acronymOrTokenMatches;
};

export const recommendBooks = async (userId: string) => {
  const history = await prisma.transaction.findMany({
    where: { userId },
    include: { book: true },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  const likedCategories = history.reduce<Record<string, number>>((acc, t) => {
    const category = t.book.category;
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(likedCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);

  const recommendations = await prisma.book.findMany({
    where: topCategories.length
      ? {
          category: { in: topCategories },
          NOT: { transactions: { some: { userId } } },
        }
      : undefined,
    take: 12,
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
  });

  if (recommendations.length > 0) return recommendations;

  return prisma.book.findMany({
    where: {
      availableCopies: { gt: 0 },
      NOT: { transactions: { some: { userId } } },
    },
    take: 12,
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
  });
};

export const forecastDemand = async () => {
  const issued = await prisma.transaction.groupBy({
    by: ["bookId"],
    where: { type: "ISSUE" },
    _count: true,
    orderBy: { _count: { bookId: "desc" } },
    take: 10,
  });

  const books = await prisma.book.findMany({
    where: { id: { in: issued.map((row) => row.bookId) } },
  });

  const bookById = new Map<string, Book>();
  books.forEach((book) => bookById.set(book.id, book));

  return issued.map((row) => {
    const book = bookById.get(row.bookId);
    const demandScore = row._count * (book?.rating ?? 4);
    return {
      bookId: row.bookId,
      title: book?.title,
      branch: book?.branch,
      availableCopies: book?.availableCopies,
      demandScore,
      lowStockAlert: (book?.availableCopies ?? 0) <= 2,
    };
  });
};

export const autoTagBook = (description: string, category: string) => {
  const tags = new Set<string>(tokenize(description));
  tags.add(category.toLowerCase());

  if (description.toLowerCase().includes("machine learning")) tags.add("ai");
  if (description.toLowerCase().includes("database")) tags.add("database");
  if (description.toLowerCase().includes("physics")) tags.add("science");

  return Array.from(tags).slice(0, 12);
};

export const chatbotReply = async (question: string, userId?: string) => {
  const text = question.toLowerCase();

  if (text.includes("recommend")) {
    const books = userId ? await recommendBooks(userId) : await prisma.book.findMany({ take: 5, orderBy: { rating: "desc" } });
    return {
      intent: "recommendation",
      reply: "Yeh top picks hain jo aapko pasand aa sakti hain.",
      data: books,
    };
  }

  if (text.includes("fine")) {
    return {
      intent: "fine_info",
      reply: "Fine policy: 1 day grace, uske baad default 5 currency units per day.",
    };
  }

  if (text.includes("availability") || text.includes("available")) {
    const available = await prisma.book.count({ where: { availableCopies: { gt: 0 } } });
    return {
      intent: "availability",
      reply: `Abhi ${available} titles immediately available hain.`,
    };
  }

  const books = await semanticSearchBooks(question);
  return {
    intent: "search",
    reply: "Mujhe ye relevant books mili hain.",
    data: books.slice(0, 5),
  };
};

type StudyModePayload = {
  summary: string;
  keyNotes: string[];
  mcqs: Array<{
    question: string;
    options: string[];
    answer: string;
  }>;
  revisionChecklist: string[];
};

const normalizeSentences = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const buildMcqs = (bookTitle: string, category: string, notes: string[]) => {
  const firstNote = notes[0] ?? `Core focus area from ${bookTitle}`;
  const secondNote = notes[1] ?? `Key concept from ${category}`;

  return [
    {
      question: `What is the primary learning objective of ${bookTitle}?`,
      options: [
        "Memorize random terminology",
        `Understand ${category} concepts and real applications`,
        "Focus only on exam tricks",
        "Avoid practical examples",
      ],
      answer: `Understand ${category} concepts and real applications`,
    },
    {
      question: `Which note should be revised first from this book?`,
      options: [firstNote, secondNote, "Only bibliography", "Only index pages"],
      answer: firstNote,
    },
    {
      question: "Which study strategy is most effective for this content?",
      options: [
        "Skim once and stop",
        "Read with active recall and short quizzes",
        "Skip examples",
        "Avoid revision planning",
      ],
      answer: "Read with active recall and short quizzes",
    },
  ];
};

export const generateStudyMode = async (bookId?: string, prompt?: string): Promise<StudyModePayload> => {
  const candidateBooks = await prisma.book.findMany({
    where: bookId ? { id: bookId } : undefined,
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take: 1,
  });

  const book = candidateBooks[0];
  if (!book) {
    return {
      summary: "No book context available. Please select a valid book to generate study mode.",
      keyNotes: ["Select a book first", "Then regenerate summary and MCQs"],
      mcqs: [],
      revisionChecklist: ["Pick a target book", "Read summary", "Attempt generated MCQs"],
    };
  }

  const sentences = normalizeSentences(book.description);
  const keyNotes = [
    sentences[0] ?? `${book.title} builds strong foundations in ${book.category}.`,
    sentences[1] ?? `It includes practical understanding for university-level ${book.category.toLowerCase()} study.`,
    `High-impact tags: ${book.tags.slice(0, 5).join(", ") || "core concepts"}`,
    prompt ? `Prompt focus: ${prompt}` : `Recommended branch context: ${book.branch}`,
  ];

  const summary = `${book.title} by ${book.author} is a ${book.category} focused resource designed for applied learning. ${keyNotes[0]} ${keyNotes[1]}`;
  const mcqs = buildMcqs(book.title, book.category, keyNotes);

  const revisionChecklist = [
    "Read the summary once, then explain it in your own words.",
    "Revise key notes and map each one to a practical scenario.",
    "Solve MCQs without looking at answers.",
    "Review weak areas and re-attempt after 24 hours.",
  ];

  return {
    summary,
    keyNotes,
    mcqs,
    revisionChecklist,
  };
};

export const predictBookAvailability = async (bookId: string) => {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return null;

  const [issues, returns, reservations] = await Promise.all([
    prisma.transaction.count({ where: { bookId, type: "ISSUE" } }),
    prisma.transaction.count({ where: { bookId, type: "RETURN" } }),
    prisma.reservation.count({ where: { bookId, status: { in: ["PENDING", "APPROVED"] } } }),
  ]);

  const issuePressure = Math.max(1, issues - returns + reservations);
  const daysToNextLikelyAvailability = book.availableCopies > 0 ? 0 : Math.min(21, Math.max(2, issuePressure * 2));
  const confidence = Math.max(50, 92 - issuePressure * 3);

  return {
    bookId: book.id,
    title: book.title,
    availableCopies: book.availableCopies,
    activeDemandSignals: issuePressure,
    predictedAvailableInDays: daysToNextLikelyAvailability,
    confidencePercent: confidence,
    recommendation:
      daysToNextLikelyAvailability === 0
        ? "Book is currently available. Issue now for immediate access."
        : `Join the waitlist. Expected availability in ~${daysToNextLikelyAvailability} days.`,
  };
};

export const getStudyMatches = async (userId: string) => {
  const myIssues = await prisma.transaction.findMany({
    where: { userId, type: { in: ["ISSUE", "RENEWAL"] } },
    select: { bookId: true },
  });

  const myBookIds = Array.from(new Set(myIssues.map((row) => row.bookId)));
  if (myBookIds.length === 0) return [];

  const matches = await prisma.transaction.findMany({
    where: {
      bookId: { in: myBookIds },
      userId: { not: userId },
      type: { in: ["ISSUE", "RENEWAL"] },
    },
    include: {
      user: { select: { id: true, name: true, role: true, branch: true } },
      book: { select: { id: true, title: true, category: true, branch: true } },
    },
    take: 30,
    orderBy: { createdAt: "desc" },
  });

  return matches.map((match) => ({
    user: match.user,
    book: match.book,
    collaborationHint: `You both are reading ${match.book.title}. Suggested: 30-minute peer revision session.`,
  }));
};

export const getLeaderboard = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      branch: true,
      transactions: { select: { type: true, fineAmount: true } },
      reservations: { select: { id: true } },
    },
  });

  const leaderboard = users.map((user) => {
    const issuePoints = user.transactions.filter((tx) => tx.type === "ISSUE").length * 10;
    const renewalPoints = user.transactions.filter((tx) => tx.type === "RENEWAL").length * 5;
    const returnPoints = user.transactions.filter((tx) => tx.type === "RETURN").length * 7;
    const finePenalty = user.transactions.reduce((sum, tx) => sum + (tx.fineAmount ?? 0), 0);
    const reservationBonus = user.reservations.length * 2;

    const score = Math.max(0, Math.round(issuePoints + renewalPoints + returnPoints + reservationBonus - finePenalty));

    return {
      userId: user.id,
      name: user.name,
      role: user.role,
      branch: user.branch,
      score,
      badges: [
        issuePoints >= 30 ? "Avid Reader" : null,
        returnPoints >= 21 ? "On-Time Returner" : null,
        reservationBonus >= 10 ? "Queue Strategist" : null,
      ].filter(Boolean),
    };
  });

  return leaderboard.sort((a, b) => b.score - a.score).slice(0, 20);
};

export const getUserBadges = async (userId: string) => {
  const leaderboard = await getLeaderboard();
  const me = leaderboard.find((row) => row.userId === userId);

  if (!me) {
    return {
      score: 0,
      rank: null,
      badges: [],
    };
  }

  return {
    score: me.score,
    rank: leaderboard.findIndex((row) => row.userId === userId) + 1,
    badges: me.badges,
  };
};

export const explainAnyPage = (text: string, mode: "simple" | "detailed" | "exam" = "simple") => {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
  const base = sentences.slice(0, 5);

  if (mode === "simple") {
    return {
      mode,
      explanation: base.map((line) => `- ${line}`).join("\n"),
      takeaway: "Focus on these points first before diving into details.",
    };
  }

  if (mode === "exam") {
    return {
      mode,
      explanation: [
        "Exam-focused explanation:",
        ...base.map((line, idx) => `${idx + 1}. ${line}`),
      ].join("\n"),
      probableQuestions: [
        "Define the core concept in your own words.",
        "Differentiate this concept from related approaches.",
        "Give one real-world application from this topic.",
      ],
    };
  }

  return {
    mode,
    explanation: clean,
    takeaway: "Detailed mode keeps original context for deep study.",
  };
};

const normalizeImageHint = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);

export const imageSearchBooks = async (imageUrl: string, hint?: string) => {
  const tokens = normalizeImageHint(`${imageUrl} ${hint ?? ""}`);

  const localMatches = await prisma.book.findMany({
    where: {
      OR: [
        ...tokens.map((token) => ({ title: { contains: token, mode: "insensitive" as const } })),
        ...tokens.map((token) => ({ author: { contains: token, mode: "insensitive" as const } })),
        ...tokens.map((token) => ({ tags: { has: token } })),
      ],
    },
    take: 10,
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
  });

  if (localMatches.length > 0) {
    return {
      source: "local-catalog",
      matches: localMatches,
      external: [],
    };
  }

  const query = tokens.slice(0, 4).join(" ").trim();
  if (!query) {
    return {
      source: "local-catalog",
      matches: [],
      external: [],
    };
  }

  try {
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`);
    const data = (await response.json()) as { docs?: Array<{ title?: string; author_name?: string[]; first_publish_year?: number }> };

    const external = (data.docs ?? []).map((doc) => ({
      title: doc.title ?? "Unknown",
      author: doc.author_name?.[0] ?? "Unknown",
      firstPublishYear: doc.first_publish_year,
    }));

    return {
      source: "open-library",
      matches: [],
      external,
    };
  } catch {
    return {
      source: "open-library",
      matches: [],
      external: [],
    };
  }
};

export const getBookSummaryByMode = async (bookId: string, mode: "short" | "detailed" | "exam") => {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return null;

  const sentences = book.description.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);

  if (mode === "short") {
    return {
      mode,
      title: book.title,
      summary: `${book.title} is a ${book.category} resource focused on ${sentences[0] ?? "core concepts"}.`,
    };
  }

  if (mode === "exam") {
    return {
      mode,
      title: book.title,
      summary: [
        `${book.title} exam mode summary:`,
        `- Core idea: ${sentences[0] ?? book.description}`,
        `- Important focus area: ${sentences[1] ?? "Applied understanding and revision"}`,
        "- Suggested exam strategy: active recall + MCQ practice",
      ].join("\n"),
    };
  }

  return {
    mode,
    title: book.title,
    summary: `${book.description} Category: ${book.category}. Author: ${book.author}. Branch context: ${book.branch}.`,
  };
};
