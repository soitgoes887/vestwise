import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PensionCalculator = () => {
  const [yourContribution, setYourContribution] = useState(639.88);
  const [employerContribution, setEmployerContribution] = useState(810.93);
  const [taxRelief] = useState(159.97);
  const [currentAge] = useState(37);
  const [retirementAge] = useState(65);
  const [annualReturn, setAnnualReturn] = useState(5);

  const monthlyContribution = yourContribution + employerContribution + taxRelief;

  const years = retirementAge - currentAge;
  const months = years * 12;
  const monthlyRate = annualReturn / 100 / 12;

  // Future Value of Annuity formula: FV = PMT × [(1 + r)^n - 1] / r
  const futureValue = monthlyContribution * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;

  // Calculate year-by-year breakdown
  const yearlyData = [];
  for (let year = 0; year <= years; year++) {
    const monthsElapsed = year * 12;
    const value = monthsElapsed === 0 ? 0 :
      monthlyContribution * (Math.pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate;

    const totalContributed = monthlyContribution * monthsElapsed;
    const growthAmount = value - totalContributed;

    yearlyData.push({
      year: currentAge + year,
      value: Math.round(value),
      contributed: Math.round(totalContributed),
      growth: Math.round(growthAmount)
    });
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold mb-6">How Your £2 Million Pension Grows</h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h2 className="font-bold text-lg mb-2">The Formula</h2>
        <p className="mb-2">We use the <strong>Future Value of Annuity</strong> formula:</p>
        <div className="bg-white p-3 rounded font-mono text-sm">
          FV = PMT × [(1 + r)^n - 1] / r
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          <li><strong>FV</strong> = Future Value (what you'll have)</li>
          <li><strong>PMT</strong> = Monthly payment (£{monthlyContribution.toFixed(2)})</li>
          <li><strong>r</strong> = Monthly interest rate ({annualReturn}% ÷ 12 = {(monthlyRate * 100).toFixed(3)}%)</li>
          <li><strong>n</strong> = Number of months ({months} months)</li>
        </ul>
      </div>

      <div className="mb-6">
        <div className="mb-4">
          <label className="block font-semibold mb-2">
            Your Monthly Contribution: £{yourContribution.toFixed(2)}
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            step="10"
            value={yourContribution}
            onChange={(e) => setYourContribution(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-2">
            Employer Monthly Contribution: £{employerContribution.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="2000"
            step="10"
            value={employerContribution}
            onChange={(e) => setEmployerContribution(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mb-4 bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Tax Relief (20%): £{taxRelief.toFixed(2)}</div>
          <div className="text-lg font-bold mt-1">
            Total Monthly Contribution: £{monthlyContribution.toFixed(2)}
          </div>
        </div>

        <label className="block font-semibold mb-2">
          Assumed Annual Investment Return: {annualReturn}%
        </label>
        <input
          type="range"
          min="3"
          max="8"
          step="0.5"
          value={annualReturn}
          onChange={(e) => setAnnualReturn(parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-sm text-gray-600 mt-1">
          Typical pension growth ranges from 4-7% per year after fees
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded">
          <div className="text-sm text-gray-600">Final Pot Value</div>
          <div className="text-2xl font-bold text-green-700">
            £{Math.round(futureValue).toLocaleString()}
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded">
          <div className="text-sm text-gray-600">You Contributed</div>
          <div className="text-2xl font-bold text-blue-700">
            £{Math.round(monthlyContribution * months).toLocaleString()}
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <div className="text-sm text-gray-600">Investment Growth</div>
          <div className="text-2xl font-bold text-purple-700">
            £{Math.round(futureValue - (monthlyContribution * months)).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3">Growth Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={yearlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `£${(value/1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value) => `£${value.toLocaleString()}`}
              labelFormatter={(label) => `Age ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="contributed" stroke="#3b82f6" name="Total Contributed" />
            <Line type="monotone" dataKey="value" stroke="#10b981" name="Total Value" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-gray-50 p-4 rounded">
        <h3 className="font-bold mb-3">Key Milestones</h3>
        <div className="space-y-2 text-sm">
          {[5, 10, 15, 20, 28].map(yr => {
            const data = yearlyData[yr];
            return (
              <div key={yr} className="flex justify-between border-b pb-2">
                <span className="font-semibold">Age {data.year} ({yr} years):</span>
                <span>£{data.value.toLocaleString()}
                  <span className="text-gray-600 ml-2">
                    (contributed £{data.contributed.toLocaleString()})
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <h3 className="font-bold mb-2">Important Notes:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>This assumes {annualReturn}% average annual return (adjustable above)</li>
          <li>Returns will vary year to year - some years up, some down</li>
          <li>Fees and charges will reduce the actual growth slightly</li>
          <li>This calculation assumes contributions stay constant in real terms</li>
          <li>The power of compound interest means most growth happens in the later years</li>
        </ul>
      </div>
    </div>
  );
};

export default PensionCalculator;
