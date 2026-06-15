
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, AlertTriangle, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  if (typeof value !== 'number' || !isFinite(value)) return '0.0%';
  return (value * 100).toFixed(1) + '%';
};

const calculatePayment = (principal, annualRate, termYears, paymentsPerYear) => {
  const periodicRate = annualRate / paymentsPerYear;
  const totalPeriods = termYears * paymentsPerYear;
  
  if (periodicRate === 0) {
    return principal / totalPeriods;
  }
  
  return principal * (periodicRate * Math.pow(1 + periodicRate, totalPeriods)) / 
         (Math.pow(1 + periodicRate, totalPeriods) - 1);
};

const calculateTotalInterest = (principal, payment, termYears, paymentsPerYear) => {
  const totalPayments = termYears * paymentsPerYear;
  return (payment * totalPayments) - principal;
};

const calculateEAR = (apr, paymentsPerYear) => {
  if (apr === 0 || paymentsPerYear === 0) return 0;
  return (Math.pow(1 + (apr / 100) / paymentsPerYear, paymentsPerYear) - 1) * 100;
};

export default function InterestRateSensitivity() {
  const [principal, setPrincipal] = useState(250000);
  const [baseAPR, setBaseAPR] = useState(6.5);
  const [termYears, setTermYears] = useState(30);
  const [paymentsPerYear, setPaymentsPerYear] = useState(12);
  const [testRange, setTestRange] = useState(3); // ±3%
  const [stepSize, setStepSize] = useState(0.25); // 0.25% steps

  const analysis = useMemo(() => {
    const basePayment = calculatePayment(principal, baseAPR / 100, termYears, paymentsPerYear);
    const baseTotalInterest = calculateTotalInterest(principal, basePayment, termYears, paymentsPerYear);
    
    const scenarios = [];
    let minRate = Math.max(0.1, baseAPR - testRange);
    let maxRate = baseAPR + testRange;
    
    // Use an integer-based loop to avoid floating-point accumulation errors
    const numSteps = Math.floor((maxRate - minRate) / stepSize); // Number of steps, not including maxRate if it's not a perfect multiple
    
    for (let i = 0; i <= numSteps; i++) {
      const rate = parseFloat((minRate + i * stepSize).toFixed(3)); // Calculate rate precisely and round to prevent floating point issues

      // Ensure we don't go past the maxRate
      if (rate > maxRate + 0.001) continue; // Add a small epsilon to account for rounding errors

      const payment = calculatePayment(principal, rate / 100, termYears, paymentsPerYear);
      const totalInterest = calculateTotalInterest(principal, payment, termYears, paymentsPerYear);
      const paymentChange = (payment - basePayment) / basePayment;
      const interestChange = (totalInterest - baseTotalInterest) / baseTotalInterest;
      const ear = calculateEAR(rate, paymentsPerYear);
      
      scenarios.push({
        apr: rate,
        ear,
        payment,
        totalInterest,
        paymentChange,
        interestChange,
        isBase: Math.abs(rate - baseAPR) < 0.001 // Use a small tolerance for base comparison
      });
    }

    // Ensure maxRate is included if not covered by steps
    const lastRateInScenarios = scenarios.length > 0 ? scenarios[scenarios.length - 1].apr : -Infinity;
    if (Math.abs(maxRate - lastRateInScenarios) > 0.001 && maxRate >= minRate) {
        const payment = calculatePayment(principal, maxRate / 100, termYears, paymentsPerYear);
        const totalInterest = calculateTotalInterest(principal, payment, termYears, paymentsPerYear);
        const paymentChange = (payment - basePayment) / basePayment;
        const interestChange = (totalInterest - baseTotalInterest) / baseTotalInterest;
        const ear = calculateEAR(maxRate, paymentsPerYear);
        scenarios.push({
            apr: maxRate,
            ear,
            payment,
            totalInterest,
            paymentChange,
            interestChange,
            isBase: Math.abs(maxRate - baseAPR) < 0.001
        });
    }

    // Ensure base case is always included if step size skips it
    if (!scenarios.some(s => s.isBase) && baseAPR >= minRate && baseAPR <= maxRate + 0.001) { // Check if baseAPR is within range
        const payment = calculatePayment(principal, baseAPR / 100, termYears, paymentsPerYear);
        const totalInterest = calculateTotalInterest(principal, payment, termYears, paymentsPerYear);
        const ear = calculateEAR(baseAPR, paymentsPerYear);
        scenarios.push({
            apr: baseAPR,
            ear,
            payment,
            totalInterest,
            paymentChange: 0,
            interestChange: 0,
            isBase: true
        });
        scenarios.sort((a, b) => a.apr - b.apr); // Re-sort after adding base case
    }
    
    return {
      basePayment,
      baseTotalInterest,
      scenarios: scenarios.sort((a, b) => a.apr - b.apr) // Ensure scenarios are always sorted
    };
  }, [principal, baseAPR, termYears, paymentsPerYear, testRange, stepSize]);

  const getRiskLevel = (change) => {
    const absChange = Math.abs(change);
    if (absChange < 0.05) return { level: 'low', color: 'text-green-600', bg: 'bg-green-50' };
    if (absChange < 0.15) return { level: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { level: 'high', color: 'text-red-600', bg: 'bg-red-50' };
  };

  return (
    <TooltipProvider>
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
            <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-xl">Interest Rate Sensitivity Analysis</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Stress test loan payments across different interest rate scenarios
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Inputs Section - Mobile Responsive */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Amount ($)</Label>
                <Input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label>Base APR (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={baseAPR}
                        onChange={(e) => setBaseAPR(Number(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-2">Annual Percentage Rate (APR)</p>
                    <p>This is the annual interest rate charged for borrowing. It's the percentage of the principal (the loan amount) you pay each year as interest.</p>
                  </TooltipContent>
                </UITooltip>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Term (Years)</Label>
                <Input
                  type="number"
                  value={termYears}
                  onChange={(e) => setTermYears(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Payments/Year</Label>
                <Input
                  type="number"
                  value={paymentsPerYear}
                  onChange={(e) => setPaymentsPerYear(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label>Test Range (±%)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={testRange}
                        onChange={(e) => setTestRange(Number(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Defines how far above and below your Base APR you want to test.</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              
              <div className="space-y-2">
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label>Step Size (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={stepSize}
                        onChange={(e) => setStepSize(Number(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <div className="space-y-2">
                      <p>Determines the intervals at which results are calculated within your test range. This creates the list of scenarios in the "Stress Test Results" table.</p>
                      <p className="text-xs text-gray-500">Example: With a 3.5% base, 3% range, and 0.35% step, it will test 3.5%, 3.85%, 4.2%, etc.</p>
                    </div>
                  </TooltipContent>
                </UITooltip>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm">Base Case Scenario</h4>
              <div className="text-sm space-y-1">
                <p>APR: {baseAPR}%</p>
                <p>EAR: {calculateEAR(baseAPR, paymentsPerYear).toFixed(2)}%</p>
                <p>Payment: {formatCurrency(analysis.basePayment)}</p>
                <p>Total Interest: {formatCurrency(analysis.baseTotalInterest)}</p>
              </div>
            </div>
          </div>

          {/* Results Section - Mobile Responsive */}
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-xs sm:text-sm font-medium">Worst Case</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-red-600">
                  {formatCurrency(Math.max(...analysis.scenarios.map(s => s.payment)))}
                </p>
                <p className="text-xs text-gray-500">
                  At {(() => {
                    const worstScenario = analysis.scenarios.reduce((max, s) => s.payment > max.payment ? s : max);
                    return worstScenario.apr.toFixed(2);
                  })()}% APR
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  EAR: {(() => {
                    const worstScenario = analysis.scenarios.reduce((max, s) => s.payment > max.payment ? s : max);
                    return worstScenario.ear.toFixed(2);
                  })()}%
                </p>
              </Card>

              <Card className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-orange-600" />
                  <span className="text-xs sm:text-sm font-medium">Max Impact</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-orange-600">
                  {formatPercent(Math.max(...analysis.scenarios.map(s => Math.abs(s.paymentChange))))}
                </p>
                <p className="text-xs text-gray-500">Payment change</p>
              </Card>
            </div>

            {/* Sensitivity Chart - Mobile Responsive */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base lg:text-lg">Payment Sensitivity to Interest Rate</h3>
              <div className="h-48 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analysis.scenarios}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="apr" 
                      tick={{ fontSize: 10 }}
                      label={{ value: 'APR (%)', position: 'insideBottom', offset: -5, style: { fontSize: '10px' } }}
                      tickFormatter={(value) => value.toFixed(2)}
                      type="number"
                      domain={['dataMin', 'dataMax']}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                      label={{ value: 'Payment ($)', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                      width={50}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Monthly Payment']}
                      labelFormatter={(label) => `APR: ${Number(label).toFixed(2)}%`}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="payment" 
                      name="Monthly Payment"
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Scenario Table - Mobile Responsive */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base lg:text-lg">Stress Test Results</h3>
              
              {/* Desktop Table */}
              <div className="hidden sm:block border rounded-lg max-h-64 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-950">
                    <TableRow>
                      <TableHead className="text-xs">APR (%)</TableHead>
                      <TableHead className="text-xs">EAR (%)</TableHead>
                      <TableHead className="text-right text-xs">Payment</TableHead>
                      <TableHead className="text-right text-xs">Payment Δ</TableHead>
                      <TableHead className="text-right text-xs">Interest Δ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.scenarios.map((scenario, i) => {
                      const paymentRisk = getRiskLevel(scenario.paymentChange);
                      return (
                        <TableRow 
                          key={i} 
                          className={scenario.isBase ? 'bg-blue-50 dark:bg-blue-950/20 font-semibold' : ''}
                        >
                          <TableCell className="text-sm">
                            {scenario.apr.toFixed(2)}%
                            {scenario.isBase && <Badge variant="secondary" className="ml-2 text-xs">Base</Badge>}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {scenario.ear.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(scenario.payment)}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${paymentRisk.color}`}>
                            {scenario.paymentChange >= 0 ? '+' : ''}{formatPercent(scenario.paymentChange)}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${scenario.interestChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {scenario.interestChange >= 0 ? '+' : ''}{formatPercent(scenario.interestChange)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3 max-h-64 overflow-y-auto">
                {analysis.scenarios.map((scenario, i) => {
                  const paymentRisk = getRiskLevel(scenario.paymentChange);
                  return (
                    <Card key={i} className={`p-3 ${scenario.isBase ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-sm">{scenario.apr.toFixed(2)}% APR</h4>
                        {scenario.isBase && <Badge variant="secondary" className="text-xs">Base</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">EAR</p>
                          <p className="font-mono font-semibold">{scenario.ear.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Payment</p>
                          <p className="font-mono font-semibold">{formatCurrency(scenario.payment)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Payment Change</p>
                          <p className={`font-mono font-semibold ${paymentRisk.color}`}>
                            {scenario.paymentChange >= 0 ? '+' : ''}{formatPercent(scenario.paymentChange)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Interest Change</p>
                          <p className={`font-mono font-semibold ${scenario.interestChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {scenario.interestChange >= 0 ? '+' : ''}{formatPercent(scenario.interestChange)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* EAR Explanation Footnote */}
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300">
                <p className="font-semibold mb-1">Understanding EAR (Effective Annual Rate)</p>
                <p className="mb-2">
                  EAR is the annual interest rate that accounts for compounding frequency. Unlike APR (which is a stated rate), EAR shows the true yearly cost of borrowing by factoring in how many times interest compounds per year.
                </p>
                <p>
                  <strong>Why it matters:</strong> When comparing loans with different payment schedules or compounding frequencies, EAR provides a more accurate comparison. For example, two loans with the same 6% APR but different payment frequencies will have different EARs and different true costs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
