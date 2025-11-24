
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, CreditCard, DollarSign, Clock, TrendingDown, RotateCcw, Copy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const formatCurrency = (value) => {
  if (typeof value !== 'number' || !isFinite(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(value);
};

const formatCurrencyCompact = (value) => {
  if (typeof value !== 'number' || !isFinite(value)) return '$0';
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(value);
};

const formatNumber = (value, decimals = 0) => {
  if (typeof value !== 'number' || !isFinite(value)) return '0';
  return value.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

const initialState = {
  principal: 250000,
  annualRate: 6.5,
  termYears: 30,
  paymentsPerYear: 12,
  extraPayment: 0,
};

export default function LoanAmortization() {
  const [principal, setPrincipal] = useState(initialState.principal);
  const [annualRate, setAnnualRate] = useState(initialState.annualRate);
  const [termYears, setTermYears] = useState(initialState.termYears);
  const [paymentsPerYear, setPaymentsPerYear] = useState(initialState.paymentsPerYear);
  const [extraPayment, setExtraPayment] = useState(initialState.extraPayment);
  const [copyText, setCopyText] = useState('Copy');

  const calculations = useMemo(() => {
    if (principal <= 0 || termYears <= 0 || paymentsPerYear <= 0) {
      return { regularSchedule: [], extraSchedule: [], chartData: [] };
    }

    const periodicRate = annualRate / 100 / paymentsPerYear;
    const totalPeriods = Math.ceil(termYears * paymentsPerYear);
    
    // Calculate regular monthly payment
    let regularPayment;
    if (periodicRate === 0) {
      regularPayment = principal / totalPeriods;
    } else {
      regularPayment = principal * (periodicRate * Math.pow(1 + periodicRate, totalPeriods)) / 
                     (Math.pow(1 + periodicRate, totalPeriods) - 1);
    }

    // Generate regular amortization schedule
    const regularSchedule = [];
    let balance = principal;
    let totalInterest = 0;
    
    for (let period = 1; period <= totalPeriods && balance > 0.01; period++) {
      const interestPayment = balance * periodicRate;
      const principalPayment = Math.min(regularPayment - interestPayment, balance);
      balance = Math.max(0, balance - principalPayment);
      totalInterest += interestPayment;
      
      regularSchedule.push({
        period,
        payment: regularPayment,
        interest: interestPayment,
        principal: principalPayment,
        balance,
        totalInterest: totalInterest
      });
    }

    // Generate schedule with extra payments
    const extraSchedule = [];
    let extraBalance = principal;
    let extraTotalInterest = 0;
    let extraPeriod = 1;
    
    while (extraBalance > 0.01 && extraPeriod <= totalPeriods) {
      const interestPayment = extraBalance * periodicRate;
      const totalPayment = regularPayment + extraPayment;
      const principalPayment = Math.min(totalPayment - interestPayment, extraBalance);
      extraBalance = Math.max(0, extraBalance - principalPayment);
      extraTotalInterest += interestPayment;
      
      extraSchedule.push({
        period: extraPeriod,
        payment: totalPayment,
        interest: interestPayment,
        principal: principalPayment,
        balance: extraBalance,
        totalInterest: extraTotalInterest
      });
      
      extraPeriod++;
    }

    // Generate chart data
    const chartData = [];
    const maxPeriods = Math.max(regularSchedule.length, extraSchedule.length);
    
    for (let i = 0; i < maxPeriods; i++) {
      const regular = regularSchedule[i];
      const extra = extraSchedule[i];
      
      chartData.push({
        period: i + 1,
        regularBalance: regular?.balance || 0,
        extraBalance: extra?.balance || 0
      });
    }

    return {
      regularPayment,
      regularSchedule,
      extraSchedule,
      chartData,
      regularTotalInterest: regularSchedule[regularSchedule.length - 1]?.totalInterest || 0,
      extraTotalInterest: extraSchedule[extraSchedule.length - 1]?.totalInterest || 0,
      timeSaved: regularSchedule.length - extraSchedule.length,
      interestSaved: (regularSchedule[regularSchedule.length - 1]?.totalInterest || 0) - 
                    (extraSchedule[extraSchedule.length - 1]?.totalInterest || 0)
    };
  }, [principal, annualRate, termYears, paymentsPerYear, extraPayment]);

  const handleReset = () => {
    setPrincipal(initialState.principal);
    setAnnualRate(initialState.annualRate);
    setTermYears(initialState.termYears);
    setPaymentsPerYear(initialState.paymentsPerYear);
    setExtraPayment(initialState.extraPayment);
  };

  const handleCopy = () => {
    let resultsText = `
Loan Amortization Summary:
--------------------------
Principal: ${formatCurrency(principal)}
Annual Rate: ${annualRate}%
Term: ${termYears} years
Regular Payment: ${formatCurrency(calculations.regularPayment)}
Total Payment (w/ extra): ${formatCurrency(calculations.regularPayment + extraPayment)}
    `.trim();
    if (extraPayment > 0) {
      resultsText += `
Time Saved: ${formatNumber(calculations.timeSaved, 0)} periods
Interest Saved: ${formatCurrency(calculations.interestSaved)}
      `.trim();
    }
    navigator.clipboard.writeText(resultsText);
    setCopyText('Copied!');
    setTimeout(() => setCopyText('Copy'), 2000);
  };

  const exportToCSV = () => {
    const schedule = extraPayment > 0 ? calculations.extraSchedule : calculations.regularSchedule;
    const headers = ['Period', 'Payment', 'Interest', 'Principal', 'Balance'];
    const csvData = [
      headers,
      ...schedule.map(row => [
        row.period,
        row.payment.toFixed(2),
        row.interest.toFixed(2),
        row.principal.toFixed(2),
        row.balance.toFixed(2)
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amortization-schedule.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const paymentFrequencyText = {
    12: 'Monthly',
    26: 'Bi-weekly',
    52: 'Weekly',
    4: 'Quarterly',
    1: 'Annual'
  };

  return (
    <TooltipProvider>
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
              <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl">Loan & Amortization Planner</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Calculate payments and see the impact of extra payments
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleReset} variant="outline" size="sm" className="gap-2"><RotateCcw className="h-4 w-4"/> Reset</Button>
            <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2"><Copy className="h-4 w-4"/> {copyText}</Button>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Inputs Section */}
          <div className="space-y-6">
            <h3 className="font-semibold text-base lg:text-lg">Loan Details</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <UITooltip>
                    <TooltipTrigger className="w-full text-left">
                      <Label>Principal Amount ($)</Label>
                      <Input
                        type="number"
                        value={principal}
                        onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      The initial amount of money borrowed or loaned.
                    </TooltipContent>
                  </UITooltip>
                </div>
                
                <div className="space-y-2">
                  <UITooltip>
                    <TooltipTrigger className="w-full text-left">
                      <Label>Annual Interest Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={annualRate}
                        onChange={(e) => setAnnualRate(Number(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      The yearly interest rate charged on the loan.
                    </TooltipContent>
                  </UITooltip>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <UITooltip>
                    <TooltipTrigger className="w-full text-left">
                      <Label>Loan Term (Years)</Label>
                      <Input
                        type="number"
                        value={termYears}
                        onChange={(e) => setTermYears(Number(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      The total duration over which the loan will be repaid, in years.
                    </TooltipContent>
                  </UITooltip>
                </div>
                
                <div className="space-y-2">
                  <UITooltip>
                    <TooltipTrigger className="w-full text-left">
                      <Label>Payment Frequency</Label>
                      <Select value={paymentsPerYear.toString()} onValueChange={(v) => setPaymentsPerYear(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">Monthly (12/year)</SelectItem>
                          <SelectItem value="26">Bi-weekly (26/year)</SelectItem>
                          <SelectItem value="52">Weekly (52/year)</SelectItem>
                          <SelectItem value="4">Quarterly (4/year)</SelectItem>
                          <SelectItem value="1">Annual (1/year)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TooltipTrigger>
                    <TooltipContent>
                      How often payments are made within a year.
                    </TooltipContent>
                  </UITooltip>
                </div>
              </div>

              <div className="space-y-2">
                <UITooltip>
                  <TooltipTrigger className="w-full text-left">
                    <Label>Extra Payment per Period ($)</Label>
                    <Input
                      type="number"
                      value={extraPayment}
                      onChange={(e) => setExtraPayment(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="Optional extra payment"
                    />
                    <p className="text-xs text-gray-500">Additional amount paid each period toward principal</p>
                  </TooltipTrigger>
                  <TooltipContent>
                    An optional additional amount paid on top of your regular payment, directly reducing the principal.
                  </TooltipContent>
                </UITooltip>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Summary Cards - Mobile Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-xs sm:text-sm font-medium">Regular Payment</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 truncate">
                  {formatCurrencyCompact(calculations.regularPayment)}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {paymentFrequencyText[paymentsPerYear] || 'Per period'}
                </p>
              </Card>

              <Card className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs sm:text-sm font-medium">Total Payment</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                  {formatCurrencyCompact(calculations.regularPayment + extraPayment)}
                </p>
                <p className="text-xs text-gray-500">
                  Including extra payment
                </p>
              </Card>

              {extraPayment > 0 && (
                <>
                  <Card className="p-3 sm:p-4 bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-xs sm:text-sm font-medium">Time Saved</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-green-600">
                      {formatNumber(calculations.timeSaved)} 
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {paymentFrequencyText[paymentsPerYear]?.toLowerCase()} periods
                    </p>
                  </Card>

                  <Card className="p-3 sm:p-4 bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-green-600" />
                      <span className="text-xs sm:text-sm font-medium">Interest Saved</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                      {formatCurrencyCompact(calculations.interestSaved)}
                    </p>
                  </Card>
                </>
              )}
            </div>

            {/* Balance Chart */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm sm:text-base">Loan Balance Over Time</h3>
              <div className="h-48 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={calculations.chartData.slice(0, 120)}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 10 }}
                      label={{ value: 'Period', position: 'insideBottom', offset: -5, style: { fontSize: '10px' } }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                      width={50}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Balance']}
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="regularBalance" 
                      name="Regular Payments"
                      stroke="#dc2626" 
                      strokeWidth={2}
                      dot={false}
                    />
                    {extraPayment > 0 && (
                      <Line 
                        type="monotone" 
                        dataKey="extraBalance" 
                        name="With Extra Payments"
                        stroke="#16a34a" 
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Amortization Table */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="font-semibold text-sm sm:text-base">Amortization Schedule</h3>
                {extraPayment > 0 && (
                  <Badge variant="secondary" className="gap-2 self-start sm:self-auto">
                    <TrendingDown className="h-3 w-3" />
                    With Extra Payments
                  </Badge>
                )}
              </div>
              
              {/* Desktop Table */}
              <div className="hidden sm:block border rounded-lg max-h-80 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-950">
                    <TableRow>
                      <TableHead className="text-xs">Period</TableHead>
                      <TableHead className="text-right text-xs">Payment</TableHead>
                      <TableHead className="text-right text-xs">Interest</TableHead>
                      <TableHead className="text-right text-xs">Principal</TableHead>
                      <TableHead className="text-right text-xs">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(extraPayment > 0 ? calculations.extraSchedule : calculations.regularSchedule)
                      .slice(0, 24)
                      .map((row) => (
                      <TableRow key={row.period}>
                        <TableCell className="font-medium text-xs">{row.period}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(row.payment)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-red-600">
                          {formatCurrency(row.interest)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-blue-600">
                          {formatCurrency(row.principal)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-xs">
                          {formatCurrency(row.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(extraPayment > 0 ? calculations.extraSchedule : calculations.regularSchedule).length > 24 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-4 text-xs">
                          ... and {(extraPayment > 0 ? calculations.extraSchedule : calculations.regularSchedule).length - 24} more periods
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3 max-h-80 overflow-y-auto">
                {(extraPayment > 0 ? calculations.extraSchedule : calculations.regularSchedule)
                  .slice(0, 12)
                  .map((row) => (
                  <Card key={row.period} className="p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-sm">Period {row.period}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Payment</p>
                        <p className="font-mono font-semibold">{formatCurrencyCompact(row.payment)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Interest</p>
                        <p className="font-mono text-red-600">{formatCurrencyCompact(row.interest)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Principal</p>
                        <p className="font-mono text-blue-600">{formatCurrencyCompact(row.principal)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Balance</p>
                        <p className="font-mono font-semibold">{formatCurrencyCompact(row.balance)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
                {(extraPayment > 0 ? calculations.extraSchedule : calculations.regularSchedule).length > 12 && (
                  <div className="text-center text-gray-500 py-2 text-xs">
                    ... and {(extraPayment > 0 ? calculations.extraSchedule : calculations.regularSchedule).length - 12} more periods
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
