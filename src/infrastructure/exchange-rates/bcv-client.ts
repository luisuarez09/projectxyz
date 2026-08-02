import { createHash } from "node:crypto";

const BCV_URL = "https://www.bcv.org.ve/";

export type BcvSnapshot = {
  effectiveDate: string;
  rates: { currency: string; rate: string }[];
  sourceUrl: string;
  sourceHash: string;
  sourcePublishedAt: Date | null;
  capturedAt: Date;
};

export class BcvResponseError extends Error {}

const bcvCurrencies = [
  { currency: "USD", elementId: "dolar", required: true },
  { currency: "EUR", elementId: "euro", required: true },
  { currency: "CNY", elementId: "yuan", required: false },
  { currency: "TRY", elementId: "lira", required: false },
  { currency: "RUB", elementId: "rublo", required: false },
] as const;

function readRate(html: string, currency: string, elementId: string) {
  const block = html.match(new RegExp(`<div\\s+id=["']${elementId}["'][\\s\\S]*?<strong[^>]*>([\\s\\S]*?)<\\/strong>`, "i"));
  const normalized = block?.[1]
    ?.replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, "")
    .replace(/\s+/g, "")
    .replaceAll(".", "")
    .replace(",", ".");
  if (!normalized || !/^\d+(?:\.\d+)?$/.test(normalized) || Number(normalized) <= 0) {
    throw new BcvResponseError(`El BCV no devolvió una tasa válida para ${currency}.`);
  }
  return normalized;
}

export function parseBcvHomepage(html: string, headers?: Headers): BcvSnapshot {
  const date = html.match(/Fecha\s+Valor:[\s\S]*?content=["'](\d{4}-\d{2}-\d{2})T/i)?.[1];
  if (!date) throw new BcvResponseError("El BCV no devolvió una fecha valor reconocible.");

  const lastModified = headers?.get("last-modified");
  const sourcePublishedAt = lastModified ? new Date(lastModified) : null;
  const rates = bcvCurrencies.flatMap(({ currency, elementId, required }) => {
    try {
      return [{ currency, rate: readRate(html, currency, elementId) }];
    } catch (error) {
      if (required) throw error;
      return [];
    }
  });
  return {
    effectiveDate: date,
    rates,
    sourceUrl: BCV_URL,
    sourceHash: createHash("sha256").update(html).digest("hex"),
    sourcePublishedAt: sourcePublishedAt && !Number.isNaN(sourcePublishedAt.valueOf()) ? sourcePublishedAt : null,
    capturedAt: new Date(),
  };
}

export async function fetchBcvExchangeRates(): Promise<BcvSnapshot> {
  const response = await fetch(BCV_URL, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "proyectoxyz-exchange-rate-sync/1.0",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new BcvResponseError(`El BCV respondió con estado ${response.status}.`);
  return parseBcvHomepage(await response.text(), response.headers);
}

export const bcvSourceUrl = BCV_URL;
