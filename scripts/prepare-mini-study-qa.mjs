// Explicitly authorised isolated QA accounts. Never invite/email or alter real users.
// Credentials go only to the invoking test harness, never to a repository file.
import {randomBytes} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
if(process.env.MINI_STUDY_QA_APPROVED!=="yes")throw new Error("Explicit QA authorisation is required.");
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const run="mini-study-20260908";
const organisations=await admin.from("organisations").select("id").is("archived_at",null);
if(organisations.error||organisations.data?.length!==1)throw new Error("Expected one active college organisation; choose scope explicitly before continuing.");
const organisationId=organisations.data[0].id;
const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
if(listed.error)throw listed.error;
const results=[];
for(const role of ["teacher","student"]){
 const email=`mini-qa-${role}-20260908@example.invalid`;
 const password=`Qa-${randomBytes(24).toString("base64url")}!`;
 const existing=listed.data.users.find(u=>u.email===email);
 if(existing&&existing.app_metadata?.qa_run!==run)throw new Error("Refusing to change an account without this QA marker.");
 const result=existing?await admin.auth.admin.updateUserById(existing.id,{password}):await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{qa_run:run},user_metadata:{display_name:`QA ONLY Mini ${role}`,qa_run:run}});
 if(result.error||!result.data.user)throw result.error??new Error("Test account creation failed.");
 const id=result.data.user.id;
 const profile=await admin.from("user_profiles").upsert({id,organisation_id:organisationId,role,display_name:`QA ONLY Mini ${role}`,archived_at:null},{onConflict:"id"});
 if(profile.error)throw profile.error;
 results.push({id,email,password,role});
}
console.log(JSON.stringify({run,organisationId,accounts:results}));
