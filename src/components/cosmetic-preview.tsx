export function OceanScene({ backdrop = false }: { backdrop?: boolean }) {
  return <div className={`ocean-scene${backdrop ? " ocean-backdrop" : ""}`} aria-hidden="true">
    <span className="ocean-fish fish-one">🐠</span><span className="ocean-fish fish-two">🐟</span>
    <span className="ocean-fish fish-three">🐠</span><span className="ocean-fish fish-four">🐟</span>
    <span className="ocean-bubbles">○ ˚ ○<br/> ˚ ○<br/>○ ˚</span>
    <span className="ocean-reef">〰 〰 〰</span>
  </div>;
}

export function CosmeticPreview({ value }: { value: unknown }) {
  const config = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (config.theme === "ocean" || config.background === "ocean") return <div className="reward-preview" role="img" aria-label="Ocean theme preview: fish, bubbles and underwater light">
    <OceanScene/><div className="preview-reading-card"><strong>Your next small step</strong><p>Take your time. You are making progress.</p></div>
  </div>;
  if (config.frame) return <div className="reward-preview python-preview" role="img" aria-label="Python badge preview: a cute snake and playful code characters"><span className="python-code code-one" aria-hidden="true">{'{◕‿◕}'}</span><span className="python-code code-two" aria-hidden="true">{'print("hi!")'}</span><span className="python-code code-three" aria-hidden="true">{'[ʘ‿ʘ]'}</span><span className="preview-badge"><span className="gold-badge-icon" aria-hidden="true">★</span><br/>Your achievement</span></div>;
  if (config.effect === "confetti") return <div className="reward-preview grid place-items-center bg-purple-50"><div className="text-center"><div className="text-3xl" aria-hidden="true">🎉 ✦ 🎊 ✧</div><strong>Step complete!</strong><p>A little celebration of your progress.</p></div></div>;
  return <p className="my-3 text-sm">A visual preview is not available for this reward yet.</p>;
}
