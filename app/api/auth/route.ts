import { NextRequest, NextResponse } from 'next/server'

const DEV_PASSWORD = 'mmmport'

export async function POST(request: NextRequest) {
  const { password } = (await request.json()) as { password?: string }

  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('piece_dev_auth', '1', {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
  })
  return response
}
