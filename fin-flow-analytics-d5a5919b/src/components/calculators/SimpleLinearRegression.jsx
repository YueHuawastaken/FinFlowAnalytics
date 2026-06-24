

// // export default SimpleLinearRegression;
// import React, { useState, useMemo } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Label } from '@/components/ui/label';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
// import { BrainCircuit, Plus, X, ListOrdered, BarChartHorizontal, AlertTriangle, Info, TrendingUp, Sigma } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { Badge } from '@/components/ui/badge';
// import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
// import EconometricsDiagnosis from './EconometricsDiagnosis';

// const formatNumber = (num, decimals = 4) => {
//   if (num === null || num === undefined || !isFinite(num)) {
//     return "N/A";
//   }
//   return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
// };

// const getRSquaredBadge = (rSquared) => {
//   if (rSquared === null || !isFinite(rSquared)) return null;
  
//   if (rSquared >= 0.8) {
//     return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Strong Fit</Badge>;
//   } else if (rSquared >= 0.6) {
//     return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Moderate Fit</Badge>;
//   } else {
//     return <Badge variant="destructive">Weak Fit</Badge>;
//   }
// };

// // ===== NEW: T-Distribution Lookup Table =====
// const getTValue = (confidenceLevel, degreesOfFreedom) => {
//   // Two-tailed t-distribution values
//   const tTable = {
//     90: { 1: 6.314, 2: 2.920, 3: 2.353, 4: 2.132, 5: 2.015, 
//           6: 1.943, 7: 1.895, 8: 1.860, 9: 1.833, 10: 1.812,
//           12: 1.782, 14: 1.761, 16: 1.746, 18: 1.734, 20: 1.725,
//           25: 1.708, 30: 1.697, 40: 1.684, 50: 1.676, 60: 1.671,
//           80: 1.664, 100: 1.660, 120: 1.658, 200: 1.653, 500: 1.648 },
//     95: { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
//           6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
//           12: 2.179, 14: 2.145, 16: 2.120, 18: 2.101, 20: 2.086,
//           25: 2.060, 30: 2.042, 40: 2.021, 50: 2.009, 60: 2.000,
//           80: 1.990, 100: 1.984, 120: 1.980, 200: 1.972, 500: 1.965 },
//     99: { 1: 63.657, 2: 9.925, 3: 5.841, 4: 4.604, 5: 4.032,
//           6: 3.707, 7: 3.499, 8: 3.355, 9: 3.250, 10: 3.169,
//           12: 3.055, 14: 2.977, 16: 2.921, 18: 2.878, 20: 2.845,
//           25: 2.787, 30: 2.750, 40: 2.704, 50: 2.678, 60: 2.660,
//           80: 2.639, 100: 2.626, 120: 2.617, 200: 2.601, 500: 2.586 }
//   };
  
//   // Find closest available degrees of freedom
//   const df = Math.min(Math.max(Math.round(degreesOfFreedom), 1), 500);
//   const availableDfs = Object.keys(tTable[confidenceLevel]).map(Number);
//   const closestDf = availableDfs.reduce((prev, curr) => 
//     Math.abs(curr - df) < Math.abs(prev - df) ? curr : prev
//   );
  
//   return tTable[confidenceLevel][closestDf];
// };

// const SimpleLinearRegression = () => {
//   const [dataPoints, setDataPoints] = useState([
//     { x: 1, y: 2500 }, { x: 2, y: 2800 }, { x: 3, y: 3100 },
//     { x: 4, y: 3500 }, { x: 5, y: 3300 }, { x: 6, y: 3800 },
//   ]);
//   const [forecastHorizon, setForecastHorizon] = useState(3);
//   const [xLabel, setXLabel] = useState('Month');
//   const [yLabel, setYLabel] = useState('Revenue');
  
//   // ===== NEW: Confidence Level State =====
//   const [confidenceLevel, setConfidenceLevel] = useState(95);

//   const regressionResults = useMemo(() => {
//     if (dataPoints.length < 2) {
//       return { isValid: false };
//     }

//     const n = dataPoints.length;
//     const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
//     const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
//     const xBar = sumX / n;
//     const yBar = sumY / n;

//     const numerator = dataPoints.reduce((acc, p) => acc + (p.x - xBar) * (p.y - yBar), 0);
//     const denominator = dataPoints.reduce((acc, p) => acc + Math.pow(p.x - xBar, 2), 0);
    
