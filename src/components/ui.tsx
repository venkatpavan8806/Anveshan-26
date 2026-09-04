import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-slate-900 border border-slate-800 rounded-xl shadow-sm", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "red" | "green" | "amber" }) {
  const toneClass = {
    default: "text-white",
    red: "text-red-400",
    green: "text-emerald-400",
    amber: "text-amber-400",
  }[tone];

  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", toneClass)}>{value}</p>
    </Card>
  );
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "red" | "green" | "amber" | "indigo" }) {
  const toneClass = {
    default: "bg-slate-800 text-slate-300",
    red: "bg-red-500/15 text-red-300",
    green: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    indigo: "bg-sky-500/15 text-sky-300",
  }[tone];

  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", toneClass)}>{children}</span>;
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const variantClass = {
    primary: "bg-sky-500 hover:bg-sky-600 text-white",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-300",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    ghost: "text-slate-300 hover:bg-slate-800",
  }[variant];

  return (
    <button
      className={cn(
        "rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        variantClass,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-lg border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-900",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400",
        props.className
      )}
    />
  );
}
