import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  // ── Dev password gate ──
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname === '/login' || pathname === '/api/auth'
  if (!isAuthRoute) {
    const auth = request.cookies.get('piece_dev_auth')
    if (auth?.value !== '1') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
