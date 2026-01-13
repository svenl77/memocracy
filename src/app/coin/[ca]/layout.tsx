'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';

export default function CoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const ca = params.ca as string;
  const baseUrl = `/coin/${ca}`;

  const tabs = [
    { name: 'Overview', href: baseUrl, icon: '📊' },
    { name: 'Analytics', href: `${baseUrl}/analytics`, icon: '🛡️' },
  ];

  const isActive = (href: string) => {
    if (href === baseUrl) return pathname === baseUrl;
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl shadow-lg mb-6 p-2 sticky top-4 z-10">
            <div className="flex space-x-2 overflow-x-auto">
              {tabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap
                    ${
                      isActive(tab.href)
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
