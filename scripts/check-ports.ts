import net from "node:net";
import { PORTS } from "../src/lib/server/ports.js";

const args = process.argv.slice(2);
const onlyFlag = args.find((a) => a.startsWith("--"));
const onlyServices = onlyFlag
  ? onlyFlag.replace("--", "").split(",")
  : null;

type Entry = [string, number];

const entries = (Object.entries(PORTS) as Entry[])
  .filter(([name]) => !onlyServices || onlyServices.includes(name));

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

async function main() {
  const results = await Promise.all(
    entries.map(async ([name, port]) => {
      const free = await checkPort(port);
      return { name, port, free };
    })
  );

  let allFree = true;
  for (const r of results) {
    const icon = r.free ? "\x1b[32m\u2713\x1b[0m" : "\x1b[31m\u2717\x1b[0m";
    const label = r.free ? "FREE" : "CONFLICT";
    const color = r.free ? "\x1b[32m" : "\x1b[31m";
    console.log(`${icon} ${r.name.padEnd(12)} ${r.port}  ${color}${label}\x1b[0m`);
    if (!r.free) allFree = false;
  }

  if (!allFree) {
    console.error("\n\x1b[31mERROR: Port conflict detected. Free the ports above or change them in .env\x1b[0m");
    process.exit(1);
  }
}

main();
