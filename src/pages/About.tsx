import React from 'react';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">About Vestwise</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4">Our Mission</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Vestwise was created to help UK-based employees understand and optimize their equity compensation packages.
            We believe that everyone should have access to clear, accurate projections of their RSU and ESPP investments.
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Equity compensation can be complex, especially when dealing with international companies, currency conversions,
            and UK-specific tax regulations. Vestwise simplifies this process by providing intuitive tools and accurate calculations.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4">What We Offer</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">RSU Management</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Track multiple RSU grants with various vesting schedules. Our calculator handles quarterly, semi-annual,
                and annual vesting periods, as well as cliff vesting scenarios.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">ESPP Projections</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Model your Employee Stock Purchase Plan with customizable contribution amounts, discount rates,
                and purchase periods. See how your ESPP shares accumulate over time.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">UK Tax Calculations</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Built specifically for UK employees, our calculator includes Income Tax, National Insurance,
                and Capital Gains Tax calculations with annual allowances.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Visual Insights</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Interactive charts and detailed tables help you visualize your equity growth and understand
                the potential value of your compensation over time.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4">Key Assumptions</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Sell-to-cover method for RSU tax withholding at vesting</li>
            <li>Income Tax and National Insurance calculated on RSU value at vesting</li>
            <li>Capital Gains Tax applies to ESPP shares based on purchase price vs. sale price</li>
            <li>All RSU values in USD; ESPP contributions in GBP</li>
            <li>Customizable stock growth rates and exchange rates</li>
            <li>Flexible projection timeline with configurable years and detailed year-by-year breakdown</li>
          </ul>
        </div>

        <div className="mt-8 text-center text-gray-600 dark:text-gray-400">
          <p className="text-sm">
            <strong>Disclaimer:</strong> Vestwise provides projections for informational purposes only.
            These calculations are estimates and should not be considered financial or tax advice.
            Please consult with a qualified financial advisor or tax professional for personalized guidance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
