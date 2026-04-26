export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Nested Makes</h1>
          <p className="text-sm text-neutral-600">
            Tavs rokdarbu “community” un izaicinājumu palīgs.
          </p>
        </header>

        <section className="space-y-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-sm text-neutral-600">Šodien</div>
            <div className="mt-1 text-base">
              Izvēlies vienu mazu soli: 20 min adīšana / 10 rindas / 1 mezgls.
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-sm text-neutral-600">Kopīgie projekti</div>
            <div className="mt-1 text-base">
              Drīzumā: pievienojies kopīgam projektam un dalies progresā.
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-sm text-neutral-600">Discover</div>
            <div className="mt-1 text-base">
              Iedvesmojies no citu darbiem un atrodi jaunus projektus.
            </div>
          </div>
        </section>
      </div>

      {/* Bottom navigation (pagaidām tikai UI, bez klikšķiem) */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
        <div className="mx-auto flex max-w-[430px] justify-between px-4 py-3 text-sm">
          <button className="font-medium">Home</button>
          <button className="text-neutral-500">Discover</button>
          <button className="text-neutral-500">Challenges</button>
          <button className="text-neutral-500">Profile</button>
        </div>
      </nav>
    </main>
  );
}

