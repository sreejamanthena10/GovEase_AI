import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState } from "react";
import {
  Bot,
  Brain,
  MessageSquareText,
  ListChecks,
  FileEdit,
  ShieldCheck,
  Target,
  UploadCloud,
  Cpu,
  MessageCircle,
  ListOrdered,
  ClipboardList,
  BellRing,
  Globe2,
  Lock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  FileText,
  AlertTriangle,
  X,
} from "lucide-react";
import { analyzeDocument, type AnalysisResult } from "@/lib/analyze.functions";
import { FeatureToolsModal, type ToolKey } from "@/components/FeatureTools";



export const Route = createFileRoute("/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "GovEase — AI Document Assistant" },
      {
        name: "description",
        content:
          "AI-powered assistant that simplifies government paperwork with plain-language explanations, step-by-step guidance, and secure auto-fill.",
      },
    ],
  }),
});

type Stage = "idle" | "uploading" | "analyzing" | "done" | "error";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Page() {
  const [assistantActive, setAssistantActive] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyze = useServerFn(analyzeDocument);

  const handleUploadClick = useCallback(() => fileInputRef.current?.click(), []);

  const clearAll = useCallback(() => {
    setResult(null);
    setErrorMsg(null);
    setStage("idle");
    setFileName(null);
    setProgress(0);
  }, []);


  const startProgress = useCallback(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(0);
    let p = 0;
    progressTimer.current = setInterval(() => {
      // Ease toward 90% while waiting on the AI; final jump to 100 on success.
      p += Math.max(0.6, (90 - p) * 0.06);
      setProgress(Math.min(90, p));
    }, 160);
  }, []);

  const stopProgress = useCallback((final: number) => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    setProgress(final);
  }, []);

  const runProcessing = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setResult(null);
      setErrorMsg(null);
      setStage("uploading");
      startProgress();

      try {
        if (file.size > 15 * 1024 * 1024) {
          throw new Error("File is larger than 15 MB. Please upload a smaller document.");
        }
        const dataBase64 = await fileToBase64(file);
        setStage("analyzing");
        const res = await analyze({
          data: {
            filename: file.name,
            mime: file.type || "application/octet-stream",
            dataBase64,
          },
        });
        stopProgress(100);
        setResult(res);
        setStage("done");
      } catch (err) {
        stopProgress(0);
        setStage("error");
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong analysing this document.");
      }
    },
    [analyze, startProgress, stopProgress],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void runProcessing(f);
    e.target.value = "";
  };

  return (
    <main className="min-h-screen bg-radial-hero text-foreground">
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
      />

      <Header />

      <section id="upload" className="mx-auto max-w-7xl px-6 pt-10 pb-14 md:pt-16 md:pb-24 animate-fade-up">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-stretch">
          <div className="flex flex-col justify-center animate-fade-up" style={{ animationDelay: "0.05s" }}>
            <div className="mb-5 inline-flex items-center gap-2 self-start rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              GovEase
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.15] tracking-tight">
              Simplify Government Paperwork with AI
            </h1>

            <p className="mt-5 max-w-md text-base md:text-lg text-muted-foreground leading-relaxed">
              Upload official documents and get plain-language explanations, step-by-step guidance, and auto-filled forms in seconds.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={handleUploadClick}
                className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-lg glow-primary transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                <UploadCloud className="h-5 w-5" />
                Upload and Simplify
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => setAssistantActive((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-6 py-3.5 font-medium text-foreground/90 transition hover:border-primary/60 hover:text-foreground"
              >
                <Bot className="h-4 w-4 text-primary-glow" />
                {assistantActive ? "Hide" : "Ask"} Assistant
              </button>
            </div>

            <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Secure
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Free to try
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="h-3.5 w-3.5 text-success" /> Made for India
              </span>
            </div>
          </div>

          <AssistantCard active={assistantActive} onToggle={() => setAssistantActive((v) => !v)} />
        </div>
      </section>

      <ChallengeSection />
      <SolutionSection
        stage={stage}
        progress={progress}
        fileName={fileName}
        onUpload={handleUploadClick}
        onOpenTool={setActiveTool}
      />

      {(result || errorMsg || stage === "analyzing" || stage === "uploading") && (
        <AnalysisPanel
          stage={stage}
          fileName={fileName}
          result={result}
          errorMsg={errorMsg}
          onDismiss={clearAll}
          onRetry={handleUploadClick}
        />
      )}

      <ImpactSection />
      <Footer />

      {activeTool && (
        <FeatureToolsModal
          toolKey={activeTool}
          result={result}
          fileName={fileName}
          onClose={() => setActiveTool(null)}
          onClearData={clearAll}
        />
      )}
    </main>

  );
}


