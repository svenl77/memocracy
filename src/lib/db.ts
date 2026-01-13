import { PrismaClient } from "@prisma/client";
import { env } from "./env";
import { logger } from "./logger";

const g = global as any;

// Create Prisma client with connection pooling
export const prisma = g.prisma || new PrismaClient({
  log: env.NODE_ENV === "development" 
    ? [{ level: "query", emit: "event" }]
    : [{ level: "error", emit: "event" }],
});

// Log queries in development
if (env.NODE_ENV === "development" && !g.prisma) {
  prisma.$on("query" as never, (e: any) => {
    logger.debug("Prisma query", { query: e.query, duration: e.duration });
  });
}

// Log errors
prisma.$on("error" as never, (e: any) => {
  logger.error("Prisma error", { error: e });
});

if (env.NODE_ENV !== "production") g.prisma = prisma;
