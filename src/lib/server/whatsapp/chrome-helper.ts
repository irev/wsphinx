import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

export function findChromeExecutable(): string | null {
  const home = process.env.USERPROFILE || "";
  const cacheDir = join(home, ".cache", "puppeteer", "chrome");

  try {
    const dirs = readdirSync(cacheDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("win64-"))
      .map((d) => d.name)
      .sort()
      .reverse();

    for (const dir of dirs) {
      const exePath = join(cacheDir, dir, "chrome-win64", "chrome.exe");
      if (existsSync(exePath)) {
        return exePath;
      }
    }
  } catch {
  }

  try {
    const result = execSync("where.exe chrome", {
      shell: "cmd.exe",
      encoding: "utf-8",
      timeout: 3000,
    });
    const systemPath = result.trim().split(/\r?\n/)[0]?.trim();
    if (systemPath && existsSync(systemPath)) {
      return systemPath;
    }
  } catch {
  }

  return null;
}
