import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { motion } from 'framer-motion';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarWidth] = useState(260);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen"
        style={{ marginLeft: sidebarWidth }}
      >
        {children}
      </motion.main>
    </div>
  );
}
