import { cn } from "@/lib/utils";

/*
  The panel's form controls.

  Deliberately plain elements rather than Radix wrappers: every one of these
  is a native input in a server-rendered form, so the panel keeps working with
  no JavaScript at all — which on a one-CPU box behind two proxies is a
  property worth having, not a purist flourish.

  The label is always rendered and always associated. A placeholder is not a
  label: it disappears the moment someone types, taking the only description
  of the field with it, and screen readers treat it as a hint rather than a
  name.
*/

const CONTROL =
  "border-border bg-background text-foreground placeholder:text-muted-foreground/60 " +
  "focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border px-3 py-2 " +
  "text-sm outline-none transition-all focus-visible:ring-3 disabled:opacity-50 " +
  "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required ? (
          <span className="text-destructive ml-0.5" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="text-muted-foreground text-xs text-pretty">
          {hint}
        </p>
      ) : null}

      {children}

      {error ? (
        <p id={errorId} className="text-destructive text-xs text-pretty">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(CONTROL, "min-h-24 resize-y", className)}
      {...props}
    />
  );
}

export function SelectInput({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  /*
    `appearance-none` strips the native arrow, so one is drawn back with a
    background image — the trap recorded in the root CLAUDE.md. `color-scheme`
    is bound to the tone in globals.css, which is what keeps the option popup
    from rendering white-on-white on a dark surface.
  */
  return (
    <div className="relative">
      <select
        className={cn(CONTROL, "appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      >
        <path
          d="M4 6l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** A form-level error, above the submit button. */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm text-pretty"
    >
      {children}
    </p>
  );
}

/** A form-level success note, same shape as FormError. */
export function FormNotice({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="status"
      className="border-hairline bg-secondary text-foreground rounded-lg border px-3 py-2 text-sm text-pretty"
    >
      {children}
    </p>
  );
}
