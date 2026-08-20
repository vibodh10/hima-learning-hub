import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Hima Learning Hub", template: "%s · Hima Learning Hub" },
  description: "Purposeful learning practice and progress for Level 3 Computing and Digital.",
  applicationName: "Hima Learning Hub",
  manifest: "/manifest.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile=await getSessionProfile();
  let theme:string|undefined;
  let badgeFrame:string|undefined;
  let celebrationEffect:string|undefined;
  if(profile?.role==="student"){
    const supabase=await createClient();
    const{data}=await supabase.from("reward_purchases")
      .select("equipped_at,reward_items(kind,asset_config)")
      .eq("learner_id",profile.id).eq("purchase_status","completed")
      .not("equipped_at","is",null);
    for(const purchase of data??[]){
      const item=related(purchase.reward_items);
      const config=asRecord(item?.asset_config);
      if(item?.kind==="profile_theme"||item?.kind==="dashboard_background")theme=String(config.theme??config.background??"");
      if(item?.kind==="badge_frame")badgeFrame=String(config.frame??"");
      if(item?.kind==="celebration_effect")celebrationEffect=String(config.effect??"");
    }
  }
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col" data-theme={theme||undefined} data-badge-frame={badgeFrame||undefined} data-celebration-effect={celebrationEffect||undefined}>{children}<ServiceWorkerRegistration /></body>
    </html>
  );
}

function related<T>(value:T|T[]|null|undefined):T|undefined{return Array.isArray(value)?value[0]:value??undefined}
function asRecord(value:unknown):Record<string,unknown>{return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{}}
