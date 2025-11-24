
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BrainCircuit, Plus, X, ListOrdered, BarChartHorizontal, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const formatNumber = (num, decimals = 4) => {
  if (num === null || num === undefined || !isFinite(num)) {
    return "N/A";
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const getRSquaredBadge = (rSquared) => {
  if (rSquared === null || !isFinite(rSquared)) return null;
  
  if (rSquared >= 0.8) {
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Strong Fit</Badge>;
  } else if (rSquared >= 0.6) {
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Moderate Fit</Badge>;
  } else {
    return <Badge variant="destructive">Weak Fit</Badge>;
  }
};

const SimpleLinearRegression = () => {
  const [dataPoints, setDataPoints] = useState([
    { x: 1, y: 2500 }, { x: 2, y: 2800 }, { x: 3, y: 3100 },
    { x: 4, y: 3500 }, { x: 5, y: 3300 }, { x: 6, y: 3800 },
  ]);
  const [forecastHorizon, setForecastHorizon] = useState(3);
  const [xLabel, setXLabel] = useState('Month');
  const [yLabel, setYLabel] = useState('Revenue');

  const regressionResults = useMemo(() => {
    if (dataPoints.length < 2) {
      return { isValid: false };
    }

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
    const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
    const xBar = sumX / n;
    const yBar = sumY / n;

    const numerator = dataPoints.reduce((acc, p) => acc + (p.x - xBar) * (p.y - yBar), 0);
    const denominator = dataPoints.reduce((acc, p) => acc + Math.pow(p.x - xBar, 2), 0);
    
    if (denominator === 0) return { isValid: false };

    const slope = numerator / denominator;
    const intercept = yBar - slope * xBar;

    const sst = dataPoints.reduce((acc, p) => acc + Math.pow(p.y - yBar, 2), 0);
    const sse = dataPoints.reduce((acc, p) => {
      const yHat = intercept + slope * p.x;
      return acc + Math.pow(p.y - yHat, 2);
    }, 0);
    
    const rSquared = sst === 0 ? 1 : 1 - (sse / sst);

    const forecasts = [];
    const lastX = dataPoints[dataPoints.length - 1].x;
    for (let i = 1; i <= forecastHorizon; i++) {
      const forecastX = lastX + i;
      const forecastY = intercept + slope * forecastX;
      forecasts.push({ x: forecastX, y: forecastY });
    }
    
    const allX = [...dataPoints.map(p => p.x), ...forecasts.map(f => f.x)];
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    
    const lineData = [
      { x: minX, y: intercept + slope * minX },
      { x: maxX, y: intercept + slope * maxX },
    ];

    return {
      isValid: true,
      slope,
      intercept,
      rSquared,
      equation: `ŷ = ${formatNumber(intercept, 2)} + ${formatNumber(slope, 2)}x`,
      forecasts,
      lineData
    };
  }, [dataPoints, forecastHorizon]);

  const addDataPoint = () => {
    const lastX = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].x : 0;
    setDataPoints([...dataPoints, { x: lastX + 1, y: 0 }]);
  };

  const removeDataPoint = (index) => {
    if (dataPoints.length > 2) {
      setDataPoints(dataPoints.filter((_, i) => i !== index));
    }
  };

  const updateDataPoint = (index, field, value) => {
    const newData = [...dataPoints];
    newData[index][field] = Number(value);
    setDataPoints(newData);
  };
  
  const autoIndexX = () => {
    setDataPoints(dataPoints.map((p, i) => ({ ...p, x: i + 1 })));
  };

  const combinedChartData = [...dataPoints, ... (regressionResults.forecasts || [])];

  return (
    <TooltipProvider>
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900">
            <BrainCircuit className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Simple Linear Regression Forecaster</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Model trends and forecast future values based on historical data
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Inputs Section */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <UITooltip>
                  <TooltipTrigger asChild><div>
                    <Label>X-Variable Name</Label>
                    <Input value={xLabel} onChange={(e) => setXLabel(e.target.value)} placeholder="e.g., Time Period"/>
                  </div></TooltipTrigger>
                  <TooltipContent>
                    <p>This is your time period (e.g., Month, Quarter, Year). The model uses this to track the trend over time.</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="space-y-2">
                <UITooltip>
                  <TooltipTrigger asChild><div>
                    <Label>Y-Variable Name</Label>
                    <Input value={yLabel} onChange={(e) => setYLabel(e.target.value)} placeholder="e.g., Sales" />
                  </div></TooltipTrigger>
                  <TooltipContent>
                    <p>This is the financial metric you want to forecast (e.g., Revenue, Costs, Profit).</p>
                  </TooltipContent>
                </UITooltip>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Label className="flex items-center gap-1">Paired Data Points (x, y) <Info className="h-3 w-3" /></Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter your historical data here. For accurate forecasts, you need at least 6-8 data points. More data is better!</p>
                  </TooltipContent>
                </UITooltip>
                <div className="flex gap-2">
                  <Button onClick={autoIndexX} variant="outline" size="sm" className="gap-2"><ListOrdered className="h-4 w-4"/>Auto-Index X</Button>
                  <Button onClick={addDataPoint} variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4"/>Add Row</Button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {dataPoints.map((p, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Input type="number" value={p.x} onChange={(e) => updateDataPoint(index, 'x', e.target.value)} className="font-mono" />
                    <Input type="number" value={p.y} onChange={(e) => updateDataPoint(index, 'y', e.target.value)} className="font-mono" />
                    <Button variant="ghost" size="icon" onClick={() => removeDataPoint(index)} className="text-red-500 hover:text-red-700">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <UITooltip>
                <TooltipTrigger asChild><div>
                  <Label>Forecast Horizon</Label>
                  <Input type="number" value={forecastHorizon} onChange={e => setForecastHorizon(Math.max(0, Number(e.target.value)))} placeholder="Number of periods to forecast" />
                </div></TooltipTrigger>
                <TooltipContent>
                  <p>How many periods into the future do you want to predict? Caution: forecasts become less reliable the further out you go.</p>
                </TooltipContent>
              </UITooltip>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {!regressionResults.isValid ? (
              <Alert>
                <AlertTitle>Not Enough Data</AlertTitle>
                <AlertDescription>Please provide at least two valid data points to perform regression analysis.</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <UITooltip>
                    <TooltipTrigger asChild><Card className="p-4">
                      <p className="text-sm font-medium text-gray-500">Slope (b)</p>
                      <p className="text-xl font-bold">{formatNumber(regressionResults.slope)}</p>
                    </Card></TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>The average change in your metric per time period. A positive number means it's growing; negative means it's declining. Example: '240' means an average increase of $240 per month.</p>
                    </TooltipContent>
                  </UITooltip>
                  <UITooltip>
                    <TooltipTrigger asChild><Card className="p-4">
                      <p className="text-sm font-medium text-gray-500">Intercept (a)</p>
                      <p className="text-xl font-bold">{formatNumber(regressionResults.intercept)}</p>
                    </Card></TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>The model's estimated starting value of your metric before your data began. This is often less important for forecasting than the slope.</p>
                    </TooltipContent>
                  </UITooltip>
                   <UITooltip>
                    <TooltipTrigger asChild><Card className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-500">R-Squared</p>
                          <p className="text-xl font-bold">{formatNumber(regressionResults.rSquared, 3)}</p>
                        </div>
                        {getRSquaredBadge(regressionResults.rSquared)}
                      </div>
                    </Card></TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>How well the trend line fits your historical data. Closer to 1.0 (100%) = a more reliable forecast. Below 0.7 means the trend is weak and the forecast may be unreliable.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                
                <UITooltip>
                  <TooltipTrigger asChild><Card className="p-4 text-center">
                      <p className="text-sm font-medium text-gray-500">Regression Equation</p>
                      <p className="text-lg font-mono font-semibold">{regressionResults.equation}</p>
                  </Card></TooltipTrigger>
                  <TooltipContent>
                    <p>The formula used to make the forecast. Plug in a future period number (x) to calculate the predicted value (ŷ).</p>
                  </TooltipContent>
                </UITooltip>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={combinedChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" dataKey="x" name={xLabel} domain={['dataMin', 'dataMax']} />
                      <YAxis type="number" dataKey="y" name={yLabel} domain={['auto', 'auto']} tickFormatter={(v) => v.toLocaleString()} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Legend />
                      <Scatter name="Data" dataKey="y" fill="#8884d8" data={dataPoints} />
                      <Line name="Forecast" dataKey="y" stroke="#82ca9d" strokeWidth={2} dot={{ stroke: '#82ca9d', strokeWidth: 2 }} data={regressionResults.forecasts}/>
                      <Line name="Trend" dataKey="y" stroke="red" dot={false} strokeWidth={2} data={regressionResults.lineData} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                
                {regressionResults.forecasts.length > 0 && (
                   <div className="space-y-2">
                     <Alert variant="default" className="border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200">
                        <AlertTriangle className="h-4 w-4 !text-yellow-600" />
                        <AlertDescription>
                          Remember: This is a prediction, not a guarantee. Use this as a planning guide, but be prepared for actual results to differ. Always consider external factors like seasonality and market changes.
                        </AlertDescription>
                      </Alert>
                     <h3 className="font-semibold pt-4">Forecasted Values</h3>
                     <div className="border rounded-lg max-h-48 overflow-auto">
                       <Table>
                         <TableHeader>
                           <TableRow>
                             <TableHead>{xLabel}</TableHead>
                             <TableHead className="text-right">Forecasted {yLabel}</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {regressionResults.forecasts.map(f => (
                             <TableRow key={f.x}>
                               <TableCell>{formatNumber(f.x, 0)}</TableCell>
                               <TableCell className="text-right font-mono">{formatNumber(f.y, 2)}</TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                     </div>
                   </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};

export default SimpleLinearRegression;
