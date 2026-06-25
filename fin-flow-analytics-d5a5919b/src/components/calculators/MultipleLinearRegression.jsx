import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ZAxis, LineChart, Line } from 'recharts';
import { BarChart3, Plus, X, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EconometricsDiagnosis from './EconometricsDiagnosis';
import EndogeneityDiagnosis from './EndogeneityDiagnosis';

// --- Matrix Math Helpers ---
const matTranspose = (matrix) => {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
};

const matMultiply = (a, b) => {
  const result = new Array(a.length).fill(0).map(() => new Array(b[0].length).fill(0));
  return result.map((row, i) => {
    return row.map((_, j) => {
      return a[i].reduce((sum, _, k) => sum + a[i][k] * b[k][j], 0);
    });
  });
};

const matInverse3x3 = (m) => {
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (det === 0) return null;

  const invDet = 1 / det;
  const adj = [
    [e * i - f * h, c * h - b * i, b * f - c * e],
    [f * g - d * i, a * i - c * g, c * d - a * f],
    [d * h - e * g, b * g - a * h, a * e - b * d]
  ];
  
  return adj.map(row => row.map(val => val * invDet));
};

// ===== Get t-critical value =====
const getTValue = (confidenceLevel, degreesOfFreedom) => {
  const tTable = {
    90: { 1: 6.314, 2: 2.920, 3: 2.353, 4: 2.132, 5: 2.015, 
          6: 1.943, 7: 1.895, 8: 1.860, 9: 1.833, 10: 1.812,
          12: 1.782, 14: 1.761, 16: 1.746, 18: 1.734, 20: 1.725,
          25: 1.708, 30: 1.697, 40: 1.684, 50: 1.676, 60: 1.671,
          80: 1.664, 100: 1.660, 120: 1.658, 200: 1.653, 500: 1.648 },
    95: { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
          6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
          12: 2.179, 14: 2.145, 16: 2.120, 18: 2.101, 20: 2.086,
          25: 2.060, 30: 2.042, 40: 2.021, 50: 2.009, 60: 2.000,
          80: 1.990, 100: 1.984, 120: 1.980, 200: 1.972, 500: 1.965 },
    99: { 1: 63.657, 2: 9.925, 3: 5.841, 4: 4.604, 5: 4.032,
          6: 3.707, 7: 3.499, 8: 3.355, 9: 3.250, 10: 3.169,
          12: 3.055, 14: 2.977, 16: 2.921, 18: 2.878, 20: 2.845,
          25: 2.787, 30: 2.750, 40: 2.704, 50: 2.678, 60: 2.660,
          80: 2.639, 100: 2.626, 120: 2.617, 200: 2.601, 500: 2.586 }
  };
  const df = Math.min(Math.max(Math.round(degreesOfFreedom), 1), 500);
  const availableDfs = Object.keys(tTable[confidenceLevel]).map(Number);
  const closestDf = availableDfs.reduce((prev, curr) => 
    Math.abs(curr - df) < Math.abs(prev - df) ? curr : prev
  );
  return tTable[confidenceLevel][closestDf];
};

// ===== Calculate p-value from t-statistic =====
const calculatePValue = (tStat, df) => {
  const absT = Math.abs(tStat);
  if (absT > 10) return '< 0.001';
  if (absT > 5) return '< 0.01';
  if (absT > 3) return '< 0.05';
  if (absT > 2) return '< 0.10';
  return '> 0.10';
};

const formatPValue = (pValue) => {
  if (typeof pValue === 'string') return pValue;
  if (pValue === null || pValue === undefined) return 'N/A';
  if (pValue < 0.001) return '< 0.001';
  if (pValue < 0.01) return '< 0.01';
  if (pValue < 0.05) return '< 0.05';
  if (pValue < 0.10) return '< 0.10';
  return formatNumber(pValue, 3);
};

const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || !isFinite(num)) return "N/A";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const VifBadge = ({ vif, name }) => {
  let level = 'good';
  let message = 'Low Correlation';
  let description = 'This predictor is independent - good for forecasting.';
  
  if (vif > 10) { 
    level = 'alert'; 
    message = '⚠️ High Correlation'; 
    description = 'This predictor is highly correlated with others - forecast may be unreliable.';
  } else if (vif > 5) { 
    level = 'warning'; 
    message = '⚠️ Moderate Correlation'; 
    description = 'Some correlation detected - use forecast with caution.';
  }

  const styles = {
    good: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    alert: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <Badge className={styles[level]}>{message}</Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-semibold">{name} Correlation (VIF: {formatNumber(vif, 2)})</p>
        <p className="text-sm">{description}</p>
      </TooltipContent>
    </UITooltip>
  );
};

