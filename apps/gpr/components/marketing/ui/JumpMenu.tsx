export interface JumpMenuItem {
  href: string;
  label: string;
}

/**
 * Compact in-page anchor menu (country frame 1057:10772): muted "JUMP TO"
 * label + white pills with a 1px #c6c6c6 stroke. Navigation chrome, not
 * copy; pass `label={null}` to hide the label.
 */
export function JumpMenu({
  items,
  ariaLabel = 'On this page',
  label = 'Jump to',
}: {
  items: JumpMenuItem[];
  ariaLabel?: string;
  label?: string | null;
}) {
  if (!items.length) return null;
  return (
    <nav className="mk-jump" aria-label={ariaLabel}>
      {label ? (
        <span className="mk-jump-label" aria-hidden="true">
          {label}
        </span>
      ) : null}
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
