export interface JumpMenuItem {
  href: string;
  label: string;
}

/** Compact in-page anchor menu (navigation component, not copy). */
export function JumpMenu({
  items,
  ariaLabel = 'On this page',
}: {
  items: JumpMenuItem[];
  ariaLabel?: string;
}) {
  if (!items.length) return null;
  return (
    <nav className="mk-jump" aria-label={ariaLabel}>
      <ul>
        {items.map((it) => (
          <li key={it.href}>
            <a href={it.href}>{it.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
