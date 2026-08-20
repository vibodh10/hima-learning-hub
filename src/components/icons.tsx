export function Mark({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span aria-hidden="true" className={`grid size-10 place-items-center rounded-xl bg-teal-700 text-lg font-bold text-white ${className}`}>{children}</span>;
}
