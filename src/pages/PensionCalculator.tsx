import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { saveConfig, loadConfig, generateReadableUUID } from '../services/configService';

interface PensionPot {
  id: string;
  name: string;
  currentValue: number;
  platformFeeType: 'percentage' | 'capped'; // percentage or capped
  platformFee: number; // percentage
  cappedFee: number; // absolute amount in pounds
  fundFee: number; // percentage
}

const PensionCalculator: React.FC = () => {
  // Pension Pots state
  const [pensionPots, setPensionPots] = useState<PensionPot[]>([]);
  const [showAddPot, setShowAddPot] = useState(false);
  const [editingPotId, setEditingPotId] = useState<string | null>(null);
  const [newPot, setNewPot] = useState({
    name: '',
    currentValue: '',
    platformFeeType: 'percentage' as 'percentage' | 'capped',
    platformFee: '',
    cappedFee: '',
    fundFee: ''
  });
  const [editPot, setEditPot] = useState({
    name: '',
    currentValue: '',
    platformFeeType: 'percentage' as 'percentage' | 'capped',
    platformFee: '',
    cappedFee: '',
    fundFee: ''
  });

  // Input state
  const [pensionableIncome, setPensionableIncome] = useState<string>('');
  const [ownContributionPct, setOwnContributionPct] = useState<string>('');
  const [employerContributionPct, setEmployerContributionPct] = useState<string>('');
  const [currentAge, setCurrentAge] = useState<string>('');
  const [retirementAge, setRetirementAge] = useState<string>('');
  const [annualReturn, setAnnualReturn] = useState<string>('');

  // Save/Load configuration state
  const [configUuid, setConfigUuid] = useState('');
  const [loadUuid, setLoadUuid] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [loadStatus, setLoadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [showSaveLoad, setShowSaveLoad] = useState(false);

  // Handlers for pension pots
  const handleAddPot = () => {
    if (!newPot.name || !newPot.currentValue) {
      alert('Please fill in pot name and current value');
      return;
    }

    const pot: PensionPot = {
      id: Date.now().toString(),
      name: newPot.name,
      currentValue: parseFloat(newPot.currentValue) || 0,
      platformFeeType: newPot.platformFeeType,
      platformFee: parseFloat(newPot.platformFee) || 0,
      cappedFee: parseFloat(newPot.cappedFee) || 0,
      fundFee: parseFloat(newPot.fundFee) || 0
    };

    setPensionPots([...pensionPots, pot]);
    setNewPot({ name: '', currentValue: '', platformFeeType: 'percentage', platformFee: '', cappedFee: '', fundFee: '' });
    setShowAddPot(false);
  };

  const handleRemovePot = (id: string) => {
    setPensionPots(pensionPots.filter(pot => pot.id !== id));
  };

  const handleStartEdit = (pot: PensionPot) => {
    setEditingPotId(pot.id);
    setEditPot({
      name: pot.name,
      currentValue: pot.currentValue.toString(),
      platformFeeType: pot.platformFeeType,
      platformFee: pot.platformFee.toString(),
      cappedFee: pot.cappedFee.toString(),
      fundFee: pot.fundFee.toString()
    });
  };

  const handleCancelEdit = () => {
    setEditingPotId(null);
    setEditPot({ name: '', currentValue: '', platformFeeType: 'percentage', platformFee: '', cappedFee: '', fundFee: '' });
  };

  const handleSaveEdit = () => {
    if (!editPot.name || !editPot.currentValue) {
      alert('Please fill in pot name and current value');
      return;
    }

    setPensionPots(pensionPots.map(pot =>
      pot.id === editingPotId
        ? {
            ...pot,
            name: editPot.name,
            currentValue: parseFloat(editPot.currentValue) || 0,
            platformFeeType: editPot.platformFeeType,
            platformFee: parseFloat(editPot.platformFee) || 0,
            cappedFee: parseFloat(editPot.cappedFee) || 0,
            fundFee: parseFloat(editPot.fundFee) || 0
          }
        : pot
    ));
    setEditingPotId(null);
    setEditPot({ name: '', currentValue: '', platformFeeType: 'percentage', platformFee: '', cappedFee: '', fundFee: '' });
  };

  // Save/Load handlers
  const handleSaveConfiguration = async () => {
    try {
      const uuid = configUuid || generateReadableUUID();
      const config = {
        configType: 'pension' as const,
        pensionPots,
        pensionInputs: {
          pensionableIncome,
          ownContributionPct,
          employerContributionPct,
          currentAge,
          retirementAge,
          annualReturn
        }
      };

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

      // Check if this is a pension configuration
      if (config.configType !== 'pension' && !config.pensionPots) {
        setLoadStatus({ type: 'error', message: 'This ID contains an RSU/ESPP configuration, not a pension plan.' });
        return;
      }

      setPensionPots(config.pensionPots || []);
      if (config.pensionInputs) {
        setPensionableIncome(config.pensionInputs.pensionableIncome || '80000');
        setOwnContributionPct(config.pensionInputs.ownContributionPct || '8');
        setEmployerContributionPct(config.pensionInputs.employerContributionPct || '10');
        setCurrentAge(config.pensionInputs.currentAge || '37');
        setRetirementAge(config.pensionInputs.retirementAge || '65');
        setAnnualReturn(config.pensionInputs.annualReturn || '5');
      }
      setConfigUuid(loadUuid);

      setLoadStatus({ type: 'success', message: 'Configuration loaded successfully!' });
      setTimeout(() => setLoadStatus({ type: null, message: '' }), 5000);
    } catch (error) {
      setLoadStatus({ type: 'error', message: 'Failed to load configuration. Check your ID and try again.' });
    }
  };

  // Parse input values
  const income = parseFloat(pensionableIncome) || 0;
  const ownPct = parseFloat(ownContributionPct) || 0;
  const empPct = parseFloat(employerContributionPct) || 0;
  const age = parseInt(currentAge) || 37;
  const retAge = parseInt(retirementAge) || 65;
  const returnRate = parseFloat(annualReturn) || 5;

  // Calculate total current pot value
  const totalCurrentPot = pensionPots.reduce((sum, pot) => sum + pot.currentValue, 0);

  // Calculate contributions
  const yourMonthlyContribution = (income * ownPct / 100) / 12;
  const employerMonthlyContribution = (income * empPct / 100) / 12;
  const taxRelief = yourMonthlyContribution * 0.25; // 20% tax relief means 25% bonus on net contribution
  const monthlyContribution = yourMonthlyContribution + employerMonthlyContribution + taxRelief;

  const years = retAge - age;
  const months = years * 12;

  // Calculate year-by-year breakdown with fees
  const yearlyData = useMemo(() => {
    const data = [];

    for (let year = 0; year <= years; year++) {
      const monthsElapsed = year * 12;

      // Calculate growth for each pot with fees
      let totalPotValue = 0;
      let totalFeesDeducted = 0;

      for (const pot of pensionPots) {
        // Calculate effective platform fee
        let effectivePlatformFee = 0;
        if (pot.platformFeeType === 'percentage') {
          effectivePlatformFee = pot.platformFee;
        } else {
          // Capped fee: convert absolute amount to percentage based on current pot value
          // Cap is per year, so calculate as percentage of pot value
          const currentPotValue = pot.currentValue * Math.pow(1 + (returnRate / 100 / 12), monthsElapsed);
          effectivePlatformFee = currentPotValue > 0 ? (pot.cappedFee / currentPotValue) * 100 : 0;
        }

        // Combined annual fee (platform + fund)
        const totalAnnualFee = effectivePlatformFee + pot.fundFee;
        const effectiveMonthlyRate = (returnRate - totalAnnualFee) / 100 / 12;

        // Growth of this pot with fees
        const potValue = pot.currentValue * Math.pow(1 + effectiveMonthlyRate, monthsElapsed);
        totalPotValue += potValue;

        // Calculate fees deducted
        const potValueWithoutFees = pot.currentValue * Math.pow(1 + (returnRate / 100 / 12), monthsElapsed);
        totalFeesDeducted += (potValueWithoutFees - potValue);
      }

      // Calculate average fee rate weighted by pot values for new contributions
      let avgAnnualFee = 0;
      if (pensionPots.length > 0 && totalCurrentPot > 0) {
        let totalWeightedFee = 0;
        for (const pot of pensionPots) {
          let effectivePlatformFee = 0;
          if (pot.platformFeeType === 'percentage') {
            effectivePlatformFee = pot.platformFee;
          } else {
            // For new contributions, use capped fee as percentage of pot value
            effectivePlatformFee = pot.currentValue > 0 ? (pot.cappedFee / pot.currentValue) * 100 : 0;
          }
          totalWeightedFee += (effectivePlatformFee + pot.fundFee) * pot.currentValue;
        }
        avgAnnualFee = totalWeightedFee / totalCurrentPot;
      }

      const effectiveMonthlyRate = (returnRate - avgAnnualFee) / 100 / 12;

      // Future value of contributions (with average fee rate)
      const contributionsValue = monthsElapsed === 0 ? 0 :
        monthlyContribution * (Math.pow(1 + effectiveMonthlyRate, monthsElapsed) - 1) / effectiveMonthlyRate;

      const totalValue = totalPotValue + contributionsValue;
      const totalContributed = totalCurrentPot + (monthlyContribution * monthsElapsed);
      const growthAmount = totalValue - totalContributed;

      data.push({
        year: age + year,
        value: Math.round(totalValue),
        contributed: Math.round(totalContributed),
        growth: Math.round(growthAmount),
        fees: Math.round(totalFeesDeducted)
      });
    }

    return data;
  }, [age, years, monthlyContribution, returnRate, pensionPots, totalCurrentPot]);

  const futureValue = yearlyData.length > 0 ? yearlyData[yearlyData.length - 1].value : 0;
  const totalContributed = totalCurrentPot + (monthlyContribution * months);

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-gray-800 dark:text-white">Pension Calculator</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side - Input panels */}
        <div className="w-full lg:w-96 lg:flex-shrink-0 space-y-6">

          {/* Pension Pots */}
          <div className="bg-purple-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-600">
            <h2 className="text-xl font-semibold text-purple-900 dark:text-white mb-3">Pension Pots</h2>

            {pensionPots.length > 0 && (
              <div className="space-y-2 mb-3">
                {pensionPots.map((pot) => (
                  <div key={pot.id} className="bg-white dark:bg-gray-700 p-3 rounded border border-purple-200 dark:border-purple-600">
                    {editingPotId === pot.id ? (
                      // Edit Form
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Pot Name</label>
                          <input
                            type="text"
                            value={editPot.name}
                            onChange={(e) => setEditPot({...editPot, name: e.target.value})}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Current Value (£)</label>
                          <input
                            type="number"
                            value={editPot.currentValue}
                            onChange={(e) => setEditPot({...editPot, currentValue: e.target.value})}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Platform Fee Type</label>
                          <div className="flex gap-4 mb-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                value="percentage"
                                checked={editPot.platformFeeType === 'percentage'}
                                onChange={(e) => setEditPot({...editPot, platformFeeType: 'percentage', cappedFee: ''})}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-900 dark:text-white">Percentage</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                value="capped"
                                checked={editPot.platformFeeType === 'capped'}
                                onChange={(e) => setEditPot({...editPot, platformFeeType: 'capped', platformFee: ''})}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-900 dark:text-white">Capped (£/year)</span>
                            </label>
                          </div>
                          {editPot.platformFeeType === 'percentage' ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editPot.platformFee}
                              onChange={(e) => setEditPot({...editPot, platformFee: e.target.value})}
                              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                              placeholder="e.g., 0.45"
                            />
                          ) : (
                            <input
                              type="number"
                              step="1"
                              value={editPot.cappedFee}
                              onChange={(e) => setEditPot({...editPot, cappedFee: e.target.value})}
                              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                              placeholder="e.g., 200"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Fund Fee (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editPot.fundFee}
                            onChange={(e) => setEditPot({...editPot, fundFee: e.target.value})}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded font-semibold hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display Mode
                      <div className="flex justify-between items-start">
                        <div className="text-sm text-gray-900 dark:text-white flex-1">
                          <div className="font-semibold">{pot.name}</div>
                          <div><strong>Value:</strong> £{pot.currentValue.toLocaleString()}</div>
                          {pot.platformFeeType === 'percentage' ? (
                            <div><strong>Platform Fee:</strong> {pot.platformFee}%</div>
                          ) : (
                            <div><strong>Platform Fee:</strong> £{pot.cappedFee}/year (capped)</div>
                          )}
                          <div><strong>Fund Fee:</strong> {pot.fundFee}%</div>
                          <div className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                            {pot.platformFeeType === 'percentage'
                              ? `Total Fees: ${(pot.platformFee + pot.fundFee).toFixed(2)}%`
                              : `Total Fees: £${pot.cappedFee}/year + ${pot.fundFee}%`
                            }
                          </div>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => handleStartEdit(pot)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemovePot(pot.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xl font-bold"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="bg-white dark:bg-gray-700 p-2 rounded border border-purple-300 dark:border-purple-600">
                  <div className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                    Total Pot Value: £{totalCurrentPot.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowAddPot(!showAddPot)}
              className="w-full px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
            >
              {showAddPot ? 'Cancel' : '+ Add Pension Pot'}
            </button>

            {showAddPot && (
              <div className="mt-4 space-y-3 bg-white dark:bg-gray-700 p-3 rounded border border-purple-300 dark:border-purple-600">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Pot Name</label>
                  <input
                    type="text"
                    value={newPot.name}
                    onChange={(e) => setNewPot({...newPot, name: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., Vanguard SIPP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Current Value (£)</label>
                  <input
                    type="number"
                    value={newPot.currentValue}
                    onChange={(e) => setNewPot({...newPot, currentValue: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Platform Fee Type</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="percentage"
                        checked={newPot.platformFeeType === 'percentage'}
                        onChange={(e) => setNewPot({...newPot, platformFeeType: 'percentage', cappedFee: ''})}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">Percentage</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="capped"
                        checked={newPot.platformFeeType === 'capped'}
                        onChange={(e) => setNewPot({...newPot, platformFeeType: 'capped', platformFee: ''})}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">Capped (£/year)</span>
                    </label>
                  </div>
                  {newPot.platformFeeType === 'percentage' ? (
                    <input
                      type="number"
                      step="0.01"
                      value={newPot.platformFee}
                      onChange={(e) => setNewPot({...newPot, platformFee: e.target.value})}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      placeholder="e.g., 0.45"
                    />
                  ) : (
                    <input
                      type="number"
                      step="1"
                      value={newPot.cappedFee}
                      onChange={(e) => setNewPot({...newPot, cappedFee: e.target.value})}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      placeholder="e.g., 200"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Fund Fee (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPot.fundFee}
                    onChange={(e) => setNewPot({...newPot, fundFee: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="e.g., 0.15"
                  />
                </div>
                <button
                  onClick={handleAddPot}
                  className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                >
                  Save Pot
                </button>
              </div>
            )}
          </div>

          {/* Pension Inputs */}
          <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-600">
            <h2 className="text-xl font-semibold text-blue-900 dark:text-white mb-3">Contribution Inputs</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Pensionable Income (£)</label>
                <input
                  type="number"
                  value={pensionableIncome}
                  onChange={(e) => setPensionableIncome(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="e.g., 80000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Your Contribution (%)</label>
                <input
                  type="number"
                  value={ownContributionPct}
                  onChange={(e) => setOwnContributionPct(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="e.g., 8"
                  step="0.1"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Monthly: £{yourMonthlyContribution.toFixed(2)} + £{taxRelief.toFixed(2)} tax relief
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Employer Contribution (%)</label>
                <input
                  type="number"
                  value={employerContributionPct}
                  onChange={(e) => setEmployerContributionPct(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="e.g., 10"
                  step="0.1"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Monthly: £{employerMonthlyContribution.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-700 p-3 rounded border border-blue-200 dark:border-blue-600">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Total Monthly Contribution: £{monthlyContribution.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Annual: £{(monthlyContribution * 12).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Age & Growth Parameters */}
          <div className="bg-green-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-green-200 dark:border-green-600">
            <h2 className="text-xl font-semibold text-green-900 dark:text-white mb-3">Age & Growth</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Current Age</label>
                <input
                  type="number"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="e.g., 37"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Retirement Age</label>
                <input
                  type="number"
                  value={retirementAge}
                  onChange={(e) => setRetirementAge(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="e.g., 65"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Years until retirement: {years}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Annual Investment Return (%)</label>
                <input
                  type="number"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="e.g., 5"
                  step="0.1"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Typical pension growth: 4-7% per year after fees
                </p>
              </div>
            </div>
          </div>

          {/* Key Assumptions */}
          <div className="bg-pink-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Important Notes</h3>
            <ul className="text-xs space-y-1 list-disc list-inside text-gray-800 dark:text-gray-200">
              <li>Assumes {returnRate}% average annual return (adjustable)</li>
              <li>Platform and fund fees are deducted from returns</li>
              <li>Each pot has its own fee structure</li>
              <li>Returns will vary year to year</li>
              <li>Tax relief calculated at 20% basic rate</li>
              <li>Contributions assumed constant in real terms</li>
              <li>Compound interest means most growth in later years</li>
            </ul>
          </div>

          {/* Save/Load Configuration */}
          <div className="bg-orange-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-600">
            <button
              onClick={() => setShowSaveLoad(!showSaveLoad)}
              className="w-full px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded font-semibold hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
            >
              {showSaveLoad ? 'Hide Save/Load' : '💾 Save/Load Configuration'}
            </button>

            {showSaveLoad && (
              <div className="mt-4 space-y-4 bg-white dark:bg-gray-700 p-3 rounded border border-orange-300 dark:border-orange-600">
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Save Configuration</h3>
                  {configUuid && (
                    <div className="mb-2 p-2 bg-blue-100 dark:bg-blue-900 rounded text-sm text-gray-900 dark:text-white">
                      <strong>Current ID:</strong> {configUuid}
                    </div>
                  )}
                  <button
                    onClick={handleSaveConfiguration}
                    className="w-full px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded font-semibold hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
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

                <div className="pt-3 border-t border-orange-200 dark:border-orange-700">
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
                    className="w-full px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded font-semibold hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Right side - Charts and results */}
        <div className="flex-1 space-y-8 min-w-0">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded border border-green-200 dark:border-green-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Final Pot Value</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                £{Math.round(futureValue).toLocaleString()}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded border border-blue-200 dark:border-blue-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Contributed</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                £{Math.round(totalContributed).toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded border border-purple-200 dark:border-purple-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Investment Growth</div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                £{Math.round(futureValue - totalContributed).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Growth Chart */}
          <div className="overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Growth Over Time</h2>
            <div className="w-full" style={{ minHeight: '300px', height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="year"
                    label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis
                    label={{ value: 'Value (£)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => `£${(value/1000).toFixed(0)}k`}
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip
                    formatter={(value: number) => `£${value.toLocaleString()}`}
                    labelFormatter={(label) => `Age ${label}`}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.375rem',
                      color: '#f3f4f6'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="contributed" stroke="#3b82f6" name="Total Contributed" />
                  <Line type="monotone" dataKey="value" stroke="#10b981" name="Total Value" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Milestones Table */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Key Milestones</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Age</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Years</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Total Value</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Contributed</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-white">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {[5, 10, 15, 20, Math.min(years, 28)].filter(yr => yr <= years).map(yr => {
                    const data = yearlyData[yr];
                    if (!data) return null;
                    return (
                      <tr key={yr} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center font-semibold text-gray-900 dark:text-white">{data.year}</td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-gray-900 dark:text-white">{yr}</td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-bold text-green-700 dark:text-green-400">
                          £{data.value.toLocaleString()}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-blue-700 dark:text-blue-400">
                          £{data.contributed.toLocaleString()}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-purple-700 dark:text-purple-400">
                          £{data.growth.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PensionCalculator;
