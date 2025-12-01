// Use JSON file-based database instead of Prisma
// Import and re-export from database.ts
import { prisma, reloadDatabase } from './database'

// Re-export for compatibility with existing code
export { prisma, reloadDatabase }
export { prisma as default }

