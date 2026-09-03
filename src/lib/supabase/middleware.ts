import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  VOLUNTEER: "/volunteer/scan",
  PARTICIPANT: "/participant",
};

// Section prefixes and the roles allowed inside them.
const GUARDED_SECTIONS: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/volunteer", roles: ["VOLUNTEER", "ADMIN"] },
  { prefix: "/participant", roles: ["PARTICIPANT"] },
];

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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");
  const guarded = GUARDED_SECTIONS.find((s) => pathname.startsWith(s.prefix));

  if (!user) {
    if (guarded) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Logged in — look up role to gate sections and to bounce away from /login.
  if (guarded || isAuthRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = role ? ROLE_HOME[role] ?? "/" : "/";
      return NextResponse.redirect(url);
    }

    if (guarded && (!role || !guarded.roles.includes(role))) {
      const url = request.nextUrl.clone();
      url.pathname = role ? ROLE_HOME[role] ?? "/" : "/login";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
