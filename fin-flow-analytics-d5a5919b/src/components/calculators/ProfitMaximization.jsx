
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { TrendingUp, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formatCurrency = (value) => {
  if (typeof value !== 'number' || !isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(value);
};

const formatNumber = (value, decimals = 2) => {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  return value.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

export default function ProfitMaximization() {
  // Demand function: P = a - bQ
  const [demandA, setDemandA] = useState(100); // Intercept (max price)
  const [demandB, setDemandB] = useState(0.5);  // Slope (price sensitivity)
  
  // Cost function: C = F + cQ
  const [fixedCost, setFixedCost] = useState(500); // Fixed cost
  const [marginalCost, setMarginalCost] = useState(20); // Variable cost per unit

  const results = useMemo(() => {
    // Validation
    if (demandA <= 0 || demandB <= 0) {
      return { 
        error: "Demand parameters must be positive (a > 0, b > 0)",
        isValid: false 
      };
    }
    
    if (marginalCost < 0) {
      return { 
        error: "Marginal cost cannot be negative",
        isValid: false 
      };
    }

    if (demandA <= marginalCost) {
      return { 
        error: "Maximum price (a) must be greater than marginal cost for profitable operation",
        isValid: false 
      };
    }

    // Core calculations
    const optimalQuantity = Math.max(0, (demandA - marginalCost) / (2 * demandB));
    const optimalPrice = demandA - demandB * optimalQuantity;
    const totalRevenue = optimalPrice * optimalQuantity;
    const totalCost = fixedCost + marginalCost * optimalQuantity;
    const maxProfit = totalRevenue - totalCost;
    
    // Marginal revenue at optimal point: MR = a - 2bQ
    const marginalRevenue = demandA - 2 * demandB * optimalQuantity;
    
    // Correct price elasticity calculation: ε = -(a+c)/(a-c) at optimal quantity for P=a-bQ and MR=MC.
    // The previous formula -(demandB * optimalQuantity) / optimalPrice was a general point elasticity formula.
    // For profit maximization, where MR = MC, and assuming linear demand (P = a - bQ) and constant MC,
    // the optimal quantity is Q* = (a - c) / (2b).
    // The optimal price is P* = a - bQ* = a - b((a - c) / (2b)) = a - (a - c) / 2 = (2a - a + c) / 2 = (a + c) / 2.
    // Price Elasticity of Demand (PED) at Q*: ε = (dQ/dP) * (P/Q)
    // From P = a - bQ, dP/dQ = -b, so dQ/dP = -1/b.
    // Therefore, ε = (-1/b) * (P*/Q*) = (-1/b) * (((a + c) / 2) / ((a - c) / (2b)))
    // ε = (-1/b) * ((a + c) / 2) * (2b / (a - c))
    // ε = -(a + c) / (a - c)
    const elasticityAtOptimum = -(demandA + marginalCost) / (demandA - marginalCost);
    
    // Generate chart data
    const maxQ = Math.min(demandA / demandB, optimalQuantity * 2.5);
    const chartData = [];
    
    for (let q = 0; q <= maxQ; q += maxQ / 50) {
      const price = Math.max(0, demandA - demandB * q);
      const tr = price * q;
      const tc = fixedCost + marginalCost * q;
      const profit = tr - tc;
      const mr = demandA - 2 * demandB * q;
      
      chartData.push({
        quantity: q,
        price,
        totalRevenue: tr,
        totalCost: tc,
        profit,
        marginalRevenue: mr,
        marginalCost
      });
    }

    return {
      isValid: true,
      optimalQuantity,
      optimalPrice,
      totalRevenue,
      totalCost,
      maxProfit,
      marginalRevenue,
      chartData,
      // Additional metrics
      elasticityAtOptimum,
      revenueMaximizingQ: demandA / (2 * demandB),
      breakEvenQuantities: calculateBreakEven(demandA, demandB, fixedCost, marginalCost)
    };
  }, [demandA, demandB, fixedCost, marginalCost]);

  // Calculate break-even points where profit = 0
  function calculateBreakEven(a, b, F, c) {
    // Profit = (a - bQ)Q - F - cQ = aQ - bQ² - F - cQ = (a-c)Q - bQ² - F
    // Set profit = 0: -bQ² + (a-c)Q - F = 0
    // bQ² - (a-c)Q + F = 0
    
    const A = b;
    const B = -(a - c);
    const C = F;
    
    const discriminant = B * B - 4 * A * C;
    
    if (discriminant < 0) return []; // No real break-even points
    
    const q1 = (-B - Math.sqrt(discriminant)) / (2 * A);
    const q2 = (-B + Math.sqrt(discriminant)) / (2 * A);
    
    return [q1, q2].filter(q => q >= 0).sort((a, b) => a - b);
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
            <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Profit Maximization (Microeconomics)</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Find optimal quantity and price for maximum profit
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Inputs Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Demand Function: P = a - bQ</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Intercept (a) - Max Price ($)</Label>
                  <Input
                    type="number"
                    value={demandA}
                    onChange={(e) => setDemandA(Number(e.target.value) || 0)}
                    className="font-mono"
                    placeholder="e.g., 100"
                  />
                  <p className="text-xs text-gray-500">Price when quantity = 0</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Slope (b) - Price Sensitivity</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={demandB}
                    onChange={(e) => setDemandB(Number(e.target.value) || 0)}
                    className="font-mono"
                    placeholder="e.g., 0.5"
                  />
                  <p className="text-xs text-gray-500">Price decrease per unit increase</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Cost Function: C = F + cQ</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fixed Cost (F) ($)</Label>
                  <Input
                    type="number"
                    value={fixedCost}
                    onChange={(e) => setFixedCost(Number(e.target.value) || 0)}
                    className="font-mono"
                    placeholder="e.g., 500"
                  />
                  <p className="text-xs text-gray-500">Cost independent of quantity</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Marginal Cost (c) ($/unit)</Label>
                  <Input
                    type="number"
                    value={marginalCost}
                    onChange={(e) => setMarginalCost(Number(e.target.value) || 0)}
                    className="font-mono"
                    placeholder="e.g., 20"
                  />
                  <p className="text-xs text-gray-500">Variable cost per unit</p>
                </div>
              </div>
            </div>

            {/* Current demand and cost equations */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold mb-2">Current Model</h4>
              <p className="font-mono text-sm">P(Q) = {demandA} - {demandB}Q</p>
              <p className="font-mono text-sm">C(Q) = {fixedCost} + {marginalCost}Q</p>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {!results.isValid ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{results.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Key Results */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Optimal Quantity</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatNumber(results.optimalQuantity)} <span className="text-lg">units</span>
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Optimal Price</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(results.optimalPrice)}
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium">Maximum Profit</span>
                    </div>
                    <p className={`text-2xl font-bold ${results.maxProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(results.maxProfit)}
                    </p>
                    <Badge variant={results.maxProfit >= 0 ? "default" : "destructive"} className="mt-1">
                      {results.maxProfit >= 0 ? "Profitable" : "Loss"}
                    </Badge>
                  </Card>

                  <Card className="p-4">
                    <span className="text-sm font-medium text-gray-500">Total Revenue</span>
                    <p className="text-xl font-bold">
                      {formatCurrency(results.totalRevenue)}
                    </p>
                    <span className="text-sm font-medium text-gray-500">Total Cost</span>
                    <p className="text-xl font-bold">
                      {formatCurrency(results.totalCost)}
                    </p>
                  </Card>
                </div>

                {/* Economic Analysis */}
                <Card className="p-4">
                  <h4 className="font-semibold mb-2">Economic Analysis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Marginal Revenue at Optimum:</strong> {formatCurrency(results.marginalRevenue)}</p>
                      <p><strong>Marginal Cost:</strong> {formatCurrency(marginalCost)}</p>
                      <p><strong>Price Elasticity at Optimum:</strong> {formatNumber(results.elasticityAtOptimum)}</p>
                    </div>
                    <div>
                      <p><strong>Revenue-Maximizing Q:</strong> {formatNumber(results.revenueMaximizingQ)} units</p>
                      {results.breakEvenQuantities.length > 0 && (
                        <p><strong>Break-Even Points:</strong> {results.breakEvenQuantities.map(q => formatNumber(q)).join(', ')} units</p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Charts */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Revenue, Cost & Profit Curves</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={results.chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="quantity" 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Quantity (Q)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                          label={{ value: 'Value ($)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [formatCurrency(value), name]}
                          labelFormatter={(label) => `Quantity: ${formatNumber(label)}`}
                        />
                        <Legend />
                        
                        <Line 
                          type="monotone" 
                          dataKey="totalRevenue" 
                          name="Total Revenue"
                          stroke="#22c55e" 
                          strokeWidth={3}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalCost" 
                          name="Total Cost"
                          stroke="#ef4444" 
                          strokeWidth={3}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          name="Profit"
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={false}
                        />
                        
                        {/* Mark optimal point */}
                        <ReferenceLine 
                          x={results.optimalQuantity} 
                          stroke="black" 
                          strokeDasharray="4 4"
                          label={{ value: 'Q*', position: 'insideBottomRight' }}
                        />
                        <ReferenceLine 
                          y={0} 
                          stroke="gray" 
                          strokeDasharray="2 2"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
