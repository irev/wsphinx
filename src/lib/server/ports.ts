import net from "node:net";

export const PORTS = {
  dev: parseInt(process.env.VITE_PORT || "9393"),
  worker: parseInt(process.env.WORKER_API_PORT || "9494"),
  preview: parseInt(process.env.VITE_PREVIEW_PORT || "9595"),
  production: parseInt(process.env.PORT || "9696"),
} as const;

export type PortService = keyof typeof PORTS;
export type PortResult = { service: PortService; port: number; free: boolean };
export type PortResultMap = Record<PortService, PortResult>;

function checkPort(port: number): Promise<boolean> {
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

export async function checkAllPorts(): Promise<PortResultMap> {
  const entries = Object.entries(PORTS) as [PortService, number][];
  const results = await Promise.all(
    entries.map(async ([service, port]) => ({
      service,
      port,
      free: await checkPort(port),
    }))
  );
  return Object.fromEntries(results.map((r) => [r.service, r])) as PortResultMap;
}

export function getPortUrl(service: PortService): string {
  switch (service) {
    case "worker":
      return `http://127.0.0.1:${PORTS.worker}`;
    default:
      return `http://localhost:${PORTS[service]}`;
  }
}
