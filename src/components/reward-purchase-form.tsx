"use client";

import { useActionState, useEffect, useState } from "react";
import { equipReward, purchaseReward, type ActionState } from "@/app/actions/learning";

export function RewardPurchaseForm({
  rewardId,price,owned,affordable,purchaseId,equipped,preview,
}:{
  rewardId:string;price:number;owned:boolean;affordable:boolean;
  purchaseId?:string;equipped?:boolean;preview:unknown;
}){
  const[state,action,pending]=useActionState<ActionState,FormData>(purchaseReward,{});
  const[equipState,equipAction,equipPending]=useActionState<ActionState,FormData>(equipReward,{});
  const[showPreview,setShowPreview]=useState(false);
  const purchaseResult=state.testData&&typeof state.testData==="object"
    ?state.testData as {purchaseId?:string}:undefined;
  const equipResult=equipState.testData&&typeof equipState.testData==="object"
    ?equipState.testData as {kind?:string;equipped?:boolean;assetConfig?:Record<string,unknown>}:undefined;
  useEffect(()=>{
    if(!equipState.ok||!equipResult?.kind)return;
    applyEquippedCosmetic(equipResult.kind,equipResult.equipped===true,equipResult.assetConfig??{});
  },[equipState.ok,equipResult]);
  const currentOwned=owned||Boolean(state.ok);
  const currentPurchaseId=purchaseId??purchaseResult?.purchaseId;
  return <div className="mt-4">
    {showPreview&&<div className="mb-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm"><strong>Preview</strong><pre className="mt-2 whitespace-pre-wrap font-sans">{formatPreview(preview)}</pre></div>}
    <div className="flex flex-wrap gap-2">
      <button className="button-secondary" type="button" onClick={()=>setShowPreview(value=>!value)}>{showPreview?"Close preview":"Preview"}</button>
      {!currentOwned&&<form action={action}><input type="hidden" name="rewardId" value={rewardId}/><button className="button" disabled={pending||!affordable}>{pending?"Purchasing…":affordable?`Buy for ${price} coins`:`Need ${price} coins`}</button></form>}
      {currentOwned&&<span className="button-secondary cursor-default">Owned</span>}
      {currentOwned&&currentPurchaseId&&<form action={equipAction}><input type="hidden" name="purchaseId" value={currentPurchaseId}/><input type="hidden" name="equip" value={equipped?"false":"true"}/><button className="button" disabled={equipPending}>{equipPending?"Saving…":equipped?"Unequip":"Equip"}</button></form>}
      {equipped&&<span className="rounded-full bg-teal-100 px-3 py-2 text-sm font-bold text-teal-900">Equipped</span>}
    </div>
    {state.message&&<p className={`mt-3 text-sm ${state.ok?"text-teal-800":"text-red-700"}`} role="status">{state.message}</p>}
    {equipState.message&&<p className={`mt-3 text-sm ${equipState.ok?"text-teal-800":"text-red-700"}`} role="status">{equipState.message}</p>}
  </div>;
}

function formatPreview(value:unknown){
  return value&&typeof value==="object"
    ?Object.entries(value as Record<string,unknown>).map(([key,item])=>`${key.replaceAll("_"," ")}: ${String(item)}`).join("\n")
    :"Visual customisation preview";
}
function applyEquippedCosmetic(kind:string,equipped:boolean,config:Record<string,unknown>){
  const body=document.body;
  if(kind==="profile_theme"||kind==="dashboard_background"){
    if(equipped)body.dataset.theme=String(config.theme??config.background??"");
    else delete body.dataset.theme;
  }
  if(kind==="badge_frame"){
    if(equipped)body.dataset.badgeFrame=String(config.frame??"");
    else delete body.dataset.badgeFrame;
  }
  if(kind==="celebration_effect"){
    if(equipped)body.dataset.celebrationEffect=String(config.effect??"");
    else delete body.dataset.celebrationEffect;
  }
}
