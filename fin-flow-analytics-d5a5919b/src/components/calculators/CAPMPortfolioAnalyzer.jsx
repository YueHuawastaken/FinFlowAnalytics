
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const formatPercent = (value) => {
  if (typeof value !== 'number' || !isFinite(value)) return '0.0%';
  return (value * 100).toFixed(2) + '%';
};

const formatNumber = (value, decimals = 4) => {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  return value.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

export default function CAPMPortfolioAnalyzer() {
  // Market parameters
  const [riskFreeRate, setRiskFreeRate] = useState(0.03); // 3%
  const [marketReturn, setMarketReturn] = useState(0.10); // 10%
  
  // Asset A parameters
  const [betaA, setBetaA] = useState(1.2);
  const [muA, setMuA] = useState(0.12);
  const [sigmaA, setSigmaA] = useState(0.20);
  
  // Asset B parameters
  const [betaB, setBetaB] = useState(0.8);
  const [muB, setMuB] = useState(0.08);
  const [sigmaB, setSigmaB] = useState(0.15);
  
  // Portfolio parameters
  const [correlation, setCorrelation] = useState(0.3);
  const [weightA, setWeightA] = useState([0.6]); // Using array for Slider component

  const analysis = useMemo(() => {
    const w = weightA[0];
    const wB = 1 - w;
    
    // CAPM expected returns
    const capmA = riskFreeRate + betaA * (marketReturn - riskFreeRate);
    const capmB = riskFreeRate + betaB * (marketReturn - riskFreeRate);
    
    // Portfolio calculations
    const portfolioReturn = w * muA + wB * muB;
    const portfolioBeta = w * betaA + wB * betaB;
    const portfolioVariance = Math.pow(w, 2) * Math.pow(sigmaA, 2) + 
                             Math.pow(wB, 2) * Math.pow(sigmaB, 2) + 
                             2 * w * wB * sigmaA * sigmaB * correlation;
    const portfolioStdDev = Math.sqrt(portfolioVariance);
    
    // Sharpe ratios
    const sharpeA = (muA - riskFreeRate) / sigmaA;
    const sharpeB = (muB - riskFreeRate) / sigmaB;
    const sharpePortfolio = (portfolioReturn - riskFreeRate) / portfolioStdDev;
    
    // Efficient frontier (sweep w from 0 to 1)
    const efficientFrontier = [];
    for (let i = 0; i <= 100; i++) {
      const weight = i / 100;
      const weightBFrontier = 1 - weight;
      const returnFrontier = weight * muA + weightBFrontier * muB;
      const varianceFrontier = Math.pow(weight, 2) * Math.pow(sigmaA, 2) + 
                              Math.pow(weightBFrontier, 2) * Math.pow(sigmaB, 2) + 
                              2 * weight * weightBFrontier * sigmaA * sigmaB * correlation;
      const stdDevFrontier = Math.sqrt(varianceFrontier);
      const sharpeFrontier = (returnFrontier - riskFreeRate) / stdDevFrontier;
      
      efficientFrontier.push({
        weight,
        expectedReturn: returnFrontier,
        stdDev: stdDevFrontier,
        sharpe: sharpeFrontier
      });
    }
    
    // Find optimal (max Sharpe) portfolio
    const optimalPortfolio = efficientFrontier.reduce((best, current) => 
      current.sharpe > best.sharpe ? current : best
    );
    
    return {
      capmA,
      capmB,
      portfolioReturn,
      portfolioBeta,
      portfolioStdDev,
      sharpeA,
      sharpeB,
      sharpePortfolio,
      efficientFrontier,
      optimalPortfolio
    };
  }, [riskFreeRate, marketReturn, betaA, muA, sigmaA, betaB, muB, sigmaB, correlation, weightA]);

  const getSharpeRating = (sharpe) => {
    if (sharpe > 1.0) return { level: 'excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (sharpe > 0.5) return { level: 'good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (sharpe > 0.2) return { level: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-xl">CAPM & Portfolio Analyzer</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Capital Asset Pricing Model and two-asset portfolio optimization
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Inputs Section - Mobile Responsive */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-base lg:text-lg">Market Parameters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Risk-Free Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(riskFreeRate * 100).toFixed(2)}
                    onChange={(e) => setRiskFreeRate((Number(e.target.value) || 0) / 100)}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Market Return (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(marketReturn * 100).toFixed(2)}
                    onChange={(e) => setMarketReturn((Number(e.target.value) || 0) / 100)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-base lg:text-lg">Asset A</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Beta (β)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={betaA}
                    onChange={(e) => setBetaA(Number(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Expected Return (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(muA * 100).toFixed(2)}
                    onChange={(e) => setMuA((Number(e.target.value) || 0) / 100)}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Std Deviation (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(sigmaA * 100).toFixed(2)}
                    onChange={(e) => setSigmaA((Number(e.target.value) || 0) / 100)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-base lg:text-lg">Asset B</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Beta (β)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={betaB}
                    onChange={(e) => setBetaB(Number(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Expected Return (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(muB * 100).toFixed(2)}
                    onChange={(e) => setMuB((Number(e.target.value) || 0) / 100)}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Std Deviation (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(sigmaB * 100).toFixed(2)}
                    onChange={(e) => setSigmaB((Number(e.target.value) || 0) / 100)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-base lg:text-lg">Portfolio Composition</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Correlation (ρ)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="-1"
                    max="1"
                    value={correlation}
                    onChange={(e) => setCorrelation(Number(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Weight of Asset A: {formatPercent(weightA[0])}</Label>
                  <Slider
                    value={weightA}
                    onValueChange={setWeightA}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                    <span>0% A, 100% B</span>
                    <span>100% A, 0% B</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section - Mobile Responsive */}
          <div className="space-y-6">
            {/* CAPM Results */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base lg:text-lg">CAPM Expected Returns</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Asset A (CAPM)</p>
                  <p className="text-lg sm:text-xl font-bold">{formatPercent(analysis.capmA)}</p>
                  <p className="text-xs text-gray-500">vs Actual: {formatPercent(muA)}</p>
                </Card>
                
                <Card className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Asset B (CAPM)</p>
                  <p className="text-lg sm:text-xl font-bold">{formatPercent(analysis.capmB)}</p>
                  <p className="text-xs text-gray-500">vs Actual: {formatPercent(muB)}</p>
                </Card>
              </div>
            </div>

            {/* Portfolio Metrics */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base lg:text-lg">Current Portfolio ({formatPercent(weightA[0])} A, {formatPercent(1-weightA[0])} B)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Expected Return</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">{formatPercent(analysis.portfolioReturn)}</p>
                </Card>
                
                <Card className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Risk (Std Dev)</p>
                  <p className="text-lg sm:text-2xl font-bold text-orange-600">{formatPercent(analysis.portfolioStdDev)}</p>
                </Card>
                
                <Card className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Portfolio Beta</p>
                  <p className="text-lg sm:text-2xl font-bold">{formatNumber(analysis.portfolioBeta, 3)}</p>
                </Card>
                
                <Card className={`p-3 sm:p-4 ${getSharpeRating(analysis.sharpePortfolio).bg}`}>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Sharpe Ratio</p>
                  <p className={`text-lg sm:text-2xl font-bold ${getSharpeRating(analysis.sharpePortfolio).color}`}>
                    {formatNumber(analysis.sharpePortfolio, 3)}
                  </p>
                </Card>
              </div>
            </div>

            {/* Optimal Portfolio */}
            <Card className="p-4 bg-green-50 dark:bg-green-950/20">
              <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200">Optimal Portfolio (Max Sharpe)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Weight A:</strong> {formatPercent(analysis.optimalPortfolio.weight)}</p>
                  <p><strong>Expected Return:</strong> {formatPercent(analysis.optimalPortfolio.expectedReturn)}</p>
                </div>
                <div>
                  <p><strong>Risk:</strong> {formatPercent(analysis.optimalPortfolio.stdDev)}</p>
                  <p><strong>Sharpe Ratio:</strong> {formatNumber(analysis.optimalPortfolio.sharpe, 3)}</p>
                </div>
              </div>
            </Card>

            {/* Efficient Frontier Chart - Mobile Responsive */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base lg:text-lg">Efficient Frontier</h3>
              <div className="h-48 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={analysis.efficientFrontier}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="stdDev" 
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={formatPercent}
                      label={{ value: 'Risk (Std Dev)', position: 'insideBottom', offset: -5, style: { fontSize: '10px' } }}
                    />
                    <YAxis 
                      dataKey="expectedReturn"
                      type="number" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={formatPercent}
                      label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                      width={50}
                    />
                    <Tooltip 
                      formatter={(value, name) => [formatPercent(value), name]}
                      labelFormatter={() => ''}
                      cursor={{ strokeDasharray: '3 3' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Scatter 
                      name="Efficient Frontier" 
                      dataKey="expectedReturn" 
                      fill="#3b82f6"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Individual Asset Performance Table - Mobile Cards */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base lg:text-lg">Asset Comparison</h3>
              
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Asset</TableHead>
                      <TableHead className="text-xs">Expected Return</TableHead>
                      <TableHead className="text-xs">Risk</TableHead>
                      <TableHead className="text-xs">Sharpe Ratio</TableHead>
                      <TableHead className="text-xs">Beta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-sm">Asset A</TableCell>
                      <TableCell className="text-sm">{formatPercent(muA)}</TableCell>
                      <TableCell className="text-sm">{formatPercent(sigmaA)}</TableCell>
                      <TableCell className={`text-sm ${getSharpeRating(analysis.sharpeA).color}`}>
                        {formatNumber(analysis.sharpeA, 3)}
                      </TableCell>
                      <TableCell className="text-sm">{formatNumber(betaA, 2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-sm">Asset B</TableCell>
                      <TableCell className="text-sm">{formatPercent(muB)}</TableCell>
                      <TableCell className="text-sm">{formatPercent(sigmaB)}</TableCell>
                      <TableCell className={`text-sm ${getSharpeRating(analysis.sharpeB).color}`}>
                        {formatNumber(analysis.sharpeB, 3)}
                      </TableCell>
                      <TableCell className="text-sm">{formatNumber(betaB, 2)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-blue-50 dark:bg-blue-950/20">
                      <TableCell className="font-medium text-sm">Portfolio</TableCell>
                      <TableCell className="text-sm">{formatPercent(analysis.portfolioReturn)}</TableCell>
                      <TableCell className="text-sm">{formatPercent(analysis.portfolioStdDev)}</TableCell>
                      <TableCell className={`text-sm ${getSharpeRating(analysis.sharpePortfolio).color}`}>
                        {formatNumber(analysis.sharpePortfolio, 3)}
                      </TableCell>
                      <TableCell className="text-sm">{formatNumber(analysis.portfolioBeta, 2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {[
                  { name: 'Asset A', return: muA, risk: sigmaA, sharpe: analysis.sharpeA, beta: betaA },
                  { name: 'Asset B', return: muB, risk: sigmaB, sharpe: analysis.sharpeB, beta: betaB },
                  { name: 'Portfolio', return: analysis.portfolioReturn, risk: analysis.portfolioStdDev, sharpe: analysis.sharpePortfolio, beta: analysis.portfolioBeta, highlight: true }
                ].map((asset, i) => (
                  <Card key={i} className={`p-3 ${asset.highlight ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                    <h4 className="font-semibold mb-2 text-sm">{asset.name}</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Expected Return</p>
                        <p className="font-semibold">{formatPercent(asset.return)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Risk</p>
                        <p className="font-semibold">{formatPercent(asset.risk)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sharpe Ratio</p>
                        <p className={`font-semibold ${getSharpeRating(asset.sharpe).color}`}>
                          {formatNumber(asset.sharpe, 3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Beta</p>
                        <p className="font-semibold">{formatNumber(asset.beta, 2)}</p>
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
