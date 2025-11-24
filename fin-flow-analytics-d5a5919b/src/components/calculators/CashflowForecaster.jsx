
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, TrendingUp, DollarSign, AlertTriangle, RotateCcw, Copy, Info, TrendingDown, Banknote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (value, compact = false) => {
  if (typeof value !== 'number' || !isFinite(value)) return '$0';
  
  if (compact) {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const initialState = {
  startingCash: 50000,
  baseRevenue: 25000,
  baseExpense: 20000,
  revenueGrowth: 2,
  expenseGrowth: 1.5,
  manualRevenues: Array(12).fill(25000),
  manualExpenses: Array(12).fill(20000)
};

export default function CashflowForecaster() {
  const [startingCash, setStartingCash] = useState(initialState.startingCash);
  const [autoMode, setAutoMode] = useState(true);
  const [baseRevenue, setBaseRevenue] = useState(initialState.baseRevenue);
  const [baseExpense, setBaseExpense] = useState(initialState.baseExpense);
  const [revenueGrowth, setRevenueGrowth] = useState(initialState.revenueGrowth);
  const [expenseGrowth, setExpenseGrowth] = useState(initialState.expenseGrowth);
  const [manualRevenues, setManualRevenues] = useState(initialState.manualRevenues);
  const [manualExpenses, setManualExpenses] = useState(initialState.manualExpenses);
  const [compactNumbers, setCompactNumbers] = useState(false);
  const [copyText, setCopyText] = useState('Copy');

  // Live calculation with proper rounding policy
  const calculations = useMemo(() => {
    let revenues, expenses;
    
    if (autoMode) {
      // Auto-generate using growth rates
      revenues = Array(12).fill(0).map((_, i) => 
        Math.round(baseRevenue * Math.pow(1 + revenueGrowth / 100, i))
      );
      expenses = Array(12).fill(0).map((_, i) => 
        Math.round(baseExpense * Math.pow(1 + expenseGrowth / 100, i))
      );
    } else {
      // Use manual entries, rounded to nearest dollar
      revenues = manualRevenues.map(r => Math.round(r || 0));
      expenses = manualExpenses.map(e => Math.round(e || 0));
    }
    
    let cash = startingCash;
    const results = [];
    let totalRevenue = 0;
    let totalExpenses = 0;
    let negativeMonths = 0;
    
    for (let i = 0; i < 12; i++) {
      const revenue = revenues[i];
      const expense = expenses[i];
      const net = revenue - expense; // Already rounded since revenue and expense are rounded
      cash += net;
      
      // Sum from rounded values to match display
      totalRevenue += revenue;
      totalExpenses += expense;
      
      if (cash < 0) negativeMonths++;
      
      results.push({
        month: months[i],
        monthIndex: i + 1,
        revenue,
        expense,
        net,
        cash: Math.round(cash), // Round cash balance for display consistency
        isNegativeCash: cash < 0,
        isNegativeNet: net < 0
      });
    }
    
    const endingBalance = results[11].cash; // Use the rounded final cash balance
    const netCashFlow = totalRevenue - totalExpenses; // From rounded monthly values
    const minCash = Math.min(startingCash, ...results.map(r => r.cash));
    const maxCash = Math.max(startingCash, ...results.map(r => r.cash));
    
    return {
      results,
      totalRevenue,
      totalExpenses,
      endingBalance,
      netCashFlow,
      minCash,
      maxCash,
      negativeMonths,
      hasRisk: negativeMonths > 0 || minCash < 0
    };
  }, [startingCash, autoMode, baseRevenue, baseExpense, revenueGrowth, expenseGrowth, manualRevenues, manualExpenses]);

  const handleReset = () => {
    setStartingCash(initialState.startingCash);
    setAutoMode(true);
    setBaseRevenue(initialState.baseRevenue);
    setBaseExpense(initialState.baseExpense);
    setRevenueGrowth(initialState.revenueGrowth);
    setExpenseGrowth(initialState.expenseGrowth);
    setManualRevenues([...initialState.manualRevenues]);
    setManualExpenses([...initialState.manualExpenses]);
  };

  const handleCopy = () => {
    const resultsText = `
12-Month Cashflow Forecast Results:
===================================
Starting Cash: ${formatCurrency(startingCash)}
Total Revenue: ${formatCurrency(calculations.totalRevenue)}
Total Expenses: ${formatCurrency(calculations.totalExpenses)}
Net Cash Flow: ${formatCurrency(calculations.netCashFlow)}
Ending Balance: ${formatCurrency(calculations.endingBalance)}
${calculations.hasRisk ? `⚠️ Risk Alert: ${calculations.negativeMonths} months with negative cash` : '✅ No cash shortages projected'}
    `.trim();
    navigator.clipboard.writeText(resultsText);
    setCopyText('Copied!');
    setTimeout(() => setCopyText('Copy'), 2000);
  };

  const exportToCSV = () => {
    const headers = ['Month', 'Revenue', 'Expenses', 'Net Cash Flow', 'Cash Balance'];
    const csvData = [
      headers,
      ...calculations.results.map(row => [
        row.month,
        row.revenue.toFixed(2), // Still use toFixed for CSV export for decimal precision
        row.expense.toFixed(2),
        row.net.toFixed(2),
        row.cash.toFixed(2)
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cashflow-forecast.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateManualRevenue = (index, value) => {
    const newRevenues = [...manualRevenues];
    newRevenues[index] = Number(value) || 0; // Will be rounded in useMemo
    setManualRevenues(newRevenues);
  };

  const updateManualExpense = (index, value) => {
    const newExpenses = [...manualExpenses];
    newExpenses[index] = Number(value) || 0; // Will be rounded in useMemo
    setManualExpenses(newExpenses);
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg sm:text-xl">12-Month Cashflow Forecaster</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Project your monthly cash position and identify potential shortfalls
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="compact-toggle" className="text-sm">Compact</Label>
                <Switch
                  id="compact-toggle"
                  checked={compactNumbers}
                  onCheckedChange={setCompactNumbers}
                />
              </div>
              <Button onClick={handleReset} variant="outline" size="sm" className="gap-2">
                <RotateCcw className="h-4 w-4"/> Reset
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
          {/* KPI Dashboard - Mobile Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-3 sm:p-4 bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Total Revenue</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                {formatCurrency(calculations.totalRevenue, compactNumbers)}
              </p>
            </Card>
            
            <Card className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-950/20">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <span className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">Total Expenses</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-orange-600 truncate">
                {formatCurrency(calculations.totalExpenses, compactNumbers)}
              </p>
            </Card>
            
            <Card className={`p-3 sm:p-4 ${calculations.endingBalance >= 0 ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
              <div className="flex items-center gap-2">
                <Banknote className={`h-4 w-4 ${calculations.endingBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                <span className={`text-xs sm:text-sm font-medium ${calculations.endingBalance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>Ending Balance</span>
              </div>
              <p className={`text-lg sm:text-2xl font-bold ${calculations.endingBalance >= 0 ? 'text-blue-600' : 'text-red-600'} truncate`}>
                {formatCurrency(calculations.endingBalance, compactNumbers)}
              </p>
            </Card>

            <Card className={`p-3 sm:p-4 ${calculations.hasRisk ? 'bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20'}`}>
              <div className="flex items-center gap-2">
                {calculations.hasRisk ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <DollarSign className="h-4 w-4 text-green-600" />
                )}
                <span className={`text-xs sm:text-sm font-medium ${calculations.hasRisk ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                  Risk Status
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={calculations.hasRisk ? "destructive" : "default"} className="text-xs">
                  {calculations.hasRisk ? `${calculations.negativeMonths} Risk Months` : 'No Risks'}
                </Badge>
              </div>
            </Card>
          </div>

          {calculations.hasRisk && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                Cash shortage detected in {calculations.negativeMonths} month{calculations.negativeMonths !== 1 ? 's' : ''}. 
                Lowest balance: {formatCurrency(calculations.minCash, compactNumbers)}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Inputs Section - Mobile Responsive */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-base lg:text-lg">Initial Setup</h3>
                <div className="space-y-2">
                  <Label>Starting Cash Balance ($)</Label>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="number"
                        value={startingCash}
                        onChange={(e) => setStartingCash(Number(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      The amount of cash your business has at the start of the forecast period
                    </TooltipContent>
                  </UITooltip>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Revenue & Expense Input Mode</h3>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="mode-switch" className="text-sm">
                      {autoMode ? 'Auto-Generate' : 'Manual Entry'}
                    </Label>
                    <Switch
                      id="mode-switch"
                      checked={!autoMode}
                      onCheckedChange={(checked) => setAutoMode(!checked)}
                    />
                  </div>
                </div>

                {autoMode ? (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>Auto-generating from base amounts and growth rates</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Base Monthly Revenue ($)</Label>
                        <Input
                          type="number"
                          value={baseRevenue}
                          onChange={(e) => setBaseRevenue(Number(e.target.value) || 0)}
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Base Monthly Expenses ($)</Label>
                        <Input
                          type="number"
                          value={baseExpense}
                          onChange={(e) => setBaseExpense(Number(e.target.value) || 0)}
                          className="font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label>Revenue Growth Rate</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[revenueGrowth]}
                            onValueChange={(value) => setRevenueGrowth(value[0])}
                            min={-50}
                            max={200}
                            step={0.1}
                            className="flex-1"
                          />
                          <div className="flex items-center gap-1 w-24">
                            <Input
                              type="number"
                              value={revenueGrowth.toFixed(1)}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (!isNaN(val) && val >= -50 && val <= 200) {
                                  setRevenueGrowth(val);
                                }
                              }}
                              className="text-sm font-mono text-center"
                              step="0.1"
                              min="-50"
                              max="200"
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label>Expense Growth Rate</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[expenseGrowth]}
                            onValueChange={(value) => setExpenseGrowth(value[0])}
                            min={-50}
                            max={200}
                            step={0.1}
                            className="flex-1"
                          />
                          <div className="flex items-center gap-1 w-24">
                            <Input
                              type="number"
                              value={expenseGrowth.toFixed(1)}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (!isNaN(val) && val >= -50 && val <= 200) {
                                  setExpenseGrowth(val);
                                }
                              }}
                              className="text-sm font-mono text-center"
                              step="0.1"
                              min="-50"
                              max="200"
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="secondary">
                        Revenue {revenueGrowth >= 0 ? 'growing' : 'declining'} at {Math.abs(revenueGrowth).toFixed(1)}%/month
                      </Badge>
                      <Badge variant="secondary">
                        Expenses {expenseGrowth >= 0 ? 'growing' : 'declining'} at {Math.abs(expenseGrowth).toFixed(1)}%/month
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-lg border p-4 opacity-100">
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <DollarSign className="h-4 w-4" />
                      <span>Enter each month's values manually (rounded to nearest dollar)</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                      {months.map((month, idx) => (
                        <div key={month} className="space-y-2 p-3 rounded-lg border bg-gray-50/50 dark:bg-gray-800/50">
                          <Label className="font-medium text-sm">{month}</Label>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              placeholder="Revenue"
                              value={manualRevenues[idx]}
                              onChange={(e) => updateManualRevenue(idx, e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                            <Input
                              type="number"
                              placeholder="Expenses"
                              value={manualExpenses[idx]}
                              onChange={(e) => updateManualExpense(idx, e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results Section - Mobile Responsive */}
            <div className="space-y-6">
              {/* Cash Flow Chart - Responsive Height */}
              <div className="space-y-2">
                <h3 className="font-semibold">Cash Balance Trend</h3>
                <div className="h-48 sm:h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={calculations.results}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 10 }}
                        className="text-gray-600"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => formatCurrency(value, true)}
                        className="text-gray-600"
                        width={60}
                      />
                      <Tooltip 
                        formatter={(value, name) => [formatCurrency(value, compactNumbers), name]}
                        labelStyle={{ color: 'black' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="cash" 
                        name="Cash Balance"
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 1, r: 3 }}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Breakdown - Enhanced Mobile Design */}
              <div className="space-y-2">
                <h3 className="font-semibold">Monthly Breakdown</h3>
                
                {/* Desktop Table with Sticky Header and Tooltips */}
                <div className="hidden md:block border rounded-lg max-h-80 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10">
                      <TableRow>
                        <TableHead className="font-semibold">Month</TableHead>
                        <TableHead className="text-right font-semibold">Revenue</TableHead>
                        <TableHead className="text-right font-semibold">Expenses</TableHead>
                        <TableHead className="text-right font-semibold">Net Flow</TableHead>
                        <TableHead className="text-right font-semibold">Cash Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculations.results.map((row) => (
                        <TableRow key={row.month} className={row.isNegativeCash ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                          <TableCell className="font-medium">{row.month}</TableCell>
                          <TableCell className="text-right font-mono text-green-600 text-sm">
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <span className={compactNumbers ? "cursor-help" : ""}>
                                  {formatCurrency(row.revenue, compactNumbers)}
                                </span>
                              </TooltipTrigger>
                              {compactNumbers && <TooltipContent>{formatCurrency(row.revenue, false)}</TooltipContent>}
                            </UITooltip>
                          </TableCell>
                          <TableCell className="text-right font-mono text-orange-600 text-sm">
                             <UITooltip>
                              <TooltipTrigger asChild>
                                <span className={compactNumbers ? "cursor-help" : ""}>
                                  {formatCurrency(row.expense, compactNumbers)}
                                </span>
                              </TooltipTrigger>
                              {compactNumbers && <TooltipContent>{formatCurrency(row.expense, false)}</TooltipContent>}
                            </UITooltip>
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${row.isNegativeNet ? 'text-red-600' : 'text-green-600'}`}>
                             <UITooltip>
                              <TooltipTrigger asChild>
                                <span className={compactNumbers ? "cursor-help" : ""}>
                                  {formatCurrency(row.net, compactNumbers)}
                                </span>
                              </TooltipTrigger>
                              {compactNumbers && <TooltipContent>{formatCurrency(row.net, false)}</TooltipContent>}
                            </UITooltip>
                          </TableCell>
                          <TableCell className={`text-right font-mono font-semibold text-sm ${row.isNegativeCash ? 'text-red-600' : 'text-blue-600'}`}>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <span className={compactNumbers ? "cursor-help" : ""}>
                                  {formatCurrency(row.cash, compactNumbers)}
                                </span>
                              </TooltipTrigger>
                              {compactNumbers && <TooltipContent>{formatCurrency(row.cash, false)}</TooltipContent>}
                            </UITooltip>
                            {row.isNegativeCash && (
                              <AlertTriangle className="inline ml-1 h-3 w-3" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card Layout - Enhanced */}
                <div className="md:hidden space-y-3 max-h-80 overflow-y-auto">
                  {calculations.results.map((row) => (
                    <Card key={row.month} className={`p-3 ${row.isNegativeCash ? 'bg-red-50 border-red-200 dark:bg-red-950/20' : ''}`}>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-sm">{row.month}</h4>
                        {row.isNegativeCash && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Risk
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Revenue</p>
                          <p className="font-mono text-green-600 truncate">{formatCurrency(row.revenue, true)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Expenses</p>
                          <p className="font-mono text-orange-600 truncate">{formatCurrency(row.expense, true)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Net Flow</p>
                          <p className={`font-mono truncate ${row.isNegativeNet ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(row.net, true)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Cash Balance</p>
                          <p className={`font-mono font-semibold truncate ${row.isNegativeCash ? 'text-red-600' : 'text-blue-600'}`}>
                            {formatCurrency(row.cash, true)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
