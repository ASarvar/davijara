import { Logo } from "@/components/layout/logo";

/*
  The frame shared by the two unauthenticated screens — login and first-run
  setup. A plain centred card: this is the one part of the panel a person sees
  before they are anybody, so it carries the mark and nothing else.
*/
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo variant="footer" />
        </div>

        <div className="bg-card border-border rounded-xl border p-6 [box-shadow:var(--shadow-1)] sm:p-7">
          <h1 className="font-heading text-xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              {description}
            </p>
          ) : null}

          <div className="mt-6">{children}</div>
        </div>

        {footer ? (
          <div className="text-muted-foreground mt-6 text-center text-xs text-pretty">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}
