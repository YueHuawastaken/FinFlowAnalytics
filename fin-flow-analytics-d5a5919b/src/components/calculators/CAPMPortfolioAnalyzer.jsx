
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComposedChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
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
  const [marketStdDev, setMarketStdDev] = useState(0.16); // 16%
  
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
    const alphaA = muA - capmA;
    const alphaB = muB - capmB;
    const maxBeta = Math.max(1.5, betaA, betaB, 1.0);
    const smlXMax = maxBeta * 1.4;
    const smlLine = [
      { beta: 0, expectedReturn: riskFreeRate },
      { beta: smlXMax, expectedReturn: riskFreeRate + smlXMax * (marketReturn - riskFreeRate) }
    ];
    const smlPoints = [
      { name: 'Rf', beta: 0, expectedReturn: riskFreeRate, color: '#9ca3af', shape: 'diamond', size: 4 },
      { name: 'Market', beta: 1, expectedReturn: marketReturn, color: '#000000', shape: 'circle', size: 4 },
      { name: 'Asset A', beta: betaA, expectedReturn: muA, color: alphaA >= 0 ? '#16a34a' : '#dc2626', shape: 'triangle-up', size: 4 },
      { name: 'Asset B', beta: betaB, expectedReturn: muB, color: alphaB >= 0 ? '#16a34a' : '#dc2626', shape: 'triangle-down', size: 4 }
    ];
    const smlYMax = Math.max(0.20, riskFreeRate + maxBeta * (marketReturn - riskFreeRate), muA, muB, marketReturn);
    const cmlLine = [
      { stdDev: 0, expectedReturn: riskFreeRate },
      { stdDev: marketStdDev, expectedReturn: marketReturn }
    ];
    const marketSharpe = marketStdDev > 0 ? (marketReturn - riskFreeRate) / marketStdDev : 0;
    const smlTable = [0, 0.5, 1.0, 1.5, 2.0].map((beta) => ({
      beta,
      expectedReturn: riskFreeRate + beta * (marketReturn - riskFreeRate)
    }));
    const cmlTable = [0, 0.05, 0.10, 0.15, 0.20].map((stdDev) => ({
      stdDev,
      expectedReturn: riskFreeRate + stdDev * marketSharpe
    }));
    
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
    const cmlReturnMin = Math.min(riskFreeRate, marketReturn, portfolioReturn, optimalPortfolio.expectedReturn);
    const cmlReturnMax = Math.max(riskFreeRate, marketReturn, portfolioReturn, optimalPortfolio.expectedReturn);
    const cmlYMin = Math.max(0, cmlReturnMin - 0.01);
    const cmlYMax = cmlReturnMax + 0.01;
    
    return {
      capmA,
      capmB,
      alphaA,
      alphaB,
      portfolioReturn,
      portfolioBeta,
      portfolioStdDev,
      sharpeA,
      sharpeB,
      sharpePortfolio,
      efficientFrontier,
      optimalPortfolio,
      smlLine,
      cmlPoints: [
        { name: 'Rf', stdDev: 0, expectedReturn: riskFreeRate, color: '#9ca3af', shape: 'diamond', size: 4 },
        { name: 'Market', stdDev: marketStdDev, expectedReturn: marketReturn, color: '#000000', shape: 'circle', size: 4 },
        { name: 'Current Portfolio', stdDev: portfolioStdDev, expectedReturn: portfolioReturn, color: '#2563eb', shape: 'square', size: 4 },
        { name: 'Optimal Portfolio', stdDev: optimalPortfolio.stdDev, expectedReturn: optimalPortfolio.expectedReturn, color: '#16a34a', shape: 'circle', size: 4 }
      ],
      cmlXMax: Math.max(marketStdDev, portfolioStdDev, optimalPortfolio.stdDev, 0.2) * 1.5,
      cmlYMin,
      cmlYMax,
      efXMax: Math.max(...efficientFrontier.map(p => p.stdDev)) * 1.2,
      smlXMax,
      efYMax: Math.max(...efficientFrontier.map(p => p.expectedReturn)) * 1.2,
      minVariance: efficientFrontier.reduce((min, cur) => cur.stdDev < min.stdDev ? cur : min, efficientFrontier[0]),
      smlPoints,
      smlTable,
      cmlTable,
      smlYMax,
      maxBeta,
      cmlLine,
      marketStdDev
    };
  }, [riskFreeRate, marketReturn, marketStdDev, betaA, muA, sigmaA, betaB, muB, sigmaB, correlation, weightA]);

  const getSharpeRating = (sharpe) => {
    if (sharpe > 1.0) return { level: 'excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (sharpe > 0.5) return { level: 'good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (sharpe > 0.2) return { level: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  // Custom tooltip to ensure we show the exact payload.expectedReturn value
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const scatterData = payload.filter(p => p && p.payload && p.payload.name);
    const item = scatterData.length > 0 ? scatterData[0] : payload.find(p => p && p.payload && p.payload.expectedReturn !== undefined) || payload[0];
    if (!item || !item.payload) return null;
    const data = item.payload;
    const name = data.name || item.name || 'Point';
    const xLabel = data.beta !== undefined ? 'Beta' : 'Risk/Std Dev';
    const xValue = data.beta !== undefined ? data.beta.toFixed(2) : (data.stdDev !== undefined ? data.stdDev.toFixed(2) : 'N/A');
    const yValue = data.expectedReturn;
    return (
      <div className="rounded border bg-white p-2 text-xs shadow-sm">
        <div className="font-semibold">{name}</div>
        <div>{xLabel}: {xValue}</div>
        <div>Return: {formatPercent(yValue)}</div>
      </div>
    );
  };

  // Custom point shapes for Recharts (return SVG elements)
  const Diamond = ({ cx, cy, fill, stroke, size = 4 }) => (
    <path d={`M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z`} fill={fill} stroke={stroke} />
  );
  const Square = ({ cx, cy, fill, stroke, size = 3 }) => (
    <rect x={cx - size} y={cy - size} width={size * 2} height={size * 2} fill={fill} stroke={stroke} rx={2} />
  );
  const Circle = ({ cx, cy, fill, stroke, size = 4 }) => (
    <circle cx={cx} cy={cy} r={size} fill={fill} stroke={stroke} />
  );
  const Triangle = ({ cx, cy, fill, stroke, size = 4, up = true }) => (
    <path d={up ? `M ${cx} ${cy - size} L ${cx + size} ${cy + size} L ${cx - size} ${cy + size} Z` : `M ${cx} ${cy + size} L ${cx + size} ${cy - size} L ${cx - size} ${cy - size} Z`} fill={fill} stroke={stroke} />
  );
  const HollowCircle = ({ cx, cy, stroke = '#6b7280', size = 3 }) => (
    <circle cx={cx} cy={cy} r={size} fill="none" stroke={stroke} strokeWidth={2} />
  );

  const smlLegendPayload = [
    { value: 'SML Line', type: 'line', color: '#1d4ed8', id: 'sml-line' },
    { value: 'Rf', type: 'diamond', color: '#9ca3af', id: 'sml-rf' },
    { value: 'Market', type: 'circle', color: '#000000', id: 'sml-market' },
    { value: 'Asset A', type: 'triangle', color: '#16a34a', id: 'sml-a' },
    { value: 'Asset B', type: 'triangle', color: '#dc2626', id: 'sml-b' }
  ];
  const cmlLegendPayload = [
    { value: 'CML Line', type: 'line', color: '#2563eb', id: 'cml-line' },
    { value: 'Rf', type: 'diamond', color: '#9ca3af', id: 'cml-rf' },
    { value: 'Market', type: 'circle', color: '#000000', id: 'cml-market' },
    { value: 'Current Portfolio', type: 'square', color: '#2563eb', id: 'cml-current' },
    { value: 'Optimal Portfolio', type: 'circle', color: '#16a34a', id: 'cml-optimal' }
  ];
  const efLegendPayload = [
    { value: 'Efficient Frontier', type: 'line', color: '#0ea5e9', id: 'ef-line' },
    { value: 'Current Portfolio', type: 'circle', color: '#2563eb', id: 'ef-current' },
    { value: 'Optimal Portfolio', type: 'circle', color: '#16a34a', id: 'ef-optimal' }
  ];

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

                <div className="space-y-2">
                  <Label>Market Std Dev (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(marketStdDev * 100).toFixed(2)}
                    onChange={(e) => setMarketStdDev((Number(e.target.value) || 0) / 100)}
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
                  <p className={`mt-2 text-sm font-medium ${analysis.alphaA >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analysis.alphaA >= 0 ? '+' : ''}{formatPercent(analysis.alphaA)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {analysis.alphaA >= 0 ? 'Positive alpha = undervalued (above SML)' : 'Negative alpha = overvalued (below SML)'}
                  </p>
                </Card>
                
                <Card className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Asset B (CAPM)</p>
                  <p className="text-lg sm:text-xl font-bold">{formatPercent(analysis.capmB)}</p>
                  <p className="text-xs text-gray-500">vs Actual: {formatPercent(muB)}</p>
                  <p className={`mt-2 text-sm font-medium ${analysis.alphaB >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analysis.alphaB >= 0 ? '+' : ''}{formatPercent(analysis.alphaB)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {analysis.alphaB >= 0 ? 'Positive alpha = undervalued (above SML)' : 'Negative alpha = overvalued (below SML)'}
                  </p>
                </Card>
              </div>
            </div>

            {/* SML Chart */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base lg:text-lg">Security Market Line (SML)</h3>
              <div className="h-56 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analysis.smlLine} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="beta"
                      type="number"
                      domain={[0, analysis.smlXMax]}
                      tick={{ fontSize: 10 }}
                      tickCount={7}
                      tickFormatter={(value) => {
    // Round to 1 decimal place to avoid floating point issues like 2.0999999999999996
    const rounded = Math.round(value * 10) / 10;
    // If it's a whole number, show as integer (e.g., "2" instead of "2.0")
    if (rounded % 1 === 0) {
      return rounded.toString();
    }
    return rounded.toFixed(1);   }}
                      label={{ value: 'Beta', position: 'insideBottom', offset: -5, style: { fontSize: '10px' } }}
                    />
                    <YAxis 
                      dataKey="expectedReturn"
                      type="number" 
                      domain={[0, analysis.smlYMax]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={formatPercent}
                      label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                      width={55}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend payload={smlLegendPayload} wrapperStyle={{ fontSize: '12px' }} />
                    <Line 
                      type="linear"
                      dataKey="expectedReturn"
                      name="SML"
                      stroke="#1d4ed8"
                      dot={false}
                      strokeWidth={3}
                      tooltipType="none"
                    />
                    {
                      analysis.smlPoints.map((p) => {
                        const shape = p.shape === 'diamond'
                          ? (props) => <Diamond {...props} fill={p.color} stroke="#374151" size={p.size} />
                          : p.shape === 'circle'
                          ? (props) => <Circle {...props} fill={p.color} stroke="#000" size={p.size} />
                          : p.shape === 'triangle-up'
                          ? (props) => <Triangle {...props} fill={p.color} stroke="#374151" size={p.size} up={true} />
                          : (props) => <Triangle {...props} fill={p.color} stroke="#374151" size={p.size} up={false} />;

                        return (
                          <Scatter key={p.name} name={p.name} data={[p]} dataKey="expectedReturn" shape={shape} />
                        );
                      })
                    }
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 bg-white/80 p-1 text-xs shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">SML reference values</p>
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-600 dark:text-gray-300">
                      <th className="px-2 py-1">Beta</th>
                      <th className="px-2 py-1">Expected Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.smlTable.map((row) => (
                      <tr key={row.beta} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-2 py-1 font-medium text-slate-700 dark:text-slate-200">{row.beta.toFixed(2)}</td>
                        <td className="px-2 py-1 text-slate-600 dark:text-slate-400">{formatPercent(row.expectedReturn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CML Chart */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base lg:text-lg">Capital Market Line (CML)</h3>
              <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white/80 shadow-sm dark:border-gray-800 dark:bg-gray-950/80 h-56 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analysis.cmlLine} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="stdDev"
                      type="number"
                      domain={[0, analysis.cmlXMax || analysis.marketStdDev || 0.25]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={formatPercent}
                      label={{ value: 'Risk (Std Dev)', position: 'insideBottom', offset: -5, style: { fontSize: '10px' } }}
                    />
                    <YAxis 
                      dataKey="expectedReturn"
                      type="number" 
                      domain={[analysis.cmlYMin, analysis.cmlYMax]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={formatPercent}
                      label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                      width={55}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend payload={cmlLegendPayload} wrapperStyle={{ fontSize: '12px' }} />
                    <Line 
                      type="linear"
                      dataKey="expectedReturn"
                      name="CML"
                      stroke="#2563eb"
                      strokeDasharray="6 4"
                      dot={false}
                      strokeWidth={3}
                      tooltipType="none"
                    />
                    {
                      analysis.cmlPoints.map((p) => {
                        let shapeFn = (props) => <Diamond {...props} fill={p.color} stroke="#374151" size={p.size} />;
                        if (p.shape === 'circle') shapeFn = (props) => <Circle {...props} fill={p.color} stroke="#374151" size={p.size} />;
                        if (p.shape === 'square') shapeFn = (props) => <Square {...props} fill={p.color} stroke="#1f2937" size={p.size} />;

                        return (
                          <Scatter key={p.name} name={p.name} data={[p]} dataKey="expectedReturn" shape={shapeFn} />
                        );
                      })
                    }
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white/80 p-2 text-xs shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">CML reference values</p>
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="px-2 py-1">Std Dev</th>
                    <th className="px-2 py-1">Expected Return</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.cmlTable.map((row) => (
                    <tr key={row.stdDev} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-2 py-1 font-medium text-slate-700 dark:text-slate-200">{formatPercent(row.stdDev)}</td>
                      <td className="px-2 py-1 text-slate-600 dark:text-slate-400">{formatPercent(row.expectedReturn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Interpretation Summary */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold mb-2">Interpretation Summary</p>
              <p className="mb-1">If an asset plots <strong>above the SML</strong> → Positive Alpha → <strong>Undervalued</strong> → <span className="font-semibold">BUY</span></p>
              <p className="mb-1">If an asset plots <strong>below the SML</strong> → Negative Alpha → <strong>Overvalued</strong> → <span className="font-semibold">SELL</span></p>
              <p>In equilibrium, all assets should lie <strong>on the SML</strong> (alpha = 0).</p>
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
                  <ComposedChart data={analysis.efficientFrontier} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="stdDev" 
                      type="number"
                      domain={[0, analysis.efXMax || 0.5]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={formatPercent}
                      label={{ value: 'Risk (Std Dev)', position: 'insideBottom', offset: -5, style: { fontSize: '10px' } }}
                    />
                    <YAxis 
                      dataKey="expectedReturn"
                      type="number" 
                      domain={[0, analysis.efYMax || 0.3]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={formatPercent}
                      label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend payload={efLegendPayload} wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="expectedReturn"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 3, fill: '#38bdf8', stroke: '#0ea5e9', strokeWidth: 2 }}
                      isAnimationActive={false}
                      tooltipType="none"
                    />
                    <Scatter
                      name="Efficient Frontier"
                      data={analysis.efficientFrontier}
                      dataKey="expectedReturn"
                      legendType="none"
                      shape={(props) => <Circle {...props} fill="transparent" stroke="transparent" size={4} />}
                    />
                    {/* Current Portfolio */}
                    <Scatter name="Current Portfolio" data={[{ stdDev: analysis.portfolioStdDev, expectedReturn: analysis.portfolioReturn, name: 'Current Portfolio' }]} dataKey="expectedReturn" shape={(props) => <Square {...props} fill="#2563eb" stroke="#1f2937" size={4} />} />
                    {/* Optimal Portfolio */}
                    <Scatter name="Optimal Portfolio" data={[{ stdDev: analysis.optimalPortfolio.stdDev, expectedReturn: analysis.optimalPortfolio.expectedReturn, name: 'Optimal Portfolio' }]} dataKey="expectedReturn" shape={(props) => <Circle {...props} fill="#16a34a" stroke="#065f46" size={4} />} />
                    {/* Minimum Variance (hollow) */}
                    <Scatter name="Min Variance" data={[{ stdDev: analysis.minVariance.stdDev, expectedReturn: analysis.minVariance.expectedReturn, name: 'Min Variance' }]} dataKey="expectedReturn" shape={(props) => <HollowCircle {...props} stroke="#6b7280" size={4} />} />
                  </ComposedChart>
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
