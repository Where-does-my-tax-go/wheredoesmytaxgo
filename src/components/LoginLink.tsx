"use client";

import { usePathname } from "next/navigation";

export function loginHref(returnTo: string): string {
  return `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
}

// The header link for logged-out visitors; login brings them back to the page they were on.
export function LoginLink() {
  const pathname = usePathname();
  return (
    // A plain link, not next/link: /auth/login is served by the Auth0 proxy, not a Next.js page.
    <a
      href={loginHref(pathname)}
      onClick={(event) => {
        event.currentTarget.href = loginHref(window.location.pathname + window.location.search);
      }}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-current hover:bg-black/5"
    >
      Log in
    </a>
  );
}
