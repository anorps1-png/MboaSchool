import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { EtablissementProvider } from '@/contexts/etablissement-context';

export default function DashboardRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EtablissementProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </EtablissementProvider>
  );
}
