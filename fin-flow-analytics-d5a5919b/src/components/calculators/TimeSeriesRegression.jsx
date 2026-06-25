// ===== src/components/calculators/TimeSeriesRegression.jsx =====

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
  FileText
} from 'lucide-react';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EconometricsDiagnosis from './EconometricsDiagnosis';
import EndogeneityDiagnosis from './EndogeneityDiagnosis';

// ===== Utility Functions =====

const formatNumber = (num, decimals = 4) => {
  if (num === null || num === undefined || !isFinite(num)) return "N/A";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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
      }
    };
  }, [dataPoints, lagOrder, forecastHorizon]);

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

        // Set labels from headers
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
  };

  const clearData = () => {
    if (dataPoints.length > 0) {
      setDataPoints([{ t: 2000, y: 0, x: 0 }]);
    }
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

                {/* Time Series Data with Upload/Export */}
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

              {/* ===== Econometrics Diagnosis (Time Series Specific) ===== */}
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

                  {/* ===== Endogeneity Diagnosis (TS-specific) ===== */}
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