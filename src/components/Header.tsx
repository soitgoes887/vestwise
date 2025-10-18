import React from 'react';
import logo from '../vestwise-logo-icon-v3.svg';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-800 dark:to-purple-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 md:py-4">
          {/* Logo and Brand */}
          <div
            className="flex items-center space-x-2 md:space-x-3 cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            {/* Logo Icon */}
            <img
              src={logo}
              alt="Vestwise"
              className="w-8 h-8 md:w-10 md:h-10 drop-shadow-md"
            />

            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Vestwise
              </h1>
              <p className="text-xs text-indigo-100 dark:text-indigo-200 hidden sm:block">Smart Equity Planning</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap justify-end gap-2 sm:gap-3 md:gap-0 md:space-x-8">
            <button
              onClick={() => onNavigate('home')}
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                currentPage === 'home'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('calculator')}
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                currentPage === 'calculator'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              Calculator
            </button>
            <button
              onClick={() => onNavigate('about')}
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                currentPage === 'about'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              About
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                currentPage === 'contact'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              Contact
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
