// ===== src/components/calculators/TimeSeriesRegression.jsx =====
// Enhanced with visible Advanced TS Diagnostics

import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  TrendingUp, 
  Plus, 
  X, 
  ListOrdered, 
  AlertTriangle, 
  Info,
  Activity,
  Clock,
  Upload,
  Download,
  FileText,
  Shield,
  Zap,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EconometricsDiagnosis from './EconometricsDiagnosis';
import EndogeneityDiagnosis from './EndogeneityDiagnosis';

// ===== Utility Functions =====

const formatNumber = (num, decimals = 4) => {
  if (num === null || num === undefined || !isFinite(num)) return "N/A";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// ===== ADF Critical Values =====
const ADF_CRITICAL_VALUES = {
  'no_constant': { '1%': -2.58, '5%': -1.95, '10%': -1.62 },
  'constant': { '1%': -3.43, '5%': -2.86, '10%': -2.57 },
  'constant_trend': { '1%': -3.96, '5%': -3.41, '10%': -3.12 }
};

// ===== Cointegration Critical Values (Engle-Granger) =====
const COINTEGRATION_CRITICAL_VALUES = {
  '10%': -3.04,
  '5%': -3.34,
  '2.5%': -3.59,
  '1%': -3.90
};

// ===== Data Parser for Time Series =====
const parseTimeSeriesFile = (text, fileType) => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  let headers = [];
  let rows = [];
  
  if (fileType === 'csv' || fileType === 'text/csv') {
    const allRows = lines.map(line => line.split(',').map(cell => cell.trim()));
    headers = allRows[0] || [];
    rows = allRows.slice(1).filter(row => row.length >= 3);
  } else if (fileType === 'application/json') {
    try {
      const jsonData = JSON.parse(text);
      if (Array.isArray(jsonData)) {
        headers = Object.keys(jsonData[0] || {});
        rows = jsonData.map(item => headers.map(h => item[h]));
      }
    } catch (e) {
      throw new Error('Invalid JSON format');
    }
  } else {
    const allRows = lines.map(line => line.split(/\t|\s+/).filter(cell => cell.trim() !== ''));
    headers = allRows[0] || [];
    rows = allRows.slice(1).filter(row => row.length >= 3);
  }
  return { headers, rows };
};

// ===== ADF Unit Root Test =====
const calculateADFTest = (data, modelType = 'constant', maxLags = null) => {
  const y = data.map(p => p.y);
  const n = y.length;
  
  if (n < 6) {
    return { 
      isValid: false, 
      message: 'Need at least 6 observations for ADF test',
      testStatistic: null,
      criticalValues: ADF_CRITICAL_VALUES[modelType],
      isStationary: null,
      pValue: null
    };
  }
  
  // Compute first differences
  const dy = [];
  for (let i = 1; i < n; i++) {
    dy.push(y[i] - y[i-1]);
  }
  
  // Determine optimal lag using AIC (simplified)
  const maxLagsUsed = maxLags || Math.min(Math.floor((n-1)/3), 4);
  
  // Simple ADF test without lags for demonstration
  const y_lag = y.slice(0, n-1);
  const y_diff = dy;
  
  const meanY_lag = y_lag.reduce((a, b) => a + b, 0) / y_lag.length;
  const meanDiff = y_diff.reduce((a, b) => a + b, 0) / y_diff.length;
  
  // Simple OLS: Δyₜ = α + θyₜ₋₁ + eₜ
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < y_lag.length; i++) {
    numerator += (y_lag[i] - meanY_lag) * (y_diff[i] - meanDiff);
    denominator += (y_lag[i] - meanY_lag) ** 2;
  }
  
  const theta = denominator === 0 ? 0 : numerator / denominator;
  const alpha = meanDiff - theta * meanY_lag;
  
  // Residuals and standard error
  let sse = 0;
  for (let i = 0; i < y_lag.length; i++) {
    const predicted = alpha + theta * y_lag[i];
    sse += (y_diff[i] - predicted) ** 2;
  }
  const se = Math.sqrt(sse / (y_lag.length - 2));
  const seTheta = se / Math.sqrt(denominator);
  
  const testStatistic = theta / seTheta;
  
  // Get critical values
  const criticalValues = ADF_CRITICAL_VALUES[modelType] || ADF_CRITICAL_VALUES['constant'];
  
  // Determine if stationary (test statistic < critical value)
  const isStationary = testStatistic < criticalValues['5%'];
  
  // Approximate p-value (simplified)
  let pValue = null;
  if (isStationary) {
    pValue = testStatistic < criticalValues['1%'] ? '< 0.01' : 
             testStatistic < criticalValues['5%'] ? '< 0.05' : '< 0.10';
  } else {
    pValue = '> 0.10';
  }
  
  return {
    isValid: true,
    testStatistic: testStatistic,
    criticalValues: criticalValues,
    isStationary: isStationary,
    pValue: pValue,
    theta: theta,
    alpha: alpha,
    modelType: modelType,
    n: y_lag.length
  };
};