//     if (denominator === 0) return { isValid: false };

//     const slope = numerator / denominator;
//     const intercept = yBar - slope * xBar;

//     // ===== NEW: Calculate residuals and SSE =====
//     const residuals = dataPoints.map(p => {
//       const predicted = intercept + slope * p.x;
//       return { x: p.x, actual: p.y, predicted, residual: p.y - predicted };
//     });
    
//     const sst = dataPoints.reduce((acc, p) => acc + Math.pow(p.y - yBar, 2), 0);
//     const sse = residuals.reduce((acc, r) => acc + Math.pow(r.residual, 2), 0);
//     const ssr = sst - sse;
    
//     const rSquared = sst === 0 ? 1 : 1 - (sse / sst);
    
//     // ===== NEW: Calculate Standard Error and Statistics =====
//     const degreesOfFreedom = n - 2;
//     const standardErrorEstimate = Math.sqrt(sse / degreesOfFreedom);
//     const standardErrorSlope = standardErrorEstimate / Math.sqrt(denominator);
//     const standardErrorIntercept = standardErrorEstimate * Math.sqrt((1/n) + (Math.pow(xBar, 2) / denominator));
    
//     // T-statistics
//     const tStatisticSlope = slope / standardErrorSlope;
//     const tStatisticIntercept = intercept / standardErrorIntercept;
    
//     // ===== NEW: Get t-value for confidence intervals =====
//     const tValue = getTValue(confidenceLevel, degreesOfFreedom);
    
//     // Confidence intervals for slope and intercept
//     const slopeCI = {
//       lower: slope - tValue * standardErrorSlope,
//       upper: slope + tValue * standardErrorSlope
//     };
//     const interceptCI = {
//       lower: intercept - tValue * standardErrorIntercept,
//       upper: intercept + tValue * standardErrorIntercept
//     };

//     // ===== NEW: Calculate forecasts with prediction intervals =====
//     const forecasts = [];
//     const lastX = dataPoints[dataPoints.length - 1].x;
//     for (let i = 1; i <= forecastHorizon; i++) {
//       const forecastX = lastX + i;
//       const forecastY = intercept + slope * forecastX;
      
//       // Standard error for prediction (includes uncertainty in both regression and individual prediction)
//       const sePrediction = standardErrorEstimate * Math.sqrt(
//         1 + (1/n) + (Math.pow(forecastX - xBar, 2) / denominator)
//       );
      
//       // Margin of error for prediction interval
//       const marginOfError = tValue * sePrediction;
      
//       forecasts.push({
//         x: forecastX,
//         y: forecastY,
//         lowerBound: forecastY - marginOfError,
//         upperBound: forecastY + marginOfError,
//         standardError: sePrediction,
//         marginOfError: marginOfError
//       });
//     }
    
//     const allX = [...dataPoints.map(p => p.x), ...forecasts.map(f => f.x)];
//     const minX = Math.min(...allX);
//     const maxX = Math.max(...allX);
    
//     const lineData = [
//       { x: minX, y: intercept + slope * minX },
//       { x: maxX, y: intercept + slope * maxX },
//     ];

//     return {
//       isValid: true,
//       slope,
//       intercept,
//       rSquared,
//       equation: `ŷ = ${formatNumber(intercept, 2)} + ${formatNumber(slope, 2)}x`,
//       forecasts,
//       lineData,
      
//       // ===== NEW: Additional statistics =====
//       residuals,
//       sse,
//       ssr,
//       sst,
//       standardErrorEstimate,
//       standardErrorSlope,
//       standardErrorIntercept,
//       tStatisticSlope,
//       tStatisticIntercept,
//       slopeCI,
//       interceptCI,
//       tValue,
//       degreesOfFreedom,
//       n,
//       xBar,
//       denominator,
//       meanX: xBar
//     };
//   }, [dataPoints, forecastHorizon, confidenceLevel]);

//   const addDataPoint = () => {
//     const lastX = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].x : 0;
//     setDataPoints([...dataPoints, { x: lastX + 1, y: 0 }]);
//   };

//   const removeDataPoint = (index) => {
//     if (dataPoints.length > 2) {
//       setDataPoints(dataPoints.filter((_, i) => i !== index));
//     }
//   };

//   const updateDataPoint = (index, field, value) => {
//     const newData = [...dataPoints];
//     newData[index][field] = Number(value);
//     setDataPoints(newData);
//   };
  
