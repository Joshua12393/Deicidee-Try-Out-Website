import { z } from "zod";
import { PublicationReviewForm } from "./publication-review-form";
import { defaultRecruitmentConfig, recruitmentConfigSchema, type RecruitmentConfig } from "@/lib/recruitment-config";
import { publicationChanges } from "@/lib/publication-diff";
import { manilaDate, type Officer } from "@/lib/dashboard";
export async function PublicationRequests({ officer, revision, published }: { officer: Officer; revision: number; published: RecruitmentConfig | null }) {
  const columns = "id,author_id,content,base_revision,status,created_at,review_note,reviewed_at,author:officer_profiles!author_id(display_name)";
  const [pending, history] = await Promise.all([
    officer.supabase.from("publication_requests").select(columns, { count: "exact" }).eq("status", "pending").order("created_at", { ascending: true }).limit(100),
    officer.supabase.from("publication_requests").select(columns).neq("status", "pending").order("created_at", { ascending: false }).limit(20),
  ]);
  if (pending.error || history.error) return <p className="notice">Publication review is unavailable. Ask an admin to check the database setup.</p>;
  const data = [...pending.data, ...history.data];
  return <section className="publication-requests"><h2>{officer.profile.role === "admin" ? "Publication review" : "Your publication requests"} <span className="settings-badge">{pending.count ?? pending.data.length} pending</span></h2><p className="muted">{officer.profile.role === "admin" ? "Compare each submitted snapshot with the public guide before deciding. Approval publishes the entire request and pauses applications." : "Your changes go live only after an admin approves them. You can keep editing your separate draft while a request is pending."}</p>
    {!data.length && <p className="muted">No publication requests yet.</p>}
    {data.map(request => {
      const content = recruitmentConfigSchema.safeParse(request.content);
      const author = z.object({ display_name: z.string() }).safeParse(request.author);
      const changes = content.success ? publicationChanges(published ?? defaultRecruitmentConfig, content.data) : [];
      return <details className="settings-section" key={request.id} open={request.status === "pending"}><summary><span><strong>{author.success ? author.data.display_name : "Officer"} · {request.status}</strong><small>{manilaDate(request.created_at)} · Asia/Manila</small></span></summary><div className="request-content">
        {!content.success ? <p className="notice">This request contains invalid settings. Reject it and ask for a fresh draft.</p> : <><p className="muted">{changes.length} changed fields compared with the current public guide.</p>{changes.map(change => <div className="publication-change" key={change.label}><h3>{change.label}</h3><div className="grid-two"><div><small>Currently public</small><p className="preserve-lines">{change.before || "Not provided"}</p></div><div><small>Requested change</small><p className="preserve-lines">{change.after || "Not provided"}</p></div></div></div>)}</>}
        {request.status === "pending" && officer.profile.role === "admin" && <PublicationReviewForm id={request.id} revision={revision} stale={!content.success || request.base_revision !== revision} own={request.author_id === officer.profile.id} />}
        {request.review_note && <p className="preserve-lines">Review note: {request.review_note}</p>}
      </div></details>;
    })}{(pending.count ?? 0) > 100 && <p className="muted">Showing the oldest 100 pending requests. Review them to see the next requests.</p>}{history.data.length === 20 && <p className="muted">Showing the latest 20 completed reviews.</p>}
  </section>;
}
