import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuth0, isAuthConfigured } from "@/lib/auth0";
import { proxy } from "./proxy";

vi.mock("@/lib/auth0", () => ({
  isAuthConfigured: vi.fn(),
  getAuth0: vi.fn(),
}));

const authResponse = NextResponse.next({ headers: { "x-from-auth0": "yes" } });
const auth0 = {
  middleware: vi.fn(async () => authResponse),
  getSession: vi.fn(),
};

beforeEach(() => {
  vi.mocked(isAuthConfigured).mockReturnValue(true);
  vi.mocked(getAuth0).mockReturnValue(auth0 as unknown as ReturnType<typeof getAuth0>);
  auth0.getSession.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const request = (path: string) => new NextRequest(`http://localhost:3000${path}`);

describe("proxy", () => {
  it("lets Auth0 handle its own routes", async () => {
    const res = await proxy(request("/auth/callback?code=abc"));
    expect(res).toBe(authResponse);
    expect(auth0.getSession).not.toHaveBeenCalled();
  });

  it("passes logged-in requests through Auth0's response", async () => {
    auth0.getSession.mockResolvedValue({ user: { sub: "auth0|alice" } });
    const res = await proxy(request("/petition/new?story=x"));
    expect(res).toBe(authResponse);
  });

  it("redirects logged-out page requests to login, keeping the page to return to", async () => {
    const res = await proxy(request("/petition/new?story=data-fin-buv11-2024"));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth/login");
    expect(location.searchParams.get("returnTo")).toBe("/petition/new?story=data-fin-buv11-2024");
  });

  it("returns 401 JSON for logged-out API requests", async () => {
    const res = await proxy(request("/api/me"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it.each(["/", "/receipt", "/spending", "/spending/data-fin-buv11-2024", "/category/health", "/decision/abc"])(
    "lets logged-out visitors see tracker page %s",
    async (path) => {
      const res = await proxy(request(path));
      expect(res).toBe(authResponse);
    },
  );

  it.each(["/api/breakdown?income=75000", "/api/spending", "/api/spending/data-fin-buv11-2024", "/api/departments"])(
    "lets logged-out visitors read tracker data from %s",
    async (path) => {
      const res = await proxy(request(path));
      expect(res).toBe(authResponse);
    },
  );

  it("still locks account, admin, and saving routes for logged-out visitors", async () => {
    expect((await proxy(request("/api/me"))).status).toBe(401);
    expect((await proxy(request("/api/me/riding"))).status).toBe(401);
    expect((await proxy(new NextRequest("http://localhost:3000/api/campaigns", { method: "POST" }))).status).toBe(401);
    expect((await proxy(new NextRequest("http://localhost:3000/api/spending", { method: "POST" }))).status).toBe(401);
    expect((await proxy(request("/admin"))).status).toBe(307);
    expect((await proxy(request("/spending/x/extra"))).status).toBe(307);
  });

  it("lets everything through in development when Auth0 is not configured", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    vi.stubEnv("NODE_ENV", "development");
    const res = await proxy(request("/api/me"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("fails with 500 in production when Auth0 is not configured", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await proxy(request("/"));
    expect(res.status).toBe(500);
  });
});
