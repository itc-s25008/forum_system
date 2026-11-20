import type {User} from './generated/prisma/client.ts'

declare module 'express-session' {
  interface SessionData {
    login: User | null
  }
}
