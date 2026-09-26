export function App() {
  return (
    <div className="min-h-screen bg-background text-primary flex flex-col justify-between p-6">
      <header className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-primary">
              StockSense
            </h1>
            <p className="text-sm text-primary-muted mt-1">
              Inventory Management System — Foundation Shell (Phase 0)
            </p>
          </div>
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-accent bg-accent-subtle rounded border border-accent/20">
            Phase 0 Ready
          </span>
        </div>
      </header>

      <main className="my-auto py-12 text-center">
        <div className="max-w-md mx-auto p-6 border border-border rounded bg-surface">
          <h2 className="text-base font-medium text-primary">
            Monorepo Shell Initialized
          </h2>
          <p className="text-sm text-primary-muted mt-2">
            Turborepo + Vite + Fastify + tRPC + Prisma ledger skeleton configured.
          </p>
        </div>
      </main>

      <footer className="border-t border-border pt-4 text-xs text-primary-muted flex justify-between">
        <span>StockSense Core</span>
        <span>Inter • 8px Grid • ERP Aesthetics</span>
      </footer>
    </div>
  );
}

export default App;
