import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { AppDrawer } from '../components/layout/AppDrawer';

type DrawerContextValue = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggle: () => void;
};

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const value = useMemo(
    () => ({ open, openDrawer, closeDrawer, toggle }),
    [open, openDrawer, closeDrawer, toggle]
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <AppDrawer visible={open} onClose={closeDrawer} />
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer must be used within DrawerProvider');
  return ctx;
}
