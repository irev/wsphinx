import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

function getPlatformCacheDir(): string {
  const isWin = process.platform === "win32";
  const home = isWin ? process.env.USERPROFILE : process.env.HOME;
  if (!home) return "";
  const cache = isWin ? join(home, ".cache", "puppeteer", "chrome") : join(home, ".cache", "puppeteer", "chrome");
  return cache;
}

function getPlatformSuffix(): string {
  if (process.platform === "win32") return "win64-";
  if (process.platform === "darwin") return "mac_arm-";
  return "linux-";
}

function getChromeBinaryName(): string {
  return process.platform === "win32" ? "chrome.exe" : "chrome";
}

export function findChromeExecutable(): string | null {
  const cacheDir = getPlatformCacheDir();

  try {
    const dirs = readdirSync(cacheDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith(getPlatformSuffix()))
      .map((d) => d.name)
      .sort()
      .reverse();

    const platformDir = process.platform === "win32" ? "chrome-win64" : "chrome-linux64";

    for (const dir of dirs) {
      const exePath = join(cacheDir, dir, platformDir, getChromeBinaryName());
      if (existsSync(exePath)) {
        return exePath;
      }
    }
  } catch {
  }

  try {
    const cmd = process.platform === "win32"
      ? { bin: "where.exe chrome", shell: "cmd.exe" }
      : { bin: "which chrome", shell: "/bin/sh" };

    const result = execSync(cmd.bin, {
      shell: cmd.shell,
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
