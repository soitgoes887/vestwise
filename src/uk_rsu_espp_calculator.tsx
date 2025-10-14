import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const RSUESPPCalculator = () => {
  // Format large numbers to k/M format (e.g., 100000 -> 100k)
  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  interface RSUGrant {
    id: string;
    grantDate: string;
    vestStartDate: string;
    totalShares: number;
    grantPrice: number;
    vestingSchedule: string;
  }

  const [params, setParams] = useState({
    currentStockPrice: 250,
    annualStockGrowth: 10,
    incomeTaxRate: 45,
    niRate: 2,
    usdToGbp: 1.3,
    cgtRate: 24,
    cgtAllowance: 3000,
    projectionYears: 7
  });

  const [showGbp, setShowGbp] = useState(false);
  const [rsuGrants, setRsuGrants] = useState<RSUGrant[]>([]);
  const [showAddGrant, setShowAddGrant] = useState(false);
  const [newGrant, setNewGrant] = useState({
    grantDate: '',
    vestStartDate: '',
    totalShares: '',
    grantPrice: '',
    vestingSchedule: '4y-6m' // default: 4 years, every 6 months
  });

  const [esppConfig, setEsppConfig] = useState({
    enabled: false,
    monthlyContribution: 1000,
    contributionGrowth: 5,
    discount: 15,
    purchasePeriod: 6 // months
  });
  const [showConfigureEspp, setShowConfigureEspp] = useState(false);
  const [tempEsppConfig, setTempEsppConfig] = useState({
    monthlyContribution: '1000',
    contributionGrowth: '5',
    discount: '15',
    purchasePeriod: '6'
  });

  const handleAddGrant = () => {
    if (newGrant.grantDate && newGrant.vestStartDate && newGrant.totalShares && newGrant.grantPrice) {
      setRsuGrants([...rsuGrants, {
        id: Date.now().toString(),
        grantDate: newGrant.grantDate,
        vestStartDate: newGrant.vestStartDate,
        totalShares: Number(newGrant.totalShares),
        grantPrice: Number(newGrant.grantPrice),
        vestingSchedule: newGrant.vestingSchedule
      }]);
      setNewGrant({ grantDate: '', vestStartDate: '', totalShares: '', grantPrice: '', vestingSchedule: '4y-6m' });
      setShowAddGrant(false);
    }
  };

  const handleRemoveGrant = (id: string) => {
    setRsuGrants(rsuGrants.filter(grant => grant.id !== id));
  };

  const handleSaveEsppConfig = () => {
    setEsppConfig({
      enabled: true,
      monthlyContribution: Number(tempEsppConfig.monthlyContribution),
      contributionGrowth: Number(tempEsppConfig.contributionGrowth),
      discount: Number(tempEsppConfig.discount),
      purchasePeriod: Number(tempEsppConfig.purchasePeriod)
    });
    setShowConfigureEspp(false);
  };

  const handleDisableEspp = () => {
    setEsppConfig({
      ...esppConfig,
      enabled: false
    });
  };

  const getVestingScheduleDetails = (schedule: string) => {
    // Returns { periods, intervalMonths }
    switch(schedule) {
      case '1y-cliff':
        return { periods: 1, intervalMonths: 12 };
      case '4y-3m':
        return { periods: 16, intervalMonths: 3 };
      case '4y-6m':
        return { periods: 8, intervalMonths: 6 };
      case '4y-annual':
        return { periods: 4, intervalMonths: 12 };
      case '3y-6m':
        return { periods: 6, intervalMonths: 6 };
      default:
        return { periods: 8, intervalMonths: 6 };
    }
  };

  const getVestingScheduleLabel = (schedule: string) => {
    switch(schedule) {
      case '1y-cliff':
        return '1 Year Cliff (100% after 1 year)';
      case '4y-3m':
        return '4 Years Quarterly (16 periods)';
      case '4y-6m':
        return '4 Years Semi-Annual (8 periods)';
      case '4y-annual':
        return '4 Years Annual (4 periods)';
      case '3y-6m':
        return '3 Years Semi-Annual (6 periods)';
      default:
        return schedule;
    }
  };

  const calculations = useMemo(() => {
    const years = Array.from({ length: params.projectionYears }, (_, i) => i + 1);

    interface ResultData {
      year: number;
      rsuShares: number;
      esppShares: number;
      totalShares: number;
      rsuValue: number;
      esppValue: number;
      totalValue: number;
      rsuValueGbp: number;
      esppValueGbp: number;
      totalValueGbp: number;
      capitalGainGbp: number;
      cgtTax: number;
      netProceedsAfterCgt: number;
      stockPrice: number;
      esppInvested: number;
      totalTaxesPaid: number;
    }

    const results: ResultData[] = [];

    interface VestingEntry {
      date: Date;
      shares: number;
      grant: string;
    }

    const vestingSchedule: VestingEntry[] = [];

    // Add vesting schedules for user-defined RSU grants
    rsuGrants.forEach((grant) => {
      const vestStart = new Date(grant.vestStartDate);
      const { periods, intervalMonths } = getVestingScheduleDetails(grant.vestingSchedule);

      for (let i = 0; i < periods; i++) {
        const vestDate = new Date(vestStart);
        vestDate.setMonth(vestDate.getMonth() + i * intervalMonths);
        vestingSchedule.push({
          date: vestDate,
          shares: Math.floor(grant.totalShares / periods),
          grant: `grant_${grant.id}`
        });
      }
    });

    years.forEach(year => {
      const targetDate = new Date('2025-10-13');
      targetDate.setFullYear(targetDate.getFullYear() + year);
      
      let rsuSharesVested = 0;
      let totalTaxesPaid = 0;
      
      vestingSchedule.forEach(vest => {
        if (vest.date <= targetDate) {
          const monthsSinceNow = (vest.date.getTime() - new Date('2025-10-13').getTime()) / (1000 * 60 * 60 * 24 * 30);
          const stockPriceAtVest = params.currentStockPrice * Math.pow(1 + params.annualStockGrowth / 100, monthsSinceNow / 12);
          
          const grossValue = vest.shares * stockPriceAtVest;
          const incomeTax = grossValue * (params.incomeTaxRate / 100);
          const ni = grossValue * (params.niRate / 100);
          const totalTax = incomeTax + ni;
          
          const sharesToSell = Math.ceil(totalTax / stockPriceAtVest);
          const netShares = vest.shares - sharesToSell;
          
          rsuSharesVested += netShares;
          totalTaxesPaid += totalTax;
        }
      });
      
      let esppShares = 0;
      let esppInvested = 0;

      if (esppConfig.enabled) {
        const monthsInYear = year * 12;
        const purchasePeriods = Math.floor(monthsInYear / esppConfig.purchasePeriod);

        for (let period = 1; period <= purchasePeriods; period++) {
          const periodEndMonth = period * esppConfig.purchasePeriod;
          const periodStartMonth = (period - 1) * esppConfig.purchasePeriod;

          let periodContribution = 0;
          for (let month = periodStartMonth; month < periodEndMonth; month++) {
            const yearFraction = month / 12;
            const monthlyContribution = esppConfig.monthlyContribution * Math.pow(1 + esppConfig.contributionGrowth / 100, yearFraction);
            periodContribution += monthlyContribution;
          }

          const stockPriceAtPeriodStart = params.currentStockPrice * Math.pow(1 + params.annualStockGrowth / 100, periodStartMonth / 12);
          const stockPriceAtPeriodEnd = params.currentStockPrice * Math.pow(1 + params.annualStockGrowth / 100, periodEndMonth / 12);

          const purchasePrice = Math.min(stockPriceAtPeriodStart, stockPriceAtPeriodEnd) * (1 - esppConfig.discount / 100);
          const sharesPurchased = periodContribution / purchasePrice;

          esppShares += sharesPurchased;
          esppInvested += periodContribution;
        }
      }
      
      const currentStockPrice = params.currentStockPrice * Math.pow(1 + params.annualStockGrowth / 100, year);
      const totalShares = rsuSharesVested + esppShares;
      const totalValue = totalShares * currentStockPrice;
      const rsuValue = rsuSharesVested * currentStockPrice;
      const esppValue = esppShares * currentStockPrice;
      
      // Calculate capital gains if selling all shares
      // RSUs: cost basis is the value at vesting (already taxed as income, so no gain on RSUs)
      // ESPP: cost basis is the purchase price (includes discount)
      const esppCostBasis = esppInvested / params.usdToGbp; // Convert GBP to USD
      const capitalGain = Math.max(0, esppValue - esppCostBasis);
      const capitalGainGbp = capitalGain / params.usdToGbp;
      const taxableGain = Math.max(0, capitalGainGbp - params.cgtAllowance);
      const cgtTax = taxableGain * (params.cgtRate / 100);
      const netProceedsAfterCgt = (totalValue / params.usdToGbp) - cgtTax;
      
      results.push({
        year,
        rsuShares: Math.round(rsuSharesVested),
        esppShares: Math.round(esppShares),
        totalShares: Math.round(totalShares),
        rsuValue: Math.round(rsuValue),
        esppValue: Math.round(esppValue),
        totalValue: Math.round(totalValue),
        rsuValueGbp: Math.round(rsuValue / params.usdToGbp),
        esppValueGbp: Math.round(esppValue / params.usdToGbp),
        totalValueGbp: Math.round(totalValue / params.usdToGbp),
        capitalGainGbp: Math.round(capitalGainGbp),
        cgtTax: Math.round(cgtTax),
        netProceedsAfterCgt: Math.round(netProceedsAfterCgt),
        stockPrice: Math.round(currentStockPrice * 100) / 100,
        esppInvested: Math.round(esppInvested),
        totalTaxesPaid: Math.round(totalTaxesPaid)
      });
    });
    
    return results;
  }, [params, rsuGrants, esppConfig]);

  return (
    <div className="w-full p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">RSU & ESPP Calculator</h1>

      <div className="flex gap-6">
        {/* Left side - Input panels */}
        <div className="w-96 flex-shrink-0 space-y-6">
          <div className="bg-indigo-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-indigo-200 dark:border-indigo-600">
            <h2 className="text-xl font-semibold text-indigo-900 dark:text-white mb-3">RSU Grants</h2>

            {rsuGrants.length > 0 && (
              <div className="space-y-2 mb-3">
                {rsuGrants.map((grant) => (
                  <div key={grant.id} className="bg-white dark:bg-gray-700 p-3 rounded border border-indigo-200 dark:border-indigo-600">
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <div><strong>Shares:</strong> {grant.totalShares}</div>
                        <div><strong>Grant Price:</strong> ${grant.grantPrice}</div>
                        <div><strong>Grant Date:</strong> {grant.grantDate}</div>
                        <div><strong>Vest Start:</strong> {grant.vestStartDate}</div>
                        <div><strong>Schedule:</strong> {getVestingScheduleLabel(grant.vestingSchedule)}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveGrant(grant.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xl font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAddGrant(!showAddGrant)}
              className="w-full px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
            >
              {showAddGrant ? 'Cancel' : '+ Add RSU Grant'}
            </button>

            {showAddGrant && (
              <div className="mt-4 space-y-3 bg-white dark:bg-gray-700 p-3 rounded border border-indigo-300 dark:border-indigo-600">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Grant Date</label>
                  <input
                    type="date"
                    value={newGrant.grantDate}
                    onChange={(e) => setNewGrant({...newGrant, grantDate: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Vest Start Date</label>
                  <input
                    type="date"
                    value={newGrant.vestStartDate}
                    onChange={(e) => setNewGrant({...newGrant, vestStartDate: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Total Shares</label>
                  <input
                    type="number"
                    value={newGrant.totalShares}
                    onChange={(e) => setNewGrant({...newGrant, totalShares: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 1703"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Share Price at Grant Date ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newGrant.grantPrice}
                    onChange={(e) => setNewGrant({...newGrant, grantPrice: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 250"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Vesting Schedule</label>
                  <select
                    value={newGrant.vestingSchedule}
                    onChange={(e) => setNewGrant({...newGrant, vestingSchedule: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  >
                    <option value="1y-cliff">1 Year Cliff (100% after 1 year)</option>
                    <option value="4y-3m">4 Years Quarterly (16 periods)</option>
                    <option value="4y-6m">4 Years Semi-Annual (8 periods)</option>
                    <option value="4y-annual">4 Years Annual (4 periods)</option>
                    <option value="3y-6m">3 Years Semi-Annual (6 periods)</option>
                  </select>
                </div>
                <button
                  onClick={handleAddGrant}
                  className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                >
                  Save Grant
                </button>
              </div>
            )}
          </div>

          <div className="bg-green-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-green-200 dark:border-green-600">
            <h2 className="text-xl font-semibold text-green-900 dark:text-white mb-3">ESPP Configuration</h2>

            {esppConfig.enabled && (
              <div className="mb-3 bg-white dark:bg-gray-700 p-3 rounded border border-green-200 dark:border-green-600">
                <div className="flex justify-between items-start">
                  <div className="text-sm text-gray-900 dark:text-white">
                    <div><strong>Monthly:</strong> £{esppConfig.monthlyContribution}</div>
                    <div><strong>Growth:</strong> {esppConfig.contributionGrowth}%</div>
                    <div><strong>Discount:</strong> {esppConfig.discount}%</div>
                    <div><strong>Period:</strong> {esppConfig.purchasePeriod} months</div>
                  </div>
                  <button
                    onClick={handleDisableEspp}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowConfigureEspp(!showConfigureEspp)}
              className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              {showConfigureEspp ? 'Cancel' : esppConfig.enabled ? 'Edit ESPP' : '+ Configure ESPP'}
            </button>

            {showConfigureEspp && (
              <div className="mt-4 space-y-3 bg-white dark:bg-gray-700 p-3 rounded border border-green-300 dark:border-green-600">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Monthly Contribution (£)</label>
                  <input
                    type="number"
                    value={tempEsppConfig.monthlyContribution}
                    onChange={(e) => setTempEsppConfig({...tempEsppConfig, monthlyContribution: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Annual Contribution Growth (%)</label>
                  <input
                    type="number"
                    value={tempEsppConfig.contributionGrowth}
                    onChange={(e) => setTempEsppConfig({...tempEsppConfig, contributionGrowth: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">ESPP Discount (%)</label>
                  <input
                    type="number"
                    value={tempEsppConfig.discount}
                    onChange={(e) => setTempEsppConfig({...tempEsppConfig, discount: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Purchase Period</label>
                  <select
                    value={tempEsppConfig.purchasePeriod}
                    onChange={(e) => setTempEsppConfig({...tempEsppConfig, purchasePeriod: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  >
                    <option value="3">Quarterly (3 months)</option>
                    <option value="6">Semi-Annual (6 months)</option>
                    <option value="12">Annual (12 months)</option>
                  </select>
                </div>
                <button
                  onClick={handleSaveEsppConfig}
                  className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-white">Stock Parameters</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Projection Years</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={params.projectionYears}
                  onChange={(e) => setParams({...params, projectionYears: Number(e.target.value)})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Current Stock Price ($)</label>
                <input
                  type="number"
                  value={params.currentStockPrice}
                  onChange={(e) => setParams({...params, currentStockPrice: Number(e.target.value)})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Annual Stock Growth (%)</label>
                <input
                  type="number"
                  value={params.annualStockGrowth}
                  onChange={(e) => setParams({...params, annualStockGrowth: Number(e.target.value)})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-600">
            <h2 className="text-xl font-semibold text-purple-900 dark:text-white mb-3">Currency Display</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">USD to GBP Rate:</label>
                <input
                  type="number"
                  step="0.01"
                  value={params.usdToGbp}
                  onChange={(e) => setParams({...params, usdToGbp: Number(e.target.value)})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <button
                onClick={() => setShowGbp(!showGbp)}
                className={`w-full px-4 py-2 rounded font-semibold transition-colors ${
                  showGbp
                    ? 'bg-purple-600 dark:bg-purple-500 text-white hover:bg-purple-700 dark:hover:bg-purple-600'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {showGbp ? 'Show USD' : 'Show GBP'}
              </button>
              <div className="text-sm text-purple-700 dark:text-purple-400">
                Currently displaying: <span className="font-bold">{showGbp ? 'GBP (£)' : 'USD ($)'}</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-orange-900 dark:text-white">UK Tax Rates</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Income Tax Rate (%)</label>
                <input
                  type="number"
                  value={params.incomeTaxRate}
                  onChange={(e) => setParams({...params, incomeTaxRate: Number(e.target.value)})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">National Insurance (%)</label>
                <input
                  type="number"
                  value={params.niRate}
                  onChange={(e) => setParams({...params, niRate: Number(e.target.value)})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">CGT Rate (%)</label>
                <input
                  type="number"
                  value={params.cgtRate}
                  onChange={(e) => setParams({...params, cgtRate: Number(e.target.value)})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">CGT Allowance (£)</label>
                <input
                  type="number"
                  value={params.cgtAllowance}
                  onChange={(e) => setParams({...params, cgtAllowance: Number(e.target.value)})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Key Assumptions</h3>
            <ul className="list-disc list-outside ml-5 space-y-1 text-sm text-left text-gray-700 dark:text-gray-300">
              <li>Sell-to-cover for taxes: Income tax ({params.incomeTaxRate}%) + NI ({params.niRate}%) on RSU vesting</li>
              <li>No shares sold except for tax coverage</li>
              <li>All values in USD except ESPP contributions (£)</li>
            </ul>
          </div>
        </div>

        {/* Right side - Charts and table */}
        <div className="flex-1 space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Total Shares Projection</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={calculations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Shares', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="rsuShares" stroke="#3b82f6" name="RSU Shares" strokeWidth={2} />
                <Line type="monotone" dataKey="esppShares" stroke="#10b981" name="ESPP Shares" strokeWidth={2} />
                <Line type="monotone" dataKey="totalShares" stroke="#8b5cf6" name="Total Shares" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Portfolio Value Projection</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={calculations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -5 }} />
                <YAxis
                  label={{ value: `Value (${showGbp ? '£' : '$'})`, angle: -90, position: 'insideLeft' }}
                  tickFormatter={formatValue}
                />
                <Tooltip formatter={(value) => `${showGbp ? '£' : '$'}${value.toLocaleString()}`} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey={showGbp ? "rsuValueGbp" : "rsuValue"} stackId="a" fill="#3b82f6" name="RSU Value" />
                <Bar dataKey={showGbp ? "esppValueGbp" : "esppValue"} stackId="a" fill="#10b981" name="ESPP Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Detailed Year-by-Year Breakdown</h2>
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Year</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Stock Price</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">RSU Shares</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">ESPP Shares</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Total Shares</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Total Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Capital Gain (£)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">CGT Tax (£)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Net After CGT (£)</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((row) => (
                  <tr key={row.year} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-center font-semibold text-gray-900 dark:text-white">{row.year}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-gray-900 dark:text-white">${row.stockPrice}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-gray-900 dark:text-white">{row.rsuShares.toLocaleString()}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-gray-900 dark:text-white">{row.esppShares.toLocaleString()}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-semibold text-gray-900 dark:text-white">{row.totalShares.toLocaleString()}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-bold text-blue-700 dark:text-blue-400">
                      {showGbp ? `£${row.totalValueGbp.toLocaleString()}` : `${row.totalValue.toLocaleString()}`}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-gray-900 dark:text-white">
                      £{row.capitalGainGbp.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-red-600 dark:text-red-400">
                      £{row.cgtTax.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-bold text-green-700 dark:text-green-400">
                      £{row.netProceedsAfterCgt.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RSUESPPCalculator;