//   const autoIndexX = () => {
//     setDataPoints(dataPoints.map((p, i) => ({ ...p, x: i + 1 })));
//   };

//   const combinedChartData = [...dataPoints, ...(regressionResults.forecasts || [])];

//   return (
//     <TooltipProvider>
//     <Card className="w-full">
//       <CardHeader className="pb-4">
//         <div className="flex items-center gap-3">
//           <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900">
//             <BrainCircuit className="h-5 w-5 text-teal-600 dark:text-teal-400" />
//           </div>
//           <div>
//             <CardTitle className="text-xl">Simple Linear Regression Forecaster</CardTitle>
//             <p className="text-sm text-gray-500 dark:text-gray-400">
//               Model trends and forecast future values based on historical data
//             </p>
//           </div>
//         </div>
//       </CardHeader>
      
//       <CardContent className="space-y-6">
//         <div className="grid lg:grid-cols-2 gap-8">
//           {/* Inputs Section */}
//           <div className="space-y-6">
//             <div className="grid grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <UITooltip>
//                   <TooltipTrigger asChild><div>
//                     <Label>X-Variable Name</Label>
//                     <Input value={xLabel} onChange={(e) => setXLabel(e.target.value)} placeholder="e.g., Time Period"/>
//                   </div></TooltipTrigger>
//                   <TooltipContent>
//                     <p>This is your time period (e.g., Month, Quarter, Year). The model uses this to track the trend over time.</p>
//                   </TooltipContent>
//                 </UITooltip>
//               </div>
//               <div className="space-y-2">
//                 <UITooltip>
//                   <TooltipTrigger asChild><div>
//                     <Label>Y-Variable Name</Label>
//                     <Input value={yLabel} onChange={(e) => setYLabel(e.target.value)} placeholder="e.g., Sales" />
//                   </div></TooltipTrigger>
//                   <TooltipContent>
//                     <p>This is the financial metric you want to forecast (e.g., Revenue, Costs, Profit).</p>
//                   </TooltipContent>
//                 </UITooltip>
//               </div>
//             </div>

//             <div className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <UITooltip>
//                   <TooltipTrigger asChild>
//                     <Label className="flex items-center gap-1">Paired Data Points (x, y) <Info className="h-3 w-3" /></Label>
//                   </TooltipTrigger>
//                   <TooltipContent>
//                     <p>Enter your historical data here. For accurate forecasts, you need at least 6-8 data points. More data is better!</p>
//                   </TooltipContent>
//                 </UITooltip>
//                 <div className="flex gap-2">
//                   <Button onClick={autoIndexX} variant="outline" size="sm" className="gap-2"><ListOrdered className="h-4 w-4"/>Auto-Index X</Button>
//                   <Button onClick={addDataPoint} variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4"/>Add Row</Button>
//                 </div>
//               </div>
              
//               <div className="space-y-2 max-h-60 overflow-y-auto">
//                 {dataPoints.map((p, index) => (
//                   <div key={index} className="flex items-center gap-3">
//                     <Input type="number" value={p.x} onChange={(e) => updateDataPoint(index, 'x', e.target.value)} className="font-mono" />
//                     <Input type="number" value={p.y} onChange={(e) => updateDataPoint(index, 'y', e.target.value)} className="font-mono" />
//                     <Button variant="ghost" size="icon" onClick={() => removeDataPoint(index)} className="text-red-500 hover:text-red-700">
//                       <X className="h-4 w-4" />
//                     </Button>
//                   </div>
//                 ))}
//               </div>
//             </div>
            
//             <div className="grid grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <UITooltip>
//                   <TooltipTrigger asChild><div>
//                     <Label>Forecast Horizon</Label>
//                     <Input type="number" value={forecastHorizon} onChange={e => setForecastHorizon(Math.max(0, Number(e.target.value)))} placeholder="Number of periods" />
//                   </div></TooltipTrigger>
//                   <TooltipContent>
//                     <p>How many periods into the future do you want to predict? Caution: forecasts become less reliable the further out you go.</p>
//                   </TooltipContent>
//                 </UITooltip>
//               </div>
              
