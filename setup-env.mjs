// Creates a local .env with your API key (works on Windows, macOS and Linux).
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.chdir(path.dirname(fileURLToPath(import.meta.url)));

function askHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin });
      rl.once("line", (l) => { rl.close(); process.stdout.write("\n"); resolve(l); });
      return;
    }
    let value = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (ch) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(1);
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    process.stdin.on("data", onData);
  });
}

if (fs.existsSync(".env")) {
  console.log(".env already exists, leaving it alone.");
} else {
  const key = (await askHidden("Paste your API key (input is hidden): ")).trim();
  if (!key) { console.error("No key entered."); process.exit(1); }
  fs.writeFileSync(".env", `API_KEY=${key}\n`, { mode: 0o600, flag: "wx" });
  console.log("Created .env.");
}

if (fs.existsSync(".git")) {
  try { fs.chmodSync("hooks/pre-commit", 0o755); } catch {}
  try { execFileSync("git", ["config", "core.hooksPath", "hooks"]); console.log("Commit guard turned on."); } catch {}
}
