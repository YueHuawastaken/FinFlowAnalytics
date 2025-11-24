
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FlaskConical, ArrowRight, ArrowDown, ArrowUp, Zap } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge'; // Added Badge import for mobile view

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const calculateCashflow = (startCash, revenues, expenses) => {
  let cash = startCash;
  return revenues.map((revenue, i) => {
    const expense = expenses[i];
    const net = revenue - expense;
    cash += net;
    return { revenue, expense, net, cash };
  });
};

const formatCurrency = (value) => {
    if (typeof value !== 'number' || !isFinite(value)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export default function ScenarioTester() {
  const [startingCash, setStartingCash] = useState(50000);
  const [baseRevenue, setBaseRevenue] = useState(25000);
  const [baseExpense, setBaseExpense] = useState(20000);
  const [revenueGrowth, setRevenueGrowth] = useState(2);
  const [expenseGrowth, setExpenseGrowth] = useState(1);
  
  const [revenueChange, setRevenueChange] = useState([10]);
  const [expenseChange, setExpenseChange] = useState([-5]);

  const { baseCase, scenarioCase, comparisonData, impact } = useMemo(() => {
    const baseRevenues = Array(12).fill(0).map((_, i) => baseRevenue * Math.pow(1 + revenueGrowth / 100, i));
    const baseExpenses = Array(12).fill(0).map((_, i) => baseExpense * Math.pow(1 + expenseGrowth / 100, i));
    const baseCase = calculateCashflow(startingCash, baseRevenues, baseExpenses);

    const scenarioRevenues = baseRevenues.map(r => r * (1 + revenueChange[0] / 100));
    const scenarioExpenses = baseExpenses.map(e => e * (1 + expenseChange[0] / 100));
    const scenarioCase = calculateCashflow(startingCash, scenarioRevenues, scenarioExpenses);
    
    const comparisonData = months.map((month, i) => ({
      month,
      baseCash: baseCase[i].cash,
      scenarioCash: scenarioCase[i].cash,
      delta: scenarioCase[i].cash - baseCase[i].cash,
    }));

    const baseEndingCash = baseCase[11].cash;
    const scenarioEndingCash = scenarioCase[11].cash;
    const cashImpact = scenarioEndingCash - baseEndingCash;
    const cashImpactPercent = baseEndingCash !== 0 ? (cashImpact / Math.abs(baseEndingCash)) * 100 : (scenarioEndingCash > 0 ? 100 : 0);
    
    return {
      baseCase,
      scenarioCase,
      comparisonData,
      impact: {
        baseEndingCash,
        scenarioEndingCash,
        cashImpact,
        cashImpactPercent
      }
    };
  }, [startingCash, baseRevenue, baseExpense, revenueGrowth, expenseGrowth, revenueChange, expenseChange]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
            <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-xl">Scenario Tester (What-If Analysis)</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Instantly model the impact of financial changes
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Inputs Section - Mobile Responsive */}
          <div className="space-y-6">
            <h3 className="font-semibold text-base lg:text-lg">Base Case Assumptions</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Starting Cash ($)</Label>
                <Input type="number" value={startingCash} onChange={(e) => setStartingCash(Number(e.target.value) || 0)} className="font-mono" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Base Monthly Revenue ($)</Label>
                <Input type="number" value={baseRevenue} onChange={(e) => setBaseRevenue(Number(e.target.value) || 0)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Monthly Growth (%)</Label>
                <Input type="number" value={revenueGrowth} onChange={(e) => setRevenueGrowth(Number(e.target.value) || 0)} className="font-mono" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label className="text-sm">Base Monthly Expenses ($)</Label>
                <Input type="number" value={baseExpense} onChange={(e) => setBaseExpense(Number(e.target.value) || 0)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Monthly Growth (%)</Label>
                <Input type="number" value={expenseGrowth} onChange={(e) => setExpenseGrowth(Number(e.target.value) || 0)} className="font-mono" />
              </div>
            </div>

            <Separator />
            <h3 className="font-semibold text-base lg:text-lg">Scenario Adjustments</h3>
             <div className="space-y-4">
              <Label>Revenue Change (%)</Label>
              <div className="flex items-center gap-4">
                <Slider value={revenueChange} onValueChange={setRevenueChange} min={-50} max={50} step={1} className="flex-1" />
                <span className="font-mono text-base sm:text-lg w-16 sm:w-20 text-center p-2 rounded-md bg-gray-100 dark:bg-gray-800">{revenueChange[0]}%</span>
              </div>
            </div>
            <div className="space-y-4">
              <Label>Expense Change (%)</Label>
              <div className="flex items-center gap-4">
                <Slider value={expenseChange} onValueChange={setExpenseChange} min={-50} max={50} step={1} className="flex-1" />
                <span className="font-mono text-base sm:text-lg w-16 sm:w-20 text-center p-2 rounded-md bg-gray-100 dark:bg-gray-800">{expenseChange[0]}%</span>
              </div>
            </div>
          </div>

          {/* Results Section - Mobile Responsive */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-3 sm:p-4 text-center">
                 <p className="text-xs sm:text-sm font-medium text-gray-500">Base Ending Cash</p>
                 <p className="text-lg sm:text-2xl font-bold">{formatCurrency(impact.baseEndingCash)}</p>
              </Card>
              <div className="hidden sm:flex items-center justify-center">
                <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
              </div>
              <Card className="p-3 sm:p-4 text-center">
                 <p className="text-xs sm:text-sm font-medium text-gray-500">Scenario Ending Cash</p>
                 <p className="text-lg sm:text-2xl font-bold">{formatCurrency(impact.scenarioEndingCash)}</p>
              </Card>
            </div>
            
             <Card className={`p-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-center ${impact.cashImpact > 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                <Zap className={`h-5 w-5 sm:h-6 sm:w-6 ${impact.cashImpact > 0 ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">12-Month Cash Impact</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                        <span className={`text-xl sm:text-2xl font-bold ${impact.cashImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {impact.cashImpact > 0 ? '+' : ''}{formatCurrency(impact.cashImpact)}
                        </span>
                        <span className={`text-base sm:text-lg font-semibold flex items-center ${impact.cashImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {impact.cashImpact > 0 ? <ArrowUp className="h-4 w-4"/> : <ArrowDown className="h-4 w-4"/>}
                            {impact.cashImpactPercent.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </Card>
            
            <div className="h-48 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={50} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line name="Base Case" dataKey="baseCash" stroke="#8884d8" strokeWidth={2} dot={false} />
                  <Line name="Scenario" dataKey="scenarioCash" stroke="#82ca9d" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Mobile-Responsive Table */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Monthly Breakdown</h4>
              
              {/* Desktop Table */}
              <div className="hidden sm:block border rounded-lg max-h-64 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-950">
                    <TableRow>
                      <TableHead className="text-xs">Month</TableHead>
                      <TableHead className="text-xs">Base Cash</TableHead>
                      <TableHead className="text-xs">Scenario Cash</TableHead>
                      <TableHead className="text-xs">Impact ($)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.map(d => (
                      <TableRow key={d.month}>
                        <TableCell className="font-medium text-sm">{d.month}</TableCell>
                        <TableCell className="font-mono text-sm">{formatCurrency(d.baseCash)}</TableCell>
                        <TableCell className="font-mono text-sm">{formatCurrency(d.scenarioCash)}</TableCell>
                        <TableCell className={`font-mono text-sm ${d.delta > 0 ? 'text-green-600' : d.delta < 0 ? 'text-red-600' : ''}`}>
                          {d.delta > 0 ? '+' : ''}{formatCurrency(d.delta)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-2 max-h-64 overflow-y-auto">
                {comparisonData.map(d => (
                  <Card key={d.month} className="p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-sm">{d.month}</h4>
                      <Badge className={`text-xs ${d.delta > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : d.delta < 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                        {d.delta > 0 ? '+' : ''}{formatCurrency(d.delta)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Base Cash</p>
                        <p className="font-mono">{formatCurrency(d.baseCash)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Scenario Cash</p>
                        <p className="font-mono">{formatCurrency(d.scenarioCash)}</p>
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
  );
}
