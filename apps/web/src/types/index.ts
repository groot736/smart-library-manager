export type Role = "STUDENT" | "FACULTY" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  branch?: string;
  isVerified?: boolean;
  createdAt?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  description: string;
  category: string;
  tags: string[];
  coverUrl?: string;
  availableCopies: number;
  totalCopies: number;
  rating: number;
  createdAt: string;
  branch: string;
}

export interface Transaction {
  id: string;
  type: "ISSUE" | "RETURN" | "RENEWAL";
  userId?: string;
  bookId?: string;
  issuedAt?: string;
  dueDate?: string;
  returnedAt?: string;
  fineAmount: number;
  user?: User;
  book: Book;
}

export interface Reservation {
  id: string;
  userId?: string;
  bookId?: string;
  queuePosition: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED" | "CANCELLED";
  requestedAt: string;
  expiresAt?: string;
  user?: User;
  book: Book;
}

export interface HomeFeed {
  trending: Book[];
  newlyAdded: Book[];
  recommended: Book[];
}

export interface AnalyticsResponse {
  totals: {
    booksCount: number;
    usersCount: number;
    activeReservations: number;
  };
  topIssued: Array<{
    bookId: string;
    title: string;
    issueCount: number;
  }>;
}

export interface StudyModeResponse {
  summary: string;
  keyNotes: string[];
  mcqs: Array<{
    question: string;
    options: string[];
    answer: string;
  }>;
  revisionChecklist: string[];
}

export interface AvailabilityForecast {
  bookId: string;
  title: string;
  availableCopies: number;
  activeDemandSignals: number;
  predictedAvailableInDays: number;
  confidencePercent: number;
  recommendation: string;
}

export interface StudyMatch {
  user: {
    id: string;
    name: string;
    role: Role;
    branch?: string;
  };
  book: {
    id: string;
    title: string;
    category: string;
    branch: string;
  };
  collaborationHint: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  role: Role;
  branch?: string;
  score: number;
  badges: string[];
}

export interface UserBadgeSummary {
  score: number;
  rank: number | null;
  badges: string[];
}

export interface ExplainPageResponse {
  mode: "simple" | "detailed" | "exam";
  explanation: string;
  takeaway?: string;
  probableQuestions?: string[];
}

export interface ImageSearchResponse {
  source: "local-catalog" | "open-library";
  matches: Book[];
  external: Array<{
    title: string;
    author: string;
    firstPublishYear?: number;
  }>;
}

export interface BookSummaryResponse {
  mode: "short" | "detailed" | "exam";
  title: string;
  summary: string;
}
