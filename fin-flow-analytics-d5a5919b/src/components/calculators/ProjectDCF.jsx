
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, BarChart, Bar } from 'recharts';
import { Download, LineChart as LineChartIcon, Plus, X, Calculator, TrendingUp, Clock, RotateCcw, Copy, AlertTriangle, Save, FileText, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const formatCurrency = (value) => {
  if (typeof value !== 'number' || !isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(value);
};

const formatPercent = (value) => {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  return (value * 100).toFixed(2) + '%';
};

const formatNumber = (value, decimals = 2) => {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  return value.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

// NPV calculation
const calculateNPV = (cashFlows, discountRate, periodsPerYear = 1) => {
  const adjustedRate = Math.pow(1 + discountRate, 1 / periodsPerYear) - 1;
  return cashFlows.reduce((npv, cf, period) => {
    return npv + (cf / Math.pow(1 + adjustedRate, period));
  }, 0);
};

// IRR calculation with period adjustment
const calculateIRR = (cashFlows, periodsPerYear = 1, initialGuess = 0.1) => {
  const hasNegative = cashFlows.some(cf => cf < 0);
  const hasPositive = cashFlows.some(cf => cf > 0);
  if (!hasNegative || !hasPositive) return null;

  const npv = (rate) => {
    const adjustedRate = Math.pow(1 + rate, 1 / periodsPerYear) - 1;
    return cashFlows.reduce((sum, cf, p) => sum + cf / Math.pow(1 + adjustedRate, p), 0);
  };

  let low = -0.99, high = 20.0; // Increased upper bound to handle high-return projects
  if (npv(low) * npv(high) > 0) return null;

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid);
    if (Math.abs(npvMid) < 1e-10) return mid;
    if (npv(low) * npvMid < 0) high = mid; else low = mid;
    if (Math.abs(high-low) < 1e-10) return (low+high)/2;
  }
  return null;
};

// Payback period calculations
const calculatePaybackPeriods = (cashFlows, discountRate, periodsPerYear = 1) => {
  const adjustedRate = Math.pow(1 + discountRate, 1 / periodsPerYear) - 1;
  let cumulativeSimple = 0;
  let cumulativeDiscounted = 0;
  let simplePayback = null;
  let discountedPayback = null;

  for (let i = 0; i < cashFlows.length; i++) {
    cumulativeSimple += cashFlows[i];
    cumulativeDiscounted += cashFlows[i] / Math.pow(1 + adjustedRate, i);
    
    if (simplePayback === null && cumulativeSimple >= 0) {
      if (i === 0) {
        simplePayback = 0;
      } else {
        const prevCumulative = cumulativeSimple - cashFlows[i];
        simplePayback = (i - 1 + Math.abs(prevCumulative) / cashFlows[i]) / periodsPerYear;
      }
    }
    
    if (discountedPayback === null && cumulativeDiscounted >= 0) {
      if (i === 0) {
        discountedPayback = 0;
      } else {
        const prevCumulative = cumulativeDiscounted - cashFlows[i] / Math.pow(1 + adjustedRate, i);
        const currentDiscounted = cashFlows[i] / Math.pow(1 + adjustedRate, i);
        discountedPayback = (i - 1 + Math.abs(prevCumulative) / currentDiscounted) / periodsPerYear;
      }
    }
  }

  return { simplePayback, discountedPayback };
};

const initialProject = {
  name: 'New Investment Project',
  notes: '',
  periodicity: 'annual',
  discountRate: 0.12,
  useWACC: false,
  waccInputs: {
    costOfDebt: 0.06,
    taxRate: 0.25,
    costOfEquity: 0.20,
    debtRatio: 0.4
  },
  initialInvestments: [-100000],
  operatingCashFlows: [30000, 35000, 40000, 25000],
  salvageValue: 10000,
  scenarios: {
    base: { cashFlows: [30000, 35000, 40000, 25000] },
    worst: { cashFlows: [20000, 25000, 28000, 15000] },
    best: { cashFlows: [45000, 50000, 55000, 40000] }
  }
};

export default function ProjectDCF() {
  const [project, setProject] = useState(initialProject);
  const [activeScenario, setActiveScenario] = useState('base');
  const [showWACCCalculator, setShowWACCCalculator] = useState(false);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [copyText, setCopyText] = useState('Copy');

  // Calculate WACC when enabled
  const calculatedWACC = useMemo(() => {
    const { costOfDebt, taxRate, costOfEquity, debtRatio } = project.waccInputs;
    const equityRatio = 1 - debtRatio;
    const afterTaxDebtCost = costOfDebt * (1 - taxRate);
    return (afterTaxDebtCost * debtRatio) + (costOfEquity * equityRatio);
  }, [project.waccInputs]);

  // Use WACC if enabled, otherwise use manual discount rate
  const effectiveDiscountRate = project.useWACC ? calculatedWACC : project.discountRate;
  
  // Periods per year conversion
  const periodsPerYear = {
    annual: 1,
    quarterly: 4,
    monthly: 12
  }[project.periodicity];

  const calculations = useMemo(() => {
    // Build complete cash flow timeline
    const initialCashFlows = [...project.initialInvestments];
    const operatingCashFlows = project.scenarios[activeScenario].cashFlows;
    const finalCashFlow = operatingCashFlows[operatingCashFlows.length - 1] + project.salvageValue;
    
    // Replace last operating cash flow with final cash flow including salvage
    const adjustedOperatingCashFlows = [
      ...operatingCashFlows.slice(0, -1),
      finalCashFlow
    ];
    
    const completeCashFlows = [...initialCashFlows, ...adjustedOperatingCashFlows];
    
    const npv = calculateNPV(completeCashFlows, effectiveDiscountRate, periodsPerYear);
    const irr = calculateIRR(completeCashFlows, periodsPerYear);
    const { simplePayback, discountedPayback } = calculatePaybackPeriods(completeCashFlows, effectiveDiscountRate, periodsPerYear);
    
    // Generate chart data with period labeling
    const chartData = completeCashFlows.map((cf, period) => {
      let cumulativeSimple = 0;
      let cumulativeDiscounted = 0;
      const adjustedRate = Math.pow(1 + effectiveDiscountRate, 1 / periodsPerYear) - 1;
      
      for (let i = 0; i <= period; i++) {
        cumulativeSimple += completeCashFlows[i];
        cumulativeDiscounted += completeCashFlows[i] / Math.pow(1 + adjustedRate, i);
      }
      
      let periodLabel;
      if (period < project.initialInvestments.length) {
        periodLabel = `Inv-${project.initialInvestments.length - period}`;
      } else {
        const operatingPeriod = period - project.initialInvestments.length + 1;
        if (project.periodicity === 'annual') periodLabel = `Y${operatingPeriod}`;
        else if (project.periodicity === 'quarterly') periodLabel = `Q${operatingPeriod}`;
        else periodLabel = `M${operatingPeriod}`;
      }
      
      return {
        period: periodLabel,
        periodIndex: period,
        cashFlow: cf,
        discountedCashFlow: cf / Math.pow(1 + adjustedRate, period),
        cumulativeSimple,
        cumulativeDiscounted
      };
    });

    // Decision logic
    let recommendation = 'reject';
    let recommendationText = '';
    let recommendationColor = 'text-red-600';
    
    if (npv > 0 && typeof irr === 'number' && irr > effectiveDiscountRate + 0.02) {
      recommendation = 'accept';
      recommendationText = `This project is recommended as its estimated return (IRR) of ${formatPercent(irr)} exceeds your required return by more than 2%.`;
      recommendationColor = 'text-green-600';
    } else if (npv > 0 && typeof irr === 'number' && irr > effectiveDiscountRate) {
      recommendation = 'marginal';
      recommendationText = `This project is marginally acceptable. Its IRR of ${formatPercent(irr)} barely exceeds your required return of ${formatPercent(effectiveDiscountRate)}.`;
      recommendationColor = 'text-yellow-600';
    } else {
      recommendationText = `This project is not recommended as its estimated return ${typeof irr === 'number' ? `(IRR) of ${formatPercent(irr)}` : ''} is below your required return of ${formatPercent(effectiveDiscountRate)}.`;
    }

    return {
      completeCashFlows,
      npv,
      irr,
      simplePayback,
      discountedPayback,
      chartData,
      recommendation,
      recommendationText,
      recommendationColor
    };
  }, [project, activeScenario, effectiveDiscountRate, periodsPerYear]);

  // Sensitivity Analysis
  const sensitivityAnalysis = useMemo(() => {
    const baseNPV = calculations.npv;
    if (!isFinite(baseNPV)) return []; // Don't run if base NPV is invalid

    const results = [];
    const testRates = [-0.02, -0.01, 0.01, 0.02];
    
    testRates.forEach(discountDelta => {
        const testRate = effectiveDiscountRate + discountDelta;
        if(testRate > -1) { // Discount rate cannot be less than -100%
            const testNPV = calculateNPV(calculations.completeCashFlows, testRate, periodsPerYear);
            results.push({
                variable: 'Discount Rate',
                change: `${discountDelta > 0 ? '+' : ''}${formatPercent(discountDelta).replace('%','')}%`,
                npv: testNPV,
                npvChange: testNPV - baseNPV
            });
        }
    });
    
    const testMultipliers = [0.9, 1.1]; // +/- 10%
    testMultipliers.forEach(cfMultiplier => {
        const adjustedCashFlows = calculations.completeCashFlows.map((cf, i) => 
            i < project.initialInvestments.length ? cf : cf * cfMultiplier
        );
        const testNPV = calculateNPV(adjustedCashFlows, effectiveDiscountRate, periodsPerYear);
        const changePercent = (cfMultiplier - 1);
        results.push({
            variable: 'Cash Flows',
            change: `${changePercent > 0 ? '+' : ''}${formatPercent(changePercent).replace('%','')}%`,
            npv: testNPV,
            npvChange: testNPV - baseNPV
        });
    });
    
    return results.filter(r => isFinite(r.npv));
  }, [calculations, effectiveDiscountRate, project.initialInvestments.length, periodsPerYear]);

  // Data Validation
  const validationIssues = useMemo(() => {
    const issues = [];
    if (project.periodicity === 'monthly' && project.scenarios[activeScenario].cashFlows.some(cf => Math.abs(cf) > 100000)) { // Adjusted threshold for monthly
      issues.push({ 
        type: 'warning', 
        message: "You have selected 'Monthly' periodicity but entered cash flows larger than $100,000. Did you mean to use 'Annual' or 'Quarterly'?" 
      });
    }
    if (calculations.irr === null && calculations.npv > 0) {
      issues.push({ 
        type: 'error', 
        message: 'IRR calculation failed. This can happen with unconventional cash flows (e.g., no negative initial investment or multiple sign changes). Please check your inputs.' 
      });
    }
    return issues;
  }, [project.periodicity, project.scenarios, activeScenario, calculations.irr, calculations.npv]);

  const updateProject = (updates) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  const updateWACCInputs = (updates) => {
    setProject(prev => ({
      ...prev,
      waccInputs: { ...prev.waccInputs, ...updates }
    }));
  };

  const updateScenario = (scenario, cashFlows) => {
    setProject(prev => ({
      ...prev,
      scenarios: {
        ...prev.scenarios,
        [scenario]: { cashFlows }
      }
    }));
  };

  const addInitialInvestment = () => {
    setProject(prev => ({
      ...prev,
      initialInvestments: [...prev.initialInvestments, 0]
    }));
  };

  const removeInitialInvestment = (index) => {
    if (project.initialInvestments.length > 1) {
      setProject(prev => ({
        ...prev,
        initialInvestments: prev.initialInvestments.filter((_, i) => i !== index)
      }));
    }
  };

  const updateInitialInvestment = (index, value) => {
    setProject(prev => ({
      ...prev,
      initialInvestments: prev.initialInvestments.map((inv, i) => 
        i === index ? (Number(value) || 0) : inv
      )
    }));
  };

  const addOperatingCashFlow = () => {
    const currentCashFlows = project.scenarios[activeScenario].cashFlows;
    updateScenario(activeScenario, [...currentCashFlows, 0]);
  };

  const removeOperatingCashFlow = (index) => {
    const currentCashFlows = project.scenarios[activeScenario].cashFlows;
    if (currentCashFlows.length > 1) {
      updateScenario(activeScenario, currentCashFlows.filter((_, i) => i !== index));
    }
  };

  const updateOperatingCashFlow = (index, value) => {
    const currentCashFlows = project.scenarios[activeScenario].cashFlows;
    const newCashFlows = currentCashFlows.map((cf, i) => 
      i === index ? (Number(value) || 0) : cf
    );
    updateScenario(activeScenario, newCashFlows);
  };

  const saveProject = () => {
    try {
      localStorage.setItem(`dcf-project-${Date.now()}`, JSON.stringify(project));
      alert('Project saved successfully!');
    } catch (error) {
      alert('Error saving project: ' + error.message);
    }
  };

  const handleCopy = () => {
    const resultsText = `
${project.name}
DCF Analysis Results:
-----------------------------
Discount Rate: ${formatPercent(effectiveDiscountRate)}
Net Present Value (NPV): ${formatCurrency(calculations.npv)}
Internal Rate of Return (IRR): ${typeof calculations.irr === 'number' ? formatPercent(calculations.irr) : (calculations.irr || 'N/A')}
Simple Payback Period: ${formatNumber(calculations.simplePayback, 1)} years
Discounted Payback Period: ${formatNumber(calculations.discountedPayback, 1)} years

Recommendation: ${calculations.recommendationText}
    `.trim();
    navigator.clipboard.writeText(resultsText);
    setCopyText('Copied!');
    setTimeout(() => setCopyText('Copy'), 2000);
  };

  const exportToCSV = () => {
    const headers = ['Period', 'Cash Flow', 'Discounted CF', 'Cumulative Simple', 'Cumulative Discounted'];
    const csvData = [
      headers,
      ...calculations.chartData.map(row => [
        row.period,
        row.cashFlow.toFixed(2),
        row.discountedCashFlow.toFixed(2),
        row.cumulativeSimple.toFixed(2),
        row.cumulativeDiscounted.toFixed(2)
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}-dcf-analysis.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRecommendationBadge = () => {
    const variants = {
      accept: { variant: 'default', className: 'bg-green-100 text-green-800', text: 'Strong Accept' },
      marginal: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800', text: 'Marginal' },
      reject: { variant: 'destructive', className: 'bg-red-100 text-red-800', text: 'Reject' }
    };
    
    const config = variants[calculations.recommendation];
    return <Badge className={config.className}>{config.text}</Badge>;
  };

  const CustomCashFlowTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isLastPeriod = data.periodIndex === calculations.chartData.length - 1;
      const isInvestment = data.periodIndex < project.initialInvestments.length;
      
      return (
        <div className="p-2 bg-white border rounded-md shadow-lg dark:bg-gray-800 text-sm">
          <p className="font-bold">{label}</p>
          <p className="text-blue-600">{`Cash Flow: ${formatCurrency(data.cashFlow)}`}</p>
          <p className="text-purple-600">{`Discounted CF: ${formatCurrency(data.discountedCashFlow)}`}</p>
          {isLastPeriod && !isInvestment && project.salvageValue !== 0 && (
            <p className="text-xs text-gray-500 mt-1 italic">
              (Includes Salvage Value of {formatCurrency(project.salvageValue)})
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <TooltipProvider>
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">
              <LineChartIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl">Professional DCF Investment Appraisal</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Complete investment analysis with scenario planning and risk assessment
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveProject} variant="outline" size="sm" className="gap-2">
              <Save className="h-4 w-4"/> Save
            </Button>
            <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2">
              <Copy className="h-4 w-4"/> {copyText}
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4"/> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {validationIssues.length > 0 && (
          <div className="space-y-2">
            {validationIssues.map((issue, index) => (
              <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'} className={issue.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : ''}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{issue.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        
        {/* Mobile Responsive Tabs */}
        <Tabs defaultValue="setup" className="w-full">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <TabsList className="grid w-full grid-cols-4 min-w-[400px] sm:min-w-0">
              <TabsTrigger value="setup" className="text-xs sm:text-sm px-2 sm:px-4">Setup</TabsTrigger>
              <TabsTrigger value="cashflows" className="text-xs sm:text-sm px-2 sm:px-4">Cash Flows</TabsTrigger>
              <TabsTrigger value="results" className="text-xs sm:text-sm px-2 sm:px-4">Results</TabsTrigger>
              <TabsTrigger value="sensitivity" className="text-xs sm:text-sm px-2 sm:px-4">Risk Analysis</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="setup" className="space-y-6 mt-6">
            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input
                      value={project.name}
                      onChange={(e) => updateProject({ name: e.target.value })}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cash Flow Period</Label>
                    <Select
                      value={project.periodicity}
                      onValueChange={(value) => updateProject({ periodicity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Project Notes & Assumptions</Label>
                  <Textarea
                    value={project.notes}
                    onChange={(e) => updateProject({ notes: e.target.value })}
                    placeholder="Document key assumptions, risks, and notes about this investment..."
                    className="h-20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Discount Rate Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  Discount Rate Configuration
                  <UITooltip>
                    <TooltipTrigger>
                      <Settings className="h-4 w-4 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>The discount rate represents your minimum acceptable return for this investment. You can enter it manually or calculate it using WACC.</p>
                    </TooltipContent>
                  </UITooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={project.useWACC}
                    onCheckedChange={(checked) => updateProject({ useWACC: checked })}
                  />
                  <Label>Use WACC Calculator</Label>
                </div>

                {project.useWACC ? (
                  <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm sm:text-base">Weighted Average Cost of Capital</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Cost of Debt (%)</Label>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Input
                                type="number"
                                step="0.01"
                                value={(project.waccInputs.costOfDebt * 100).toFixed(2)}
                                onChange={(e) => updateWACCInputs({ costOfDebt: (Number(e.target.value) || 0) / 100 })}
                                className="font-mono"
                              />
                            </TooltipTrigger>
                            <TooltipContent>Average interest rate on your business loans</TooltipContent>
                          </UITooltip>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Corporate Tax Rate (%)</Label>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Input
                                type="number"
                                step="0.01"
                                value={(project.waccInputs.taxRate * 100).toFixed(2)}
                                onChange={(e) => updateWACCInputs({ taxRate: (Number(e.target.value) || 0) / 100 })}
                                className="font-mono"
                              />
                            </TooltipTrigger>
                            <TooltipContent>Your business tax rate (for interest tax shield calculation)</TooltipContent>
                          </UITooltip>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Cost of Equity (%)</Label>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Input
                                type="number"
                                step="0.01"
                                value={(project.waccInputs.costOfEquity * 100).toFixed(2)}
                                onChange={(e) => updateWACCInputs({ costOfEquity: (Number(e.target.value) || 0) / 100 })}
                                className="font-mono"
                              />
                            </TooltipTrigger>
                            <TooltipContent>As an owner, what is your minimum acceptable return? (e.g., 20% for a risky SME)</TooltipContent>
                          </UITooltip>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Debt Ratio (%)</Label>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Input
                                type="number"
                                step="0.01"
                                value={(project.waccInputs.debtRatio * 100).toFixed(2)}
                                onChange={(e) => updateWACCInputs({ debtRatio: (Number(e.target.value) || 0) / 100 })}
                                className="font-mono"
                              />
                            </TooltipTrigger>
                            <TooltipContent>Proportion of project funding from debt (rest from equity)</TooltipContent>
                          </UITooltip>
                        </div>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-900 rounded border">
                        <p className="font-semibold text-sm">Calculated WACC: {formatPercent(calculatedWACC)}</p>
                        <p className="text-xs text-gray-600">This will be used as your discount rate</p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    <Label>Manual Discount Rate (%)</Label>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Input
                          type="number"
                          step="0.01"
                          value={(project.discountRate * 100).toFixed(2)}
                          onChange={(e) => updateProject({ discountRate: (Number(e.target.value) || 0) / 100 })}
                          className="font-mono"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Your required rate of return for this investment. Also known as hurdle rate.</TooltipContent>
                    </UITooltip>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashflows" className="space-y-6 mt-6">
            {/* Initial Investment Phase */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span>Initial Investment Phase</span>
                  <Button onClick={addInitialInvestment} variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
                    <Plus className="h-4 w-4" />
                    Add Period
                  </Button>
                </CardTitle>
                <p className="text-sm text-gray-500">Capital expenditures before operations begin (enter as negative values)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.initialInvestments.map((investment, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <Label className="w-full sm:w-24 text-sm">
                        {project.initialInvestments.length - index === 1 ? 'Start' : `Year -${project.initialInvestments.length - index - 1}`}
                      </Label>
                      <Input
                        type="number"
                        value={investment}
                        onChange={(e) => updateInitialInvestment(index, e.target.value)}
                        className="font-mono flex-1"
                        placeholder="Initial investment (negative)"
                      />
                      {project.initialInvestments.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInitialInvestment(index)}
                          className="text-red-500 hover:text-red-700 self-start sm:self-auto"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Operating Cash Flows with Scenarios */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  {project.periodicity === 'annual' ? 'Annual' : project.periodicity === 'quarterly' ? 'Quarterly' : 'Monthly'} Operating Cash Flows - Scenario Analysis
                </CardTitle>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Label className="text-sm">Active Scenario:</Label>
                  <div className="flex flex-wrap gap-2">
                    {['base', 'worst', 'best'].map((scenario) => (
                      <Button
                        key={scenario}
                        variant={activeScenario === scenario ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveScenario(scenario)}
                        className="capitalize text-xs sm:text-sm"
                      >
                        {scenario} Case
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h4 className="font-semibold text-sm sm:text-base capitalize">
                      {activeScenario} Case {project.periodicity === 'annual' ? 'Annual' : project.periodicity === 'quarterly' ? 'Quarterly' : 'Monthly'} Cash Flows
                    </h4>
                    <Button onClick={addOperatingCashFlow} variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
                      <Plus className="h-4 w-4" />
                      Add Period
                    </Button>
                  </div>
                  
                  {/* Mobile Responsive Cash Flow Inputs */}
                  <div className="space-y-3">
                    {project.scenarios[activeScenario].cashFlows.map((cf, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg">
                        <Label className="w-full sm:w-24 text-sm capitalize font-medium">
                          {project.periodicity.slice(0,1).toUpperCase()}{index + 1}
                        </Label>
                        <Input
                          type="number"
                          value={cf}
                          onChange={(e) => updateOperatingCashFlow(index, e.target.value)}
                          className="font-mono flex-1"
                          placeholder={`Operating cash flow for ${project.periodicity.slice(0, -2)} ${index+1}`}
                        />
                        {project.scenarios[activeScenario].cashFlows.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOperatingCashFlow(index)}
                            className="text-red-500 hover:text-red-700 self-start sm:self-auto"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terminal/Salvage Value */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Terminal Value</CardTitle>
                <p className="text-sm text-gray-500">Value recovered at project end (asset sales, residual value)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Salvage/Terminal Value ($)</Label>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="number"
                        value={project.salvageValue}
                        onChange={(e) => updateProject({ salvageValue: Number(e.target.value) || 0 })}
                        className="font-mono"
                        placeholder="Value at project end"
                      />
                    </TooltipTrigger>
                    <TooltipContent>Expected value from selling assets or ongoing business value at the end of the project</TooltipContent>
                  </UITooltip>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6 mt-6">
            {/* Investment Decision Summary */}
            <Card className={`border-2 ${
              calculations.recommendation === 'accept' ? 'border-green-200 bg-green-50' :
              calculations.recommendation === 'marginal' ? 'border-yellow-200 bg-yellow-50' :
              'border-red-200 bg-red-50'
            }`}>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold">Investment Decision</h2>
                    {getRecommendationBadge()}
                  </div>
                  <p className={`text-base sm:text-lg ${calculations.recommendationColor}`}>
                    {calculations.recommendationText}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics Grid - Mobile Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Net Present Value</span>
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${calculations.npv > 0 ? 'text-green-600' : 'text-red-600'} truncate`}>
                  {formatCurrency(calculations.npv)}
                </p>
                <p className="text-xs text-gray-500">
                  Using {formatPercent(effectiveDiscountRate)} discount rate
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Internal Rate of Return</span>
                </div>
                {calculations.irr === null && (
                  <p className="text-lg font-bold text-gray-500">N/A</p>
                )}
                {typeof calculations.irr === 'number' && (
                  <p className={`text-xl sm:text-2xl font-bold ${calculations.irr > effectiveDiscountRate ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(calculations.irr)}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  vs {formatPercent(effectiveDiscountRate)} required
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Simple Payback</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {formatNumber(calculations.simplePayback, 1)} 
                  <span className="text-base sm:text-lg"> years</span>
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Discounted Payback</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">
                  {formatNumber(calculations.discountedPayback, 1)} 
                  <span className="text-base sm:text-lg"> years</span>
                </p>
              </Card>
            </div>

            {/* Multi-Scenario Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Scenario Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scenario</TableHead>
                        <TableHead className="text-right">NPV</TableHead>
                        <TableHead className="text-right">IRR</TableHead>
                        <TableHead className="text-right">Decision</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {['worst', 'base', 'best'].map((scenario) => {
                        // Calculate for each scenario
                        const scenarioCashFlows = [
                          ...project.initialInvestments,
                          ...project.scenarios[scenario].cashFlows.slice(0, -1),
                          project.scenarios[scenario].cashFlows[project.scenarios[scenario].cashFlows.length - 1] + project.salvageValue
                        ];
                        const scenarioNPV = calculateNPV(scenarioCashFlows, effectiveDiscountRate, periodsPerYear);
                        const scenarioIRR = calculateIRR(scenarioCashFlows, periodsPerYear);
                        const scenarioDecision = scenarioNPV > 0 && typeof scenarioIRR === 'number' && scenarioIRR > effectiveDiscountRate ? 'Accept' : 'Reject';
                        
                        return (
                          <TableRow key={scenario} className={scenario === activeScenario ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                            <TableCell className="font-medium capitalize">{scenario} Case</TableCell>
                            <TableCell className={`text-right font-mono ${scenarioNPV > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(scenarioNPV)}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${typeof scenarioIRR === 'number' && scenarioIRR > effectiveDiscountRate ? 'text-green-600' : 'text-red-600'}`}>
                              {typeof scenarioIRR === 'number' ? formatPercent(scenarioIRR) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={scenarioDecision === 'Accept' ? 'default' : 'destructive'}>
                                {scenarioDecision}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cash Flow Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calculations.chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="period" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomCashFlowTooltip />} cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}/>
                        <Legend />
                        <Bar dataKey="cashFlow" name="Cash Flow" fill="#3b82f6" />
                        <Bar dataKey="discountedCashFlow" name="Discounted CF" fill="#8b5cf6" />
                        <ReferenceLine y={0} stroke="black" strokeDasharray="2 2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Cumulative Chart with Payback Markers */}
              <Card>
                <CardHeader>
                  <CardTitle>Cumulative Cash Flow & Payback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={calculations.chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                        />
                        <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="cumulativeSimple" 
                          name="Simple Cumulative"
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cumulativeDiscounted" 
                          name="Discounted Cumulative"
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <ReferenceLine y={0} stroke="black" strokeDasharray="2 2" />
                        {calculations.simplePayback && (
                          <ReferenceLine 
                            x={Math.ceil(calculations.simplePayback * periodsPerYear)} 
                            stroke="#f59e0b" 
                            strokeDasharray="4 4"
                            label={{ value: 'Simple Payback', position: 'topLeft' }}
                          />
                        )}
                        {calculations.discountedPayback && (
                          <ReferenceLine 
                            x={Math.ceil(calculations.discountedPayback * periodsPerYear)} 
                            stroke="#8b5cf6" 
                            strokeDasharray="4 4"
                            label={{ value: 'Discounted Payback', position: 'topRight' }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sensitivity" className="space-y-6 mt-6">
            {/* Sensitivity Analysis Table */}
            <Card>
              <CardHeader>
                <CardTitle>Sensitivity Analysis</CardTitle>
                <p className="text-sm text-gray-500">How the project's NPV changes based on key assumptions.</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variable</TableHead>
                      <TableHead className="text-center">Change</TableHead>
                      <TableHead className="text-right">Resulting NPV</TableHead>
                      <TableHead className="text-right">Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sensitivityAnalysis.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.variable}</TableCell>
                        <TableCell className="text-center">{item.change}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.npv)}</TableCell>
                        <TableCell className={`text-right font-mono ${item.npvChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.npvChange > 0 ? '+' : ''}{formatCurrency(item.npvChange)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Key Insights</AlertTitle>
                  <AlertDescription>
                    This table shows how changes to critical assumptions impact your project's NPV. 
                    A larger 'Impact' value indicates higher sensitivity and risk—focus your due diligence on these factors.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Risk Assessment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-green-600">Best Case</h4>
                    <p className="text-2xl font-bold">
                      {(() => {
                        const bestCashFlows = [
                          ...project.initialInvestments,
                          ...project.scenarios.best.cashFlows.slice(0, -1),
                          project.scenarios.best.cashFlows[project.scenarios.best.cashFlows.length - 1] + project.salvageValue
                        ];
                        const bestNPV = calculateNPV(bestCashFlows, effectiveDiscountRate, periodsPerYear);
                        return formatCurrency(bestNPV);
                      })()}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-blue-600">Base Case</h4>
                    <p className="text-2xl font-bold">{formatCurrency(calculations.npv)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-red-600">Worst Case</h4>
                    <p className="text-2xl font-bold">
                      {(() => {
                        const worstCashFlows = [
                          ...project.initialInvestments,
                          ...project.scenarios.worst.cashFlows.slice(0, -1),
                          project.scenarios.worst.cashFlows[project.scenarios.worst.cashFlows.length - 1] + project.salvageValue
                        ];
                        const worstNPV = calculateNPV(worstCashFlows, effectiveDiscountRate, periodsPerYear);
                        return formatCurrency(worstNPV);
                      })()}
                    </p>
                  </div>
                </div>
                
                <Alert>
                  <AlertDescription>
                    <strong>Risk Management Recommendation:</strong> Even in the worst-case scenario, 
                    {(() => {
                      const worstCashFlows = [
                        ...project.initialInvestments,
                        ...project.scenarios.worst.cashFlows.slice(0, -1),
                        project.scenarios.worst.cashFlows[project.scenarios.worst.cashFlows.length - 1] + project.salvageValue
                      ];
                      const worstNPV = calculateNPV(worstCashFlows, effectiveDiscountRate, periodsPerYear);
                      return worstNPV > 0 ? 
                        ' the project remains profitable. This suggests a robust investment opportunity.' :
                        ' the project shows negative returns. Consider additional risk mitigation strategies before proceeding.';
                    })()}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
