import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-white border border-slate-200 rounded-xl shadow-sm", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "red" | "green" | "amber" }) {
  const toneClass = {
    default: "text-slate-900",
    red: "text-red-600",
    green: "text-emerald-600",
    amber: "text-amber-600",
  }[tone];

  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", toneClass)}>{value}</p>
    </Card>
  );
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "red" | "green" | "amber" | "indigo" }) {
  const toneClass = {
    default: "bg-slate-100 text-slate-700",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-indigo-100 text-indigo-700",
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
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "text-slate-600 hover:bg-slate-100",
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
        "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
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
        "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white",
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
        "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
        props.className
      )}
    />
  );
}
