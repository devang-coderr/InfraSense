export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10">
      <div className="eyebrow mb-3">{eyebrow}</div>
      <h1 className="display-xl text-[clamp(24px,3.4vw,36px)] mb-3">{title}</h1>
      {description && (
        <p className="text-[var(--text-secondary)] text-[14.5px] max-w-xl">
          {description}
        </p>
      )}
    </div>
  );
}
