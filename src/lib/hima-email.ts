import "server-only";

function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]??char));}

export function safeEmailText(value:string){return escapeHtml(value);}

/**
 * Email is an extra delivery channel. The in-app badge/intervention is always
 * recorded first, so a missing mail provider can never lose the safeguarding
 * evidence or make attendance depend on email delivery.
 */
export async function sendHimaEmail(to:string,subject:string,html:string):Promise<boolean>{
  const key=process.env.RESEND_API_KEY;
  const from=process.env.HIMA_EMAIL_FROM;
  if(!key||!from||!to)return false;
  try{
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({from,to:[to],subject,html}),
      cache:"no-store",
    });
    return response.ok;
  }catch{return false;}
}
