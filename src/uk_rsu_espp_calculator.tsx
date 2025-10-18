import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { saveConfig, loadConfig, generateReadableUUID } from './services/configService';
import { fetchUsdToGbpRateECB, ExchangeRateData } from './services/exchangeRateService';
import { fetchStockPrice, COMPANIES, Company, StockPriceData } from './services/stockPriceService';

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
    projectionYears: 5,
    useOwnISA: false,
    useSpouseISA: false,
    ownISAAllowance: 20000,
    spouseISAAllowance: 20000
  });

  const [baseCurrency, setBaseCurrency] = useState<'USD' | 'GBP'>('USD'); // Base currency for inputs
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
    purchasePeriod: 6, // months
    hasStartDate: false,
    startDate: ''
  });
  const [showConfigureEspp, setShowConfigureEspp] = useState(false);
  const [tempEsppConfig, setTempEsppConfig] = useState({
    monthlyContribution: '1000',
    contributionGrowth: '5',
    discount: '15',
    purchasePeriod: '6',
    hasStartDate: false,
    startDate: ''
  });

  // Save/Load configuration state
  const [configUuid, setConfigUuid] = useState('');
  const [loadUuid, setLoadUuid] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [loadStatus, setLoadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [showSaveLoad, setShowSaveLoad] = useState(false);

  // Exchange rate state
  const [exchangeRateData, setExchangeRateData] = useState<ExchangeRateData | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  // Stock price state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [stockPriceData, setStockPriceData] = useState<StockPriceData | null>(null);
  const [loadingStockPrice, setLoadingStockPrice] = useState(false);
  const [stockPriceError, setStockPriceError] = useState<string | null>(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [stockPriceInput, setStockPriceInput] = useState(params.currentStockPrice.toString());

  // Fetch exchange rate on component mount
  useEffect(() => {
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    setLoadingRate(true);
    setRateError(null);
    try {
      const data = await fetchUsdToGbpRateECB();
      setExchangeRateData(data);
      // Update the USD to GBP parameter with the fetched rate
      setParams(prev => ({ ...prev, usdToGbp: data.rate }));
    } catch (error) {
      setRateError('Failed to fetch exchange rate');
      console.error('Exchange rate error:', error);
    } finally {
      setLoadingRate(false);
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const handleCompanySelect = async (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyDropdown(false);
    setCompanySearchQuery('');

    // Auto-select currency based on company country
    setBaseCurrency(company.country === 'UK' ? 'GBP' : 'USD');

    // Fetch stock price
    setLoadingStockPrice(true);
    setStockPriceError(null);
    try {
      const priceData = await fetchStockPrice(company.ticker);
      setStockPriceData(priceData);
      setParams(prev => ({ ...prev, currentStockPrice: priceData.price }));
      setStockPriceInput(priceData.price.toString());
    } catch (error) {
      setStockPriceError('Failed to fetch stock price');
      console.error('Stock price error:', error);
    } finally {
      setLoadingStockPrice(false);
    }
  };

  const refreshStockPrice = async () => {
    if (!selectedCompany) return;

    setLoadingStockPrice(true);
    setStockPriceError(null);
    try {
      const priceData = await fetchStockPrice(selectedCompany.ticker);
      setStockPriceData(priceData);
      setParams(prev => ({ ...prev, currentStockPrice: priceData.price }));
      setStockPriceInput(priceData.price.toString());
    } catch (error) {
      setStockPriceError('Failed to fetch stock price');
      console.error('Stock price error:', error);
    } finally {
      setLoadingStockPrice(false);
    }
  };

  const filteredCompanies = COMPANIES.filter(company =>
    company.name.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
    company.ticker.toLowerCase().includes(companySearchQuery.toLowerCase())
  );

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
      purchasePeriod: Number(tempEsppConfig.purchasePeriod),
      hasStartDate: tempEsppConfig.hasStartDate,
      startDate: tempEsppConfig.startDate
    });
    setShowConfigureEspp(false);
  };

  const handleDisableEspp = () => {
    setEsppConfig({
      ...esppConfig,
      enabled: false
    });
  };

  const handleSaveConfiguration = async () => {
    try {
      const uuid = configUuid || generateReadableUUID();
      const config = { rsuGrants, esppConfig, params, baseCurrency };

      await saveConfig(uuid, config);
      setConfigUuid(uuid);
      setSaveStatus({ type: 'success', message: `Saved! Your ID: ${uuid}` });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Failed to save configuration' });
    }
  };

  const handleLoadConfiguration = async () => {
    try {
      const config = await loadConfig(loadUuid);
      setRsuGrants(config.rsuGrants || []);
      setEsppConfig(config.esppConfig || esppConfig);
      setParams(config.params || params);
      setBaseCurrency(config.baseCurrency || 'USD');
      setConfigUuid(loadUuid);
      setLoadStatus({ type: 'success', message: 'Configuration loaded!' });
      setTimeout(() => setLoadStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      setLoadStatus({ type: 'error', message: 'Failed to load configuration' });
    }
  };

  const getVestingScheduleDetails = (schedule: string) => {
    // Returns { periods, intervalMonths }
    switch(schedule) {
      case '1y-cliff':
        return { periods: 1, intervalMonths: 12 };
      case '3y-annual':
        return { periods: 3, intervalMonths: 12 };
      case '3y-6m':
        return { periods: 6, intervalMonths: 6 };
      case '4y-3m':
        return { periods: 16, intervalMonths: 3 };
      case '4y-6m':
        return { periods: 8, intervalMonths: 6 };
      case '4y-annual':
        return { periods: 4, intervalMonths: 12 };
      default:
        return { periods: 8, intervalMonths: 6 };
    }
  };

  const getVestingScheduleLabel = (schedule: string) => {
    switch(schedule) {
      case '1y-cliff':
        return '1 Year Cliff (100% after 1 year)';
      case '3y-annual':
        return '3 Years Annual (3 periods)';
      case '3y-6m':
        return '3 Years Semi-Annual (6 periods)';
      case '4y-3m':
        return '4 Years Quarterly (16 periods)';
      case '4y-6m':
        return '4 Years Semi-Annual (8 periods)';
      case '4y-annual':
        return '4 Years Annual (4 periods)';
      default:
        return schedule;
    }
  };

  const calculations = useMemo(() => {
    const years = Array.from({ length: params.projectionYears }, (_, i) => i + 1);
    const currentYear = new Date().getFullYear();

    interface ResultData {
      year: number;
      displayYear: string;
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
      netProceedsAfterCgtGbp: number;
      netProceedsAfterCgtUsd: number;
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

    // Track cumulative ISA contributions
    let cumulativeISAValueGbp = 0;

    // Add vesting schedules for user-defined RSU grants
    rsuGrants.forEach((grant) => {
      const vestStart = new Date(grant.vestStartDate);
      const { periods, intervalMonths } = getVestingScheduleDetails(grant.vestingSchedule);

      const baseShares = Math.floor(grant.totalShares / periods);
      const remainder = grant.totalShares - (baseShares * periods);

      for (let i = 0; i < periods; i++) {
        const vestDate = new Date(vestStart);
        vestDate.setMonth(vestDate.getMonth() + i * intervalMonths);
        // Distribute remainder shares to the first few periods
        const shares = i < remainder ? baseShares + 1 : baseShares;
        vestingSchedule.push({
          date: vestDate,
          shares: shares,
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
      let esppMarketValueAtPurchase = 0; // Track market value for CGT cost basis

      if (esppConfig.enabled) {
        const monthsInYear = year * 12;
        const purchasePeriods = Math.floor(monthsInYear / esppConfig.purchasePeriod);

        // Calculate months from now to ESPP start date (if enabled)
        let esppStartMonthOffset = 0;
        if (esppConfig.hasStartDate && esppConfig.startDate) {
          const now = new Date();
          const esppStartDate = new Date(esppConfig.startDate);
          const monthsDiff = (esppStartDate.getFullYear() - now.getFullYear()) * 12 +
                            (esppStartDate.getMonth() - now.getMonth());
          esppStartMonthOffset = Math.max(0, monthsDiff);
        }

        for (let period = 1; period <= purchasePeriods; period++) {
          const periodEndMonth = period * esppConfig.purchasePeriod;
          const periodStartMonth = (period - 1) * esppConfig.purchasePeriod;

          // Skip periods before ESPP start date
          if (periodEndMonth <= esppStartMonthOffset) {
            continue;
          }

          let periodContribution = 0;
          for (let month = periodStartMonth; month < periodEndMonth; month++) {
            // Skip months before ESPP start
            if (month < esppStartMonthOffset) {
              continue;
            }

            const yearFraction = month / 12;
            const monthlyContribution = esppConfig.monthlyContribution * Math.pow(1 + esppConfig.contributionGrowth / 100, yearFraction);
            periodContribution += monthlyContribution;
          }

          // Skip if no contribution in this period
          if (periodContribution === 0) {
            continue;
          }

          const stockPriceAtPeriodStart = params.currentStockPrice * Math.pow(1 + params.annualStockGrowth / 100, periodStartMonth / 12);
          const stockPriceAtPeriodEnd = params.currentStockPrice * Math.pow(1 + params.annualStockGrowth / 100, periodEndMonth / 12);

          const marketPrice = Math.min(stockPriceAtPeriodStart, stockPriceAtPeriodEnd);
          const purchasePrice = marketPrice * (1 - esppConfig.discount / 100);
          const sharesPurchased = periodContribution / purchasePrice;

          // UK Tax: Discount is taxed as employment income at purchase
          const discountValueUsd = sharesPurchased * (marketPrice - purchasePrice);
          const incomeTaxOnDiscount = discountValueUsd * (params.incomeTaxRate / 100);
          const niOnDiscount = discountValueUsd * (params.niRate / 100);

          esppShares += sharesPurchased;
          esppInvested += periodContribution;
          esppMarketValueAtPurchase += sharesPurchased * marketPrice;
          totalTaxesPaid += incomeTaxOnDiscount + niOnDiscount;
        }
      }
      
      const currentStockPrice = params.currentStockPrice * Math.pow(1 + params.annualStockGrowth / 100, year);
      const totalShares = rsuSharesVested + esppShares;
      const totalValue = totalShares * currentStockPrice;
      const rsuValue = rsuSharesVested * currentStockPrice;
      const esppValue = esppShares * currentStockPrice;

      // Calculate annual ISA contributions
      let annualISAAllowance = 0;
      if (params.useOwnISA) annualISAAllowance += params.ownISAAllowance;
      if (params.useSpouseISA) annualISAAllowance += params.spouseISAAllowance;

      // Add ISA contribution for this year (transfer shares worth up to allowance)
      const totalValueGbp = totalValue / params.usdToGbp;
      const isaContributionThisYear = Math.min(annualISAAllowance, Math.max(0, totalValueGbp - cumulativeISAValueGbp));
      cumulativeISAValueGbp += isaContributionThisYear;

      // Calculate capital gains if selling all shares
      // RSUs: No capital gain from vesting - cost basis equals market value at vesting (already taxed as income)
      // ESPP: Cost basis is market value at purchase (discount already taxed as income)
      const esppCostBasisUsd = esppMarketValueAtPurchase;
      const capitalGainUsd = Math.max(0, esppValue - esppCostBasisUsd);
      const capitalGainGbp = capitalGainUsd / params.usdToGbp;

      // Apply ISA protection: ISA-protected shares have no CGT
      // Assume ISA is filled proportionally with all shares (RSU + ESPP)
      const isaProtectedRatio = totalValueGbp > 0 ? cumulativeISAValueGbp / totalValueGbp : 0;
      const isaProtectedGain = capitalGainGbp * Math.min(1, isaProtectedRatio);
      const nonISACapitalGain = Math.max(0, capitalGainGbp - isaProtectedGain);

      const taxableGain = Math.max(0, nonISACapitalGain - params.cgtAllowance);
      const cgtTax = taxableGain * (params.cgtRate / 100);
      const netProceedsAfterCgtGbp = (totalValue / params.usdToGbp) - cgtTax;
      const netProceedsAfterCgtUsd = totalValue - (cgtTax * params.usdToGbp);
      
      results.push({
        year,
        displayYear: `${currentYear + year - 1}`,
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
        netProceedsAfterCgtGbp: Math.round(netProceedsAfterCgtGbp),
        netProceedsAfterCgtUsd: Math.round(netProceedsAfterCgtUsd),
        stockPrice: Math.round(currentStockPrice * 100) / 100,
        esppInvested: Math.round(esppInvested),
        totalTaxesPaid: Math.round(totalTaxesPaid)
      });
    });
    
    return results;
  }, [params, rsuGrants, esppConfig]);

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-gray-800 dark:text-white">RSU & ESPP Calculator</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side - Input panels */}
        <div className="w-full lg:w-96 lg:flex-shrink-0 space-y-6">
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
                    <option value="3y-annual">3 Years Annual (3 periods)</option>
                    <option value="3y-6m">3 Years Semi-Annual (6 periods)</option>
                    <option value="4y-annual">4 Years Annual (4 periods)</option>
                    <option value="4y-6m">4 Years Semi-Annual (8 periods)</option>
                    <option value="4y-3m">4 Years Quarterly (16 periods)</option>
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
                    {esppConfig.hasStartDate && esppConfig.startDate && (
                      <div><strong>Start Date:</strong> {esppConfig.startDate}</div>
                    )}
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
              onClick={() => {
                if (!showConfigureEspp && esppConfig.enabled) {
                  // Populate temp config with current values when editing
                  setTempEsppConfig({
                    monthlyContribution: esppConfig.monthlyContribution.toString(),
                    contributionGrowth: esppConfig.contributionGrowth.toString(),
                    discount: esppConfig.discount.toString(),
                    purchasePeriod: esppConfig.purchasePeriod.toString(),
                    hasStartDate: esppConfig.hasStartDate,
                    startDate: esppConfig.startDate
                  });
                }
                setShowConfigureEspp(!showConfigureEspp);
              }}
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
                <div className="pt-2 border-t border-green-200 dark:border-green-700">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempEsppConfig.hasStartDate}
                      onChange={(e) => setTempEsppConfig({...tempEsppConfig, hasStartDate: e.target.checked})}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Set ESPP Start Date</span>
                  </label>
                  {tempEsppConfig.hasStartDate && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">ESPP Start Date</label>
                      <input
                        type="date"
                        value={tempEsppConfig.startDate}
                        onChange={(e) => setTempEsppConfig({...tempEsppConfig, startDate: e.target.value})}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Contributions will start from this date
                      </p>
                    </div>
                  )}
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
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Select Company (Optional)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedCompany?.name || companySearchQuery}
                    onChange={(e) => {
                      setCompanySearchQuery(e.target.value);
                      setShowCompanyDropdown(true);
                    }}
                    onFocus={() => setShowCompanyDropdown(true)}
                    onBlur={() => {
                      // Delay to allow click on dropdown items to register
                      setTimeout(() => setShowCompanyDropdown(false), 200);
                    }}
                    placeholder="Search for a company..."
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  />
                  {showCompanyDropdown && filteredCompanies.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredCompanies.map((company) => (
                        <button
                          key={company.ticker}
                          onClick={() => handleCompanySelect(company)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          <div className="font-medium">{company.name} {company.country === 'UK' ? '🇬🇧' : '🇺🇸'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{company.ticker} · {company.exchange}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedCompany && (
                  <div className="mt-1 text-xs text-blue-700 dark:text-blue-400 flex items-center justify-between">
                    <span>{selectedCompany.country === 'UK' ? '🇬🇧' : '🇺🇸'} {selectedCompany.ticker} · {selectedCompany.exchange}</span>
                    <button
                      onClick={() => {
                        setSelectedCompany(null);
                        setStockPriceData(null);
                        setCompanySearchQuery('');
                      }}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">Current Stock Price ({baseCurrency === 'USD' ? '$' : '£'})</label>
                  {selectedCompany && (
                    <button
                      onClick={refreshStockPrice}
                      disabled={loadingStockPrice}
                      className="text-xs px-2 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingStockPrice ? 'Loading...' : '🔄 Refresh'}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={stockPriceInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStockPriceInput(value);
                    // Update params only if it's a valid number
                    if (value !== '' && !isNaN(Number(value))) {
                      setParams({...params, currentStockPrice: Number(value)});
                    }
                  }}
                  onBlur={() => {
                    // On blur, if empty, reset to previous value
                    if (stockPriceInput === '' || isNaN(Number(stockPriceInput))) {
                      setStockPriceInput(params.currentStockPrice.toString());
                    } else {
                      setParams({...params, currentStockPrice: Number(stockPriceInput)});
                    }
                  }}
                  onFocus={(e) => {
                    // Select all text when focused for easy replacement
                    e.target.select();
                  }}
                  placeholder="Enter stock price"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                {stockPriceData && !stockPriceError && (
                  <div className="mt-1 space-y-1">
                    <div className="text-xs text-blue-700 dark:text-blue-400">
                      Change: <span className={stockPriceData.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {stockPriceData.change >= 0 ? '+' : ''}{stockPriceData.change.toFixed(2)} ({stockPriceData.changePercent >= 0 ? '+' : ''}{stockPriceData.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-400">
                      Updated: {formatLastUpdated(stockPriceData.lastUpdated)}
                    </div>
                  </div>
                )}
                {stockPriceError && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {stockPriceError}
                  </div>
                )}
              </div>
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
            <h2 className="text-xl font-semibold text-purple-900 dark:text-white mb-3">Currency Settings</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    Exchange Rate (1 {baseCurrency === 'USD' ? 'GBP' : 'USD'} = ? {baseCurrency}):
                  </label>
                  <button
                    onClick={fetchExchangeRate}
                    disabled={loadingRate}
                    className="text-xs px-2 py-1 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingRate ? 'Loading...' : '🔄 Refresh'}
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={params.usdToGbp}
                  onChange={(e) => setParams({...params, usdToGbp: Number(e.target.value)})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                {exchangeRateData && !rateError && (
                  <div className="mt-1 text-xs text-purple-700 dark:text-purple-400">
                    Last updated: {formatLastUpdated(exchangeRateData.lastUpdated)}
                  </div>
                )}
                {rateError && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {rateError} - using manual rate
                  </div>
                )}
              </div>
              <button
                onClick={() => setBaseCurrency(baseCurrency === 'USD' ? 'GBP' : 'USD')}
                className={`w-full px-4 py-2 rounded font-semibold transition-colors ${
                  baseCurrency === 'GBP'
                    ? 'bg-purple-600 dark:bg-purple-500 text-white hover:bg-purple-700 dark:hover:bg-purple-600'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {baseCurrency === 'GBP' ? 'Switch to USD ($)' : 'Switch to GBP (£)'}
              </button>
              <div className="text-sm text-purple-700 dark:text-purple-400">
                Currently using: <span className="font-bold">{baseCurrency === 'GBP' ? 'GBP (£)' : 'USD ($)'}</span>
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
              <div className="pt-3 border-t border-orange-200 dark:border-orange-700">
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">ISA Protection (£/year)</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={params.useOwnISA}
                      onChange={(e) => setParams({...params, useOwnISA: e.target.checked})}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      value={params.ownISAAllowance}
                      onChange={(e) => setParams({...params, ownISAAllowance: Number(e.target.value)})}
                      disabled={!params.useOwnISA}
                      className="w-24 p-1 text-sm border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">Own S&S ISA</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={params.useSpouseISA}
                      onChange={(e) => setParams({...params, useSpouseISA: e.target.checked})}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      value={params.spouseISAAllowance}
                      onChange={(e) => setParams({...params, spouseISAAllowance: Number(e.target.value)})}
                      disabled={!params.useSpouseISA}
                      className="w-24 p-1 text-sm border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">Spouse S&S ISA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Key Assumptions</h3>
            <ul className="list-disc list-outside ml-5 space-y-1 text-sm text-left text-gray-700 dark:text-gray-300">
              <li><strong>Stock Prices:</strong> Using {baseCurrency === 'USD' ? 'USD ($)' : 'GBP (£)'} for stock prices and RSU grant values</li>
              <li><strong>ESPP Contributions:</strong> Always in GBP (£) as contributions come from UK salary</li>
              <li><strong>RSUs:</strong> Income tax ({params.incomeTaxRate}%) + NI ({params.niRate}%) at vesting, sell-to-cover</li>
              <li><strong>ESPP:</strong> Discount taxed as income ({params.incomeTaxRate}% + {params.niRate}% NI) at purchase</li>
              <li><strong>CGT:</strong> Cost basis = market value at acquisition (vesting for RSUs, purchase for ESPP)</li>
              <li><strong>Tax Jurisdiction:</strong> UK tax rates applied. {baseCurrency === 'USD' ? 'Exchange rate converts USD stock prices to GBP for tax calculations.' : 'All values already in GBP.'}</li>
              {(params.useOwnISA || params.useSpouseISA) && (
                <li><strong>ISA Protection:</strong> Shares in S&S ISAs are CGT-free. Use "Bed and ISA" to transfer. Annual limits:
                  {params.useOwnISA && ` Own £${params.ownISAAllowance.toLocaleString()}`}
                  {params.useOwnISA && params.useSpouseISA && ','}
                  {params.useSpouseISA && ` Spouse £${params.spouseISAAllowance.toLocaleString()}`}
                </li>
              )}
            </ul>
          </div>

          <div className="bg-pink-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-pink-200 dark:border-pink-600">
            <h2 className="text-xl font-semibold text-pink-900 dark:text-white mb-3">Save/Load Configuration</h2>

            <button
              onClick={() => setShowSaveLoad(!showSaveLoad)}
              className="w-full px-4 py-2 bg-pink-600 dark:bg-pink-500 text-white rounded font-semibold hover:bg-pink-700 dark:hover:bg-pink-600 transition-colors"
            >
              {showSaveLoad ? 'Hide' : 'Save or Load Config'}
            </button>

            {showSaveLoad && (
              <div className="mt-4 space-y-4 bg-white dark:bg-gray-700 p-3 rounded border border-pink-300 dark:border-pink-600">
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Save Configuration</h3>
                  {configUuid && (
                    <div className="mb-2 p-2 bg-blue-100 dark:bg-blue-900 rounded text-sm text-gray-900 dark:text-white">
                      <strong>Current ID:</strong> {configUuid}
                    </div>
                  )}
                  <button
                    onClick={handleSaveConfiguration}
                    className="w-full px-4 py-2 bg-pink-600 dark:bg-pink-500 text-white rounded font-semibold hover:bg-pink-700 dark:hover:bg-pink-600 transition-colors"
                  >
                    {configUuid ? 'Update Configuration' : 'Save Configuration'}
                  </button>
                  {saveStatus.type && (
                    <div className={`mt-2 p-2 rounded text-sm ${
                      saveStatus.type === 'success'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {saveStatus.message}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-pink-200 dark:border-pink-700">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Load Configuration</h3>
                  <input
                    type="text"
                    value={loadUuid}
                    onChange={(e) => setLoadUuid(e.target.value)}
                    placeholder="Enter your config ID"
                    className="w-full p-2 border rounded mb-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  />
                  <button
                    onClick={handleLoadConfiguration}
                    disabled={!loadUuid}
                    className="w-full px-4 py-2 bg-pink-600 dark:bg-pink-500 text-white rounded font-semibold hover:bg-pink-700 dark:hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Load Configuration
                  </button>
                  {loadStatus.type && (
                    <div className={`mt-2 p-2 rounded text-sm ${
                      loadStatus.type === 'success'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {loadStatus.message}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Charts and table */}
        <div className="flex-1 space-y-8 min-w-0">
          <div className="overflow-hidden">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Total Shares Projection</h2>
            <div className="w-full" style={{ minHeight: '300px', height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={calculations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayYear" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Shares', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="rsuShares" stroke="#3b82f6" name="RSU Shares" strokeWidth={2} />
                <Line type="monotone" dataKey="esppShares" stroke="#10b981" name="ESPP Shares" strokeWidth={2} />
                <Line type="monotone" dataKey="totalShares" stroke="#8b5cf6" name="Total Shares" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Portfolio Value Projection</h2>
            <div className="w-full" style={{ minHeight: '300px', height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calculations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayYear" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                <YAxis
                  label={{ value: `Value (${baseCurrency === 'USD' ? '$' : '£'})`, angle: -90, position: 'insideLeft' }}
                  tickFormatter={formatValue}
                />
                <Tooltip formatter={(value) => `${baseCurrency === 'USD' ? '$' : '£'}${value.toLocaleString()}`} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey={baseCurrency === 'USD' ? "rsuValue" : "rsuValueGbp"} stackId="a" fill="#3b82f6" name="RSU Value" />
                <Bar dataKey={baseCurrency === 'USD' ? "esppValue" : "esppValueGbp"} stackId="a" fill="#10b981" name="ESPP Value" />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Detailed Year-by-Year Breakdown</h2>
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
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Net After CGT</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((row) => (
                  <tr key={row.year} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-center font-semibold text-gray-900 dark:text-white">{row.displayYear}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-gray-900 dark:text-white">${row.stockPrice}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-gray-900 dark:text-white">{row.rsuShares.toLocaleString()}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-gray-900 dark:text-white">{row.esppShares.toLocaleString()}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-semibold text-gray-900 dark:text-white">{row.totalShares.toLocaleString()}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-bold text-blue-700 dark:text-blue-400">
                      {baseCurrency === 'USD' ? `$${row.totalValue.toLocaleString()}` : `£${row.totalValueGbp.toLocaleString()}`}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-gray-900 dark:text-white">
                      £{row.capitalGainGbp.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-red-600 dark:text-red-400">
                      £{row.cgtTax.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-bold text-green-700 dark:text-green-400">
                      {baseCurrency === 'USD' ? `$${row.netProceedsAfterCgtUsd.toLocaleString()}` : `£${row.netProceedsAfterCgtGbp.toLocaleString()}`}
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