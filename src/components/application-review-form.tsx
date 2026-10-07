"use client";
import {useActionState,useState} from "react";
import {reviewApplication,type ReviewState} from "@/app/admin/review-actions";
export function ApplicationReviewForm({id,version,status,admin,noteKey}:{id:string;version:number;status:string;admin:boolean;noteKey:string}) {
 const [state,action,pending]=useActionState<ReviewState,FormData>(reviewApplication,{message:""});
 const [body,setBody]=useState(state.body??"");
 const [lastResult,setLastResult]=useState(state);
 if(state!==lastResult){setLastResult(state);if(state.success)setBody("");}
 return <form action={action} className="panel"><h2>Officer review</h2><input type="hidden" name="id" value={id}/><input type="hidden" name="version" value={version}/><input type="hidden" name="key" value={noteKey}/><label className="field">Private note / reason *<textarea name="body" value={body} onChange={e=>setBody(e.target.value)} required maxLength={5000} disabled={pending}/></label><div className="actions"><button className="button" name="intent" value="note" disabled={pending}>Add private note</button>{status==="pending_review" && <><button className="button secondary" name="intent" value="closed" disabled={pending}>Close application</button><button className="button secondary" name="intent" value="withdrawn" disabled={pending}>Record withdrawal</button></>}{admin && ["closed","withdrawn"].includes(status) && <button className="button secondary" name="intent" value="pending_review" disabled={pending}>Reopen for review</button>}</div><p className="muted">Every status change requires a reason. Scheduling and tryout results use separate workflows.</p>{state.message && <p className="form-message" role="status">{state.message}</p>}</form>;
}
