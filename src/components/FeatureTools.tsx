import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BellRing,
  Check,
  ClipboardList,
  Copy,
  Download,
  Globe2,
  Lock,
  Trash2,
  X,
} from "lucide-react";
import {
  translateAnalysis,
  type AnalysisResult,
  type TranslatedAnalysis,
} from "@/lib/analyze.functions";

export type ToolKey = "form" | "reminders" | "multilingual" | "secure";

const TITLES: Record<ToolKey, string> = {
  form: "Form Assistance & Auto-Fill",
  reminders: "Checklist & Reminders",
  multilingual: "Multilingual Support",
  secure: "Secure & Private Data Handling",
};

const ICONS: Record<ToolKey, typeof ClipboardList> = {
  form: ClipboardList,
  reminders: BellRing,
  multilingual: Globe2,
  secure: Lock,
};

export const INDIAN_LANGUAGES = [
  "Hindi", "Bengali", "Marathi", "Telugu", "Tamil", "Gujarati", "Urdu", "Kannada",
  "Odia", "Malayalam", "Punjabi", "Assamese", "Maithili", "Santali", "Kashmiri",
  "Nepali", "Sindhi", "Konkani", "Dogri", "Manipuri", "Bodo", "Sanskrit",
];

function download(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function FeatureToolsModal({
  toolKey,
  result,
  fileName,
  onClose,
  onClearData,
}: {
  toolKey: ToolKey;
  result: AnalysisResult | null;
  fileName: string | null;
  onClose: () => void;
  onClearData: () => void;
}) {
  const Icon = ICONS[toolKey];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border glass p-6 animate-fade-up sm:rounded-3xl md:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-lg glow-primary">
              <Icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{TITLES[toolKey]}</h2>
              <p className="text-xs text-muted-foreground">{fileName ?? "No document uploaded yet"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-surface/60 p-2 text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {toolKey === "secure" ? (
          <SecurePanel hasData={!!result} onClearData={onClearData} onClose={onClose} />
        ) : !result ? (
          <EmptyState />
        ) : toolKey === "form" ? (
          <FormPanel result={result} />
        ) : toolKey === "reminders" ? (
          <RemindersPanel result={result} />
        ) : (
          <TranslatePanel result={result} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-6 text-center">
      <p className="text-sm text-muted-foreground">
        Upload and analyse a document first — this tool uses the details extracted from it.
      </p>
    </div>
  );
}

/* ---------- Form auto-fill ---------- */
function FormPanel({ result }: { result: AnalysisResult }) {
  const [fields, setFields] = useState(() =>
    result.formFields.length
      ? result.formFields
      : [
          { label: "Full name", value: "" },
          { label: "Application / reference number", value: "" },
          { label: "Date", value: "" },
        ],
  );
  const [copied, setCopied] = useState(false);

  const asText = useMemo(
    () => fields.map((f) => `${f.label}: ${f.value || "—"}`).join("\n"),
    [fields],
  );

  const filled = fields.filter((f) => f.value.trim()).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
        {filled} of {fields.length} fields were auto-filled from your document. Edit anything that looks wrong,
        then copy or download to use in the official form.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f, i) => (
          <label key={f.label + i} className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{f.label}</span>
            <input
              value={f.value}
              placeholder="Not found — type here"
              onChange={(e) =>
                setFields((prev) => prev.map((p, idx) => (idx === i ? { ...p, value: e.target.value } : p)))
              }
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/60"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(asText);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy all fields"}
        </button>
        <button
          onClick={() => download("govease-form-details.txt", asText)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-5 py-2.5 text-sm font-medium transition hover:border-primary/60"
        >
          <Download className="h-4 w-4" /> Download
        </button>
      </div>
    </div>
  );
}

/* ---------- Checklist & reminders ---------- */
const STORAGE_KEY = "govease.checklist";

function RemindersPanel({ result }: { result: AnalysisResult }) {
  const items = useMemo(
    () => [...result.documents.map((d) => `Prepare: ${d}`), ...result.steps.map((s) => s)],
    [result],
  );

  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (key: string) => {
    setDone((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const reminders = result.reminders.length
    ? result.reminders
    : [{ label: `Complete: ${result.title}`, dueInDays: 7 }];

  const completed = items.filter((i) => done[i]).length;
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0;

  const makeIcs = () => {
    const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const events = reminders
      .map((r, i) => {
        const start = new Date(Date.now() + r.dueInDays * 86400000);
        return [
          "BEGIN:VEVENT",
          `UID:govease-${Date.now()}-${i}@govease`,
          `DTSTAMP:${stamp(new Date())}`,
          `DTSTART:${stamp(start)}`,
          `SUMMARY:${r.label.replace(/\n/g, " ")}`,
          `DESCRIPTION:GovEase reminder for ${result.title}`,
          "END:VEVENT",
        ].join("\r\n");
      })
      .join("\r\n");
    download(
      "govease-reminders.ics",
      `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GovEase//EN\r\n${events}\r\nEND:VCALENDAR`,
      "text/calendar;charset=utf-8",
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface/60 p-4">
        <div className="mb-2 flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">Your progress</span>
          <span className="text-primary-glow">{completed}/{items.length} done</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-background/60">
          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item}>
            <button
              onClick={() => toggle(item)}
              className={
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition " +
                (done[item]
                  ? "border-success/50 bg-success/5 text-muted-foreground line-through"
                  : "border-border bg-surface/60 hover:border-primary/60")
              }
            >
              <span
                className={
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border " +
                  (done[item] ? "border-success bg-success/20 text-success" : "border-border")
                }
              >
                {done[item] && <Check className="h-3.5 w-3.5" />}
              </span>
              <span>{item}</span>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">Nothing to track yet.</li>}
      </ul>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary-glow">Deadlines</div>
        <ul className="space-y-2 text-sm">
          {reminders.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="text-foreground/90">{r.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(Date.now() + r.dueInDays * 86400000).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
        <button
          onClick={makeIcs}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <BellRing className="h-4 w-4" /> Add reminders to calendar
        </button>
      </div>
    </div>
  );
}

/* ---------- Multilingual ---------- */
function TranslatePanel({ result }: { result: AnalysisResult }) {
  const translate = useServerFn(translateAnalysis);
  const [language, setLanguage] = useState("Hindi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<TranslatedAnalysis | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await translate({
        data: {
          language,
          payload: {
            title: result.title,
            summary: result.summary,
            plainExplanation: result.plainExplanation,
            steps: result.steps,
            documents: result.documents,
            warnings: result.warnings,
          },
        },
      });
      setOut(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[200px]">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Choose a language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60"
          >
            {INDIAN_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => void run()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Globe2 className="h-4 w-4" /> {loading ? "Translating…" : "Translate"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {out && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-surface/60 p-5">
            <div className="mb-2 text-sm font-semibold">{out.title}</div>
            <p className="text-sm text-foreground/90">{out.summary}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{out.plainExplanation}</p>
          </div>
          {out.steps.length > 0 && (
            <ol className="space-y-2 rounded-2xl border border-border bg-surface/60 p-5 text-sm">
              {out.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90">{s}</span>
                </li>
              ))}
            </ol>
          )}
          {out.documents.length > 0 && (
            <ul className="space-y-1.5 rounded-2xl border border-border bg-surface/60 p-5 text-sm">
              {out.documents.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span className="text-foreground/90">{d}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Secure ---------- */
function SecurePanel({
  hasData,
  onClearData,
  onClose,
}: {
  hasData: boolean;
  onClearData: () => void;
  onClose: () => void;
}) {
  const [cleared, setCleared] = useState(false);

  const points = [
    "Your file is sent over an encrypted HTTPS connection and analysed server-side.",
    "Nothing is stored in a database — the analysis lives only in this browser session.",
    "Only your checklist ticks are saved locally on this device, never uploaded.",
    "Clearing data below wipes the analysis and local checklist instantly.",
  ];

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3 rounded-xl border border-border bg-surface/60 p-3 text-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span className="text-foreground/90">{p}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* ignore */
          }
          onClearData();
          setCleared(true);
          setTimeout(onClose, 900);
        }}
        className="inline-flex items-center gap-2 rounded-full border border-destructive/50 bg-destructive/10 px-5 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20"
      >
        <Trash2 className="h-4 w-4" /> {cleared ? "All data erased" : hasData ? "Erase my data now" : "Clear local data"}
      </button>
    </div>
  );
}
