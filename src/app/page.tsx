import { clan, tryoutModes } from "@/lib/clan";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 sm:px-10">
      <a href="#main" className="sr-only focus:not-sr-only focus:py-4">Skip to content</a>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 py-7">
        <span className="text-xl font-black tracking-widest">{clan.name}<span className="text-red-500">.</span></span>
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">{clan.game} clan</span>
      </header>
      <main id="main" className="flex flex-1 flex-col justify-center py-20 sm:py-28">
        <p className="mb-6 text-sm font-bold uppercase tracking-[0.2em] text-red-400">Skill. Teamwork. Drive.</p>
        <h1 className="max-w-4xl text-5xl leading-[1.05] font-black tracking-tight uppercase sm:text-7xl">
          Prove your skill.<br /><span className="text-red-500">Earn your place.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-neutral-300">
          The Deicidee recruitment website is taking shape. Applications are not available on this website yet.
        </p>
        <section aria-labelledby="modes-title" className="mt-14 border-t border-white/10 pt-8">
          <h2 id="modes-title" className="text-sm font-bold uppercase tracking-widest">Three tryouts. Choose one.</h2>
          <ul className="mt-5 flex flex-wrap gap-3">
            {tryoutModes.map((mode) => (
              <li key={mode.id} className="border border-white/15 px-5 py-3 text-sm text-neutral-200">{mode.name}</li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="border-t border-white/10 py-6 text-xs leading-6 text-neutral-500">
        {clan.name} · A community clan website for CrossFire players.
      </footer>
    </div>
  );
}