//               {/* ===== NEW: Confidence Level Selector ===== */}
//               <div className="space-y-2">
//                 <UITooltip>
//                   <TooltipTrigger asChild><div>
//                     <Label>Confidence Level</Label>
//                     <select 
//                       className="w-full p-2 border rounded-md bg-background"
//                       value={confidenceLevel}
//                       onChange={(e) => setConfidenceLevel(Number(e.target.value))}
//                     >
//                       <option value="90">90%</option>
//                       <option value="95">95%</option>
//                       <option value="99">99%</option>
//                     </select>
//                   </div></TooltipTrigger>
//                   <TooltipContent>
//                     <p>Higher confidence = wider prediction intervals. 95% is standard for most business forecasting.</p>
//                   </TooltipContent>
//                 </UITooltip>
//               </div>
//                <div className="mt-4">
//     <EconometricsDiagnosis 
//       dataPoints={dataPoints}
//       regressionResults={regressionResults}
//       modelType="simple"
//       dependentVariable={yLabel}
//     />
//   </div>
//             </div>
//           </div>
          
          

//           {/* Results Section */}
//           <div className="space-y-6">
//             {!regressionResults.isValid ? (
//               <Alert>
//                 <AlertTitle>Not Enough Data</AlertTitle>
//                 <AlertDescription>Please provide at least two valid data points to perform regression analysis.</AlertDescription>
//               </Alert>
//             ) : (
//               <>
//                 {/* ===== UPDATED: Results Cards with More Stats ===== */}
//                 <div className="grid grid-cols-2 gap-4">
//                   <UITooltip>
//                     <TooltipTrigger asChild><Card className="p-4">
//                       <p className="text-sm font-medium text-gray-500">Slope (b)</p>
//                       <p className="text-xl font-bold">{formatNumber(regressionResults.slope)}</p>
//                       <p className="text-xs text-gray-400 mt-1">
//                         95% CI: [{formatNumber(regressionResults.slopeCI.lower, 2)}, {formatNumber(regressionResults.slopeCI.upper, 2)}]
//                       </p>
//                     </Card></TooltipTrigger>
//                     <TooltipContent className="max-w-xs">
//                       <p>The average change per period. Positive = growth, Negative = decline. With {regressionResults.n} data points, this has {regressionResults.degreesOfFreedom} degrees of freedom.</p>
//                     </TooltipContent>
//                   </UITooltip>
                  
//                   <UITooltip>
//                     <TooltipTrigger asChild><Card className="p-4">
//                       <p className="text-sm font-medium text-gray-500">Intercept (a)</p>
//                       <p className="text-xl font-bold">{formatNumber(regressionResults.intercept)}</p>
//                       <p className="text-xs text-gray-400 mt-1">
//                         95% CI: [{formatNumber(regressionResults.interceptCI.lower, 2)}, {formatNumber(regressionResults.interceptCI.upper, 2)}]
//                       </p>
//                     </Card></TooltipTrigger>
//                     <TooltipContent className="max-w-xs">
//                       <p>The estimated starting value. With {regressionResults.n} data points, this has {regressionResults.degreesOfFreedom} degrees of freedom.</p>
//                     </TooltipContent>
//                   </UITooltip>
//                 </div>
                
//                 {/* ===== NEW: Additional Stats Row ===== */}
//                 <div className="grid grid-cols-3 gap-3">
//                   <Card className="p-3">
//                     <p className="text-xs font-medium text-gray-500">R-Squared</p>
//                     <p className="text-lg font-bold">{formatNumber(regressionResults.rSquared, 3)}</p>
//                     {getRSquaredBadge(regressionResults.rSquared)}
//                   </Card>
//                   <UITooltip>
//                     <TooltipTrigger asChild><Card className="p-3">
//                       <p className="text-xs font-medium text-gray-500">Std. Error (Se)</p>
//                       <p className="text-lg font-bold">{formatNumber(regressionResults.standardErrorEstimate, 2)}</p>
//                     </Card></TooltipTrigger>
//                     <TooltipContent>
//                       <p>The average deviation of actual values from the regression line. Lower = more accurate predictions.</p>
//                     </TooltipContent>
//                   </UITooltip>
//                   <UITooltip>
//                     <TooltipTrigger asChild><Card className="p-3">
//                       <p className="text-xs font-medium text-gray-500">Observations</p>
//                       <p className="text-lg font-bold">{regressionResults.n}</p>
//                       <p className="text-xs text-gray-400">df = {regressionResults.degreesOfFreedom}</p>
//                     </Card></TooltipTrigger>
//                     <TooltipContent>
//                       <p>Degrees of freedom = n - 2. With {regressionResults.n} points, we have {regressionResults.degreesOfFreedom} degrees of freedom.</p>
//                     </TooltipContent>
//                   </UITooltip>
//                 </div>
                
