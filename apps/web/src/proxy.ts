import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isPublicPartnerRegisterRoute = pathname === '/partner/register' || pathname === '/partner/register/';

    const isProtectedRoute =
        (pathname.startsWith('/partner') && !isPublicPartnerRegisterRoute) ||
        pathname.startsWith('/admin');
    const isLoginRoute = pathname === '/login';

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

        if (!session) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (pathname.startsWith('/partner') && userData?.role !== 'partner') {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        if (pathname.startsWith('/admin') && userData?.role !== 'admin') {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        return response;
    }

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
