import { createConnection } from "node:net";

export type MalwareScanResult =
  | { clean: true; detail: string }
  | { clean: false; detail: string };

export async function scanWithClamAv(bytes: Uint8Array): Promise<MalwareScanResult> {
  const host = process.env.CLAMAV_HOST;
  const port = Number(process.env.CLAMAV_PORT ?? "3310");
  if (!host || !Number.isInteger(port))
    throw new Error("ClamAV no está configurado para validar archivos.");

  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    let response = "";
    let settled = false;

    const finish = () => {
      if (settled) return;
      const detail = response.replace(/\0/g, "").trim();
      if (!detail) return;
      settled = true;
      socket.destroy();
      if (detail.endsWith("OK")) resolve({ clean: true, detail });
      else if (detail.includes("FOUND")) resolve({ clean: false, detail });
      else reject(new Error(`ClamAV no pudo validar el archivo: ${detail}`));
    };

    socket.setTimeout(20_000);
    socket.on("connect", () => {
      socket.write(Buffer.from("zINSTREAM\0"));
      const chunkSize = 64 * 1024;
      for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
        const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.byteLength));
        const length = Buffer.allocUnsafe(4);
        length.writeUInt32BE(chunk.byteLength);
        socket.write(length);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
      if (response.includes("\0")) finish();
    });
    socket.on("end", finish);
    socket.on("close", finish);
    socket.on("timeout", () => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new Error("ClamAV agotó el tiempo de validación."));
    });
    socket.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}
