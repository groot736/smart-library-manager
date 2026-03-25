import bcrypt from "bcryptjs";
import { ReservationStatus, Role, TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { autoTagBook } from "./ai.service";

const DEMO_PASSWORD = "Password@123";

const demoUsers = [
  { name: "Admin User", email: "admin@unilib.ai", role: Role.ADMIN, branch: "Main" },
  { name: "Faculty User", email: "faculty@unilib.ai", role: Role.FACULTY, branch: "Engineering" },
  { name: "Student User", email: "student@unilib.ai", role: Role.STUDENT, branch: "Science" },
];

const demoBooks = [
  {
    title: "Deep Learning with Python",
    author: "Francois Chollet",
    isbn: "9781617294433",
    description: "Practical deep learning guide with neural network fundamentals.",
    category: "AI",
    totalCopies: 8,
    availableCopies: 6,
    rating: 4.8,
    branch: "Main",
  },
  {
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    isbn: "9781449373320",
    description: "Distributed systems, storage engines, and scalability patterns.",
    category: "Computer Science",
    totalCopies: 10,
    availableCopies: 7,
    rating: 4.9,
    branch: "Main",
  },
  {
    title: "Modern Operating Systems",
    author: "Andrew S. Tanenbaum",
    isbn: "9780133591620",
    description: "Comprehensive operating system concepts and practical architecture.",
    category: "Computer Science",
    totalCopies: 7,
    availableCopies: 3,
    rating: 4.6,
    branch: "Engineering",
  },
  {
    title: "Quantum Mechanics Essentials",
    author: "David J. Griffiths",
    isbn: "9781107189638",
    description: "Conceptual understanding of quantum systems for undergraduate learners.",
    category: "Physics",
    totalCopies: 5,
    availableCopies: 4,
    rating: 4.5,
    branch: "Science",
  },
  {
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "9780132350884",
    description: "Best practices for writing maintainable, readable, and scalable software.",
    category: "Computer Science",
    totalCopies: 9,
    availableCopies: 8,
    rating: 4.7,
    branch: "Main",
  },
];

const catalogThemes = [
  "Algorithms",
  "Databases",
  "Distributed Systems",
  "Machine Learning",
  "Cybersecurity",
  "Cloud Computing",
  "Software Engineering",
  "Operating Systems",
  "Computer Networks",
  "Data Science",
  "Robotics",
  "Physics",
];

const categoryByTheme: Record<string, string> = {
  Algorithms: "Computer Science",
  Databases: "Computer Science",
  "Distributed Systems": "Computer Science",
  "Machine Learning": "AI",
  Cybersecurity: "Computer Science",
  "Cloud Computing": "Computer Science",
  "Software Engineering": "Computer Science",
  "Operating Systems": "Computer Science",
  "Computer Networks": "Computer Science",
  "Data Science": "AI",
  Robotics: "AI",
  Physics: "Physics",
};

const branches = ["Main", "Engineering", "Science"];

const authorPool = [
  "Aarav Mehta",
  "Priya Nair",
  "Rahul Kapoor",
  "Sana Iqbal",
  "Neha Deshmukh",
  "Vikram Rao",
  "Ananya Sen",
  "Kunal Verma",
  "Ritika Shah",
  "Arjun Malhotra",
];

const createGeneratedBooks = (count: number) => {
  const books = [] as Array<{
    title: string;
    author: string;
    isbn: string;
    description: string;
    category: string;
    totalCopies: number;
    availableCopies: number;
    rating: number;
    branch: string;
  }>;

  for (let i = 1; i <= count; i += 1) {
    const theme = catalogThemes[(i - 1) % catalogThemes.length];
    const category = categoryByTheme[theme] ?? "Computer Science";
    const title = `${theme} Handbook Volume ${Math.ceil(i / catalogThemes.length)}-${((i - 1) % catalogThemes.length) + 1}`;
    const totalCopies = 3 + (i % 8);
    const availableCopies = Math.max(1, totalCopies - (i % 4));
    const rating = Math.min(4.9, 3.6 + ((i % 14) * 0.1));
    const branch = branches[(i - 1) % branches.length];
    const author = authorPool[(i - 1) % authorPool.length];

    books.push({
      title,
      author,
      isbn: `9790000${(100000 + i).toString().padStart(6, "0")}`,
      description: `Comprehensive university reference on ${theme.toLowerCase()}, including practical examples, exercises, and real-world case studies for students.`,
      category,
      totalCopies,
      availableCopies,
      rating: Number(rating.toFixed(1)),
      branch,
    });
  }

  return books;
};

const libraryBooks = [...demoBooks, ...createGeneratedBooks(120)];

export const ensureDemoData = async () => {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        branch: user.branch,
        isVerified: true,
      },
      create: {
        ...user,
        passwordHash,
        isVerified: true,
      },
    });
  }

  for (const book of libraryBooks) {
    await prisma.book.upsert({
      where: { isbn: book.isbn },
      update: {
        title: book.title,
        author: book.author,
        description: book.description,
        category: book.category,
        totalCopies: book.totalCopies,
        availableCopies: book.availableCopies,
        rating: book.rating,
        branch: book.branch,
      },
      create: {
        ...book,
        tags: autoTagBook(book.description, book.category),
        language: "English",
      },
    });
  }

  const activityExists = await prisma.transaction.count();
  if (activityExists > 0) return;

  const student = await prisma.user.findUnique({ where: { email: "student@unilib.ai" } });
  const [book1, book2] = await prisma.book.findMany({
    orderBy: [{ rating: "desc" }, { createdAt: "asc" }],
    take: 2,
  });

  if (!student || !book1) return;

  await prisma.transaction.create({
    data: {
      userId: student.id,
      bookId: book1.id,
      type: TransactionType.ISSUE,
      issuedAt: new Date(),
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.book.update({
    where: { id: book1.id },
    data: { availableCopies: { decrement: 1 } },
  });

  if (book2) {
    await prisma.reservation.create({
      data: {
        userId: student.id,
        bookId: book2.id,
        queuePosition: 1,
        status: ReservationStatus.PENDING,
      },
    });
  }
};