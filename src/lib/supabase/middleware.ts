import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the auth session on every request and gates protected routes.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: any }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/login" ||
    path.startsWith("/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Forward the validated user id to Server Components. getUser() above already
  // authenticated the session against the auth server, so pages can trust this
  // header and skip a second network round-trip on every navigation. We always
  // overwrite any client-supplied value, so it can't be spoofed.
  if (user) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.id);
    const withUser = NextResponse.next({ request: { headers: requestHeaders } });
    // Preserve the refreshed auth cookies set during getUser().
    response.cookies.getAll().forEach((cookie) => withUser.cookies.set(cookie));
    return withUser;
  }

  return response;
}
