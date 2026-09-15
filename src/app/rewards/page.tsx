import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { RewardPurchaseForm } from "@/components/reward-purchase-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function RewardsPage() {
  const actor = await requireRole("student");
  const supabase = await createClient();
  const results = await Promise.all([
    supabase.from("reward_items").select("id,title,description,kind,price,asset_config").eq("enabled", true).is("archived_at", null).order("price"),
    supabase.from("coin_transactions").select("amount,reason,description,created_at,balance_before,balance_after,transaction_status").eq("learner_id", actor.id).order("created_at", { ascending: false }),
    supabase.from("reward_purchases").select("id,reward_id,purchased_at,equipped_at,purchase_status").eq("learner_id", actor.id).eq("purchase_status","completed"),
    supabase.rpc("learner_achievement_summary",{learner_uuid:actor.id}),
    supabase.from("badge_awards").select("id,reason,awarded_at,badge_definitions(title,description)").eq("learner_id",actor.id).order("awarded_at",{ascending:false}),
  ]);
  if(results.some(result=>result.error)) throw new Error("Your rewards could not be loaded. Please try again.");
  const [{data:rewards},{data:transactions},{data:purchases},{data:summary},{data:badges}]=results;
  const achievement=summary?.[0];
  const postedBalance = transactions?.filter(transaction=>transaction.transaction_status!=="reversed").reduce((sum, transaction) => sum + Number(transaction.amount), 0) ?? 0;
  const owned = new Set((purchases ?? []).map(purchase => purchase.reward_id));
  const purchaseByReward=new Map((purchases??[]).map(purchase=>[purchase.reward_id,purchase]));

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href="/study">← Back to my step</Link>
    <h1 className="mt-8 text-3xl font-bold">My rewards</h1>
    <p className="mt-3 leading-7">Every small step counts. Here is what you have earned.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <section className="card"><h2 className="text-lg font-bold">Learning points (XP)</h2><p className="mt-2 text-3xl font-bold">{achievement?.ap_total??0}</p>
        {achievement?.current_level_title&&<p className="mt-2 font-semibold">{achievement.current_level_title}</p>}
        {achievement?.next_level_title&&<p className="mt-2">{achievement.points_to_next} more points to {achievement.next_level_title}.</p>}
        <p className="mt-2 text-sm">Your achievement points include the XP from short lessons. You keep these when you buy a theme.</p>
      </section>
      <section className="card"><h2 className="text-lg font-bold">Coins to spend</h2><p className="mt-2 text-3xl font-bold">{postedBalance}</p><p className="mt-2 text-sm">Coins buy optional themes and other visual rewards. Every 100 XP earns 1 coin automatically. You keep all your XP.</p><p className="mt-2 font-semibold">{100 - (Number(achievement?.ap_total ?? 0) % 100)} XP to your next coin.</p><p className="mt-2 text-sm">For example: 250 XP earns 2 coins, with 50 XP towards the next. Coins you spend are deducted from your balance.</p></section>
    </div>
    <details className="card mt-6"><summary className="cursor-pointer text-lg font-bold">My badges · {badges?.length??0} earned</summary><div className="mt-4 grid gap-3">{badges?.length?badges.map(badge=>{
      const definition=Array.isArray(badge.badge_definitions)?badge.badge_definitions[0]:badge.badge_definitions;
      return <article data-achievement-badge className="rounded-xl border border-purple-200 p-4" key={badge.id}><h2 className="font-bold"><span className="gold-badge-icon" aria-hidden="true">★</span> {definition?.title??"Achievement badge"}</h2><p className="mt-1">{badge.reason||definition?.description}</p><p className="mt-2 text-sm text-slate-600">Earned {new Date(badge.awarded_at).toLocaleDateString("en-GB",{timeZone:"Europe/London"})}</p></article>;
    }):<p>Your earned badges will appear here as you complete your learning steps.</p>}</div></details>

    <details className="card mt-6"><summary className="cursor-pointer text-lg font-bold">Themes and reward shop</summary><p className="mt-2 text-sm text-slate-600">Preview a reward, buy it with coins, or apply one you already own. Rewards do not change assignment marks.</p>{!rewards?.length&&<p className="mt-4">No rewards are available in the shop yet. Your teacher can check which rewards are enabled.</p>}<section className="mt-6 grid gap-5 md:grid-cols-3">{rewards?.map(reward => <article className="card" key={reward.id}>
      <div className="grid size-12 place-items-center rounded-2xl bg-teal-100 text-2xl" aria-hidden="true">{iconFor(reward.kind)}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-teal-700">{reward.kind.replaceAll("_", " ")}</p>
      <h2 className="mt-2 text-xl font-bold">{reward.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{reward.description}</p>
      <RewardPurchaseForm rewardId={reward.id} price={reward.price} owned={owned.has(reward.id)} affordable={postedBalance >= reward.price} purchaseId={purchaseByReward.get(reward.id)?.id} equipped={Boolean(purchaseByReward.get(reward.id)?.equipped_at)} preview={reward.asset_config}/>
    </article>)}</section></details>

    <details className="card mt-6"><summary className="cursor-pointer text-lg font-bold">Show my coin history</summary><p className="mt-2 text-sm text-slate-600">Every award, purchase and refund is recorded by the server.</p><div className="mt-5 grid gap-3">{transactions?.length ? transactions.map((transaction, index) => <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3" key={`${transaction.created_at}-${index}`}><div><p className="font-semibold">{transaction.description}</p><p className="text-sm text-slate-500">{new Date(transaction.created_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})} · {transaction.reason.replaceAll("_", " ")} · {transaction.transaction_status}</p>{transaction.balance_before!=null&&transaction.balance_after!=null&&<p className="mt-1 text-xs text-slate-500">Balance {transaction.balance_before} → {transaction.balance_after}</p>}</div><strong className={transaction.amount > 0 ? "text-teal-700" : "text-slate-700"}>{transaction.amount > 0 ? "+" : ""}{transaction.amount}</strong></div>) : <p className="text-slate-600">Complete learning and practice to earn your first coins.</p>}</div></details>
  </main></>;
}

function iconFor(kind: string) {
  return kind === "profile_theme" ? "◈" : kind === "badge_frame" ? "⬡" : kind === "dashboard_background" ? "▧" : kind === "avatar_item" ? "●" : "✦";
}
