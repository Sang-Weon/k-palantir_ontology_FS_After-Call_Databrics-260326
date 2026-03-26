import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'K-Palantir ACW 자동화 대시보드',
  description: '금융 콜센터 After Call Work 자동화 — 온톨로지 기반',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
