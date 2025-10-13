import React from 'react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-indigo-600">Vestwise</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Make informed decisions about your equity compensation.
            Project your RSU and ESPP growth with UK tax calculations.
          </p>
          <button
            onClick={() => onNavigate('calculator')}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
          >
            Start Planning Now →
          </button>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-indigo-600">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-xl font-semibold mb-2">RSU Tracking</h3>
            <p className="text-gray-600">
              Add multiple RSU grants with flexible vesting schedules. Track your equity growth over time.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-purple-600">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-xl font-semibold mb-2">ESPP Planning</h3>
            <p className="text-gray-600">
              Configure your Employee Stock Purchase Plan with discounts and contribution growth.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-600">
            <div className="text-3xl mb-3">🇬🇧</div>
            <h3 className="text-xl font-semibold mb-2">UK Tax Optimized</h3>
            <p className="text-gray-600">
              Built specifically for UK employees with Income Tax, NI, and Capital Gains Tax calculations.
            </p>
          </div>
        </div>

        {/* Why Vestwise Section */}
        <div className="bg-indigo-600 text-white rounded-lg p-12 mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">Why Vestwise?</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="flex items-start">
              <span className="text-2xl mr-3">✓</span>
              <div>
                <h4 className="font-semibold mb-1">Multi-Year Projections</h4>
                <p className="text-indigo-100">See your equity compensation growth with detailed yearly breakdowns</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">✓</span>
              <div>
                <h4 className="font-semibold mb-1">Sell-to-Cover Strategy</h4>
                <p className="text-indigo-100">Automatic tax withholding calculations using sell-to-cover method</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">✓</span>
              <div>
                <h4 className="font-semibold mb-1">Visual Charts</h4>
                <p className="text-indigo-100">Interactive charts to visualize your equity growth over time</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">✓</span>
              <div>
                <h4 className="font-semibold mb-1">Currency Conversion</h4>
                <p className="text-indigo-100">Toggle between USD and GBP with customizable exchange rates</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
          <p className="text-lg text-gray-600 mb-6">
            Start projecting your equity compensation in minutes
          </p>
          <button
            onClick={() => onNavigate('calculator')}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
          >
            Open Calculator
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
