"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useState } from "react";

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                     */
/* -------------------------------------------------------------------------- */

type Step =
  | "idle"
  | "loading-captcha"
  | "captcha-ready"
  | "verifying"
  | "success"
  | "error";

interface SeniatResult {
  legalName: string;
  registrationStatus: string;
  activity: string;
}

interface SeniatRifLookupProps {
  /** Valor actual del campo RIF. */
  rif: string;
  /** Se invoca cuando el SENIAT devuelve un resultado exitoso. */
  onResult: (data: { legalName: string }) => void;
}

/* -------------------------------------------------------------------------- */
/*  Validación de formato de RIF                                              */
/* -------------------------------------------------------------------------- */

/** Letra V, J, E, G, P o C seguida de 5 a 9 dígitos. */
const RIF_PATTERN = /^[VJEGPC]\d{5,9}$/i;

/* -------------------------------------------------------------------------- */
/*  Componente                                                                */
/* -------------------------------------------------------------------------- */

export function SeniatRifLookup({ rif, onResult }: SeniatRifLookupProps) {
  const [step, setStep] = useState<Step>("idle");
  const [captchaBase64, setCaptchaBase64] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SeniatResult | null>(null);

  const isValidRif = RIF_PATTERN.test(rif);

  /* ---- Cargar captcha ---------------------------------------------------- */

  const loadCaptcha = useCallback(async () => {
    setStep("loading-captcha");
    setError("");
    setCaptchaCode("");
    try {
      const response = await fetch("/api/seniat/rif-lookup");
      const data = await response.json();
      if (!response.ok || data.error) {
        setError(data.error || "Error al cargar el captcha.");
        setStep("error");
        return;
      }
      setCaptchaBase64(data.captchaBase64);
      setSessionId(data.sessionId);
      setStep("captcha-ready");
    } catch {
      setError(
        "No fue posible conectar con el portal del SENIAT. Verifica tu conexión e intenta más tarde.",
      );
      setStep("error");
    }
  }, []);

  /* ---- Verificar RIF ----------------------------------------------------- */

  const verify = useCallback(async () => {
    if (!captchaCode.trim()) return;
    setStep("verifying");
    setError("");
    try {
      const response = await fetch("/api/seniat/rif-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rif, captcha: captchaCode, sessionId }),
      });
      const data = await response.json();

      if (data.error === "captcha_invalid") {
        setError("El código ingresado no es correcto. Intenta de nuevo.");
        setCaptchaCode("");
        // Cargar un nuevo captcha automáticamente.
        void loadCaptcha();
        return;
      }

      if (!response.ok || data.error) {
        setError(data.error || "Error en la consulta.");
        setStep("error");
        return;
      }

      setResult(data as SeniatResult);
      setStep("success");
      onResult({ legalName: data.legalName });
    } catch {
      setError("No fue posible conectar con el portal del SENIAT.");
      setStep("error");
    }
  }, [rif, captchaCode, sessionId, onResult, loadCaptcha]);

  /* ---- Renderizado por estado -------------------------------------------- */

  // Estado idle: solo el botón.
  if (step === "idle") {
    return (
      <div className="mt-2">
        <Button
          className="h-8 gap-1.5 text-xs"
          disabled={!isValidRif}
          onClick={() => void loadCaptcha()}
          size="sm"
          type="button"
          variant="outline"
        >
          <Search size={14} />
          Consultar SENIAT
        </Button>
        {!isValidRif && rif.length > 0 && (
          <p className="mt-1 text-xs text-stone-500">
            Ingresa un RIF válido (ej. J500123507)
          </p>
        )}
      </div>
    );
  }

  // Cargando captcha.
  if (step === "loading-captcha") {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
        <Loader2 className="animate-spin" size={14} />
        Cargando captcha del SENIAT…
      </div>
    );
  }

  // Captcha listo / verificando.
  if (step === "captcha-ready" || step === "verifying") {
    return (
      <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
        <p className="mb-2 text-xs font-medium text-stone-600 dark:text-stone-300">
          Escribe el código que observas en la imagen:
        </p>
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Captcha del SENIAT"
              className="h-10 rounded border border-stone-300 dark:border-stone-600"
              src={captchaBase64}
            />
            <button
              className="mt-1 flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
              disabled={step === "verifying"}
              onClick={() => void loadCaptcha()}
              type="button"
            >
              <RefreshCw size={11} />
              Nuevo captcha
            </button>
          </div>
          <div className="flex flex-1 gap-2">
            <Input
              className="field h-8 text-sm"
              disabled={step === "verifying"}
              maxLength={10}
              onChange={(e) => setCaptchaCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void verify();
                }
              }}
              placeholder="Código"
              value={captchaCode}
            />
            <Button
              className="h-8 shrink-0 gap-1.5 bg-[#14352d] text-xs hover:bg-[#0e2821]"
              disabled={!captchaCode.trim() || step === "verifying"}
              onClick={() => void verify()}
              size="sm"
              type="button"
            >
              {step === "verifying" ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Search size={14} />
              )}
              {step === "verifying" ? "Consultando…" : "Verificar"}
            </Button>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Resultado exitoso.
  if (step === "success" && result) {
    return (
      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
        <div className="flex items-start gap-2">
          <CheckCircle2
            className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            size={15}
          />
          <div className="min-w-0 text-xs">
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              {result.legalName}
            </p>
            {result.registrationStatus && (
              <p
                className={`mt-0.5 ${result.registrationStatus === "VIGENTE" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
              >
                Registro {result.registrationStatus.toLowerCase()}
                {result.activity ? ` · ${result.activity}` : ""}
              </p>
            )}
          </div>
        </div>
        <button
          className="mt-2 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
          onClick={() => {
            setStep("idle");
            setResult(null);
            setError("");
          }}
          type="button"
        >
          Consultar otro RIF
        </button>
      </div>
    );
  }

  // Error.
  return (
    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950/30">
      <div className="flex items-start gap-2">
        <AlertCircle
          className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400"
          size={15}
        />
        <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
      </div>
      <button
        className="mt-2 flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        onClick={() => void loadCaptcha()}
        type="button"
      >
        <RefreshCw size={11} />
        Reintentar
      </button>
    </div>
  );
}