/* ---------- Header ---------- */
function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-lg glow-primary">
            <span className="font-display text-lg font-bold text-primary-foreground">A</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl font-bold tracking-tight md:text-2xl">
              <span className="text-gradient-primary">GovEase</span>
            </div>
            <div className="text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground/70">
              Frontend Arena
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {[
            { label: "Upload", href: "#upload" },
            { label: "Challenge", href: "#challenge" },
            { label: "Solution", href: "#solution" },
            { label: "Impact", href: "#impact" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs md:block">
            <div className="font-semibold">AI Assistant</div>
            <div className="text-muted-foreground">Online</div>
          </div>
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-surface-elevated border border-primary/30 animate-breathe">
            <Bot className="h-5 w-5 text-primary-glow" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-background" />
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- Badge ---------- */
function Badge({
  children,
  variant = "outline",
}: {
  children: React.ReactNode;
  variant?: "outline" | "solid";
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] " +
        (variant === "solid"
          ? "bg-gradient-primary text-primary-foreground shadow-lg glow-primary"
          : "border border-primary/40 bg-surface/50 text-primary-glow")
      }
    >
      {children}
    </span>
  );
}

/* ---------- Assistant Card ---------- */
function AssistantCard({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div
      className="group relative min-h-[440px] lg:min-h-[520px] [perspective:1600px] animate-fade-up cursor-pointer"
      style={{ animationDelay: "0.15s" }}
      onMouseEnter={() => !active && onToggle()}
      onMouseLeave={() => active && onToggle()}
      onClick={onToggle}
    >
      <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-primary opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25" />
      <div
        className="relative h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] group-hover:-translate-y-1"
        style={{ transform: active ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-3xl glass overflow-hidden ring-1 ring-primary/20 transition-shadow duration-500 group-hover:ring-primary/50 group-hover:glow-primary">
          <div className="relative h-full w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-primary-glow/20 transition-opacity duration-500 group-hover:opacity-80" />
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <div className="max-w-sm rounded-2xl bg-background/70 p-5 backdrop-blur-md border border-border">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-glow">
                  <FileText className="h-3.5 w-3.5" /> The Problem
                </div>
                <p className="text-sm text-muted-foreground">
                  "I don't understand this form… it's too complicated!"
                </p>
              </div>
            </div>
            <div className="absolute top-6 right-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated border border-primary/40 animate-float transition-transform duration-500 group-hover:scale-110">
              <Brain className="h-7 w-7 text-primary-glow" />
            </div>
            <div className="absolute top-6 left-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/70 px-3 py-1.5 text-xs font-medium text-primary-glow backdrop-blur animate-pulse-ring">
              <Bot className="h-3.5 w-3.5" />
              Hover to meet the AI
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-3xl glass p-6 [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold">AI Assistant</div>
              <div className="flex items-center gap-1.5 text-xs text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Online now
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3 overflow-y-auto max-h-[380px] pr-1">
            <ChatBubble>
              Hello! I'm here to help you understand government documents and
              complete your processes easily.
            </ChatBubble>

            <div className="rounded-2xl border border-primary/30 bg-surface/60 p-4">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary-glow">
                <Sparkles className="h-3.5 w-3.5" /> Simplified Explanation
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                You need to register your business on the Udyam Portal. Here are the simple steps:
              </p>
              <ul className="space-y-2 text-sm">
                {[
                  "Fill basic business details",
                  "Upload required documents",
                  "Verify & submit",
                  "Receive your Udyam Certificate",
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <ChatBubble>Would you like me to guide you step-by-step?</ChatBubble>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-surface-elevated/80 border border-border px-4 py-3 text-sm text-foreground/90">
      {children}
    </div>
  );
}

/* ---------- Challenge Section ---------- */
const CHALLENGES = [
  { icon: Brain, title: "Understand", desc: "AI reads & understands complex documents" },
  { icon: MessageSquareText, title: "Explain Simply", desc: "Converts technical language into simple terms" },
  { icon: ListChecks, title: "Guide Step-by-Step", desc: "Provides clear actions & next steps" },
  { icon: FileEdit, title: "Auto-Fill Forms", desc: "Helps fill forms with correct information" },
  { icon: ShieldCheck, title: "Build Confidence", desc: "Empowers citizens to complete processes easily" },
  { icon: Target, title: "Real Impact", desc: "Reduces friction across government workflows" },
];

function ChallengeSection() {
  return (
    <section id="challenge" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      <SectionHeader
        eyebrow="Your Challenge"
        title="Build an AI-powered assistant"
        subtitle="that explains official documents in simple language and helps citizens complete government processes with confidence."
        icon={<Target className="h-5 w-5" />}
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {CHALLENGES.map((c, i) => (
          <StaggerTile key={c.title} delay={i * 70}>
            <ChallengeTile icon={c.icon} title={c.title} desc={c.desc} />
          </StaggerTile>
        ))}
      </div>
    </section>
  );
}

function ChallengeTile({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Brain;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative aspect-square rounded-2xl border border-border bg-surface/50 p-5 transition-all duration-300 hover:-translate-y-2 hover:border-primary/60 hover:glow-primary">
      <div className="flex h-full flex-col">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-lg transition-transform group-hover:scale-110">
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="mt-auto">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function StaggerTile({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <div className="animate-fade-up opacity-0" style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}>
      {children}
    </div>
  );
}

/* ---------- Solution Section ---------- */
type SolutionKey =
  | "upload"
  | "analysis"
  | "explain"
  | "steps"
  | "form"
  | "reminders"
  | "multilingual"
  | "secure";

const SOLUTIONS: { key: SolutionKey; icon: typeof UploadCloud; title: string; desc: string }[] = [
  { key: "upload", icon: UploadCloud, title: "Document Upload", desc: "Drag, drop or pick — instant intake" },
  { key: "analysis", icon: Cpu, title: "AI Document Analysis", desc: "Understands intent & requirements" },
  { key: "explain", icon: MessageCircle, title: "Simple Language Explanation", desc: "Plain-language rewrites" },
  { key: "steps", icon: ListOrdered, title: "Step-by-Step Guidance", desc: "A checklist you can follow" },
  { key: "form", icon: ClipboardList, title: "Form Assistance & Auto-Fill", desc: "Pre-fills verified data" },
  { key: "reminders", icon: BellRing, title: "Checklist & Reminders", desc: "Never miss a deadline" },
  { key: "multilingual", icon: Globe2, title: "Multilingual Support", desc: "22+ Indian languages" },
  { key: "secure", icon: Lock, title: "Secure & Private Data Handling", desc: "End-to-end encrypted" },
];

function SolutionSection({
  stage,
  progress,
  fileName,
  onUpload,
  onOpenTool,
}: {
  stage: Stage;
  progress: number;
  fileName: string | null;
  onUpload: () => void;
  onOpenTool: (key: ToolKey) => void;
}) {

  const activated: Record<SolutionKey, boolean> = {
    upload: stage !== "idle",
    analysis: stage === "done",
    explain: stage === "done",
    steps: stage === "done",
    form: stage === "done",
    reminders: stage === "done",
    multilingual: stage === "done",
    secure: true,
  };

  const toolKeys: SolutionKey[] = ["form", "reminders", "multilingual", "secure"];

  return (
    <section id="solution" className="border-t border-border/60 bg-surface/30 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Solution May Include"
          title="An end-to-end AI toolkit"
          subtitle="Everything a citizen needs to move from confusion to completion — in minutes, not weeks."
          icon={<Sparkles className="h-5 w-5" />}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOLUTIONS.map((s, i) => {
            const isTool = toolKeys.includes(s.key);
            return (
              <StaggerTile key={s.key} delay={i * 60}>
                <SolutionTile
                  {...s}
                  active={activated[s.key]}
                  interactive={s.key === "upload" || isTool}
                  onClick={
                    s.key === "upload"
                      ? onUpload
                      : isTool
                        ? () => onOpenTool(s.key as ToolKey)
                        : undefined
                  }
                  stage={s.key === "upload" ? stage : undefined}
                  progress={s.key === "upload" ? progress : undefined}
                  fileName={s.key === "upload" ? fileName : undefined}
                  cta={isTool ? "Open tool" : undefined}
                />
              </StaggerTile>
            );
          })}
        </div>
      </div>
    </section>
  );
}


function SolutionTile({
  icon: Icon,
  title,
  desc,
  active,
  interactive,
  onClick,
  stage,
  progress,
  fileName,
  cta,
}: {
  icon: typeof UploadCloud;
  title: string;
  desc: string;
  active: boolean;
  interactive?: boolean;
  onClick?: () => void;
  stage?: Stage;
  progress?: number;
  fileName?: string | null;
  cta?: string;
}) {

  const Component = interactive ? "button" : "div";
  return (
    <Component
      onClick={onClick}
      className={
        "group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1.5 hover:glow-primary " +
        (active
          ? "border-success/60 bg-success/5"
          : "border-border bg-surface/60 hover:border-primary/60") +
        (interactive ? " cursor-pointer" : "")
      }
    >
      <div className="flex items-start justify-between">
        <div
          className={
            "flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 " +
            (active ? "bg-success/20" : "bg-gradient-primary shadow-lg")
          }
        >
          <Icon className={"h-6 w-6 " + (active ? "text-success" : "text-primary-foreground")} />
        </div>
        {active && (
          <CheckCircle2 className="h-5 w-5 text-success animate-fade-up" />
        )}
      </div>

      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>

      {interactive && stage && stage !== "idle" && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium">
            <span className="text-muted-foreground truncate max-w-[70%]">
              {fileName ?? "document"}
            </span>
            <span className="text-primary-glow">
              {stage === "uploading" && "Processing…"}
              {stage === "analyzing" && "Analysis…"}
              {stage === "done" && "Complete"}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/60">
            <div
              className="h-full bg-gradient-primary transition-all duration-150"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {cta && (
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-glow">
          <ArrowRight className="h-3.5 w-3.5" /> {cta}
        </div>
      )}

      {interactive && !cta && stage === "idle" && (
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-glow">
          <UploadCloud className="h-3.5 w-3.5" /> Click to upload
        </div>
      )}
    </Component>
  );

}


/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/70">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-6 py-8 text-center">
        <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Design · Build · Dominate
        </div>
        <div className="text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} Frontend Arena — GovEase
        </div>
      </div>
    </footer>
  );
}

/* ---------- Analysis Panel ---------- */
function AnalysisPanel({
  stage,
  fileName,
  result,
  errorMsg,
  onDismiss,
  onRetry,
}: {
  stage: Stage;
  fileName: string | null;
  result: AnalysisResult | null;
  errorMsg: string | null;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const loading = stage === "uploading" || stage === "analyzing";
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="rounded-3xl glass p-6 md:p-10 animate-fade-up">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-lg glow-primary">
              <Cpu className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-glow">
                AI Analysis
              </div>
              <div className="text-sm text-muted-foreground truncate max-w-[60vw]">
                {fileName ?? "document"}
              </div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary-glow" />
            <div>
              <div className="text-sm font-semibold">
                {stage === "uploading" ? "Reading your document…" : "AI is analysing…"}
              </div>
              <div className="text-xs text-muted-foreground">
                This usually takes 5–20 seconds.
              </div>
            </div>
          </div>
        )}

        {errorMsg && stage === "error" && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Could not analyse the document</div>
              <div className="mt-1 text-xs text-muted-foreground">{errorMsg}</div>
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                <UploadCloud className="h-3.5 w-3.5" /> Try another file
              </button>
            </div>
          </div>
        )}

        {result && stage === "done" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-primary/30 bg-surface/60 p-5">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary-glow">
                <FileText className="h-3.5 w-3.5" /> {result.title}
              </div>
              <p className="text-sm text-foreground/90">{result.summary}</p>
              <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary-glow">
                  Plain English
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {result.plainExplanation}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface/60 p-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-glow">
                  <ListOrdered className="h-3.5 w-3.5" /> Step-by-step
                </div>
                <ol className="space-y-2 text-sm">
                  {result.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="text-foreground/90">{s}</span>
                    </li>
                  ))}
                  {result.steps.length === 0 && (
                    <li className="text-xs text-muted-foreground">No steps returned.</li>
                  )}
                </ol>
              </div>

              {result.documents.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface/60 p-5">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-glow">
                    <ClipboardList className="h-3.5 w-3.5" /> Prepare
                  </div>
                  <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                    {result.documents.map((d, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span className="text-foreground/90">{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Watch out
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        <span className="text-foreground/90">{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


/* ---------- Section Header ---------- */
function SectionHeader({
  eyebrow,
  title,
  subtitle,
  icon,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-surface/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary-glow">
        {icon}
        {eyebrow}
      </div>
      <h2 className="text-3xl md:text-5xl font-bold leading-tight">{title}</h2>
      <p className="mt-4 text-base md:text-lg text-muted-foreground">{subtitle}</p>
    </div>
  );
}
