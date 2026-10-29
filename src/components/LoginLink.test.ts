import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoginLink, loginHref } from "./LoginLink";

vi.mock("next/navigation", () => ({ usePathname: () => "/receipt" }));

describe("LoginLink", () => {
  it("sends logged-out visitors to Auth0 and back to the page they were on", () => {
    const html = renderToStaticMarkup(createElement(LoginLink));
    expect(html).toContain(">Log in<");
    expect(html).toContain('href="/auth/login?returnTo=%2Freceipt"');
  });

  it("keeps the query string in the page to return to", () => {
    expect(loginHref("/spending?dept=health")).toBe("/auth/login?returnTo=%2Fspending%3Fdept%3Dhealth");
  });
});
