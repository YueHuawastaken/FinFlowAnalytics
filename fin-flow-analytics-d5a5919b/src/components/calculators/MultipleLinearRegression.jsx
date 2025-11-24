
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ZAxis } from 'recharts';
import { BarChart3, Plus, X, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  if (det === 0) return null; // Singular matrix, no inverse

  const invDet = 1 / det;
  const adj = [
    [e * i - f * h, c * h - b * i, b * f - c * e],
    [f * g - d * i, a * i - c * g, c * d - a * f],
    [d * h - e * g, b * g - a * h, a * e - b * d]
  ];
  
  return adj.map(row => row.map(val => val * invDet));
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
    message = 'High Correlation'; 
    description = 'This predictor is highly correlated with others - forecast may be unreliable.';
  } else if (vif > 5) { 
    level = 'warning'; 
    message = 'Moderate Correlation'; 
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

const getRSquaredBadge = (rSquared) => {
  if (rSquared === null || !isFinite(rSquared)) return null;
  
  let level = 'good';
  let message = 'Good Fit';
  let description = 'The model explains the data reasonably well.';
  
  if (rSquared >= 0.99) {
    level = 'warning';
    message = 'Perfect Fit - May be Overfit';
    description = 'This model may be too perfect - check for data issues or overfitting.';
  } else if (rSquared >= 0.8) {
    level = 'good';
    message = 'Strong Fit';
    description = 'The model explains the data very well - reliable for forecasting.';
  } else if (rSquared >= 0.6) {
    level = 'moderate';
    message = 'Moderate Fit';
    description = 'The model captures some trends but may miss important factors.';
  } else {
    level = 'poor';
    message = 'Weak Fit';
    description = 'The model poorly explains the data - forecasts may be unreliable.';
  }

  const styles = {
    good: 'bg-green-100 text-green-800',
    moderate: 'bg-blue-100 text-blue-800', 
    warning: 'bg-yellow-100 text-yellow-800',
    poor: 'bg-red-100 text-red-800'
  };

  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <Badge className={styles[level]}>{message}</Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-semibold">R-Squared: {formatNumber(rSquared * 100, 1)}%</p>
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

  // Data
  const [data, setData] = useState([
    { y: 300, x1: 10, x2: 20 }, 
    { y: 350, x1: 12, x2: 25 },
    { y: 400, x1: 15, x2: 28 }, 
    { y: 480, x1: 18, x2: 35 },
    { y: 550, x1: 22, x2: 40 }, 
    { y: 600, x1: 25, x2: 42 }
  ]);

  // Forecast inputs
  const [forecastInputs, setForecastInputs] = useState({ x1: 28, x2: 50 });

  const results = useMemo(() => {
    if (data.length < 3) return { error: "Need at least 3 data points for multiple regression." };

    // --- Core Regression Calculation ---
    const X = data.map(p => [1, p.x1, p.x2]);
    const y = data.map(p => [p.y]);
    
    const Xt = matTranspose(X);
    const XtX = matMultiply(Xt, X);
    const XtX_inv = matInverse3x3(XtX);

    if (!XtX_inv) return { 
      error: "Multicollinearity detected", 
      multicollinearity: true,
      description: `The predictors '${x1Label}' and '${x2Label}' are too highly correlated. This makes the forecast unreliable.`
    };
    
    const Xty = matMultiply(Xt, y);
    const beta = matMultiply(XtX_inv, Xty).map(val => val[0]); // [b0, b1, b2]

    // --- R-squared Calculation ---
    const y_hat = X.map(row => beta[0] + beta[1] * row[1] + beta[2] * row[2]);
    const y_bar = data.reduce((sum, p) => sum + p.y, 0) / data.length;
    const sse = data.reduce((sum, p, i) => sum + (p.y - y_hat[i]) ** 2, 0);
    const sst = data.reduce((sum, p) => sum + (p.y - y_bar) ** 2, 0);
    const rSquared = sst === 0 ? 1 : 1 - (sse / sst);
    
    // --- VIF Calculation ---
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
      if (r_x1_x2_sq < 0.999) { // Prevent division by zero
        vif1 = vif2 = 1 / (1 - r_x1_x2_sq);
      } else {
        vif1 = vif2 = Infinity;
      }
    }

    // --- Forecasting ---
    const forecast = beta[0] + beta[1] * forecastInputs.x1 + beta[2] * forecastInputs.x2;
    const hasMulticollinearity = vif1 > 5 || vif2 > 5;

    const plotData = data.map((p, i) => ({ 
      actualY: p.y, 
      predictedY: y_hat[i],
      x1: p.x1,
      x2: p.x2
    }));

    return {
      beta,
      rSquared,
      vif1,
      vif2,
      forecast,
      hasMulticollinearity,
      plotData,
      equation: `${yLabel} = ${formatNumber(beta[0], 2)} + ${formatNumber(beta[1], 2)} × (${x1Label}) + ${formatNumber(beta[2], 2)} × (${x2Label})`
    };
  }, [data, forecastInputs, yLabel, x1Label, x2Label]);

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
          {/* Configuration Section - Mobile Responsive */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-base lg:text-lg">📊 Define Your Variables</h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Output (y) we want to predict:</Label>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Input
                        value={yLabel}
                        onChange={(e) => setYLabel(e.target.value)}
                        placeholder="e.g., Monthly Revenue"
                        className="font-medium"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>The financial result you want to model and forecast, e.g., Monthly Revenue, Production Costs.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>

                <div className="space-y-2">
                  <Label>Predictor 1 (x₁):</Label>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Input
                        value={x1Label}
                        onChange={(e) => setX1Label(e.target.value)}
                        placeholder="e.g., Advertising Budget"
                        className="font-medium"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>A factor you believe influences the output, e.g., Advertising Budget, Number of Employees.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>

                <div className="space-y-2">
                  <Label>Predictor 2 (x₂):</Label>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Input
                        value={x2Label}
                        onChange={(e) => setX2Label(e.target.value)}
                        placeholder="e.g., Sales Team Size"
                        className="font-medium"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Another influencing factor.</p>
                    </TooltipContent>
                  </UITooltip>
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
              
              {/* Mobile-Responsive Data Entry */}
              <div className="space-y-4">
                {/* Desktop Table */}
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
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-base lg:text-lg">🔮 Create a Forecast</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Results Section - Mobile Responsive */}
          <div className="space-y-6">
            {results.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4"/>
                <AlertTitle>{results.multicollinearity ? 'Multicollinearity Detected' : 'Calculation Error'}</AlertTitle>
                <AlertDescription>{results.description || results.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Forecast Result */}
                <Card className={`p-4 sm:p-6 text-center ${results.hasMulticollinearity ? 'border-orange-300 bg-orange-50' : 'bg-blue-50'}`}>
                  <h3 className="font-semibold text-base sm:text-lg mb-2">🎯 Forecasted {yLabel}</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
                    {formatNumber(results.forecast, 2)}
                  </p>
                  {results.hasMulticollinearity && (
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2 text-orange-700 cursor-help">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">Caution: See Model Issues</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>The predictors are highly correlated, making the forecast unreliable. Consider removing one predictor or using different data.</p>
                      </TooltipContent>
                    </UITooltip>
                  )}
                </Card>

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
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">R-Squared:</p>
                          <p className="text-xl font-bold">{formatNumber(results.rSquared, 3)}</p>
                        </div>
                        {getRSquaredBadge(results.rSquared)}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Model Diagnostics - Mobile Responsive */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base lg:text-lg">🔍 Model Diagnostics</h3>
                  
                  <div className="space-y-3">
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Card className="p-4 cursor-help">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{x1Label} Impact:</p>
                              <p className="text-lg sm:text-lg font-bold text-green-600">
                                {formatNumber(results.beta[1], 2)} per unit
                              </p>
                            </div>
                            <VifBadge vif={results.vif1} name={x1Label} />
                          </div>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Represents the model's estimate of the change in {yLabel} for a one-unit increase in this predictor.</p>
                      </TooltipContent>
                    </UITooltip>
                    
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Card className="p-4 cursor-help">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{x2Label} Impact:</p>
                              <p className="text-lg sm:text-lg font-bold text-green-600">
                                {formatNumber(results.beta[2], 2)} per unit
                              </p>
                            </div>
                            <VifBadge vif={results.vif2} name={x2Label} />
                          </div>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Represents the model's estimate of the change in {yLabel} for a one-unit increase in this predictor.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>

                  {results.hasMulticollinearity && (
                    <Alert className="border-red-300 bg-red-50 text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>⚠️ Multicollinearity Warning:</strong> The inputs '{x1Label}' and '{x2Label}' are highly correlated. This model may not be trustworthy.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Model Fit Chart - Mobile Responsive */}
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
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
