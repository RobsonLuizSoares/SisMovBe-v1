import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const DASHBOARD_PATHS = [
  '/',
  '/resumo',
  '/movements',
  '/requests',
  '/pending-asiweb',
  '/assets',
  '/units',
  '/users',
  '/settings',
  '/solicitar-envio',
  '/minhas-solicitacoes',
  '/fila',
  '/receber',
];
const AUTH_PATHS = ['/login', '/forgot-password'];
const PUBLIC_PATHS = ['/auth/callback', '/permission-denied'];

function isDashboardPath(pathname: string) {
  return DASHBOARD_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/')));
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  if (isAuthPath(pathname)) {
    if (user) {
      supabaseResponse = NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  if (isDashboardPath(pathname) && !user) {
    supabaseResponse = NextResponse.redirect(new URL('/login', request.url));
    return supabaseResponse;
  }

  return supabaseResponse;
}