// ===== Cointegration Test (Engle-Granger) =====
const calculateCointegrationTest = (data, results) => {
  const n = data.length;
  
  if (n < 6) {
    return {
      isValid: false,
      message: 'Need at least 6 observations for cointegration test',
      testStatistic: null,
      criticalValues: COINTEGRATION_CRITICAL_VALUES,
      isCointegrated: null
    };
  }
  
  // Use residuals from the main regression
  const residuals = results.residuals.map(r => r.residual);
  
  // ADF test on residuals
  const y = residuals;
  const dy = [];
  for (let i = 1; i < y.length; i++) {
    dy.push(y[i] - y[i-1]);
  }
  
  const y_lag = y.slice(0, y.length - 1);
  const y_diff = dy;
  
  const meanY_lag = y_lag.reduce((a, b) => a + b, 0) / y_lag.length;
  const meanDiff = y_diff.reduce((a, b) => a + b, 0) / y_diff.length;
  
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < y_lag.length; i++) {
    numerator += (y_lag[i] - meanY_lag) * (y_diff[i] - meanDiff);
    denominator += (y_lag[i] - meanY_lag) ** 2;
  }
  
  const theta = denominator === 0 ? 0 : numerator / denominator;
  
  let sse = 0;
  for (let i = 0; i < y_lag.length; i++) {
    const predicted = theta * y_lag[i];
    sse += (y_diff[i] - predicted) ** 2;
  }
  const se = Math.sqrt(sse / (y_lag.length - 1));
  const seTheta = se / Math.sqrt(denominator);
  
  const testStatistic = theta / seTheta;
  
  // Use cointegration critical values (different from ADF!)
  const criticalValues = COINTEGRATION_CRITICAL_VALUES;
  const isCointegrated = testStatistic < criticalValues['5%'];
  
  return {
    isValid: true,
    testStatistic: testStatistic,
    criticalValues: criticalValues,
    isCointegrated: isCointegrated,
    theta: theta,
    n: y_lag.length
  };
};

// ===== HAC Standard Errors (Newey-West) =====
const calculateHACStandardErrors = (data, results) => {
  const n = data.length;
  const residuals = results.residuals.map(r => r.residual);
  const xValues = data.map(p => p.x);
  const meanX = xValues.reduce((a, b) => a + b, 0) / n;
  
  // Newey-West with lag = floor(4*(n/100)^(2/9))
  const maxLag = Math.min(Math.floor(4 * Math.pow(n/100, 2/9)), n-1);
  
  // Compute weights
  const weights = [];
  for (let lag = 0; lag <= maxLag; lag++) {
    weights.push(1 - lag / (maxLag + 1));
  }
  
  // Compute S_0 (lag 0)
  let S0 = 0;
  for (let t = 0; t < n; t++) {
    const xDev = xValues[t] - meanX;
    S0 += (xDev * residuals[t]) ** 2;
  }
  
  // Compute S_lag for each lag
  let S = S0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let t = lag; t < n; t++) {
      const xDev_t = xValues[t] - meanX;
      const xDev_t_lag = xValues[t - lag] - meanX;
      sum += xDev_t * xDev_t_lag * residuals[t] * residuals[t - lag];
    }
    S += 2 * weights[lag] * sum;
  }
  
  // Compute denominator
  const denominator = xValues.reduce((acc, x) => acc + (x - meanX) ** 2, 0);
  
  // HAC variance
  const hacVariance = S / (denominator ** 2);
  const hacSe = Math.sqrt(hacVariance);
  
  // Compare with OLS standard error
  const olsSe = results.seSlope;
  
  return {
    hacSe: hacSe,
    olsSe: olsSe,
    ratio: hacSe / olsSe,
    maxLag: maxLag,
    isSignificantlyDifferent: Math.abs(hacSe / olsSe - 1) > 0.2
  };
};

