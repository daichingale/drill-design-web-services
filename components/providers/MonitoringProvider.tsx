// components/providers/MonitoringProvider.tsx
"use client";

import { useEffect } from "react";
import { setupErrorTracking } from "@/lib/monitoring/errorTracking";
import { setupPerformanceMonitoring } from "@/lib/monitoring/performanceMetrics";

export default function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupErrorTracking();
    setupPerformanceMonitoring();
  }, []);

  return <>{children}</>;
}

