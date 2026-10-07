"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="panel section"><h1>Officer access unavailable.</h1><p>We could not load the private workspace. Check the Supabase connection, migration, and assigned officer access, then retry. No successful save is implied.</p><button className="button" onClick={reset}>Try again</button></section>;
}
