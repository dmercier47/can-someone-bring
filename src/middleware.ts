import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const HOST_ONLY = ["/dashboard", "/new", "/sheets"];

// Keeps the host's login session fresh and sends signed-out visitors on host pages to /login.
export async function middleware(request: NextRequest) {
  // If a sign-in link lands somewhere other than /auth/confirm (e.g. Supabase fell back to the
  // Site URL: "/?code=…" or "/?token_hash=…&type=email"), forward it so the sign-in still finishes.
  const params = request.nextUrl.searchParams;
  if ((params.get("code") || params.get("token_hash")) && !request.nextUrl.pathname.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    const keep = new URLSearchParams();
    for (const k of ["code", "token_hash", "type", "next"]) {
      const v = params.get(k);
      if (v) keep.set(k, v);
    }
    url.search = `?${keep}`;
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && HOST_ONLY.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Guest pages (/s/...) don't need a session; skip them and static assets for speed.
  matcher: ["/", "/dashboard/:path*", "/new", "/sheets/:path*", "/login", "/auth/:path*"],
};
