import React, { useState } from 'react';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-800 dark:to-purple-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            {/* SVG Logo */}
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-md"
            >
              {/* Background circle */}
              <circle cx="20" cy="20" r="18" fill="white" fillOpacity="0.95"/>

              {/* Upward trending arrow/graph representing growth */}
              <path
                d="M 10 28 L 15 22 L 20 18 L 25 12 L 30 8"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Dots on the line */}
              <circle cx="10" cy="28" r="2" fill="#6366f1"/>
              <circle cx="15" cy="22" r="2" fill="#6366f1"/>
              <circle cx="20" cy="18" r="2" fill="#8b5cf6"/>
              <circle cx="25" cy="12" r="2" fill="#8b5cf6"/>
              <circle cx="30" cy="8" r="2.5" fill="#8b5cf6"/>

              {/* Checkmark overlay - representing vesting */}
              <path
                d="M 27 24 L 30 27 L 35 20"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>

            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Vestwise
              </h1>
              <p className="text-xs text-indigo-100 dark:text-indigo-200">Smart Equity Planning</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-8">
            <button
              onClick={() => onNavigate('home')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'home'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('calculator')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'calculator'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              Calculator
            </button>
            <button
              onClick={() => onNavigate('about')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'about'
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-indigo-100 dark:text-indigo-200 hover:text-white'
              }`}
            >
              About
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className={`text-sm font-medium transition-colors ${
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
