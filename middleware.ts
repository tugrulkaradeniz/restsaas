import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getTenantFromHost } from '@/lib/utils'

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

  // Subdomain → tenant slug header'a yaz + o restoranın sipariş sayfasına rewrite et
  const host = request.headers.get('host') || ''
  const tenantSlug = getTenantFromHost(host)
  if (tenantSlug && tenantSlug !== 'www') {
    supabaseResponse.headers.set('x-tenant-slug', tenantSlug)

    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = `/order/${tenantSlug}`
      return NextResponse.rewrite(url)
    }
  }

  const publicPaths = ['/login', '/register', '/admin/login', '/forgot-password', '/menu', '/order', '/account', '/rezervasyon']
  const isPublicPath = pathname === '/' || publicPaths.some((p) => pathname.startsWith(p))
  const isApiWebhook = pathname.startsWith('/api/webhooks')
  const isApiRoute = pathname.startsWith('/api/')

  // Giriş yapılmamış → ana sayfa tanıtım sayfasını, diğer korumalı sayfalar login'i göstersin
  if (!user && !isPublicPath && !isApiWebhook && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const isSuperAdmin = role === 'super_admin'

    // Login/register sayfasındaysa role'e göre yönlendir
    if (pathname === '/login' || pathname === '/register' || pathname === '/admin/login') {
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
