import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { hasCapability } from "../capabilities";

describe("hasCapability (UX only — the server authorizes)", () => {
  it("reads the server-issued capability list", () => {
    expect(hasCapability({ capabilities: ["business.review"] }, "business.review")).toBe(true);
    expect(hasCapability({ capabilities: ["business.review"] }, "business.operate")).toBe(false);
  });

  it("fails closed when the user or the list is missing", () => {
    expect(hasCapability(null, "review.write")).toBe(false);
    expect(hasCapability(undefined, "review.write")).toBe(false);
    expect(hasCapability({}, "review.write")).toBe(false);
  });

  it("ignores the role entirely", () => {
    expect(hasCapability({ role: "SUPER_ADMIN" } as { capabilities?: string[] }, "business.hide")).toBe(false);
  });
});

// Phase 15D (D-75): rendering decisions come from capabilities. Role names
// may appear only as display labels — never compared to decide what a user
// can see or do.
const SRC = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "test" || name === "__tests__" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("No role-name authorization in the frontend", () => {
  const files = sourceFiles(SRC).map((path) => ({
    path: relative(SRC, path).replace(/\\/g, "/"),
    text: readFileSync(path, "utf8"),
  }));

  it("no code compares a role to a role name", () => {
    const offenders = files
      .filter((f) => /role\s*(===|!==)\s*["'](CUSTOMER|BUSINESS_OWNER|SUPPORT|MODERATOR|ADMIN|SUPER_ADMIN)["']/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("the retired role booleans are gone from the auth context", () => {
    const ctx = files.find((f) => f.path === "contexts/AuthContext.tsx")!.text;
    for (const name of ["isAdmin", "isSuperAdmin", "canModerate", "isOwner"]) {
      expect(ctx).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
  });
});