//                 <UITooltip>
//                   <TooltipTrigger asChild><Card className="p-4 text-center">
//                       <p className="text-sm font-medium text-gray-500">Regression Equation</p>
//                       <p className="text-lg font-mono font-semibold">{regressionResults.equation}</p>
//                       <p className="text-xs text-gray-400 mt-1">
//                         t-statistic: {formatNumber(regressionResults.tStatisticSlope, 3)} | 
//                         t-critical ({confidenceLevel}%): {formatNumber(regressionResults.tValue, 3)}
//                       </p>
//                   </Card></TooltipTrigger>
//                   <TooltipContent>
//                     <p>The formula used to make the forecast. Plug in a future period number (x) to calculate the predicted value (ŷ).</p>
//                   </TooltipContent>
//                 </UITooltip>

//                 <div className="h-80 w-full">
//                   <ResponsiveContainer width="100%" height="100%">
//                     <ComposedChart data={combinedChartData}>
//                       <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
//                       <XAxis type="number" dataKey="x" name={xLabel} domain={['dataMin', 'dataMax']} />
//                       <YAxis type="number" dataKey="y" name={yLabel} domain={['auto', 'auto']} tickFormatter={(v) => v.toLocaleString()} />
//                       <Tooltip 
//                         cursor={{ strokeDasharray: '3 3' }}
//                         formatter={(value, name, props) => {
//                           // ===== NEW: Enhanced tooltip showing intervals =====
//                           if (name === 'Forecast' && props.payload.upperBound) {
//                             return [
//                               `${formatNumber(value, 2)} (${formatNumber(props.payload.lowerBound, 2)} - ${formatNumber(props.payload.upperBound, 2)})`,
//                               name
//                             ];
//                           }
//                           return [formatNumber(value, 2), name];
//                         }}
//                       />
//                       <Legend />
//                       <Scatter name="Data" dataKey="y" fill="#8884d8" data={dataPoints} />
//                       <Line name="Forecast" dataKey="y" stroke="#82ca9d" strokeWidth={2} dot={{ stroke: '#82ca9d', strokeWidth: 2 }} data={regressionResults.forecasts}/>
//                       <Line name="Trend" dataKey="y" stroke="red" dot={false} strokeWidth={2} data={regressionResults.lineData} />
//                     </ComposedChart>
//                   </ResponsiveContainer>
//                 </div>
             
//                 {regressionResults.forecasts.length > 0 && (
//                    <div className="space-y-2">
//                      <Alert variant="default" className="border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200">
//                         <AlertTriangle className="h-4 w-4 !text-yellow-600" />
//                         <AlertDescription>
//                           Remember: This is a prediction, not a guarantee. Use this as a planning guide, but be prepared for actual results to differ. Always consider external factors like seasonality and market changes.
//                         </AlertDescription>
//                       </Alert>
//                      <h3 className="font-semibold pt-4">Forecasted Values</h3>
                     
//                      {/* ===== UPDATED: Forecast Table with Confidence Intervals ===== */}
//                      <div className="border rounded-lg max-h-48 overflow-auto">
//                        <Table>
//                          <TableHeader>
//                            <TableRow>
//                              <TableHead>{xLabel}</TableHead>
//                              <TableHead className="text-right">Forecasted {yLabel}</TableHead>
//                              <TableHead className="text-right">{confidenceLevel}% Confidence Interval</TableHead>
//                              <TableHead className="text-right">Margin of Error</TableHead>
//                            </TableRow>
//                          </TableHeader>
//                          <TableBody>
//                            {regressionResults.forecasts.map(f => (
//                              <TableRow key={f.x}>
//                                <TableCell>{formatNumber(f.x, 0)}</TableCell>
//                                <TableCell className="text-right font-mono">{formatNumber(f.y, 2)}</TableCell>
//                                <TableCell className="text-right font-mono text-sm">
//                                  {formatNumber(f.lowerBound, 2)} — {formatNumber(f.upperBound, 2)}
//                                </TableCell>
//                                <TableCell className="text-right font-mono text-sm">
//                                  ±{formatNumber(f.marginOfError, 2)}
//                                </TableCell>
//                              </TableRow>
//                            ))}
//                          </TableBody>
//                        </Table>
//                      </div>
                  
                     
//                      {/* ===== NEW: Sample Size Warning ===== */}
//                      {regressionResults.n < 10 && (
//                        <Alert variant="default" className="border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-200">
//                          <Info className="h-4 w-4 !text-blue-600" />
//                          <AlertDescription>
//                            <span className="font-medium">Limited Data Warning:</span> With only {regressionResults.n} data points, the confidence intervals are wide. 
//                            Consider collecting more data (ideally 10+ points) for more precise forecasts. 
//                            Current degrees of freedom: {regressionResults.degreesOfFreedom}
//                          </AlertDescription>
//                        </Alert>
//                      )}
//                    </div>
//                 )}
//               </>
//             )}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//     </TooltipProvider>
//   );
 
