import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const role = user?.app_metadata?.role as string | undefined

  // Subdomain → tenant slug header'a yaz
  const host = request.headers.get('host') || ''
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000'
  const subdomain = host.replace(`.${appDomain}`, '')
  const isTenantRequest = subdomain !== host && subdomain !== 'www'
  if (isTenantRequest) {
    supabaseResponse.headers.set('x-tenant-slug', subdomain)
  }

  const publicPaths = ['/login', '/register', '/forgot-password', '/menu', '/order', '/rezervasyon']
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))
  const isApiWebhook = pathname.startsWith('/api/webhooks')

  // Giriş yapılmamış → login'e yönlendir
  if (!user && !isPublicPath && !isApiWebhook) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const isSuperAdmin = role === 'super_admin'

    // Login/register sayfasındaysa role'e göre yönlendir
    if (pathname === '/login' || pathname === '/register') {
      const url = request.nextUrl.clone()
      url.pathname = isSuperAdmin ? '/super-admin' : '/dashboard'
      return NextResponse.redirect(url)
    }

    // Super admin değil ama /super-admin'e girmeye çalışıyor
    if (!isSuperAdmin && pathname.startsWith('/super-admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Super admin ama restoran paneline girmeye çalışıyor
    if (isSuperAdmin && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/super-admin'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
