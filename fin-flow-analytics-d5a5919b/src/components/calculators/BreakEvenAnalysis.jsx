
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Target, DollarSign, Shield, AlertTriangle, RotateCcw, Copy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const formatNumber = (num) => {
  if (num === null || num === undefined || !isFinite(num)) {
    return "N/A";
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const initialState = {
  fixedCosts: 50000,
  pricePerUnit: 120,
  variableCostPerUnit: 70,
  expectedSales: 1500,
};

export default function BreakEvenAnalysis() {
  const [fixedCosts, setFixedCosts] = useState(initialState.fixedCosts);
  const [pricePerUnit, setPricePerUnit] = useState(initialState.pricePerUnit);
  const [variableCostPerUnit, setVariableCostPerUnit] = useState(initialState.variableCostPerUnit);
  const [expectedSales, setExpectedSales] = useState(initialState.expectedSales);
  const [copyText, setCopyText] = useState('Copy');

  const {
    contributionMargin,
    breakEvenQuantity,
    breakEvenRevenue,
    marginOfSafetyUnits,
    marginOfSafetyPercent,
    isValid,
    chartData,
    maxQuantity,
    error
  } = useMemo(() => {
    const contributionMargin = pricePerUnit - variableCostPerUnit;
    
    if (pricePerUnit <= variableCostPerUnit) {
      const errorMsg = contributionMargin === 0 
        ? 'Break-even is infinite. Price per unit must be greater than variable cost per unit.'
        : 'Sale Price per Unit must be greater than Variable Cost per Unit to be profitable.';
      // Return default values for calculations when invalid to avoid destructuring errors
      return { 
        isValid: false, 
        chartData: [], 
        maxQuantity: 0, 
        error: errorMsg,
        contributionMargin: 0,
        breakEvenQuantity: 0,
        breakEvenRevenue: 0,
        marginOfSafetyUnits: 0,
        marginOfSafetyPercent: 0
      };
    }

    const breakEvenQuantity = fixedCosts / contributionMargin;
    const breakEvenRevenue = breakEvenQuantity * pricePerUnit;

    let marginOfSafetyUnits = null;
    let marginOfSafetyPercent = null;
    if (expectedSales > 0) {
      marginOfSafetyUnits = expectedSales - breakEvenQuantity;
      marginOfSafetyPercent = (marginOfSafetyUnits / expectedSales) * 100;
    }
    
    // Ensure maxQuantity is reasonable even if breakEvenQuantity or expectedSales are 0 or small
    const calculatedMaxQuantity = Math.max(breakEvenQuantity, expectedSales || 0);
    const finalMaxQuantity = calculatedMaxQuantity === 0 ? 1000 : calculatedMaxQuantity * 1.5; // Avoid 0 maxQuantity for chart

    const chartData = [];
    const step = finalMaxQuantity / 10;
    for (let i = 0; i <= 10; i++) {
      const quantity = step * i;
      chartData.push({
        quantity: Math.round(quantity),
        revenue: quantity * pricePerUnit,
        totalCost: fixedCosts + (quantity * variableCostPerUnit),
      });
    }

    return {
      contributionMargin,
      breakEvenQuantity,
      breakEvenRevenue,
      marginOfSafetyUnits,
      marginOfSafetyPercent,
      isValid: true,
      error: null,
      chartData,
      maxQuantity: finalMaxQuantity
    };
  }, [fixedCosts, pricePerUnit, variableCostPerUnit, expectedSales]);

  const handleReset = () => {
    setFixedCosts(initialState.fixedCosts);
    setPricePerUnit(initialState.pricePerUnit);
    setVariableCostPerUnit(initialState.variableCostPerUnit);
    setExpectedSales(initialState.expectedSales);
  };

  const handleCopy = () => {
    const resultsText = `
Break-Even Analysis Results:
----------------------------
Break-Even Point: ${formatNumber(breakEvenQuantity)} units
Break-Even Revenue: $${formatNumber(breakEvenRevenue)}
Contribution Margin: $${formatNumber(contributionMargin)} / unit
${expectedSales > 0 && marginOfSafetyUnits !== null ? `Margin of Safety: ${formatNumber(marginOfSafetyUnits)} units (${formatNumber(marginOfSafetyPercent)}%)` : ''}
    `.trim();
    navigator.clipboard.writeText(resultsText);
    setCopyText('Copied!');
    setTimeout(() => setCopyText('Copy'), 2000);
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Break-Even & Margin of Safety</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Find the point where revenue equals costs
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" size="sm" className="gap-2"><RotateCcw className="h-4 w-4"/> Reset</Button>
              <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2"><Copy className="h-4 w-4"/> {copyText}</Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Inputs Section */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fixed-costs">Total Fixed Costs ($)</Label>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="fixed-costs"
                      type="number"
                      value={fixedCosts}
                      onChange={(e) => setFixedCosts(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="e.g., 50000"
                    />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold">Fixed Costs (monthly/annual, independent of sales):</p>
                      <ul className="text-sm space-y-1 list-disc pl-5">
                        <li>Rent/Lease</li>
                        <li>Salaries (admin staff, management)</li>
                        <li>Insurance / licenses</li>
                        <li>Other overhead</li>
                      </ul>
                      <p className="text-xs italic">Costs that don't change with production volume</p>
                    </div>
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-per-unit">Sale Price per Unit ($)</Label>
                 <UITooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="price-per-unit"
                      type="number"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="e.g., 120"
                    />
                  </TooltipTrigger>
                  <TooltipContent>The amount you sell one unit of your product/service for.</TooltipContent>
                </UITooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="variable-cost-per-unit">Variable Cost per Unit ($)</Label>
                 <UITooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="variable-cost-per-unit"
                      type="number"
                      value={variableCostPerUnit}
                      onChange={(e) => setVariableCostPerUnit(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="e.g., 70"
                    />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold">Variable Costs (per unit sold):</p>
                      <ul className="text-sm space-y-1 list-disc pl-5">
                        <li>Materials</li>
                        <li>Packaging</li>
                        <li>Delivery/shipping</li>
                        <li>Commission or per-sale fees</li>
                      </ul>
                      <p className="text-xs italic">Costs that vary directly with production volume</p>
                    </div>
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected-sales">Expected Sales (Units)</Label>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="expected-sales"
                      type="number"
                      value={expectedSales}
                      onChange={(e) => setExpectedSales(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="e.g., 1500 (Optional)"
                    />
                   </TooltipTrigger>
                   <TooltipContent>Your sales forecast, used to calculate Margin of Safety.</TooltipContent>
                </UITooltip>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {!isValid ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Invalid Input</AlertTitle>
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <p className="text-sm text-gray-500">Break-Even Point</p>
                      <p className="text-2xl font-bold">{formatNumber(breakEvenQuantity)} <span className="text-lg font-medium">units</span></p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-gray-500">Break-Even Revenue</p>
                      <p className="text-2xl font-bold">${formatNumber(breakEvenRevenue)}</p>
                    </Card>
                    <Card className={`p-4 ${marginOfSafetyUnits !== null && marginOfSafetyUnits < 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-500" />
                        <p className="text-sm text-gray-500">Margin of Safety</p>
                      </div>
                      <p className={`text-xl font-bold ${marginOfSafetyUnits !== null && marginOfSafetyUnits < 0 ? 'text-red-600' : ''}`}>
                        {formatNumber(marginOfSafetyUnits)} <span className="text-base font-medium">units</span>
                      </p>
                      <p className={`text-xl font-bold ${marginOfSafetyPercent !== null && marginOfSafetyPercent < 0 ? 'text-red-600' : ''}`}>
                        {formatNumber(marginOfSafetyPercent)}%
                      </p>
                    </Card>
                    <Card className="p-4">
                       <p className="text-sm text-gray-500">Contribution Margin</p>
                       <p className="text-2xl font-bold">${formatNumber(contributionMargin)} <span className="text-lg font-medium">/ unit</span></p>
                    </Card>
                  </div>
                  
                  {/* Chart */}
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="quantity" type="number" domain={[0, 'dataMax']} tick={{ fontSize: 12 }} label={{ value: 'Units Sold', position: 'insideBottom', offset: -5 }}/>
                        <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value, name) => [`$${formatNumber(value)}`, name]} labelFormatter={(label) => `Units: ${formatNumber(label)}`} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Total Revenue" stroke="#16a34a" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="totalCost" name="Total Cost" stroke="#dc2626" strokeWidth={2} dot={false} />
                        <ReferenceLine x={breakEvenQuantity} stroke="black" strokeDasharray="4 4" label={{ value: 'B/E Point', position: 'insideTopLeft' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
