import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if this is a protected route (partner or admin dashboard)
    const isProtectedRoute = pathname.startsWith('/partner') || pathname.startsWith('/admin');
    const isLoginRoute = pathname === '/login';

    // For protected routes, check authentication
    if (isProtectedRoute) {
        let response = NextResponse.next({
            request: {
                headers: request.headers,
            },
        });

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
                            request.cookies.set(name, value)
                        );
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        });
                        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
                            response.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { data: { session } } = await supabase.auth.getSession();

        // If no session, redirect to login
        if (!session) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Check user role for the specific dashboard
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (pathname.startsWith('/partner') && userData?.role !== 'partner') {
            // Partner route but not a partner - redirect to login
            return NextResponse.redirect(new URL('/login', request.url));
        }

        if (pathname.startsWith('/admin') && userData?.role !== 'admin') {
            // Admin route but not an admin - redirect to login
            return NextResponse.redirect(new URL('/login', request.url));
        }

        return response;
    }

    // If logged in and trying to access login, redirect to appropriate dashboard
    if (isLoginRoute) {
        let response = NextResponse.next({
            request: {
                headers: request.headers,
            },
        });

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
                            request.cookies.set(name, value)
                        );
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        });
                        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
                            response.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (userData?.role === 'admin') {
                return NextResponse.redirect(new URL('/admin/dashboard', request.url));
            } else if (userData?.role === 'partner') {
                return NextResponse.redirect(new URL('/partner/dashboard', request.url));
            }
        }

        return response;
    }

    // For i18n routes, use the intl middleware
    if (pathname === '/' || pathname.match(/^\/(en|pt|es)(\/|$)/)) {
        return intlMiddleware(request);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/',
        '/(en|pt|es)/:path*',
        '/login',
        '/partner/:path*',
        '/admin/:path*',
    ],
};
