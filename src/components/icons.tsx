export function Mark({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span aria-hidden="true" className={`brand-mark grid size-10 place-items-center rounded-xl text-lg font-bold text-white ${className}`}>{children}</span>;
}
