export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 p-6 shadow-sm">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-black">חידון יומי 🎯</h1>
        </div>
        {children}
      </div>
    </main>
  )
}
