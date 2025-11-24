import React from 'react';
import ThemeToggle from '../ui/ThemeToggle';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-4 border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm px-3 sm:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open sidebar</span>
      </Button>
      
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 truncate">
          SME Finance & Economics Suite
        </h1>
      </div>
      
      <ThemeToggle />
    </header>
  );
}