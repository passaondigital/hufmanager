import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// HufManager und HufiApp teilen sich die Supabase-Site-URL (https://hufiapp.de).
// Jede Auth-Mail aus dem Frontend muss deshalb explizit auf die eigene Domain
// zurückleiten, sonst landet der Link in der falschen App.
const AUTH_MAIL_CALLS: Array<{ call: RegExp; option: string }> = [
  { call: /supabase\.auth\.signUp\(/g, option: "emailRedirectTo" },
  { call: /supabase\.auth\.signInWithOtp\(/g, option: "emailRedirectTo" },
  { call: /supabase\.auth\.resetPasswordForEmail\(/g, option: "redirectTo" },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("Auth-Mail-Redirects", () => {
  it("setzen bei jedem Aufruf ein explizites Redirect-Ziel", () => {
    const missing: string[] = [];
    let found = 0;

    for (const file of sourceFiles(join(__dirname, ".."))) {
      const text = readFileSync(file, "utf8");
      for (const { call, option } of AUTH_MAIL_CALLS) {
        for (const match of text.matchAll(call)) {
          found++;
          const window = text.slice(match.index, match.index + 600);
          if (!window.includes(option)) {
            const line = text.slice(0, match.index).split("\n").length;
            missing.push(`${file}:${line} ohne ${option}`);
          }
        }
      }
    }

    expect(found).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
