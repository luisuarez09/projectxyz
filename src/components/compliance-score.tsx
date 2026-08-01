import { ShieldCheck } from "lucide-react"

const bands = [
  { min: 0, max: 39, label: "Crítico", color: "#dc2626", text: "text-rose-700" },
  { min: 40, max: 59, label: "Vulnerable", color: "#ea580c", text: "text-orange-700" },
  { min: 60, max: 74, label: "En desarrollo", color: "#d97706", text: "text-amber-700" },
  { min: 75, max: 89, label: "Sólido", color: "#0284c7", text: "text-sky-700" },
  { min: 90, max: 100, label: "Fortalecido", color: "#059669", text: "text-emerald-700" },
]

export function scoreBand(score: number) {
  return bands.find((band) => score >= band.min && score <= band.max) ?? bands[0]
}

export function ComplianceScore({ score, compact = false }: { score: number; compact?: boolean }) {
  const band = scoreBand(score)
  const size = compact ? "size-28" : "size-40"
  return (
    <div className="text-center">
      <div className={`relative mx-auto grid ${size} place-items-center rounded-full`} style={{ background: `conic-gradient(${band.color} ${score * 3.6}deg, #e7e5e4 0deg)` }} aria-label={`Índice de preparación formal: ${score} de 100, nivel ${band.label}`}>
        <div className="absolute inset-2.5 rounded-full bg-white dark:bg-stone-900" />
        <div className="relative">{!compact && <ShieldCheck className="mx-auto mb-1 text-stone-400" size={18} />}<p className={compact ? "text-3xl font-semibold" : "text-5xl font-semibold tracking-tight"}>{score}</p><p className="text-xs text-stone-500">de 100</p></div>
      </div>
      <p className={`mt-3 text-sm font-semibold ${band.text}`}>{band.label}</p>
    </div>
  )
}

export function ScoreScale() {
  return <div><div className="h-2 overflow-hidden rounded-full bg-[linear-gradient(90deg,#dc2626_0%,#ea580c_40%,#d97706_60%,#0284c7_75%,#059669_90%)]" /><div className="mt-1.5 flex justify-between text-[10px] text-stone-500"><span>0 · Crítico</span><span>60</span><span>75</span><span>90 · Fortalecido</span></div></div>
}
