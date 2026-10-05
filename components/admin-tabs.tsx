import Link from 'next/link';

export function AdminTabs({ slug, active }: { slug: string; active: 'applications' | 'investors' }) {
  const tabs = [
    { key: 'applications', label: 'Applications', href: `/w/${slug}/admin` },
    { key: 'investors', label: 'Investors', href: `/w/${slug}/admin/investors` },
  ] as const;

  return (
    <nav className="admin-tabs" aria-label="Admin sections">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={tab.key === active ? 'active' : undefined}
          aria-current={tab.key === active ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
