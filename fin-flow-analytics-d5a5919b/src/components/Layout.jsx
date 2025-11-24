import React, { useState } from 'react';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import ThemeProvider from './theme/ThemeProvider';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar */}
          <div className={`
            fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
          
          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <div className="p-3 sm:p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}