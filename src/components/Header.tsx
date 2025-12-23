import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../vestwise-logo-icon-v3.svg';

const Header: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-800 dark:to-purple-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 md:py-4">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-2 md:space-x-3">
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
              <p className="text-xs text-indigo-100 dark:text-indigo-200 hidden sm:block">Smart Financial Planning</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-wrap justify-end gap-2 sm:gap-3 md:gap-0 md:space-x-8">
            <Link
              to="/"
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                currentPath === '/'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              to="/rsu"
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                currentPath === '/rsu'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              RSU/ESPP
            </Link>
            <Link
              to="/pension"
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                currentPath === '/pension'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              Pension
            </Link>
            <Link
              to="/about"
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                currentPath === '/about'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              About
            </Link>
            <Link
              to="/contact"
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                currentPath === '/contact'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
