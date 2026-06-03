import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session;
  const role = session?.user?.role;

  // Public routes
  if (pathname === "/login" || pathname === "/") {
    if (isLoggedIn) {
      // Redirect to appropriate dashboard
      const dest = role === "admin" ? "/admin/dashboard" : "/seller/dashboard";
      return NextResponse.redirect(new URL(dest, req.nextUrl));
    }
    return NextResponse.next();
  }

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/seller/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  // Seller routes
  if (pathname.startsWith("/seller")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
    // Admins can also view seller pages if needed
    return NextResponse.next();
  }

  // API routes — no redirect, let handlers deal with auth
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
