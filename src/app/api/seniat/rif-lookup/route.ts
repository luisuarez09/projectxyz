import { NextRequest, NextResponse } from "next/server";

const SENIAT_BASE = "http://contribuyente.seniat.gob.ve/BuscaRif";
const TIMEOUT_MS = 15_000;

/** Headers que imitan un navegador real para que el SENIAT no rechace la petición. */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "es-VE,es;q=0.9,en;q=0.5",
};

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                */
/* -------------------------------------------------------------------------- */

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extrae pares clave=valor de las cabeceras Set-Cookie y los acumula en un Map.
 * De esta forma las cookies de una respuesta posterior sobrescriben las anteriores
 * si comparten nombre (p. ej. JSESSIONID renovado por Captcha.jpg).
 */
function mergeCookies(
  map: Map<string, string>,
  response: Response,
): Map<string, string> {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const entry of raw) {
    const [pair] = entry.split(";");
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    map.set(pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim());
  }
  return map;
}

function cookieString(map: Map<string, string>): string {
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

/* -------------------------------------------------------------------------- */
/*  GET — Obtener captcha                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Carga la página de consulta de RIF del SENIAT, captura la sesión y devuelve
 * la imagen del captcha como Base64 junto con las cookies de sesión.
 *
 * Respuesta: `{ captchaBase64: string, sessionId: string }`
 */
export async function GET() {
  try {
    // 1. Cargar la página para obtener la cookie de sesión (JSESSIONID).
    const pageResponse = await fetchWithTimeout(
      `${SENIAT_BASE}/BuscaRif.jsp`,
      { headers: { ...BROWSER_HEADERS }, redirect: "follow" },
    );

    const cookies = new Map<string, string>();
    mergeCookies(cookies, pageResponse);

    if (cookies.size === 0) {
      return NextResponse.json(
        { error: "No se pudo establecer sesión con el portal del SENIAT." },
        { status: 502 },
      );
    }

    // 2. Descargar la imagen captcha con la misma sesión.
    const captchaResponse = await fetchWithTimeout(
      `${SENIAT_BASE}/Captcha.jpg`,
      {
        headers: {
          ...BROWSER_HEADERS,
          Cookie: cookieString(cookies),
          Referer: `${SENIAT_BASE}/BuscaRif.jsp`,
        },
      },
    );

    // Merge: el captcha puede renovar la cookie de sesión.
    mergeCookies(cookies, captchaResponse);

    if (!captchaResponse.ok) {
      return NextResponse.json(
        { error: "No se pudo obtener el captcha del SENIAT." },
        { status: 502 },
      );
    }

    const buffer = await captchaResponse.arrayBuffer();
    const captchaBase64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;

    return NextResponse.json({
      captchaBase64,
      sessionId: cookieString(cookies),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "No fue posible conectar con el portal del SENIAT. Verifica tu conexión e intenta más tarde.",
      },
      { status: 502 },
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  POST — Verificar RIF                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Envía el RIF y el código captcha al SENIAT y devuelve los datos parseados.
 *
 * Body: `{ rif: string, captcha: string, sessionId: string }`
 *
 * Respuesta exitosa: `{ legalName, registrationStatus, activity }`
 * Errores: `{ error: string }` con status 400 / 404 / 422 / 502.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rif, captcha, sessionId } = body as {
      rif?: string;
      captcha?: string;
      sessionId?: string;
    };

    if (!rif || !captcha || !sessionId) {
      return NextResponse.json(
        { error: "Faltan datos requeridos (RIF, captcha o sesión)." },
        { status: 400 },
      );
    }

    // Construir el form-data tal como lo envía el navegador al hacer submit.
    const formData = new URLSearchParams();
    formData.set("p_rif", rif);
    formData.set("p_cedula", "");
    formData.set("codigo", captcha);
    formData.set("busca", " Buscar ");

    const response = await fetchWithTimeout(`${SENIAT_BASE}/BuscaRif.jsp`, {
      method: "POST",
      headers: {
        ...BROWSER_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: sessionId,
        Referer: `${SENIAT_BASE}/BuscaRif.jsp`,
        Origin: "http://contribuyente.seniat.gob.ve",
      },
      body: formData.toString(),
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "El portal del SENIAT no respondió correctamente." },
        { status: 502 },
      );
    }

    // La página usa windows-1252 (charset declarado en su <meta>).
    const rawBuffer = await response.arrayBuffer();
    const html = new TextDecoder("windows-1252").decode(rawBuffer);

    // ------------------------------------------------------------------
    // Detectar si la respuesta contiene la sección de resultado.
    // La sección de resultado incluye "REGISTRO VIGENTE" / "REGISTRO VENCIDO"
    // o la línea de separación "____…____".  La presencia de Captcha.jpg NO
    // es útil porque el formulario (con captcha) se muestra siempre.
    // ------------------------------------------------------------------
    const hasResult =
      /REGISTRO\s+(VIGENTE|VENCIDO|SUSPENDIDO)/i.test(html) ||
      html.includes("____________________________________");

    if (!hasResult) {
      // Sin sección de resultado → el captcha fue incorrecto.
      return NextResponse.json(
        { error: "captcha_invalid" },
        { status: 422 },
      );
    }

    // Extraer nombre legal.
    // Formato esperado: <font face="Verdana" size="2">RIF&nbsp;NOMBRE (COMERCIAL)</font>
    // El tag puede estar envuelto en <b> o no; las comillas pueden ser simples o dobles.
    const nameMatch = html.match(
      /<font\s+face=["']?Verdana["']?\s+size=["']?2["']?\s*>([^<]+)<\/font>/i,
    );

    if (!nameMatch) {
      return NextResponse.json(
        {
          error:
            "El SENIAT devolvió un resultado pero no fue posible extraer el nombre. Intenta de nuevo.",
        },
        { status: 502 },
      );
    }

    // El texto viene como "J500123507&nbsp;FUNDACIÓN CONSTRUYAMOS PAÍS (CONSTRUYAMOS PAIS )"
    const rawText = nameMatch[1]
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Separar el RIF del nombre.
    const parts = rawText.match(/^[A-Z]\d+\s+(.+)$/i);
    const legalName = parts ? parts[1].trim() : rawText;

    // Estado del registro.
    let registrationStatus = "VIGENTE";
    if (/REGISTRO\s+VENCIDO/i.test(html)) registrationStatus = "VENCIDO";
    else if (/REGISTRO\s+SUSPENDIDO/i.test(html))
      registrationStatus = "SUSPENDIDO";

    // Actividad económica.
    const activityMatch = html.match(
      /Actividad\s+Econ\S*mica:\s*([^\n<]+)/i,
    );
    const activity = activityMatch ? activityMatch[1].trim() : "";

    return NextResponse.json({ legalName, registrationStatus, activity });
  } catch {
    return NextResponse.json(
      {
        error:
          "No fue posible conectar con el portal del SENIAT. Verifica tu conexión e intenta más tarde.",
      },
      { status: 502 },
    );
  }
}
