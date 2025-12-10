import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/items/:path*', '/recipes/:path*', '/purchases/:path*', '/production/:path*', '/reports/:path*', '/settings/:path*'],
}

