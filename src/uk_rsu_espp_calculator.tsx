import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { saveConfig, loadConfig, generateReadableUUID, listConfigs, ConfigResponse } from './services/configService';
import { fetchUsdToGbpRateECB, ExchangeRateData } from './services/exchangeRateService';
import { fetchStockPrice, COMPANIES, Company, StockPriceData } from './services/stockPriceService';
import { useAuth } from './contexts/AuthContext';

const RSUESPPCalculator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Compensation state
  const [baseSalaryConfig, setBaseSalaryConfig] = useState({
    enabled: false,
    amount: 130000,
    growthRate: 3,
  });
  const [showBaseSalary, setShowBaseSalary] = useState(false);
  const [tempBaseSalary, setTempBaseSalary] = useState({ amount: '130000', growthRate: '3' });

  const [bonusConfig, setBonusConfig] = useState({
    enabled: false,
    percentage: 12,
  });
  const [showBonus, setShowBonus] = useState(false);
  const [tempBonus, setTempBonus] = useState({ percentage: '12' });

  const [carAllowanceConfig, setCarAllowanceConfig] = useState({
    enabled: false,
    amount: 8000,
    growthRate: 2,
  });
  const [showCarAllowance, setShowCarAllowance] = useState(false);
  const [tempCarAllowance, setTempCarAllowance] = useState({ amount: '8000', growthRate: '2' });

  // Save/Load configuration state
  const [configUuid, setConfigUuid] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [loadStatus, setLoadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<ConfigResponse[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

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

  // Derive stock's native currency from selected company
  const stockNativeCurrency: 'USD' | 'GBP' = selectedCompany?.country === 'UK' ? 'GBP' : 'USD';

  // Convert stock price to baseCurrency if needed
  // params.currentStockPrice is always in the stock's native currency
  const stockPriceInBaseCurrency = useMemo(() => {
    if (stockNativeCurrency === baseCurrency) {
      return params.currentStockPrice;
    }
    // Convert between currencies
    if (stockNativeCurrency === 'USD' && baseCurrency === 'GBP') {
      // USD to GBP: divide by exchange rate (assuming usdToGbp means 1 USD = X GBP)
      return params.currentStockPrice / params.usdToGbp;
    } else {
      // GBP to USD: multiply by exchange rate
      return params.currentStockPrice * params.usdToGbp;
    }
  }, [params.currentStockPrice, params.usdToGbp, stockNativeCurrency, baseCurrency]);

  // Fetch exchange rate on component mount
  useEffect(() => {
    fetchExchangeRate();
  }, []);

  // Fetch saved configs when user is authenticated
  useEffect(() => {
    if (user) {
      fetchSavedConfigs();
    } else {
      setSavedConfigs([]);
    }
  }, [user]);

  const fetchSavedConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const configs = await listConfigs('rsu');
      setSavedConfigs(configs);
    } catch (error) {
      console.error('Failed to fetch saved configs:', error);
    } finally {
      setLoadingConfigs(false);
    }
  };

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
      // Round to 2 decimals for display and calculations
      const roundedPrice = Math.round(priceData.price * 100) / 100;
      setParams(prev => ({ ...prev, currentStockPrice: roundedPrice }));
      setStockPriceInput(roundedPrice.toFixed(2));
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
      // Round to 2 decimals for display and calculations
      const roundedPrice = Math.round(priceData.price * 100) / 100;
      setParams(prev => ({ ...prev, currentStockPrice: roundedPrice }));
      setStockPriceInput(roundedPrice.toFixed(2));
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
      // Validate that vest start date is not before grant date
      const grantDate = new Date(newGrant.grantDate);
      const vestStartDate = new Date(newGrant.vestStartDate);
      if (vestStartDate < grantDate) {
        alert('Vest start date cannot be before grant date');
        return;
      }
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

  const handleSaveBaseSalary = () => {
    setBaseSalaryConfig({
      enabled: true,
      amount: Number(tempBaseSalary.amount),
      growthRate: Number(tempBaseSalary.growthRate),
    });
    setShowBaseSalary(false);
  };

  const handleSaveBonus = () => {
    setBonusConfig({
      enabled: true,
      percentage: Number(tempBonus.percentage),
    });
    setShowBonus(false);
  };

  const handleSaveCarAllowance = () => {
    setCarAllowanceConfig({
      enabled: true,
      amount: Number(tempCarAllowance.amount),
      growthRate: Number(tempCarAllowance.growthRate),
    });
    setShowCarAllowance(false);
  };

  const handleSaveConfiguration = async () => {
    try {
      const config = {
        configType: 'rsu' as const,
        rsuGrants,
        esppConfig,
        params,
        baseCurrency,
        selectedCompany,
        baseSalaryConfig,
        bonusConfig,
        carAllowanceConfig,
      };
      const name = configUuid || generateReadableUUID();

      const savedConfig = await saveConfig(config, name, false, configUuid || undefined);
      setConfigUuid(savedConfig.id);
      setSaveStatus({ type: 'success', message: `Saved! Config: ${savedConfig.name || savedConfig.id}` });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Failed to save configuration' });
    }
  };

  const handleLoadConfiguration = async (configId: string) => {
    try {
      const config = await loadConfig(configId);
      setRsuGrants(config.rsuGrants || []);
      setEsppConfig(config.esppConfig || esppConfig);
      setParams(config.params || params);
      setBaseCurrency(config.baseCurrency || 'USD');
      setSelectedCompany(config.selectedCompany || null);
      // Load compensation configs
      if (config.baseSalaryConfig) setBaseSalaryConfig(config.baseSalaryConfig);
      if (config.bonusConfig) setBonusConfig(config.bonusConfig);
      if (config.carAllowanceConfig) setCarAllowanceConfig(config.carAllowanceConfig);
      setConfigUuid(configId);

      // Fetch fresh stock price if a company was saved
      if (config.selectedCompany) {
        setLoadingStockPrice(true);
        setStockPriceError(null);
        try {
          const priceData = await fetchStockPrice(config.selectedCompany.ticker);
          setStockPriceData(priceData);
          // Round to 2 decimals for display and calculations
          const roundedPrice = Math.round(priceData.price * 100) / 100;
          setParams(prev => ({ ...(config.params || params), currentStockPrice: roundedPrice }));
          setStockPriceInput(roundedPrice.toFixed(2));
        } catch (error) {
          setStockPriceError('Failed to fetch stock price');
          console.error('Stock price error:', error);
        } finally {
          setLoadingStockPrice(false);
        }
      }

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
    const now = new Date();
    const currentYear = now.getFullYear();

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
      yearlyIncome: number;
      yearlyIncomeGbp: number;
      capitalGainGbp: number;
      cgtTax: number;
      netProceedsAfterCgtGbp: number;
      netProceedsAfterCgtUsd: number;
      stockPrice: number;
      esppInvested: number;
      totalTaxesPaid: number;
      // Compensation fields
      baseSalary: number;
      bonus: number;
      carAllowance: number;
      totalCash: number;
      totalComp: number;
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
      // Use end of displayed year (Dec 31) as target date for consistency
      const displayYearNum = currentYear + year - 1;
      const targetDate = new Date(displayYearNum, 11, 31, 23, 59, 59); // Dec 31 of display year

      let rsuSharesVested = 0;
      let totalTaxesPaid = 0;
      let rsuCostBasisUsd = 0; // Track cost basis for CGT calculation

      vestingSchedule.forEach(vest => {
        if (vest.date <= targetDate) {
          const monthsSinceNow = (vest.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
          const stockPriceAtVest = stockPriceInBaseCurrency * Math.pow(1 + params.annualStockGrowth / 100, monthsSinceNow / 12);

          const grossValue = vest.shares * stockPriceAtVest;
          const incomeTax = grossValue * (params.incomeTaxRate / 100);
          const ni = grossValue * (params.niRate / 100);
          const totalTax = incomeTax + ni;

          const sharesToSell = Math.ceil(totalTax / stockPriceAtVest);
          const netShares = vest.shares - sharesToSell;

          rsuSharesVested += netShares;
          totalTaxesPaid += totalTax;

          // Track cost basis: market value at vesting for the net shares kept
          rsuCostBasisUsd += netShares * stockPriceAtVest;
        }
      });

      let esppShares = 0;
      let esppInvested = 0;
      let esppMarketValueAtPurchase = 0; // Track market value for CGT cost basis

      if (esppConfig.enabled) {
        // Use actual calendar dates for ESPP purchases
        const esppStartDate = esppConfig.hasStartDate && esppConfig.startDate
          ? new Date(esppConfig.startDate)
          : new Date(now);

        // Generate purchase dates based on ESPP start + purchase period intervals
        let purchaseDate = new Date(esppStartDate);
        purchaseDate.setMonth(purchaseDate.getMonth() + esppConfig.purchasePeriod);

        while (purchaseDate <= targetDate) {
          // Calculate contribution period: from (purchaseDate - purchasePeriod) to purchaseDate
          const periodStartDate = new Date(purchaseDate);
          periodStartDate.setMonth(periodStartDate.getMonth() - esppConfig.purchasePeriod);

          // Calculate contribution for this period
          let periodContribution = 0;
          const contributionDate = new Date(periodStartDate);

          for (let m = 0; m < esppConfig.purchasePeriod; m++) {
            // Calculate years from ESPP start for contribution growth
            const monthsFromStart = (contributionDate.getFullYear() - esppStartDate.getFullYear()) * 12 +
                                   (contributionDate.getMonth() - esppStartDate.getMonth());
            const yearFraction = Math.max(0, monthsFromStart) / 12;
            const monthlyContribution = esppConfig.monthlyContribution * Math.pow(1 + esppConfig.contributionGrowth / 100, yearFraction);
            periodContribution += monthlyContribution;
            contributionDate.setMonth(contributionDate.getMonth() + 1);
          }

          // Calculate stock prices at period start and end relative to now
          const monthsToStartFromNow = (periodStartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
          const monthsToEndFromNow = (purchaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

          const stockPriceAtPeriodStart = stockPriceInBaseCurrency * Math.pow(1 + params.annualStockGrowth / 100, monthsToStartFromNow / 12);
          const stockPriceAtPeriodEnd = stockPriceInBaseCurrency * Math.pow(1 + params.annualStockGrowth / 100, monthsToEndFromNow / 12);

          const marketPrice = Math.min(stockPriceAtPeriodStart, stockPriceAtPeriodEnd);
          const purchasePrice = marketPrice * (1 - esppConfig.discount / 100);
          const sharesPurchased = periodContribution / purchasePrice;

          // UK Tax: Discount is taxed as employment income at purchase
          const discountValue = sharesPurchased * (marketPrice - purchasePrice);
          const incomeTaxOnDiscount = discountValue * (params.incomeTaxRate / 100);
          const niOnDiscount = discountValue * (params.niRate / 100);

          esppShares += sharesPurchased;
          esppInvested += periodContribution;
          esppMarketValueAtPurchase += sharesPurchased * marketPrice;
          totalTaxesPaid += incomeTaxOnDiscount + niOnDiscount;

          // Move to next purchase date
          purchaseDate.setMonth(purchaseDate.getMonth() + esppConfig.purchasePeriod);
        }
      }

      // Calculate stock price at end of display year
      const monthsToTargetFromNow = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const currentStockPrice = stockPriceInBaseCurrency * Math.pow(1 + params.annualStockGrowth / 100, monthsToTargetFromNow / 12);
      const totalShares = rsuSharesVested + esppShares;
      const totalValue = totalShares * currentStockPrice;
      const rsuValue = rsuSharesVested * currentStockPrice;
      const esppValue = esppShares * currentStockPrice;

      // Calculate annual ISA contributions
      let annualISAAllowance = 0;
      if (params.useOwnISA) annualISAAllowance += params.ownISAAllowance;
      if (params.useSpouseISA) annualISAAllowance += params.spouseISAAllowance;

      // Add ISA contribution for this year (transfer shares worth up to allowance)
      // If baseCurrency is GBP, totalValue is already in GBP; if USD, convert
      const totalValueGbp = baseCurrency === 'GBP' ? totalValue : totalValue / params.usdToGbp;
      const isaContributionThisYear = Math.min(annualISAAllowance, Math.max(0, totalValueGbp - cumulativeISAValueGbp));
      cumulativeISAValueGbp += isaContributionThisYear;

      // Calculate capital gains if selling all shares
      // RSUs: Cost basis equals market value at vesting (already taxed as income)
      // Capital gain = current value - vesting value
      const rsuCapitalGain = Math.max(0, rsuValue - rsuCostBasisUsd);

      // ESPP: Cost basis is market value at purchase (discount already taxed as income)
      const esppCostBasis = esppMarketValueAtPurchase;
      const esppCapitalGain = Math.max(0, esppValue - esppCostBasis);

      // Total capital gains (in baseCurrency)
      const capitalGain = rsuCapitalGain + esppCapitalGain;
      // Convert to GBP for UK CGT calculation
      const capitalGainGbp = baseCurrency === 'GBP' ? capitalGain : capitalGain / params.usdToGbp;

      // Apply ISA protection: ISA-protected shares have no CGT
      // Assume ISA is filled proportionally with all shares (RSU + ESPP)
      const isaProtectedRatio = totalValueGbp > 0 ? cumulativeISAValueGbp / totalValueGbp : 0;
      const isaProtectedGain = capitalGainGbp * Math.min(1, isaProtectedRatio);
      const nonISACapitalGain = Math.max(0, capitalGainGbp - isaProtectedGain);

      const taxableGain = Math.max(0, nonISACapitalGain - params.cgtAllowance);
      const cgtTax = taxableGain * (params.cgtRate / 100);
      const netProceedsAfterCgtGbp = totalValueGbp - cgtTax;
      const netProceedsAfterCgtUsd = baseCurrency === 'USD' ? totalValue - cgtTax * params.usdToGbp : totalValue * params.usdToGbp - cgtTax * params.usdToGbp;

      // Calculate yearly income (difference from previous year)
      const previousYearValue = results.length > 0 ? results[results.length - 1].totalValue : 0;
      const previousYearValueGbp = results.length > 0 ? results[results.length - 1].totalValueGbp : 0;
      const yearlyIncome = Math.round(totalValue - previousYearValue);
      const yearlyIncomeGbp = Math.round(totalValueGbp - previousYearValueGbp);

      // Calculate compensation components
      const yearIndex = year - 1; // 0-indexed for growth calculation
      const baseSalaryGross = baseSalaryConfig.enabled
        ? Math.round(baseSalaryConfig.amount * Math.pow(1 + baseSalaryConfig.growthRate / 100, yearIndex))
        : 0;
      const bonusGross = bonusConfig.enabled && baseSalaryConfig.enabled
        ? Math.round(baseSalaryGross * (bonusConfig.percentage / 100))
        : 0;
      const carAllowanceGross = carAllowanceConfig.enabled
        ? Math.round(carAllowanceConfig.amount * Math.pow(1 + carAllowanceConfig.growthRate / 100, yearIndex))
        : 0;

      // Apply income tax to get net values (same as RSU/ESPP)
      const incomeTaxRate = params.incomeTaxRate / 100;
      const baseSalary = Math.round(baseSalaryGross * (1 - incomeTaxRate));
      const bonusAmount = Math.round(bonusGross * (1 - incomeTaxRate));
      const carAllowance = Math.round(carAllowanceGross * (1 - incomeTaxRate));

      const totalCash = baseSalary + bonusAmount + carAllowance;
      // Total comp includes cash plus the yearly RSU/ESPP income (in the chosen currency)
      const yearlyStockIncome = baseCurrency === 'GBP' ? yearlyIncomeGbp : yearlyIncome;
      const totalComp = totalCash + yearlyStockIncome;

      results.push({
        year,
        displayYear: `${currentYear + year - 1}`,
        rsuShares: Math.round(rsuSharesVested),
        esppShares: Math.round(esppShares),
        totalShares: Math.round(totalShares),
        rsuValue: Math.round(rsuValue),
        esppValue: Math.round(esppValue),
        totalValue: Math.round(totalValue),
        rsuValueGbp: Math.round(baseCurrency === 'GBP' ? rsuValue : rsuValue / params.usdToGbp),
        esppValueGbp: Math.round(baseCurrency === 'GBP' ? esppValue : esppValue / params.usdToGbp),
        totalValueGbp: Math.round(totalValueGbp),
        yearlyIncome,
        yearlyIncomeGbp,
        capitalGainGbp: Math.round(capitalGainGbp),
        cgtTax: Math.round(cgtTax),
        netProceedsAfterCgtGbp: Math.round(netProceedsAfterCgtGbp),
        netProceedsAfterCgtUsd: Math.round(netProceedsAfterCgtUsd),
        stockPrice: Math.round(currentStockPrice * 100) / 100,
        esppInvested: Math.round(esppInvested),
        totalTaxesPaid: Math.round(totalTaxesPaid),
        baseSalary,
        bonus: bonusAmount,
        carAllowance,
        totalCash,
        totalComp,
      });
    });

    return results;
  }, [params, rsuGrants, esppConfig, baseCurrency, stockPriceInBaseCurrency, baseSalaryConfig, bonusConfig, carAllowanceConfig]);

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-gray-800 dark:text-white">Total Compensation Calculator</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side - Input panels */}
        <div className="w-full lg:w-96 lg:flex-shrink-0 space-y-6">
          {/* Base Salary */}
          <div className="bg-teal-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-teal-200 dark:border-teal-600">
            <h2 className="text-xl font-semibold text-teal-900 dark:text-white mb-3">Base Salary</h2>
            {baseSalaryConfig.enabled && (
              <div className="mb-3 bg-white dark:bg-gray-700 p-3 rounded border border-teal-200 dark:border-teal-600">
                <div className="flex justify-between items-start">
                  <div className="text-sm text-gray-900 dark:text-white">
                    <div><strong>Amount:</strong> {baseCurrency === 'GBP' ? '£' : '$'}{baseSalaryConfig.amount.toLocaleString()}</div>
                    <div><strong>Growth:</strong> {baseSalaryConfig.growthRate}%/year</div>
                  </div>
                  <button
                    onClick={() => setBaseSalaryConfig({ ...baseSalaryConfig, enabled: false })}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                if (!showBaseSalary && baseSalaryConfig.enabled) {
                  setTempBaseSalary({
                    amount: baseSalaryConfig.amount.toString(),
                    growthRate: baseSalaryConfig.growthRate.toString(),
                  });
                }
                setShowBaseSalary(!showBaseSalary);
              }}
              className="w-full px-4 py-2 bg-teal-600 dark:bg-teal-500 text-white rounded font-semibold hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors"
            >
              {showBaseSalary ? 'Cancel' : baseSalaryConfig.enabled ? 'Edit Salary' : '+ Add Base Salary'}
            </button>
            {showBaseSalary && (
              <div className="mt-4 space-y-3 bg-white dark:bg-gray-700 p-3 rounded border border-teal-300 dark:border-teal-600">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Annual Salary ({baseCurrency === 'GBP' ? '£' : '$'})</label>
                  <input
                    type="number"
                    value={tempBaseSalary.amount}
                    onChange={(e) => setTempBaseSalary({ ...tempBaseSalary, amount: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 130000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Annual Growth Rate (%)</label>
                  <input
                    type="number"
                    value={tempBaseSalary.growthRate}
                    onChange={(e) => setTempBaseSalary({ ...tempBaseSalary, growthRate: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 3"
                  />
                </div>
                <button
                  onClick={handleSaveBaseSalary}
                  className="w-full px-4 py-2 bg-teal-600 dark:bg-teal-500 text-white rounded font-semibold hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Car Allowance */}
          <div className="bg-cyan-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-cyan-200 dark:border-cyan-600">
            <h2 className="text-xl font-semibold text-cyan-900 dark:text-white mb-3">Car Allowance</h2>
            {carAllowanceConfig.enabled && (
              <div className="mb-3 bg-white dark:bg-gray-700 p-3 rounded border border-cyan-200 dark:border-cyan-600">
                <div className="flex justify-between items-start">
                  <div className="text-sm text-gray-900 dark:text-white">
                    <div><strong>Amount:</strong> {baseCurrency === 'GBP' ? '£' : '$'}{carAllowanceConfig.amount.toLocaleString()}/year</div>
                    <div><strong>Growth:</strong> {carAllowanceConfig.growthRate}%/year</div>
                  </div>
                  <button
                    onClick={() => setCarAllowanceConfig({ ...carAllowanceConfig, enabled: false })}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                if (!showCarAllowance && carAllowanceConfig.enabled) {
                  setTempCarAllowance({
                    amount: carAllowanceConfig.amount.toString(),
                    growthRate: carAllowanceConfig.growthRate.toString(),
                  });
                }
                setShowCarAllowance(!showCarAllowance);
              }}
              className="w-full px-4 py-2 bg-cyan-600 dark:bg-cyan-500 text-white rounded font-semibold hover:bg-cyan-700 dark:hover:bg-cyan-600 transition-colors"
            >
              {showCarAllowance ? 'Cancel' : carAllowanceConfig.enabled ? 'Edit Car Allowance' : '+ Add Car Allowance'}
            </button>
            {showCarAllowance && (
              <div className="mt-4 space-y-3 bg-white dark:bg-gray-700 p-3 rounded border border-cyan-300 dark:border-cyan-600">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Annual Amount ({baseCurrency === 'GBP' ? '£' : '$'})</label>
                  <input
                    type="number"
                    value={tempCarAllowance.amount}
                    onChange={(e) => setTempCarAllowance({ ...tempCarAllowance, amount: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 8000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Annual Growth Rate (%)</label>
                  <input
                    type="number"
                    value={tempCarAllowance.growthRate}
                    onChange={(e) => setTempCarAllowance({ ...tempCarAllowance, growthRate: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 2"
                  />
                </div>
                <button
                  onClick={handleSaveCarAllowance}
                  className="w-full px-4 py-2 bg-cyan-600 dark:bg-cyan-500 text-white rounded font-semibold hover:bg-cyan-700 dark:hover:bg-cyan-600 transition-colors"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Bonus */}
          <div className="bg-yellow-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-600">
            <h2 className="text-xl font-semibold text-yellow-900 dark:text-white mb-3">Bonus</h2>
            {bonusConfig.enabled && (
              <div className="mb-3 bg-white dark:bg-gray-700 p-3 rounded border border-yellow-200 dark:border-yellow-600">
                <div className="flex justify-between items-start">
                  <div className="text-sm text-gray-900 dark:text-white">
                    <div><strong>Percentage:</strong> {bonusConfig.percentage}% of salary</div>
                  </div>
                  <button
                    onClick={() => setBonusConfig({ ...bonusConfig, enabled: false })}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                if (!showBonus && bonusConfig.enabled) {
                  setTempBonus({ percentage: bonusConfig.percentage.toString() });
                }
                setShowBonus(!showBonus);
              }}
              className="w-full px-4 py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded font-semibold hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors"
            >
              {showBonus ? 'Cancel' : bonusConfig.enabled ? 'Edit Bonus' : '+ Add Bonus'}
            </button>
            {showBonus && (
              <div className="mt-4 space-y-3 bg-white dark:bg-gray-700 p-3 rounded border border-yellow-300 dark:border-yellow-600">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Bonus (% of Salary)</label>
                  <input
                    type="number"
                    value={tempBonus.percentage}
                    onChange={(e) => setTempBonus({ percentage: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 12"
                  />
                </div>
                <button
                  onClick={handleSaveBonus}
                  className="w-full px-4 py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded font-semibold hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* ESPP Configuration */}
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

          {/* RSU Grants */}
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
                      // Clear selected company when user starts typing
                      if (selectedCompany) {
                        setSelectedCompany(null);
                        setStockPriceData(null);
                      }
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
                  value={Math.round(stockPriceInBaseCurrency * 100) / 100}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStockPriceInput(value);
                    // Update params only if it's a valid number
                    // Convert from baseCurrency to native currency if needed
                    if (value !== '' && !isNaN(Number(value))) {
                      let nativePrice = Number(value);
                      if (stockNativeCurrency !== baseCurrency) {
                        if (baseCurrency === 'GBP' && stockNativeCurrency === 'USD') {
                          // User entered GBP, convert to USD for storage
                          nativePrice = nativePrice * params.usdToGbp;
                        } else {
                          // User entered USD, convert to GBP for storage
                          nativePrice = nativePrice / params.usdToGbp;
                        }
                      }
                      setParams({...params, currentStockPrice: nativePrice});
                    }
                  }}
                  onBlur={() => {
                    // On blur, if empty, reset to converted value
                    if (stockPriceInput === '' || isNaN(Number(stockPriceInput))) {
                      setStockPriceInput((Math.round(stockPriceInBaseCurrency * 100) / 100).toString());
                    }
                  }}
                  onFocus={(e) => {
                    // Select all text when focused for easy replacement
                    e.target.select();
                  }}
                  placeholder="Enter stock price"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                {stockNativeCurrency !== baseCurrency && selectedCompany && (
                  <div className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                    Native price: {stockNativeCurrency === 'USD' ? '$' : '£'}{params.currentStockPrice.toFixed(2)} {stockNativeCurrency}
                    {' → '}{baseCurrency === 'USD' ? '$' : '£'}{(Math.round(stockPriceInBaseCurrency * 100) / 100).toFixed(2)} {baseCurrency}
                  </div>
                )}
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

            {!user ? (
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-400 mb-3">Sign in to save and load your configurations</p>
                <button
                  onClick={() => navigate('/login', { state: { from: { pathname: '/rsu' } } })}
                  className="px-6 py-2 bg-pink-600 dark:bg-pink-500 text-white rounded font-semibold hover:bg-pink-700 dark:hover:bg-pink-600 transition-colors"
                >
                  Sign In to Save
                </button>
              </div>
            ) : (
              <>
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
                          <strong>Current:</strong> {savedConfigs.find(c => c.id === configUuid)?.name || configUuid}
                        </div>
                      )}
                      <button
                        onClick={handleSaveConfiguration}
                        className="w-full px-4 py-2 bg-pink-600 dark:bg-pink-500 text-white rounded font-semibold hover:bg-pink-700 dark:hover:bg-pink-600 transition-colors"
                      >
                        {configUuid ? 'Update Configuration' : 'Save New Configuration'}
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
                      <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Your Saved Configurations</h3>
                      {loadingConfigs ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
                      ) : savedConfigs.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No saved configurations yet</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {savedConfigs.map((config) => (
                            <button
                              key={config.id}
                              onClick={() => handleLoadConfiguration(config.id)}
                              className={`w-full text-left p-2 rounded border transition-colors ${
                                configUuid === config.id
                                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30'
                                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                            >
                              <div className="font-medium text-gray-900 dark:text-white">
                                {config.name || 'Unnamed Config'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Updated {new Date(config.updated_at).toLocaleDateString()}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
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
              </>
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
                <Tooltip formatter={(value) => `${baseCurrency === 'USD' ? '$' : '£'}${(value as number)?.toLocaleString() ?? 0}`} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey={baseCurrency === 'USD' ? "rsuValue" : "rsuValueGbp"} stackId="a" fill="#3b82f6" name="RSU Value" />
                <Bar dataKey={baseCurrency === 'USD' ? "esppValue" : "esppValueGbp"} stackId="a" fill="#10b981" name="ESPP Value" />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Total Compensation (After Tax)</h2>
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Year</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Salary (Net)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Car (Net)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Bonus (Net)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">ESPP (Net)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">RSU (Net)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Total Cash</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Total Comp</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((row) => (
                  <tr key={row.year} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-center font-semibold text-gray-900 dark:text-white">{row.displayYear}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-teal-700 dark:text-teal-400">
                      {baseCurrency === 'GBP' ? '£' : '$'}{row.baseSalary.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-cyan-700 dark:text-cyan-400">
                      {baseCurrency === 'GBP' ? '£' : '$'}{row.carAllowance.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-yellow-700 dark:text-yellow-400">
                      {baseCurrency === 'GBP' ? '£' : '$'}{row.bonus.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-green-700 dark:text-green-400">
                      {baseCurrency === 'GBP' ? '£' : '$'}{row.esppValue > 0 ? Math.round((row.esppValue / row.totalValue) * (baseCurrency === 'GBP' ? row.yearlyIncomeGbp : row.yearlyIncome)).toLocaleString() : 0}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-indigo-700 dark:text-indigo-400">
                      {baseCurrency === 'GBP' ? '£' : '$'}{row.rsuValue > 0 ? Math.round((row.rsuValue / row.totalValue) * (baseCurrency === 'GBP' ? row.yearlyIncomeGbp : row.yearlyIncome)).toLocaleString() : 0}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-semibold text-gray-900 dark:text-white">
                      {baseCurrency === 'GBP' ? '£' : '$'}{row.totalCash.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-bold text-purple-700 dark:text-purple-400">
                      {baseCurrency === 'GBP' ? '£' : '$'}{row.totalComp.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-gray-200 dark:bg-gray-600 font-bold">
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-gray-900 dark:text-white">TOTAL</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-teal-700 dark:text-teal-400">
                    {baseCurrency === 'GBP' ? '£' : '$'}{calculations.reduce((sum, row) => sum + row.baseSalary, 0).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-cyan-700 dark:text-cyan-400">
                    {baseCurrency === 'GBP' ? '£' : '$'}{calculations.reduce((sum, row) => sum + row.carAllowance, 0).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-yellow-700 dark:text-yellow-400">
                    {baseCurrency === 'GBP' ? '£' : '$'}{calculations.reduce((sum, row) => sum + row.bonus, 0).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-green-700 dark:text-green-400">
                    {baseCurrency === 'GBP' ? '£' : '$'}{calculations.reduce((sum, row) => sum + row.esppValue, 0).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-indigo-700 dark:text-indigo-400">
                    {baseCurrency === 'GBP' ? '£' : '$'}{calculations.reduce((sum, row) => sum + row.rsuValue, 0).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-gray-900 dark:text-white">
                    {baseCurrency === 'GBP' ? '£' : '$'}{calculations.reduce((sum, row) => sum + row.totalCash, 0).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-purple-700 dark:text-purple-400">
                    {baseCurrency === 'GBP' ? '£' : '$'}{calculations.reduce((sum, row) => sum + row.totalComp, 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Stock Details Table */}
          <div className="overflow-x-auto">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Stock Details</h2>
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Year</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Stock Price</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">RSU Shares</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">ESPP Shares</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Total Shares</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Portfolio Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Capital Gain (£)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">CGT Tax (£)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Net After CGT</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((row) => (
                  <tr key={row.year} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-center font-semibold text-gray-900 dark:text-white">{row.displayYear}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-gray-900 dark:text-white">{baseCurrency === 'USD' ? '$' : '£'}{row.stockPrice}</td>
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
