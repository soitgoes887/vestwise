import React from 'react';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 text-left">About Vestwise</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4 text-left">Our Mission</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 text-left">
            Vestwise was created to help UK-based employees understand and optimize their total compensation packages and pension planning.
            We believe that everyone should have access to clear, accurate projections of their salary, bonus, RSU and ESPP investments, as well as their retirement savings.
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-left">
            Equity compensation and pension planning can be complex, especially when dealing with international companies, currency conversions,
            and UK-specific tax regulations. Vestwise simplifies this process by providing intuitive tools and accurate calculations.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4 text-left">What We Offer</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-left">Total Compensation</h3>
              <p className="text-gray-700 dark:text-gray-300 text-left">
                Track your complete package including base salary, bonus, and car allowance alongside your equity compensation.
                See your total compensation grow over time with annual growth projections.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-left">RSU Management</h3>
              <p className="text-gray-700 dark:text-gray-300 text-left">
                Track multiple RSU grants with various vesting schedules. Our calculator handles quarterly, semi-annual,
                and annual vesting periods, as well as cliff vesting scenarios.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-left">ESPP Projections</h3>
              <p className="text-gray-700 dark:text-gray-300 text-left">
                Model your Employee Stock Purchase Plan with customizable contribution amounts, discount rates,
                and purchase periods. See how your ESPP shares accumulate over time.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-left">Pension Planning</h3>
              <p className="text-gray-700 dark:text-gray-300 text-left">
                Project your pension pot growth with employer contributions, tax relief at 20% basic rate, and compound interest.
                Model different contribution percentages and see how your retirement fund grows over time with detailed year-by-year breakdowns.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-left">UK Tax Calculations</h3>
              <p className="text-gray-700 dark:text-gray-300 text-left">
                Built specifically for UK employees, our calculators include Income Tax, National Insurance,
                Capital Gains Tax calculations with annual allowances, and pension tax relief.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-left">Visual Insights</h3>
              <p className="text-gray-700 dark:text-gray-300 text-left">
                Interactive charts and detailed tables help you visualize your compensation and pension growth.
                Understand the potential value of your total package and retirement savings over time.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4 text-left">Key Assumptions</h2>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-left">Total Compensation Calculator</h3>
            <ul className="list-disc list-outside ml-5 space-y-2 text-gray-700 dark:text-gray-300 text-left">
              <li>Base salary, bonus, and car allowance with configurable annual growth rates</li>
              <li>All cash compensation shown after income tax deductions</li>
              <li>Sell-to-cover method for RSU tax withholding at vesting</li>
              <li>Income Tax and National Insurance calculated on RSU value at vesting</li>
              <li>Capital Gains Tax applies to shares based on appreciation from cost basis</li>
              <li>All values in USD or GBP; ESPP contributions in GBP</li>
              <li>Customizable stock growth rates and exchange rates</li>
              <li>Flexible projection timeline with detailed year-by-year breakdown</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-left">Pension Calculator</h3>
            <ul className="list-disc list-outside ml-5 space-y-2 text-gray-700 dark:text-gray-300 text-left">
              <li>Tax relief calculated at 20% basic rate (25% bonus on contributions)</li>
              <li>Compound interest applied monthly using Future Value of Annuity formula</li>
              <li>Current pot value grows alongside new contributions</li>
              <li>Assumes constant contribution amounts in real terms</li>
              <li>Typical pension growth ranges from 4-7% per year after fees</li>
              <li>Returns will vary year to year in practice</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 text-gray-600 dark:text-gray-400">
          <p className="text-sm text-left">
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
