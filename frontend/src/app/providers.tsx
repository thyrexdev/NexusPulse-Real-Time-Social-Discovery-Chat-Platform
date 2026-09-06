'use client';

import React, { useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';

export function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useChatStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return <>{children}</>;
}
