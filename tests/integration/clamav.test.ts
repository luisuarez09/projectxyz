import net from "node:net";

import { describe, expect, it } from "vitest";

function scanBuffer(content: Buffer): Promise<string> {
  const host = process.env.CLAMAV_HOST ?? "localhost";
  const port = Number(process.env.CLAMAV_PORT ?? "3310");

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const response: Buffer[] = [];

    socket.setTimeout(30_000);
    socket.on("connect", () => {
      const length = Buffer.allocUnsafe(4);
      length.writeUInt32BE(content.length);
      socket.write("zINSTREAM\0");
      socket.write(length);
      socket.write(content);
      socket.write(Buffer.alloc(4));
    });
    socket.on("data", (chunk) =>
      response.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    socket.on("end", () => resolve(Buffer.concat(response).toString("utf8")));
    socket.on("timeout", () => socket.destroy(new Error("ClamAV timeout")));
    socket.on("error", reject);
  });
}

describe("ClamAV", () => {
  it("scans a harmless stream", async () => {
    const result = await scanBuffer(Buffer.from("proyectoxyz phase zero scan"));

    expect(result).toContain("stream: OK");
  });
});
