import 'next-auth'
import { AccessControl } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      accessControl?: AccessControl | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    accessControl?: AccessControl | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    accessControl?: AccessControl | null
  }
}