// ===== Spurious Regression Check =====
const checkSpuriousRegression = (data, results, adfResult) => {
  const n = data.length;
  
  // Check if both y and x are I(1)
  const yStationary = adfResult?.isStationary;
  
  // Simple check: if R² is very high and residuals are non-stationary
  const highR2 = results.rSquared > 0.8;
  
  // Check if residuals are non-stationary (using Durbin-Watson as proxy)
  const residualNonStationary = results.durbinWatson < 0.5 || results.durbinWatson > 3.5;
  
  const isSpurious = highR2 && (yStationary === false || residualNonStationary);
  
  return {
    isSpurious: isSpurious,
    highR2: highR2,
    residualNonStationary: residualNonStationary,
    yStationary: yStationary,
    recommendation: isSpurious ? 
      'Consider differencing the variables or testing for cointegration' :
      'No strong evidence of spurious regression'
  };
};

// ===== Main Component =====
const TimeSeriesRegression = () => {
  // State
  const [dataPoints, setDataPoints] = useState([
    { t: 2001, y: 70539.4, x: 159974.1 },
    { t: 2002, y: 73480.5, x: 164629.9 },
    { t: 2003, y: 74775.4, x: 168995.8 },
    { t: 2004, y: 78570.2, x: 193001.5 },
    { t: 2005, y: 81778.2, x: 212074.0 },
    { t: 2006, y: 87264.6, x: 234835.0 },
  ]);
  const [timeLabel, setTimeLabel] = useState('Year');
  const [yLabel, setYLabel] = useState('Consumption');
  const [xLabel, setXLabel] = useState('GDP');
  const [lagOrder, setLagOrder] = useState(1);
  const [forecastHorizon, setForecastHorizon] = useState(2);
  const [fileUploadError, setFileUploadError] = useState(null);
  const [endogeneityStatus, setEndogeneityStatus] = useState(null);
  const [adfResult, setAdfResult] = useState(null);
  const [cointegrationResult, setCointegrationResult] = useState(null);
  const [showAdvancedDiagnostics, setShowAdvancedDiagnostics] = useState(true);
  const [showHACDetails, setShowHACDetails] = useState(false);
  const fileInputRef = useRef(null);

  // ===== Time Series Analysis =====
  const results = useMemo(() => {
    if (dataPoints.length < 3) {
      return { isValid: false, message: 'Need at least 3 time periods' };
    }

    const n = dataPoints.length;
    const tValues = dataPoints.map(p => p.t);
    const yValues = dataPoints.map(p => p.y);
    const xValues = dataPoints.map(p => p.x);
    
    // Check for gaps in time
    const gaps = [];
    for (let i = 1; i < tValues.length; i++) {
      if (tValues[i] - tValues[i-1] > 1) {
        gaps.push({ from: tValues[i-1], to: tValues[i] });
      }
    }
    
    // Simple OLS regression
    const meanY = yValues.reduce((a, b) => a + b, 0) / n;
    const meanX = xValues.reduce((a, b) => a + b, 0) / n;
    
    const numerator = xValues.reduce((acc, x, i) => acc + (x - meanX) * (yValues[i] - meanY), 0);
    const denominator = xValues.reduce((acc, x) => acc + (x - meanX) ** 2, 0);
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    // Residuals
    const residuals = dataPoints.map((p, i) => ({
      t: p.t,
      actual: p.y,
      predicted: intercept + slope * p.x,
      residual: p.y - (intercept + slope * p.x)
    }));
    
    // SSE, SST, R²
    const sse = residuals.reduce((acc, r) => acc + r.residual ** 2, 0);
    const sst = yValues.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
    const rSquared = sst === 0 ? 0 : 1 - (sse / sst);
    
    // Standard Error
    const se = Math.sqrt(sse / (n - 2));
    const seSlope = se / Math.sqrt(denominator);
    const tStat = slope / seSlope;
    const seIntercept = se * Math.sqrt((1/n) + (Math.pow(meanX, 2) / denominator));
    
    // Durbin-Watson Test (Autocorrelation)
    let dwNumerator = 0;
    let dwDenominator = 0;
    for (let i = 1; i < residuals.length; i++) {
      dwNumerator += (residuals[i].residual - residuals[i-1].residual) ** 2;
    }
    for (let i = 0; i < residuals.length; i++) {
      dwDenominator += residuals[i].residual ** 2;
    }
    const durbinWatson = dwDenominator === 0 ? 2 : dwNumerator / dwDenominator;
    
    // Stationarity Test (Simplified)
    const half = Math.floor(n / 2);
    const firstHalf = yValues.slice(0, half);
    const secondHalf = yValues.slice(half);
    const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const meanDiff = Math.abs(mean1 - mean2) / Math.max(Math.abs(mean1), Math.abs(mean2));
    const isStationary = meanDiff < 0.15;
    
    // Forecasts
    const forecasts = [];
    const lastX = xValues[xValues.length - 1];
    const lastT = tValues[tValues.length - 1];
    const tCrit = 2.0;
    
    for (let i = 1; i <= forecastHorizon; i++) {
      const forecastT = lastT + i;
      const forecastX = lastX * (1 + 0.05);
      const forecastY = intercept + slope * forecastX;
      
      const sePred = se * Math.sqrt(1 + 1/n + Math.pow(forecastX - meanX, 2) / denominator);
      const margin = tCrit * sePred;
      
      forecasts.push({
        t: forecastT,
        y: forecastY,
        x: forecastX,
        lowerBound: forecastY - margin,
        upperBound: forecastY + margin,
        marginOfError: margin
      });
    }
    
    // ADL Model: Include lagged y
    const laggedY = [];
    for (let i = lagOrder; i < yValues.length; i++) {
      laggedY.push({
        y: yValues[i],
        y_lag: yValues[i - lagOrder],
        x: xValues[i]
      });
    }
    
    // Simple AR(1) estimation
    let arSlope = 0;
    let arIntercept = 0;
    if (laggedY.length >= 2) {
      const meanY_lag = laggedY.reduce((a, b) => a + b.y, 0) / laggedY.length;
      const meanY_lag_prev = laggedY.reduce((a, b) => a + b.y_lag, 0) / laggedY.length;
      
      const num = laggedY.reduce((acc, d) => acc + (d.y - meanY_lag) * (d.y_lag - meanY_lag_prev), 0);
      const den = laggedY.reduce((acc, d) => acc + (d.y_lag - meanY_lag_prev) ** 2, 0);
      
      arSlope = den === 0 ? 0 : num / den;
      arIntercept = meanY_lag - arSlope * meanY_lag_prev;
    }

    // HAC Standard Errors
    const hacResult = calculateHACStandardErrors(dataPoints, { residuals, seSlope });

    // Spurious Regression Check
    const spuriousCheck = checkSpuriousRegression(dataPoints, { rSquared, durbinWatson, residuals }, adfResult);

    return {
      isValid: true,
      slope,
      intercept,
      rSquared,
      se,
      seSlope,
      seIntercept,
      tStat,
      durbinWatson,
      isStationary,
      meanDiff,
      residuals,
      forecasts,
      n,
      gaps,
      laggedY,
      arSlope,
      arIntercept,
      equation: `ŷ = ${formatNumber(intercept, 2)} + ${formatNumber(slope, 2)}x`,
      arEquation: arSlope !== 0 ? `y_t = ${formatNumber(arIntercept, 2)} + ${formatNumber(arSlope, 2)}y_{t-${lagOrder}}` : null,
      meanY,
      meanX,
      // For diagnostics
      interceptCI: {
        lower: intercept - tCrit * seIntercept,
        upper: intercept + tCrit * seIntercept
      },
      slopeCI: {
        lower: slope - tCrit * seSlope,
        upper: slope + tCrit * seSlope
      },
      // HAC results
      hacSe: hacResult.hacSe,
      hacRatio: hacResult.ratio,
      hacMaxLag: hacResult.maxLag,
      hacIsDifferent: hacResult.isSignificantlyDifferent,
      // Spurious regression
      isSpurious: spuriousCheck.isSpurious,
      spuriousRecommendation: spuriousCheck.recommendation
    };
  }, [dataPoints, lagOrder, forecastHorizon, adfResult]);

  // ===== Data Management =====
  const addDataPoint = () => {
    const lastT = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].t : 2000;
    setDataPoints([...dataPoints, { t: lastT + 1, y: 0, x: 0 }]);
  };

  const removeDataPoint = (index) => {
    if (dataPoints.length > 3) {
      setDataPoints(dataPoints.filter((_, i) => i !== index));
    }
  };

  const updateDataPoint = (index, field, value) => {
    const newData = [...dataPoints];
    newData[index][field] = Number(value);
    setDataPoints(newData);
  };

  const autoIndexT = () => {
    const startYear = dataPoints.length > 0 ? dataPoints[0].t : 2001;
    setDataPoints(dataPoints.map((p, i) => ({ ...p, t: startYear + i })));
  };

  // ===== File Upload =====
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileUploadError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const { headers, rows } = parseTimeSeriesFile(text, file.type);

        if (rows.length === 0) {
          setFileUploadError('No data rows found in the file.');
          return;
        }

        if (headers.length >= 3) {
          setTimeLabel(headers[0] || 'Time');
          setYLabel(headers[1] || 'Y');
          setXLabel(headers[2] || 'X');
        }

        const newData = rows.map(row => ({
          t: parseFloat(row[0]),
          y: parseFloat(row[1]),
          x: parseFloat(row[2])
        })).filter(d => !isNaN(d.t) && !isNaN(d.y) && !isNaN(d.x));

        if (newData.length < 3) {
          setFileUploadError('Need at least 3 valid time series data points.');
          return;
        }

        setDataPoints(newData);
        setFileUploadError(null);
        setAdfResult(null);
        setCointegrationResult(null);
      } catch (err) {
        setFileUploadError(`Error parsing file: ${err.message}`);
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const exportData = () => {
    const headers = ['t', 'y', 'x'];
    const rows = dataPoints.map(p => [p.t, p.y, p.x]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeseries_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Load Sample Data =====
  const loadSampleData = () => {
    setDataPoints([
      { t: 2001, y: 70539.4, x: 159974.1 },
      { t: 2002, y: 73480.5, x: 164629.9 },
      { t: 2003, y: 74775.4, x: 168995.8 },
      { t: 2004, y: 78570.2, x: 193001.5 },
      { t: 2005, y: 81778.2, x: 212074.0 },
      { t: 2006, y: 87264.6, x: 234835.0 },
    ]);
    setTimeLabel('Year');
    setYLabel('Consumption');
    setXLabel('GDP');
    setAdfResult(null);
    setCointegrationResult(null);
  };

  const clearData = () => {
    if (dataPoints.length > 0) {
      setDataPoints([{ t: 2000, y: 0, x: 0 }]);
      setAdfResult(null);
      setCointegrationResult(null);
    }
  };

  // ===== Run ADF Test =====
  const runADFTest = () => {
    if (dataPoints.length < 6) {
      setAdfResult({ 
        isValid: false, 
        message: 'Need at least 6 observations for reliable ADF test',
        isStationary: null 
      });
      return;
    }
    const result = calculateADFTest(dataPoints, 'constant');
    setAdfResult(result);
  };

  // ===== Run Cointegration Test =====
  const runCointegrationTest = () => {
    if (dataPoints.length < 6 || !results.isValid) {
      setCointegrationResult({ 
        isValid: false, 
        message: 'Need at least 6 observations and valid regression results',
        isCointegrated: null 
      });
      return;
    }
    const result = calculateCointegrationTest(dataPoints, results);
    setCointegrationResult(result);
  };

  const combinedChartData = [...dataPoints, ...(results.forecasts || [])];

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Time Series Regression</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Analyze trends, stationarity, and autocorrelation over time
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* ===== LEFT COLUMN (2/5): Inputs ===== */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                {/* Variable Names */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Time</Label>
                    <Input 
                      value={timeLabel} 
                      onChange={(e) => setTimeLabel(e.target.value)} 
                      placeholder="e.g., Year"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Y-Variable</Label>
                    <Input 
                      value={yLabel} 
                      onChange={(e) => setYLabel(e.target.value)} 
                      placeholder="e.g., Consumption"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">X-Variable</Label>
                    <Input 
                      value={xLabel} 
                      onChange={(e) => setXLabel(e.target.value)} 
                      placeholder="e.g., GDP"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Time Series Data */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-xs font-medium">Time Series Data (t, y, x)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.json,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button 
                        onClick={triggerFileUpload} 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs gap-1 px-2"
                      >
                        <Upload className="h-3 w-3"/> Upload
                      </Button>
                      <Button 
                        onClick={exportData} 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs gap-1 px-2"
                        disabled={dataPoints.length === 0}
                      >
                        <Download className="h-3 w-3"/> Export
                      </Button>
                      <Button onClick={autoIndexT} variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
                        <ListOrdered className="h-3 w-3"/> Auto-Index
                      </Button>
                      <Button onClick={addDataPoint} variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
                        <Plus className="h-3 w-3"/> Add
                      </Button>
                    </div>
                  </div>
                  
                  {fileUploadError && (
                    <Alert variant="destructive" className="py-1.5 px-2.5">
                      <AlertTriangle className="h-3 w-3" />
                      <AlertDescription className="text-xs">{fileUploadError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-lg p-1">
                    {dataPoints.map((p, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          value={p.t} 
                          onChange={(e) => updateDataPoint(index, 't', e.target.value)} 
                          className="font-mono h-7 text-sm w-20" 
                        />
                        <Input 
                          type="number" 
                          value={p.y} 
                          onChange={(e) => updateDataPoint(index, 'y', e.target.value)} 
                          className="font-mono h-7 text-sm flex-1" 
                        />
                        <Input 
                          type="number" 
                          value={p.x} 
                          onChange={(e) => updateDataPoint(index, 'x', e.target.value)} 
                          className="font-mono h-7 text-sm flex-1" 
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeDataPoint(index)} 
                          className="h-6 w-6 text-red-500 hover:text-red-700"
                          disabled={dataPoints.length <= 3}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px] gap-1 px-2"
                      onClick={loadSampleData}
                    >
                      Load Sample Data
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px] gap-1 px-2 text-red-500 hover:text-red-700"
                      onClick={clearData}
                    >
                      Clear Data
                    </Button>
                  </div>
                </div>

                {/* Lag Order and Forecast Horizon */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Lag Order (AR)</Label>
                    <Input 
                      type="number" 
                      value={lagOrder} 
                      onChange={(e) => setLagOrder(Math.max(1, Number(e.target.value)))}
                      min={1}
                      max={3}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Forecast Horizon</Label>
                    <Input 
                      type="number" 
                      value={forecastHorizon} 
                      onChange={(e) => setForecastHorizon(Math.max(1, Number(e.target.value)))}
                      min={1}
                      max={5}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* ===== Advanced Time Series Diagnostics (Now Visible) ===== */}
              <div className="space-y-3 border-t pt-3">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowAdvancedDiagnostics(!showAdvancedDiagnostics)}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <Label className="text-sm font-medium cursor-pointer">Advanced TS Diagnostics</Label>
                    <Badge variant="outline" className="text-[8px]">Unit Root & Cointegration</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {showAdvancedDiagnostics ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </Button>
                </div>
                
                {showAdvancedDiagnostics && (
                  <div className="space-y-3 pl-1">
                    {/* ADF Unit Root Test */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Unit Root Test:</span>
                        <Button 
                          onClick={runADFTest} 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs gap-1 px-3"
                          disabled={dataPoints.length < 6}
                        >
                          <Zap className="h-3 w-3"/> Run ADF Test
                        </Button>
                        {dataPoints.length < 6 && (
                          <span className="text-[10px] text-gray-400">(Need ≥6 obs)</span>
                        )}
                      </div>
                      
                      {/* ADF Results */}
                      {adfResult && (
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded text-xs space-y-1.5 border border-gray-200 dark:border-gray-700">
                          {adfResult.isValid === false ? (
                            <p className="text-yellow-600">{adfResult.message}</p>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-500">ADF Test Statistic:</span>
                                <span className={`font-mono font-bold ${
                                  adfResult.isStationary ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                  {formatNumber(adfResult.testStatistic, 3)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">5% Critical Value:</span>
                                <span className="font-mono">{adfResult.criticalValues['5%']}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">p-value:</span>
                                <span className="font-mono">{adfResult.pValue || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
                                <Badge className={`text-[10px] ${
                                  adfResult.isStationary ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {adfResult.isStationary ? '✅ Stationary (I(0))' : '⚠️ Non-Stationary (I(1))'}
                                </Badge>
                                {!adfResult.isStationary && (
                                  <span className="text-[10px] text-yellow-600">💡 Consider differencing</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Cointegration Test */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Cointegration:</span>
                        <Button 
                          onClick={runCointegrationTest} 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs gap-1 px-3"
                          disabled={dataPoints.length < 6 || !results.isValid}
                        >
                          <Shield className="h-3 w-3"/> Engle-Granger Test
                        </Button>
                        {dataPoints.length < 6 && (
                          <span className="text-[10px] text-gray-400">(Need ≥6 obs)</span>
                        )}
                      </div>
                      
                      {/* Cointegration Results */}
                      {cointegrationResult && (
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded text-xs space-y-1.5 border border-gray-200 dark:border-gray-700">
                          {cointegrationResult.isValid === false ? (
                            <p className="text-yellow-600">{cointegrationResult.message}</p>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Engle-Granger Test Statistic:</span>
                                <span className={`font-mono font-bold ${
                                  cointegrationResult.isCointegrated ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                  {formatNumber(cointegrationResult.testStatistic, 3)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">5% Critical Value:</span>
                                <span className="font-mono">{cointegrationResult.criticalValues['5%']}</span>
                              </div>
                              <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
                                <Badge className={`text-[10px] ${
                                  cointegrationResult.isCointegrated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {cointegrationResult.isCointegrated ? '✅ Cointegrated' : '⚠️ Not Cointegrated'}
                                </Badge>
                                {!cointegrationResult.isCointegrated && (
                                  <span className="text-[10px] text-yellow-600">💡 Use differenced variables</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* HAC Standard Errors Info */}
                    {results.isValid && results.hacSe && (
                      <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded text-xs space-y-1.5 border border-gray-200 dark:border-gray-700">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setShowHACDetails(!showHACDetails)}
                        >
                          <p className="font-medium text-gray-700 dark:text-gray-300">HAC Standard Errors (Newey-West)</p>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                            {showHACDetails ? 
                              <ChevronDown className="h-3 w-3" /> : 
                              <ChevronRight className="h-3 w-3" />
                            }
                          </Button>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">HAC SE (Slope):</span>
                          <span className="font-mono">{formatNumber(results.hacSe, 4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">OLS SE (Slope):</span>
                          <span className="font-mono">{formatNumber(results.seSlope, 4)}</span>
                        </div>
                        {showHACDetails && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Ratio (HAC/OLS):</span>
                              <span className={`font-mono ${
                                results.hacRatio > 1.2 || results.hacRatio < 0.8 ? 'text-yellow-600' : ''
                              }`}>
                                {formatNumber(results.hacRatio, 3)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Max Lag:</span>
                              <span className="font-mono">{results.hacMaxLag}</span>
                            </div>
                          </>
                        )}
                        {results.hacIsDifferent && (
                          <p className="text-yellow-600 text-[10px]">⚠️ HAC and OLS SEs differ significantly - use HAC for inference</p>
                        )}
                      </div>
                    )}
                    
                    {/* Spurious Regression Warning */}
                    {results.isValid && results.isSpurious && (
                      <Alert variant="default" className="border-red-300 bg-red-50 dark:bg-red-950/20 py-1.5">
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                        <AlertDescription className="text-xs">
                          <span className="font-medium text-red-600">⚠️ Spurious Regression Risk:</span> {results.spuriousRecommendation}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>

              {/* ===== Econometrics Diagnosis ===== */}
              <div className="mt-2">
                <EconometricsDiagnosis 
                  dataPoints={dataPoints.map(p => ({ x: p.t, y: p.y }))}
                  regressionResults={results}
                  modelType="timeseries"
                  dependentVariable={yLabel}
                  defaultExpanded={false}
                  compact={true}
                  endogeneityStatus={endogeneityStatus}
                  dataType="time-series"
                />
              </div>
            </div>

            {/* ===== RIGHT COLUMN (3/5): Results ===== */}
            <div className="lg:col-span-3 space-y-4">
              {!results.isValid ? (
                <Alert>
                  <AlertTitle>Not Enough Data</AlertTitle>
                  <AlertDescription>
                    {results.message || 'Please provide at least 3 time periods.'}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Time Series Diagnostics */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">R-Squared</p>
                      <p className="text-base font-bold">{formatNumber(results.rSquared, 3)}</p>
                      <Badge className={`text-[10px] ${
                        results.rSquared >= 0.8 ? 'bg-green-100 text-green-800' :
                        results.rSquared >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {results.rSquared >= 0.8 ? 'Strong' :
                         results.rSquared >= 0.6 ? 'Moderate' :
                         'Weak'}
                      </Badge>
                    </Card>
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">Durbin-Watson</p>
                      <p className="text-base font-bold">{formatNumber(results.durbinWatson, 3)}</p>
                      <Badge className={`text-[10px] ${
                        results.durbinWatson >= 1.5 && results.durbinWatson <= 2.5 ? 
                          'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                        {results.durbinWatson >= 1.5 && results.durbinWatson <= 2.5 ? 
                          '✅ No Autocorrelation' :
                          '⚠️ Autocorrelation'}
                      </Badge>
                    </Card>
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">Stationarity</p>
                      <p className="text-base font-bold">{results.isStationary ? '✅ Yes' : '⚠️ No'}</p>
                      <p className="text-[10px] text-gray-400">Mean diff: {formatNumber(results.meanDiff, 3)}</p>
                    </Card>
                  </div>

                  {/* Results Cards - Slope & Intercept */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3">
                      <p className="text-xs font-medium text-gray-500">Slope (b)</p>
                      <p className="text-lg font-bold">{formatNumber(results.slope)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        95% CI: [{formatNumber(results.slopeCI.lower, 2)}, {formatNumber(results.slopeCI.upper, 2)}]
                      </p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs font-medium text-gray-500">Intercept (a)</p>
                      <p className="text-lg font-bold">{formatNumber(results.intercept)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        95% CI: [{formatNumber(results.interceptCI.lower, 2)}, {formatNumber(results.interceptCI.upper, 2)}]
                      </p>
                    </Card>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">Std. Error (Se)</p>
                      <p className="text-base font-bold">{formatNumber(results.se, 2)}</p>
                    </Card>
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">t-statistic</p>
                      <p className="text-base font-bold">{formatNumber(results.tStat, 3)}</p>
                    </Card>
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">Observations</p>
                      <p className="text-base font-bold">{results.n}</p>
                      <p className="text-[10px] text-gray-400">df = {results.n - 2}</p>
                    </Card>
                  </div>

                  {/* Equation */}
                  <Card className="p-3 text-center">
                    <p className="text-xs font-medium text-gray-500">Regression Equation</p>
                    <p className="text-sm font-mono font-semibold">{results.equation}</p>
                    {results.arEquation && (
                      <p className="text-[10px] font-mono text-gray-500 mt-0.5">AR({lagOrder}): {results.arEquation}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      t-stat: {formatNumber(results.tStat, 3)} | n: {results.n}
                    </p>
                  </Card>

                  {/* Chart */}
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={combinedChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" dataKey="t" name={timeLabel} tick={{ fontSize: 11 }} />
                        <YAxis type="number" dataKey="y" name={yLabel} tickFormatter={(v) => v.toLocaleString()} tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value) => formatNumber(value, 2)}
                          labelFormatter={(label) => `${timeLabel}: ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Scatter name="Data" dataKey="y" fill="#8884d8" data={dataPoints} />
                        <Line name="Forecast" dataKey="y" stroke="#82ca9d" strokeWidth={2} dot={{ stroke: '#82ca9d', strokeWidth: 2 }} data={results.forecasts}/>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Forecasts */}
                  {results.forecasts.length > 0 && (
                    <div className="space-y-2">
                      <Alert variant="default" className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 py-2">
                        <AlertTriangle className="h-3 w-3 !text-yellow-600" />
                        <AlertDescription className="text-xs">
                          Remember: Time series forecasts assume past patterns continue. 
                          External factors can cause deviations.
                        </AlertDescription>
                      </Alert>
                      
                      <h3 className="font-semibold text-sm pt-1">Forecasts</h3>
                      <div className="border rounded-lg max-h-32 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-xs">
                              <TableHead className="py-1.5">{timeLabel}</TableHead>
                              <TableHead className="text-right py-1.5">Forecast {yLabel}</TableHead>
                              <TableHead className="text-right py-1.5">95% CI</TableHead>
                              <TableHead className="text-right py-1.5">Margin</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.forecasts.map(f => (
                              <TableRow key={f.t} className="text-xs">
                                <TableCell className="py-1.5 font-medium">{f.t}</TableCell>
                                <TableCell className="text-right font-mono py-1.5">
                                  {formatNumber(f.y, 2)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-[10px] py-1.5">
                                  {formatNumber(f.lowerBound, 2)} — {formatNumber(f.upperBound, 2)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-[10px] py-1.5">
                                  ±{formatNumber(f.marginOfError, 2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Time Series Specific Warnings */}
                  {results.gaps.length > 0 && (
                    <Alert variant="default" className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 py-1.5">
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      <AlertDescription className="text-xs">
                        <span className="font-medium">Data Gap Detected:</span> Missing time periods between {results.gaps.map(g => `${g.from}→${g.to}`).join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!results.isStationary && (
                    <Alert variant="default" className="border-blue-300 bg-blue-50 dark:bg-blue-950/20 py-1.5">
                      <Info className="h-3 w-3 text-blue-600" />
                      <AlertDescription className="text-xs">
                        <span className="font-medium">Non-Stationary:</span> Time series may have a trend. 
                        Consider differencing or using log transformation.
                      </AlertDescription>
                    </Alert>
                  )}

                  {results.n < 10 && (
                    <Alert variant="default" className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 py-1.5">
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      <AlertDescription className="text-xs">
                        <span className="font-medium">Limited Data:</span> With only {results.n} observations, 
                        time series diagnostics may be unreliable. Consider collecting more data.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* ===== Endogeneity Diagnosis ===== */}
                  <div className="mt-4 pt-4 border-t">
                    <EndogeneityDiagnosis 
                      dataPoints={dataPoints.map(p => ({ x: p.t, y: p.y }))}
                      regressionResults={results}
                      onEndogeneityStatusChange={setEndogeneityStatus}
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
};

export default TimeSeriesRegression;