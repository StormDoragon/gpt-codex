import Link from 'next/link';
import type { MemberRole } from '../lib/db/schema';

type Tab = 'applications' | 'investors' | 'settings';

export function AdminTabs({ slug, active, role }: { slug: string; active: Tab; role: MemberRole }) {
  const tabs: { key: Tab; label: string; href: string }[] = [
    { key: 'applications', label: 'Applications', href: `/w/${slug}/admin` },
    { key: 'investors', label: 'Investors', href: `/w/${slug}/admin/investors` },
  ];
  // Settings (export, deletion) belongs to the owner alone.
  if (role === 'owner') tabs.push({ key: 'settings', label: 'Settings', href: `/w/${slug}/admin/settings` });

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
