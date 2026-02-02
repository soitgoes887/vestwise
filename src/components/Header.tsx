import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../vestwise-logo-icon-v3.svg';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
    navigate('/');
  };

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
          <nav className="flex flex-wrap justify-end items-center gap-2 sm:gap-3 md:gap-0 md:space-x-8">
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
              Total Comp
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

            {/* Auth Section */}
            {user ? (
              <div className="relative ml-4">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white bg-indigo-700 dark:bg-indigo-900 px-3 py-1.5 rounded-full hover:bg-indigo-800 transition-colors"
                >
                  <span className="hidden sm:inline max-w-[120px] truncate">{user.email}</span>
                  <span className="sm:hidden">Account</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Signed in as</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-4 text-xs sm:text-sm font-medium text-white bg-indigo-700 dark:bg-indigo-900 px-4 py-1.5 rounded-full hover:bg-indigo-800 transition-colors"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