const getRSquaredBadge = (rSquared, adjustedR2) => {
  if (rSquared === null || !isFinite(rSquared)) return null;
  
  let level = 'good';
  let message = 'Strong Fit';
  let description = 'The model explains the data well.';
  
  if (rSquared > 0.99) {
    level = 'warning';
    message = '⚠️ Perfect Fit - May be Overfit';
    description = 'This model may be too perfect - check for data issues or overfitting.';
  } else if (rSquared >= 0.8) {
    level = 'good';
    message = '✅ Strong Fit';
    description = 'The model explains the data very well - reliable for forecasting.';
  } else if (rSquared >= 0.6) {
    level = 'moderate';
    message = '📊 Moderate Fit';
    description = 'The model captures some trends but may miss important factors.';
  } else {
    level = 'poor';
    message = '⚠️ Weak Fit';
    description = 'The model poorly explains the data - forecasts may be unreliable.';
  }

  const styles = {
    good: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    moderate: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', 
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    poor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };

  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <Badge className={styles[level]}>{message}</Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-semibold">R²: {formatNumber(rSquared * 100, 1)}% | Adj R²: {formatNumber(adjustedR2 * 100, 1)}%</p>
        <p className="text-sm">{description}</p>
      </TooltipContent>
    </UITooltip>
  );
};