// };

// export default SimpleLinearRegression;
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BrainCircuit, Plus, X, ListOrdered, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EconometricsDiagnosis from './EconometricsDiagnosis';

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

const SimpleLinearRegression = () => {
  const [dataPoints, setDataPoints] = useState([
    { x: 1, y: 2500 }, { x: 2, y: 2800 }, { x: 3, y: 3100 },
    { x: 4, y: 3500 }, { x: 5, y: 3300 }, { x: 6, y: 3800 },
  ]);
  const [forecastHorizon, setForecastHorizon] = useState(3);
  const [xLabel, setXLabel] = useState('Month');
  const [yLabel, setYLabel] = useState('Revenue');
  const [confidenceLevel, setConfidenceLevel] = useState(95);

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

    const residuals = dataPoints.map(p => {
      const predicted = intercept + slope * p.x;
      return { x: p.x, actual: p.y, predicted, residual: p.y - predicted };
    });
    
    const sst = dataPoints.reduce((acc, p) => acc + Math.pow(p.y - yBar, 2), 0);
    const sse = residuals.reduce((acc, r) => acc + Math.pow(r.residual, 2), 0);
    const rSquared = sst === 0 ? 1 : 1 - (sse / sst);
    
    const degreesOfFreedom = n - 2;
    const standardErrorEstimate = Math.sqrt(sse / degreesOfFreedom);
    const standardErrorSlope = standardErrorEstimate / Math.sqrt(denominator);
    const standardErrorIntercept = standardErrorEstimate * Math.sqrt((1/n) + (Math.pow(xBar, 2) / denominator));
    
    const tStatisticSlope = slope / standardErrorSlope;
    const tStatisticIntercept = intercept / standardErrorIntercept;
    
    const tValue = getTValue(confidenceLevel, degreesOfFreedom);
    
    const slopeCI = {
      lower: slope - tValue * standardErrorSlope,
      upper: slope + tValue * standardErrorSlope
    };
    const interceptCI = {
      lower: intercept - tValue * standardErrorIntercept,
      upper: intercept + tValue * standardErrorIntercept
    };

    const forecasts = [];
    const lastX = dataPoints[dataPoints.length - 1].x;
    for (let i = 1; i <= forecastHorizon; i++) {
      const forecastX = lastX + i;
      const forecastY = intercept + slope * forecastX;
      
      const sePrediction = standardErrorEstimate * Math.sqrt(
        1 + (1/n) + (Math.pow(forecastX - xBar, 2) / denominator)
      );
      
      const marginOfError = tValue * sePrediction;
      
      forecasts.push({
        x: forecastX,
        y: forecastY,
        lowerBound: forecastY - marginOfError,
        upperBound: forecastY + marginOfError,
        standardError: sePrediction,
        marginOfError: marginOfError
      });
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
      lineData,
      residuals,
      sse,
      sst,
      standardErrorEstimate,
      standardErrorSlope,
      standardErrorIntercept,
      tStatisticSlope,
      tStatisticIntercept,
      slopeCI,
      interceptCI,
      tValue,
      degreesOfFreedom,
      n,
      xBar,
      denominator,
      meanX: xBar
    };
  }, [dataPoints, forecastHorizon, confidenceLevel]);

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

  const combinedChartData = [...dataPoints, ...(regressionResults.forecasts || [])];

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
          {/* Main Grid: 40% Left / 60% Right */}
          <div className="grid lg:grid-cols-5 gap-6">
            
            {/* ===== LEFT COLUMN (2/5) ===== */}
            <div className="lg:col-span-2 space-y-6">
              {/* Inputs Section */}
              <div className="space-y-4">
                {/* Row 1: X and Y Variable Names */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Label className="text-xs font-medium">X-Variable Name</Label>
                          <Input 
                            value={xLabel} 
                            onChange={(e) => setXLabel(e.target.value)} 
                            placeholder="e.g., Time Period"
                            className="h-8 text-sm"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This is your time period (e.g., Month, Quarter, Year).</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <div className="space-y-1.5">
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Label className="text-xs font-medium">Y-Variable Name</Label>
                          <Input 
                            value={yLabel} 
                            onChange={(e) => setYLabel(e.target.value)} 
                            placeholder="e.g., Sales"
                            className="h-8 text-sm"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This is the financial metric you want to forecast.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                </div>

                {/* Row 2: Data Points */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Label className="flex items-center gap-1 text-xs font-medium">
                          Data Points (x, y) <Info className="h-3 w-3" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enter your historical data here. For accurate forecasts, you need at least 6-8 data points.</p>
                      </TooltipContent>
                    </UITooltip>
                    <div className="flex gap-1.5">
                      <Button onClick={autoIndexX} variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
                        <ListOrdered className="h-3 w-3"/> Auto-Index
                      </Button>
                      <Button onClick={addDataPoint} variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
                        <Plus className="h-3 w-3"/> Add
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {dataPoints.map((p, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          value={p.x} 
                          onChange={(e) => updateDataPoint(index, 'x', e.target.value)} 
                          className="font-mono h-7 text-sm w-16" 
                        />
                        <Input 
                          type="number" 
                          value={p.y} 
                          onChange={(e) => updateDataPoint(index, 'y', e.target.value)} 
                          className="font-mono h-7 text-sm flex-1" 
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeDataPoint(index)} 
                          className="h-6 w-6 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 3: Forecast Horizon and Confidence Level */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Label className="text-xs font-medium">Forecast Horizon</Label>
                          <Input 
                            type="number" 
                            value={forecastHorizon} 
                            onChange={e => setForecastHorizon(Math.max(0, Number(e.target.value)))} 
                            placeholder="Periods"
                            className="h-8 text-sm"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>How many periods into the future do you want to predict?</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  
                  <div className="space-y-1.5">
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Label className="text-xs font-medium">Confidence Level</Label>
                          <select 
                            className="w-full h-8 text-sm border rounded-md bg-background px-2"
                            value={confidenceLevel}
                            onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                          >
                            <option value="90">90%</option>
                            <option value="95">95%</option>
                            <option value="99">99%</option>
                          </select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Higher confidence = wider prediction intervals. 95% is standard.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                </div>
              </div>

              {/* ===== ECONOMETRICS DIAGNOSTICS ===== */}
              <div className="mt-2">
                <EconometricsDiagnosis 
                  dataPoints={dataPoints}
                  regressionResults={regressionResults}
                  modelType="simple"
                  dependentVariable={yLabel}
                  defaultExpanded={false}
                  compact={true}
                />
              </div>
            </div>

            {/* ===== RIGHT COLUMN (3/5) ===== */}
            <div className="lg:col-span-3 space-y-4">
              {!regressionResults.isValid ? (
                <Alert>
                  <AlertTitle>Not Enough Data</AlertTitle>
                  <AlertDescription>Please provide at least two valid data points to perform regression analysis.</AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Results Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Card className="p-3">
                          <p className="text-xs font-medium text-gray-500">Slope (b)</p>
                          <p className="text-lg font-bold">{formatNumber(regressionResults.slope)}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {confidenceLevel}% CI: [{formatNumber(regressionResults.slopeCI.lower, 2)}, {formatNumber(regressionResults.slopeCI.upper, 2)}]
                          </p>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>The average change per period. Positive = growth, Negative = decline.</p>
                      </TooltipContent>
                    </UITooltip>
                    
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Card className="p-3">
                          <p className="text-xs font-medium text-gray-500">Intercept (a)</p>
                          <p className="text-lg font-bold">{formatNumber(regressionResults.intercept)}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {confidenceLevel}% CI: [{formatNumber(regressionResults.interceptCI.lower, 2)}, {formatNumber(regressionResults.interceptCI.upper, 2)}]
                          </p>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>The estimated starting value of your metric.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">R-Squared</p>
                      <p className="text-base font-bold">{formatNumber(regressionResults.rSquared, 3)}</p>
                      {getRSquaredBadge(regressionResults.rSquared)}
                    </Card>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Card className="p-2.5">
                          <p className="text-[10px] font-medium text-gray-500">Std. Error (Se)</p>
                          <p className="text-base font-bold">{formatNumber(regressionResults.standardErrorEstimate, 2)}</p>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The average deviation of actual values from the regression line.</p>
                      </TooltipContent>
                    </UITooltip>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Card className="p-2.5">
                          <p className="text-[10px] font-medium text-gray-500">Observations</p>
                          <p className="text-base font-bold">{regressionResults.n}</p>
                          <p className="text-[10px] text-gray-400">df = {regressionResults.degreesOfFreedom}</p>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Degrees of freedom = n - 2. With {regressionResults.n} points, we have {regressionResults.degreesOfFreedom} degrees of freedom.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  
                  {/* Equation Card */}
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Card className="p-3 text-center">
                        <p className="text-xs font-medium text-gray-500">Regression Equation</p>
                        <p className="text-base font-mono font-semibold">{regressionResults.equation}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          t-stat: {formatNumber(regressionResults.tStatisticSlope, 3)} | 
                          t-critical ({confidenceLevel}%): {formatNumber(regressionResults.tValue, 3)}
                        </p>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>The formula used to make the forecast. Plug in x to calculate ŷ.</p>
                    </TooltipContent>
                  </UITooltip>

                  {/* Chart */}
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={combinedChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" dataKey="x" name={xLabel} domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} />
                        <YAxis type="number" dataKey="y" name={yLabel} domain={['auto', 'auto']} tickFormatter={(v) => v.toLocaleString()} tick={{ fontSize: 11 }} />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(value, name, props) => {
                            if (name === 'Forecast' && props.payload.upperBound) {
                              return [
                                `${formatNumber(value, 2)} (${formatNumber(props.payload.lowerBound, 2)} - ${formatNumber(props.payload.upperBound, 2)})`,
                                name
                              ];
                            }
                            return [formatNumber(value, 2), name];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Scatter name="Data" dataKey="y" fill="#8884d8" data={dataPoints} />
                        <Line name="Forecast" dataKey="y" stroke="#82ca9d" strokeWidth={2} dot={{ stroke: '#82ca9d', strokeWidth: 2 }} data={regressionResults.forecasts}/>
                        <Line name="Trend" dataKey="y" stroke="red" dot={false} strokeWidth={1.5} data={regressionResults.lineData} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
               
                  {/* Forecast Values */}
                  {regressionResults.forecasts.length > 0 && (
                    <div className="space-y-2">
                      <Alert variant="default" className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 py-2">
                        <AlertTriangle className="h-3 w-3 !text-yellow-600" />
                        <AlertDescription className="text-xs">
                          Remember: This is a prediction, not a guarantee. Use this as a planning guide.
                        </AlertDescription>
                      </Alert>
                      
                      <h3 className="font-semibold text-sm pt-1">Forecasted Values</h3>
                      
                      <div className="border rounded-lg max-h-48 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-xs">
                              <TableHead className="py-1.5">{xLabel}</TableHead>
                              <TableHead className="text-right py-1.5">Forecasted {yLabel}</TableHead>
                              <TableHead className="text-right py-1.5">{confidenceLevel}% CI</TableHead>
                              <TableHead className="text-right py-1.5">Margin of Error</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {regressionResults.forecasts.map(f => (
                              <TableRow key={f.x} className="text-xs">
                                <TableCell className="py-1.5 font-medium">{formatNumber(f.x, 0)}</TableCell>
                                <TableCell className="text-right font-mono py-1.5">{formatNumber(f.y, 2)}</TableCell>
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
                    
                      {/* Sample Size Warning */}
                      {regressionResults.n < 10 && (
                        <Alert variant="default" className="border-blue-300 bg-blue-50 dark:bg-blue-950/20 py-2">
                          <Info className="h-3 w-3 !text-blue-600" />
                          <AlertDescription className="text-xs">
                            <span className="font-medium">Limited Data Warning:</span> With only {regressionResults.n} data points, confidence intervals are wide. 
                            Consider collecting more data (ideally 10+ points).
                          </AlertDescription>
                        </Alert>
                      )}
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
