import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { RewardPurchaseForm } from "@/components/reward-purchase-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function RewardsPage() {
  const actor = await requireRole("student");
  const supabase = await createClient();
  const [{ data: rewards }, { data: transactions }, { data: purchases }] = await Promise.all([
    supabase.from("reward_items").select("id,title,description,kind,price,asset_config").eq("enabled", true).is("archived_at", null).order("price"),
    supabase.from("coin_transactions").select("amount,reason,description,created_at,balance_before,balance_after,transaction_status").eq("learner_id", actor.id).order("created_at", { ascending: false }),
    supabase.from("reward_purchases").select("id,reward_id,purchased_at,equipped_at,purchase_status").eq("learner_id", actor.id).eq("purchase_status","completed"),
  ]);
  if (!actor) redirect("/login");
  const postedBalance = transactions?.filter(transaction=>transaction.transaction_status!=="reversed").reduce((sum, transaction) => sum + Number(transaction.amount), 0) ?? 0;
  const owned = new Set((purchases ?? []).map(purchase => purchase.reward_id));
  const purchaseByReward=new Map((purchases??[]).map(purchase=>[purchase.reward_id,purchase]));

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href="/dashboard">← Dashboard</Link>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Cosmetic rewards</p><h1 className="mt-2 text-4xl font-bold">Rewards shop</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Coins can only unlock optional visual customisations. They cannot alter marks, required work, hints, mastery, deadlines, or teacher records.</p></div><div className="rounded-2xl bg-amber-100 px-6 py-4 text-amber-950"><p className="text-sm font-bold">Gold-coin balance</p><p className="text-3xl font-bold">{postedBalance}</p></div></div>

    <section className="mt-8 grid gap-5 md:grid-cols-3">{rewards?.map(reward => <article className="card" key={reward.id}>
      <div className="grid size-12 place-items-center rounded-2xl bg-teal-100 text-2xl" aria-hidden="true">{iconFor(reward.kind)}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-teal-700">{reward.kind.replaceAll("_", " ")}</p>
      <h2 className="mt-2 text-xl font-bold">{reward.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{reward.description}</p>
      <p className="mt-2 break-all text-xs text-slate-400">Active · Item ID {reward.id}</p>
      <RewardPurchaseForm rewardId={reward.id} price={reward.price} owned={owned.has(reward.id)} affordable={postedBalance >= reward.price} purchaseId={purchaseByReward.get(reward.id)?.id} equipped={Boolean(purchaseByReward.get(reward.id)?.equipped_at)} preview={reward.asset_config}/>
    </article>)}</section>

    <section className="card mt-8"><h2 className="text-2xl font-bold">Coin history</h2><p className="mt-2 text-sm text-slate-600">Every award, purchase and refund is recorded by the server with its resulting balance.</p><div className="mt-5 grid gap-3">{transactions?.length ? transactions.map((transaction, index) => <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3" key={`${transaction.created_at}-${index}`}><div><p className="font-semibold">{transaction.description}</p><p className="text-sm text-slate-500">{new Date(transaction.created_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})} · {transaction.reason.replaceAll("_", " ")} · {transaction.transaction_status}</p>{transaction.balance_before!=null&&transaction.balance_after!=null&&<p className="mt-1 text-xs text-slate-500">Balance {transaction.balance_before} → {transaction.balance_after}</p>}</div><strong className={transaction.amount > 0 ? "text-teal-700" : "text-slate-700"}>{transaction.amount > 0 ? "+" : ""}{transaction.amount}</strong></div>) : <p className="text-slate-600">Complete learning and practice to earn your first coins.</p>}</div></section>
  </main></>;
}

function iconFor(kind: string) {
  return kind === "profile_theme" ? "◈" : kind === "badge_frame" ? "⬡" : kind === "dashboard_background" ? "▧" : kind === "avatar_item" ? "●" : "✦";
}
