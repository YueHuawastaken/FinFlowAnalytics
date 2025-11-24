
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Scatter, LineChart } from 'recharts';
import { DollarSign, AlertTriangle, CheckCircle, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formatCurrency = (value) => {
  if (typeof value !== 'number' || !isFinite(value)) return '$0.00';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

const formatNumber = (value, decimals = 2) => {
  if (value === null || typeof value !== 'number' || !isFinite(value)) return 'N/A';
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export default function OptimalPricingConstantElasticity() {
  const [mode, setMode] = useState('known_epsilon');
  const [marginalCost, setMarginalCost] = useState(10);

  // State for Known Epsilon mode
  const [knownElasticity, setKnownElasticity] = useState(2);
  const [calibP0, setCalibP0] = useState(25);
  const [calibQ0, setCalibQ0] = useState(100);

  // State for Estimate Epsilon mode
  const [p1, setP1] = useState(20);
  const [q1, setQ1] = useState(200);
  const [p2, setP2] = useState(30);
  const [q2, setQ2] = useState(120);

  const results = useMemo(() => {
    if (marginalCost <= 0) return { error: "Marginal cost must be greater than 0 for a finite optimum." };

    let elasticity, k, calibPoint;
    if (mode === 'known_epsilon') {
      elasticity = Math.abs(knownElasticity);
      if (elasticity <= 1) return { error: "Elasticity must be greater than 1 for a finite optimum." };
      if (calibP0 <= 0 || calibQ0 <= 0) return { error: "Calibration P₀ and Q₀ must be positive." };
      k = calibQ0 * Math.pow(calibP0, elasticity);
      calibPoint = { P: calibP0, Q: calibQ0 };
    } else { // estimate_epsilon
      if (p1 <= 0 || q1 <= 0 || p2 <= 0 || q2 <= 0) return { error: "All price/quantity points must be positive." };
      if (p1 === p2) return { error: "P₁ and P₂ must be different to estimate elasticity." };
      elasticity = -Math.log(q2 / q1) / Math.log(p2 / p1);
      if (elasticity <= 1) return { error: `Estimated elasticity (${formatNumber(elasticity)}) is not greater than 1. No finite optimum.` };
      calibPoint = { P: p1, Q: q1 }; // Default to P1, Q1
      k = calibPoint.Q * Math.pow(calibPoint.P, elasticity);
    }
    
    if (1 - 1 / elasticity <= 0) return { error: "No finite optimum for these inputs." };

    const optimalPrice = marginalCost / (1 - 1 / elasticity);
    if (optimalPrice <= 0) return { error: "Calculated optimal price is not positive." };

    const optimalQuantity = k * Math.pow(optimalPrice, -elasticity);
    const optimalRevenue = optimalPrice * optimalQuantity;
    const optimalProfit = (optimalPrice - marginalCost) * optimalQuantity;
    const markup = (optimalPrice - marginalCost) / optimalPrice;

    // Chart Data
    const plotPriceRange = (center, range = 2) => Array.from({ length: 51 }, (_, i) => center / range + (i * center * (range - 1/range)) / 50);
    const profitCurveData = plotPriceRange(optimalPrice).map(p => ({
        price: p,
        profit: (p - marginalCost) * (k * Math.pow(p, -elasticity))
    }));

    const demandCurveData = plotPriceRange(optimalPrice, 4).map(p => ({
        price: p,
        quantity: k * Math.pow(p, -elasticity)
    }));
    
    return {
      elasticity, k, optimalPrice, optimalQuantity, optimalRevenue, optimalProfit, markup,
      profitCurveData, demandCurveData, calibPoint,
      equation: `Q = ${formatNumber(k,0)} * P^-${formatNumber(elasticity)}`
    };

  }, [mode, marginalCost, knownElasticity, calibP0, calibQ0, p1, q1, p2, q2]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900">
            <DollarSign className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Optimal Pricing (Constant Elasticity)</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">Set profit-maximizing price using the Lerner Index</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Inputs Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Marginal Cost (c) ($/unit)</Label>
              <Input type="number" value={marginalCost} onChange={e => setMarginalCost(Number(e.target.value))} className="font-mono"/>
            </div>
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="known_epsilon">Known Elasticity</TabsTrigger>
                <TabsTrigger value="estimate_epsilon">Estimate Elasticity</TabsTrigger>
              </TabsList>
              <TabsContent value="known_epsilon" className="space-y-4 mt-4">
                 <div className="space-y-2">
                    <Label>Price Elasticity of Demand (ε)</Label>
                    <Input type="number" value={knownElasticity} onChange={e => setKnownElasticity(Number(e.target.value))} className="font-mono" placeholder="Must be > 1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Calibration Price (P₀)</Label>
                      <Input type="number" value={calibP0} onChange={e => setCalibP0(Number(e.target.value))} className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Calibration Quantity (Q₀)</Label>
                      <Input type="number" value={calibQ0} onChange={e => setCalibQ0(Number(e.target.value))} className="font-mono" />
                    </div>
                  </div>
              </TabsContent>
              <TabsContent value="estimate_epsilon" className="space-y-4 mt-4">
                  <p className="text-sm text-gray-500">Provide two observed price-quantity points to estimate elasticity.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price 1 (P₁)</Label>
                      <Input type="number" value={p1} onChange={e => setP1(Number(e.target.value))} className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity 1 (Q₁)</Label>
                      <Input type="number" value={q1} onChange={e => setQ1(Number(e.target.value))} className="font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price 2 (P₂)</Label>
                      <Input type="number" value={p2} onChange={e => setP2(Number(e.target.value))} className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity 2 (Q₂)</Label>
                      <Input type="number" value={q2} onChange={e => setQ2(Number(e.target.value))} className="font-mono" />
                    </div>
                  </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {results.error ? (
              <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Input Error</AlertTitle><AlertDescription>{results.error}</AlertDescription></Alert>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-3">
                    <p className="text-sm font-medium">Optimal Price (P*)</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(results.optimalPrice)}</p>
                  </Card>
                   <Card className="p-3">
                    <p className="text-sm font-medium">Markup % (1/ε)</p>
                    <p className="text-2xl font-bold">{formatNumber(results.markup * 100, 1)}%</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-sm font-medium">Optimal Quantity (Q*)</p>
                    <p className="text-2xl font-bold">{formatNumber(results.optimalQuantity)}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-sm font-medium">Maximum Profit (π*)</p>
                    <p className="text-2xl font-bold">{formatCurrency(results.optimalProfit)}</p>
                  </Card>
                </div>
                <Card className="p-3">
                  <h4 className="font-semibold text-sm">Derived Demand Model</h4>
                  <p className="font-mono text-center text-md">{results.equation}</p>
                  <p className="text-xs text-center text-gray-500">Elasticity (ε) = {formatNumber(results.elasticity, 3)}</p>
                </Card>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Profit vs. Price</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={results.profitCurveData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                      <XAxis type="number" dataKey="price" name="Price" domain={['dataMin', 'dataMax']} tickFormatter={p => formatCurrency(p).replace('.00','')} />
                      <YAxis type="number" domain={['auto', 'auto']} hide={true} />
                      <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={l => `Price: ${formatCurrency(l)}`}/>
                      <Line type="monotone" dataKey="profit" stroke="#8884d8" dot={false} strokeWidth={2}/>
                      <ReferenceLine x={results.optimalPrice} stroke="red" strokeDasharray="4 4" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                 <div>
                  <h3 className="font-semibold text-sm mb-1">Demand Curve</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={results.demandCurveData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                      <XAxis type="number" dataKey="price" name="Price" domain={['dataMin', 'dataMax']} tickFormatter={p => formatCurrency(p).replace('.00','')} />
                      <YAxis type="number" dataKey="quantity" name="Quantity" domain={['auto', 'auto']} hide={true}/>
                      <Tooltip formatter={(v, n) => [formatNumber(v, 0), n]} labelFormatter={l => `Price: ${formatCurrency(l)}`}/>
                      <Line type="monotone" dataKey="quantity" stroke="#82ca9d" dot={false} strokeWidth={2}/>
                      <ReferenceLine x={results.optimalPrice} stroke="red" strokeDasharray="4 4" ifOverflow="extendDomain" />
                      <ReferenceLine y={results.optimalQuantity} stroke="red" strokeDasharray="4 4" ifOverflow="extendDomain" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
