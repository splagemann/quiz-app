import { PrismaClient } from "@/app/generated/prisma/client";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Resolve database URL to handle both relative and absolute paths correctly
// This works in development, production, and Docker environments
function resolveDatabaseUrl(url?: string): string {
  if (!url) {
    return `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
  }

  if (!url.startsWith('file:')) {
    return url; // Not a file URL (e.g., PostgreSQL, MySQL), use as-is
  }

  const filePath = url.replace('file:', '');

  // If already absolute path, use it as-is
  if (path.isAbsolute(filePath)) {
    return url;
  }

  // If relative path, resolve it from process.cwd()
  return `file:${path.join(process.cwd(), filePath)}`;
}

const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
