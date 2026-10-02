export function SkipLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="skip-link" href={href}>
      {children}
    </a>
  );
}