export default function MultipleLinearRegression() {
  // Variable names
  const [yLabel, setYLabel] = useState('Revenue');
  const [x1Label, setX1Label] = useState('Marketing Spend ($)');
  const [x2Label, setX2Label] = useState('Sales Team Size');
  const [confidenceLevel, setConfidenceLevel] = useState(95);
  const [forecastHorizon, setForecastHorizon] = useState(5);
  const [endogeneityStatus, setEndogeneityStatus] = useState(null);

  // Data
  const [data, setData] = useState([
    { y: 300, x1: 10, x2: 20 }, 
    { y: 350, x1: 12, x2: 25 },
    { y: 400, x1: 15, x2: 28 }, 
    { y: 480, x1: 18, x2: 35 },
    { y: 550, x1: 22, x2: 40 }, 
    { y: 600, x1: 25, x2: 42 }
  ]);

  // Forecast inputs - now supports growth rates
  const [forecastInputs, setForecastInputs] = useState({ 
    x1: 28, 
    x2: 50,
    x1Growth: 0.05,  // 5% growth per period
    x2Growth: 0.03   // 3% growth per period
  });

  const results = useMemo(() => {
    if (data.length < 3) return { error: "Need at least 3 data points for multiple regression." };

    const n = data.length;
    const k = 2;

    // --- Core Regression Calculation ---
    const X = data.map(p => [1, p.x1, p.x2]);
    const y = data.map(p => [p.y]);
    
    const Xt = matTranspose(X);
    const XtX = matMultiply(Xt, X);
    const XtX_inv = matInverse3x3(XtX);

    if (!XtX_inv) return { 
      error: "Multicollinearity detected", 
      multicollinearity: true,
      description: `The predictors '${x1Label}' and '${x2Label}' are too highly correlated.`
    };
    
    const Xty = matMultiply(Xt, y);
    const beta = matMultiply(XtX_inv, Xty).map(val => val[0]);

    // --- Predicted values ---
    const y_hat = X.map(row => beta[0] + beta[1] * row[1] + beta[2] * row[2]);
    
    // --- Residuals ---
    const residuals = data.map((p, i) => ({
      x: i + 1,
      actual: p.y,
      predicted: y_hat[i],
      residual: p.y - y_hat[i]
    }));

    // --- SSE, SST, R² ---
    const y_bar = data.reduce((sum, p) => sum + p.y, 0) / data.length;
    const sse = data.reduce((sum, p, i) => sum + (p.y - y_hat[i]) ** 2, 0);
    const sst = data.reduce((sum, p) => sum + (p.y - y_bar) ** 2, 0);
    const rSquared = sst === 0 ? 1 : 1 - (sse / sst);
    const adjustedR2 = 1 - (1 - rSquared) * ((n - 1) / (n - k - 1));
    const ser = Math.sqrt(sse / (n - k - 1));

    // --- Standard Errors ---
    const seCoeffs = XtX_inv.map(row => Math.sqrt(row.reduce((sum, val) => sum + val * ser * ser, 0)));
    const seBeta0 = seCoeffs[0];
    const seBeta1 = seCoeffs[1];
    const seBeta2 = seCoeffs[2];

    // --- t-statistics and p-values ---
    const tBeta0 = beta[0] / seBeta0;
    const tBeta1 = beta[1] / seBeta1;
    const tBeta2 = beta[2] / seBeta2;
    const df = n - k - 1;
    const pBeta0 = calculatePValue(tBeta0, df);
    const pBeta1 = calculatePValue(tBeta1, df);
    const pBeta2 = calculatePValue(tBeta2, df);

    // --- Confidence Intervals ---
    const tCrit = getTValue(confidenceLevel, df);
    const ciBeta0 = { lower: beta[0] - tCrit * seBeta0, upper: beta[0] + tCrit * seBeta0 };
    const ciBeta1 = { lower: beta[1] - tCrit * seBeta1, upper: beta[1] + tCrit * seBeta1 };
    const ciBeta2 = { lower: beta[2] - tCrit * seBeta2, upper: beta[2] + tCrit * seBeta2 };

    // --- F-statistic ---
    const fStatistic = (rSquared / k) / ((1 - rSquared) / (n - k - 1));
    const fDf1 = k;
    const fDf2 = n - k - 1;
    const fPValue = fStatistic > 10 ? '< 0.001' : fStatistic > 5 ? '< 0.01' : fStatistic > 3 ? '< 0.05' : '> 0.10';

    // --- VIF ---
    const x1_data = data.map(p => p.x1);
    const x2_data = data.map(p => p.x2);
    const x1_bar = x1_data.reduce((s, v) => s + v, 0) / data.length;
    const x2_bar = x2_data.reduce((s, v) => s + v, 0) / data.length;
    
    const num_vif = data.reduce((s, p, i) => s + (x1_data[i] - x1_bar) * (x2_data[i] - x2_bar), 0);
    const den1_vif = data.reduce((s, p, i) => s + (x1_data[i] - x1_bar) ** 2, 0);
    const den2_vif = data.reduce((s, p, i) => s + (x2_data[i] - x2_bar) ** 2, 0);
    
    let vif1 = 1, vif2 = 1;
    if (den1_vif > 0 && den2_vif > 0) {
      const r_x1_x2_sq = (num_vif ** 2) / (den1_vif * den2_vif);
      if (r_x1_x2_sq < 0.999) {
        vif1 = vif2 = 1 / (1 - r_x1_x2_sq);
      } else {
        vif1 = vif2 = Infinity;
      }
    }

    // ===== NEW: Multi-period Forecast =====
    const forecastSeries = [];
    let currentX1 = forecastInputs.x1;
    let currentX2 = forecastInputs.x2;
    
    for (let i = 0; i < forecastHorizon; i++) {
      const forecastY = beta[0] + beta[1] * currentX1 + beta[2] * currentX2;
      
      // Calculate forecast CI (simplified)
      const seForecast = ser * Math.sqrt(
        1 + 1/n + 
        Math.pow(currentX1 - x1_bar, 2) / den1_vif + 
        Math.pow(currentX2 - x2_bar, 2) / den2_vif
      );
      const forecastCI = {
        lower: forecastY - tCrit * seForecast,
        upper: forecastY + tCrit * seForecast
      };
      
      forecastSeries.push({
        period: i + 1,
        x1: currentX1,
        x2: currentX2,
        y: forecastY,
        lowerBound: forecastCI.lower,
        upperBound: forecastCI.upper,
        marginOfError: tCrit * seForecast
      });
      
      // Grow values for next period
      currentX1 = currentX1 * (1 + forecastInputs.x1Growth);
      currentX2 = currentX2 * (1 + forecastInputs.x2Growth);
    }

    const hasMulticollinearity = vif1 > 5 || vif2 > 5;

    const plotData = data.map((p, i) => ({ 
      actualY: p.y, 
      predictedY: y_hat[i],
      x1: p.x1,
      x2: p.x2,
      residual: p.y - y_hat[i]
    }));

    return {
      beta,
      rSquared,
      adjustedR2,
      ser,
      seBeta0,
      seBeta1,
      seBeta2,
      tBeta0,
      tBeta1,
      tBeta2,
      pBeta0,
      pBeta1,
      pBeta2,
      ciBeta0,
      ciBeta1,
      ciBeta2,
      fStatistic,
      fDf1,
      fDf2,
      fPValue,
      vif1,
      vif2,
      forecastSeries,
      hasMulticollinearity,
      plotData,
      residuals,
      n,
      k,
      df,
      x1_bar,
      x2_bar,
      equation: `${yLabel} = ${formatNumber(beta[0], 2)} + ${formatNumber(beta[1], 2)} × (${x1Label}) + ${formatNumber(beta[2], 2)} × (${x2Label})`
    };
  }, [data, forecastInputs, yLabel, x1Label, x2Label, confidenceLevel, forecastHorizon]);

  const addRow = () => setData([...data, { y: 0, x1: 0, x2: 0 }]);
  const removeRow = (index) => setData(data.filter((_, i) => i !== index));
  const updateData = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = Number(value) || 0;
    setData(newData);
  };

  return (
    <TooltipProvider>
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900">
            <BarChart3 className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-xl">Multiple Regression Forecaster</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">Analyze how multiple factors influence a key financial metric</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Configuration Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-base lg:text-lg">📊 Define Your Variables</h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Output (y) we want to predict:</Label>
                  <Input
                    value={yLabel}
                    onChange={(e) => setYLabel(e.target.value)}
                    placeholder="e.g., Monthly Revenue"
                    className="font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Predictor 1 (x₁):</Label>
                  <Input
                    value={x1Label}
                    onChange={(e) => setX1Label(e.target.value)}
                    placeholder="e.g., Advertising Budget"
                    className="font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Predictor 2 (x₂):</Label>
                  <Input
                    value={x2Label}
                    onChange={(e) => setX2Label(e.target.value)}
                    placeholder="e.g., Sales Team Size"
                    className="font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confidence Level</Label>
                  <select 
                    className="w-full p-2 border rounded-md bg-background"
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                  >
                    <option value="90">90%</option>
                    <option value="95">95%</option>
                    <option value="99">99%</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="font-semibold text-base lg:text-lg">📈 Enter Historical Data</h3>
                <Button onClick={addRow} size="sm" variant="outline" className="gap-2 self-start sm:self-auto">
                  <Plus className="h-4 w-4"/>Add Row
                </Button>
              </div>
              
              <div className="hidden sm:block border rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2 mb-3 text-sm font-medium text-gray-600">
                  <div className="truncate">{yLabel}</div>
                  <div className="truncate">{x1Label}</div>
                  <div className="truncate">{x2Label}</div>
                  <div></div>
                </div>
                
                {data.map((row, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 mb-2 items-center">
                    <Input 
                      type="number" 
                      value={row.y} 
                      onChange={e => updateData(i, 'y', e.target.value)} 
                      className="font-mono text-sm"
                      placeholder="300"
                    />
                    <Input 
                      type="number" 
                      value={row.x1} 
                      onChange={e => updateData(i, 'x1', e.target.value)} 
                      className="font-mono text-sm"
                      placeholder="10"
                    />
                    <Input 
                      type="number" 
                      value={row.x2} 
                      onChange={e => updateData(i, 'x2', e.target.value)} 
                      className="font-mono text-sm"
                      placeholder="20"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeRow(i)} className="h-8 w-8">
                      <X className="h-4 w-4 text-red-500"/>
                    </Button>
                  </div>
                ))}
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3 max-h-64 overflow-y-auto">
                {data.map((row, i) => (
                  <Card key={i} className="p-3">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-sm">Data Point {i + 1}</h4>
                      <Button size="icon" variant="ghost" onClick={() => removeRow(i)} className="h-7 w-7">
                        <X className="h-4 w-4 text-red-500"/>
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">{yLabel}</Label>
                        <Input 
                          type="number" 
                          value={row.y} 
                          onChange={e => updateData(i, 'y', e.target.value)} 
                          className="font-mono text-sm"
                          placeholder="300"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">{x1Label}</Label>
                          <Input 
                            type="number" 
                            value={row.x1} 
                            onChange={e => updateData(i, 'x1', e.target.value)} 
                            className="font-mono text-sm"
                            placeholder="10"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">{x2Label}</Label>
                          <Input 
                            type="number" 
                            value={row.x2} 
                            onChange={e => updateData(i, 'x2', e.target.value)} 
                            className="font-mono text-sm"
                            placeholder="20"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* ===== NEW: Forecast Configuration ===== */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base lg:text-lg">🔮 Create a Forecast</h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">What will {x1Label} be?</Label>
                    <Input
                      type="number"
                      value={forecastInputs.x1}
                      onChange={(e) => setForecastInputs({...forecastInputs, x1: Number(e.target.value) || 0})}
                      className="font-mono"
                      placeholder="28"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">What will {x2Label} be?</Label>
                    <Input
                      type="number"
                      value={forecastInputs.x2}
                      onChange={(e) => setForecastInputs({...forecastInputs, x2: Number(e.target.value) || 0})}
                      className="font-mono"
                      placeholder="50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Forecast Horizon</Label>
                    <Input
                      type="number"
                      value={forecastHorizon}
                      onChange={(e) => setForecastHorizon(Math.max(1, Number(e.target.value) || 1))}
                      className="font-mono"
                      min={1}
                      max={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">x₁ Growth Rate</Label>
                    <Input
                      type="number"
                      value={forecastInputs.x1Growth * 100}
                      onChange={(e) => setForecastInputs({...forecastInputs, x1Growth: (Number(e.target.value) || 0) / 100})}
                      className="font-mono"
                      step={0.5}
                      placeholder="5%"
                    />
                    <p className="text-[10px] text-gray-400">% per period</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">x₂ Growth Rate</Label>
                    <Input
                      type="number"
                      value={forecastInputs.x2Growth * 100}
                      onChange={(e) => setForecastInputs({...forecastInputs, x2Growth: (Number(e.target.value) || 0) / 100})}
                      className="font-mono"
                      step={0.5}
                      placeholder="3%"
                    />
                    <p className="text-[10px] text-gray-400">% per period</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Endogeneity Diagnosis */}
            <div className="mt-4">
              <EndogeneityDiagnosis 
                dataPoints={data.map(p => ({ x: p.x1, y: p.y }))}
                regressionResults={null}
                onEndogeneityStatusChange={setEndogeneityStatus}
              />
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4"/>
                <AlertTitle>{results.multicollinearity ? 'Multicollinearity Detected' : 'Calculation Error'}</AlertTitle>
                <AlertDescription>{results.description || results.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* ===== NEW: Forecast Series Table ===== */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base lg:text-lg">🎯 Forecasted {yLabel}</h3>
                  
                  <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="py-1.5 px-2">Period</TableHead>
                          <TableHead className="text-right py-1.5 px-2">{x1Label}</TableHead>
                          <TableHead className="text-right py-1.5 px-2">{x2Label}</TableHead>
                          <TableHead className="text-right py-1.5 px-2">Forecast {yLabel}</TableHead>
                          <TableHead className="text-right py-1.5 px-2">{confidenceLevel}% CI</TableHead>
                          <TableHead className="text-right py-1.5 px-2">Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.forecastSeries.map((f, i) => (
                          <TableRow key={i} className="text-xs">
                            <TableCell className="py-1 px-2 font-medium">{i + 1}</TableCell>
                            <TableCell className="text-right font-mono py-1 px-2">{formatNumber(f.x1, 1)}</TableCell>
                            <TableCell className="text-right font-mono py-1 px-2">{formatNumber(f.x2, 1)}</TableCell>
                            <TableCell className="text-right font-mono font-bold py-1 px-2">{formatNumber(f.y, 2)}</TableCell>
                            <TableCell className="text-right font-mono text-[10px] py-1 px-2">
                              {formatNumber(f.lowerBound, 2)} — {formatNumber(f.upperBound, 2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[10px] py-1 px-2">
                              ±{formatNumber(f.marginOfError, 2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {results.hasMulticollinearity && (
                    <div className="flex items-center gap-2 text-orange-700 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      <span>⚠️ High multicollinearity detected - forecasts may be unreliable</span>
                    </div>
                  )}
                </div>

                {/* Coefficient Table */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base lg:text-lg">📋 Coefficient Estimates</h3>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="py-2 px-3">Variable</TableHead>
                          <TableHead className="text-right py-2 px-3">Coef.</TableHead>
                          <TableHead className="text-right py-2 px-3">Std. Error</TableHead>
                          <TableHead className="text-right py-2 px-3">t-stat</TableHead>
                          <TableHead className="text-right py-2 px-3">p-value</TableHead>
                          <TableHead className="text-right py-2 px-3">{confidenceLevel}% CI</TableHead>
                          <TableHead className="text-right py-2 px-3">VIF</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="text-xs">
                          <TableCell className="py-1.5 px-3 font-medium">Intercept</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatNumber(results.beta[0])}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatNumber(results.seBeta0)}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatNumber(results.tBeta0, 3)}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatPValue(results.pBeta0)}</TableCell>
                          <TableCell className="text-right font-mono text-[10px] py-1.5 px-3">
                            {formatNumber(results.ciBeta0.lower, 2)} — {formatNumber(results.ciBeta0.upper, 2)}
                          </TableCell>
                          <TableCell className="text-right py-1.5 px-3">—</TableCell>
                        </TableRow>
                        <TableRow className="text-xs">
                          <TableCell className="py-1.5 px-3 font-medium">{x1Label}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatNumber(results.beta[1])}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatNumber(results.seBeta1)}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatNumber(results.tBeta1, 3)}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatPValue(results.pBeta1)}</TableCell>
                          <TableCell className="text-right font-mono text-[10px] py-1.5 px-3">
                            {formatNumber(results.ciBeta1.lower, 2)} — {formatNumber(results.ciBeta1.upper, 2)}
                          </TableCell>
                          <TableCell className="text-right py-1.5 px-3">
                            <VifBadge vif={results.vif1} name={x1Label} />
                          </TableCell>
                        </TableRow>
                        <TableRow className="text-xs">
                          <TableCell className="py-1.5 px-3 font-medium">{x2Label}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatNumber(results.beta[2])}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatNumber(results.seBeta2)}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatNumber(results.tBeta2, 3)}</TableCell>
                          <TableCell className="text-right font-mono py-1.5 px-3">{formatPValue(results.pBeta2)}</TableCell>
                          <TableCell className="text-right font-mono text-[10px] py-1.5 px-3">
                            {formatNumber(results.ciBeta2.lower, 2)} — {formatNumber(results.ciBeta2.upper, 2)}
                          </TableCell>
                          <TableCell className="text-right py-1.5 px-3">
                            <VifBadge vif={results.vif2} name={x2Label} />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Model Summary */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base lg:text-lg">📋 Model Summary</h3>
                  
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Regression Equation:</p>
                        <p className="font-mono text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
                          {results.equation}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500">R-Squared</p>
                          <p className="text-base font-bold">{formatNumber(results.rSquared, 3)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Adjusted R²</p>
                          <p className="text-base font-bold">{formatNumber(results.adjustedR2, 3)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">F-statistic</p>
                          <p className="text-base font-bold">{formatNumber(results.fStatistic, 2)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Observations</p>
                          <p className="text-base font-bold">{results.n}</p>
                          <p className="text-[10px] text-gray-400">df = {results.df}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-gray-500">F-test p-value:</p>
                        <span className="text-xs font-mono">{formatPValue(results.fPValue)}</span>
                        {results.fPValue === '< 0.001' || results.fPValue === '< 0.01' || results.fPValue === '< 0.05' ? (
                          <Badge className="bg-green-100 text-green-800 text-[10px]">✅ Model is significant</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">⚠️ Model may not be significant</Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">R-Squared:</p>
                          <p className="text-xl font-bold">{formatNumber(results.rSquared, 3)}</p>
                        </div>
                        {getRSquaredBadge(results.rSquared, results.adjustedR2)}
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">
                          Standard Error of Regression (SER): {formatNumber(results.ser, 2)}
                          <span className="ml-2 text-[10px]">df = {results.df}</span>
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Model Fit Chart */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-base lg:text-lg">📊 Model Fit: Actual vs. Predicted</h3>
                  <div className="h-48 sm:h-64 w-full">
                    <ResponsiveContainer>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                        <XAxis 
                          type="number" 
                          dataKey="actualY" 
                          name={`Actual ${yLabel}`} 
                          domain={['dataMin - 20', 'dataMax + 20']} 
                          tickFormatter={v => formatNumber(v, 0)}
                          tick={{ fontSize: 10 }}
                          width={50}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="predictedY" 
                          name={`Predicted ${yLabel}`} 
                          domain={['dataMin - 20', 'dataMax + 20']} 
                          tickFormatter={v => formatNumber(v, 0)}
                          tick={{ fontSize: 10 }}
                          width={50}
                        />
                        <ZAxis type="number" range={[60]} />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(value, name) => [formatNumber(value, 1), name]}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Scatter name="Model Predictions" data={results.plotData} fill="#8884d8"/>
                        <ReferenceLine 
                          segment={[
                            {x: Math.min(...results.plotData.map(p => p.actualY)), y: Math.min(...results.plotData.map(p => p.actualY))},
                            {x: Math.max(...results.plotData.map(p => p.actualY)), y: Math.max(...results.plotData.map(p => p.actualY))}
                          ]} 
                          stroke="red" 
                          strokeDasharray="4 4" 
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Points closer to the red line indicate better model fit
                  </p>
                </div>

                {/* ===== NEW: Forecast Trend Chart ===== */}
                {results.forecastSeries.length > 1 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base lg:text-lg">📈 Forecast Trend</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer>
                        <LineChart data={results.forecastSeries}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                          <XAxis 
                            dataKey="period" 
                            name="Period" 
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis 
                            dataKey="y" 
                            name={`Forecast ${yLabel}`} 
                            tickFormatter={v => formatNumber(v, 0)}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [formatNumber(value, 2), name]}
                            labelFormatter={(label) => `Period ${label}`}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Line 
                            type="monotone" 
                            dataKey="y" 
                            stroke="#8884d8" 
                            name="Forecast"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="upperBound" 
                            stroke="#82ca9d" 
                            name="Upper CI"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="lowerBound" 
                            stroke="#82ca9d" 
                            name="Lower CI"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Forecast with {confidenceLevel}% confidence interval
                    </p>
                  </div>
                )}

                {/* Econometrics Diagnosis */}
                <div className="mt-4">
                  <EconometricsDiagnosis 
                    dataPoints={data.map(p => ({ x: p.x1, y: p.y }))}
                    regressionResults={{
                      isValid: true,
                      slope: results.beta[1],
                      intercept: results.beta[0],
                      rSquared: results.rSquared,
                      residuals: results.residuals || [],
                      sse: data.reduce((sum, p, i) => sum + (p.y - results.plotData[i].predictedY) ** 2, 0),
                      standardErrorEstimate: results.ser,
                      tStatisticSlope: results.tBeta1,
                      n: results.n,
                      degreesOfFreedom: results.df,
                      slopeCI: { lower: results.ciBeta1.lower, upper: results.ciBeta1.upper },
                      interceptCI: { lower: results.ciBeta0.lower, upper: results.ciBeta0.upper }
                    }}
                    modelType="multiple"
                    dependentVariable={yLabel}
                    defaultExpanded={false}
                    compact={true}
                    endogeneityStatus={endogeneityStatus}
                    dataType="cross-sectional"
                  />
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

