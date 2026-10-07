import Link from "next/link";
import { applicationStatuses,dashboardFilters,manilaDate,modeLabels,statusLabel,type Officer } from "@/lib/dashboard";
type Params=Record<string,string|string[]|undefined>;
type Row={id:string;reference:string;ign:string;mode:keyof typeof modeLabels;selected_map:string|null;status:string;created_at:string};
export async function ApplicationsDashboard({officer,params}:{officer:Officer;params:Params}) {
 const f=dashboardFilters.parse(params);
 const {data,error}=await officer.supabase.rpc("list_applications",{p_query:f.q,p_status:f.status??null,p_mode:f.mode??null,p_page:f.page});
 if(error||!data) throw new Error("Could not load applications. Try again later.");
 const results=data as {items:Row[];count:number;total:number;pending:number};
 const url=(page:number)=>`/admin?${new URLSearchParams({tab:"applications",q:f.q,status:f.status??"",mode:f.mode??"",page:String(page)})}`;
 return <><div className="grid-two dashboard-counts"><section className="panel"><p className="eyebrow">All applications</p><h2>{results.total}</h2></section><section className="panel"><p className="eyebrow">Pending review</p><h2>{results.pending}</h2></section></div>
 <form className="panel dashboard-filters" method="get" action="/admin"><input type="hidden" name="tab" value="applications"/><label className="field">Search IGN / reference<input name="q" defaultValue={f.q} maxLength={100}/></label><label className="field">Status<select name="status" defaultValue={f.status??""}><option value="">All statuses</option>{applicationStatuses.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></label><label className="field">Mode<select name="mode" defaultValue={f.mode??""}><option value="">All modes</option>{Object.entries(modeLabels).map(([m,label])=><option key={m} value={m}>{label}</option>)}</select></label><button className="button secondary">Filter</button><Link className="text-link" href="/admin?tab=applications">Reset</Link></form>
 <p className="muted">{results.count} matching application{results.count===1?"":"s"} · Page {f.page} · Times in Asia/Manila</p>
 <div className="application-list">{results.items.map(item=><Link href={`/admin/applications/${item.id}`} className="panel application-row" key={item.id}><div><h3>{item.ign}</h3><p className="application-reference muted">{item.reference}</p></div><div><span className="tag">{statusLabel(item.status)}</span><p>{modeLabels[item.mode]}{item.selected_map ? ` · ${item.selected_map}`:""}<br/>{manilaDate(item.created_at)}</p><span className="text-link">Review application ↗</span></div></Link>)}</div>
 {!results.items.length && <section className="panel"><h2>No applications found.</h2><p>{results.total ? "Change the search or filters to find another application.":"No applications have been received. This dashboard shows real records only."}</p></section>}
 <nav className="actions" aria-label="Application pages">{f.page>1 && <Link className="button secondary" href={url(f.page-1)}>Previous</Link>}{f.page*20<results.count && <Link className="button secondary" href={url(f.page+1)}>Next</Link>}</nav></>;
}
