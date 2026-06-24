import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Binary, 
  Plus, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Info,
  TrendingUp,
  Activity
} from 'lucide-react';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ===== Utility Functions =====

const formatNumber = (num, decimals = 4) => {
  if (num === null || num === undefined || !isFinite(num)) return "N/A";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// ===== Sigmoid / Logistic Function =====
const sigmoid = (z) => {
  return 1 / (1 + Math.exp(-z));
};

// ===== Standard Normal CDF (approximation) =====
const normalCDF = (z) => {
  // Approximation using Abramowitz & Stegun
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  const t = 1 / (1 + p * absZ);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);
  return 0.5 * (1 + sign * (y - 0.5));
};

// ===== Standard Normal PDF =====
const normalPDF = (z) => {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-z * z / 2);
};

// ===== Main Component =====

const BinaryChoiceModel = ({ 
  dataPoints = [], 
  setDataPoints = null,
  xLabel = 'X Variable',
  yLabel = 'Binary Outcome'
}) => {
  // State
  const [modelType, setModelType] = useState('logit'); // 'logit' or 'probit'
  const [threshold, setThreshold] = useState(0.5);

  // ===== MLE Estimation (Simplified) =====
  const results = useMemo(() => {
    if (dataPoints.length < 3) {
      return { isValid: false, message: 'Need at least 3 data points' };
    }

    const n = dataPoints.length;
    const xValues = dataPoints.map(p => p.x);
    const yValues = dataPoints.map(p => p.y);
    
    // Check if y is binary
    const uniqueY = [...new Set(yValues)];
    if (!uniqueY.every(v => v === 0 || v === 1)) {
      return { isValid: false, message: 'Y must be binary (0 or 1)' };
    }

    // Simple estimation using logistic regression approximation
    const meanX = xValues.reduce((a, b) => a + b, 0) / n;
    const meanY = yValues.reduce((a, b) => a + b, 0) / n;
    
    const numerator = xValues.reduce((acc, x, i) => acc + (x - meanX) * (yValues[i] - meanY), 0);
    const denominator = xValues.reduce((acc, x) => acc + (x - meanX) ** 2, 0);
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    const beta0 = intercept;
    const beta1 = slope;
    
    // Calculate predicted probabilities
    const predictions = dataPoints.map(p => {
      const z = beta0 + beta1 * p.x;
      const prob = modelType === 'logit' ? sigmoid(z) : normalCDF(z);
      return {
        ...p,
        predictedProb: prob,
        predictedClass: prob >= threshold ? 1 : 0,
        correct: (prob >= threshold ? 1 : 0) === p.y
      };
    });
    
    // Calculate log-likelihood
    const logL = predictions.reduce((acc, p) => {
      const prob = p.predictedProb;
      if (p.y === 1) {
        return acc + Math.log(Math.max(prob, 1e-10));
      } else {
        return acc + Math.log(Math.max(1 - prob, 1e-10));
      }
    }, 0);
    
    // Calculate null model log-likelihood (only intercept)
    const p0 = meanY;
    const logL0 = yValues.reduce((acc, y) => {
      if (y === 1) {
        return acc + Math.log(Math.max(p0, 1e-10));
      } else {
        return acc + Math.log(Math.max(1 - p0, 1e-10));
      }
    }, 0);
    
    // McFadden R²
    const mcfaddenR2 = 1 - (logL / logL0);
    
    // Percentage correctly predicted
    const correctCount = predictions.filter(p => p.correct).length;
    const percentCorrect = (correctCount / n) * 100;
    
    // Confusion matrix
    const confusionMatrix = {
      truePositive: predictions.filter(p => p.y === 1 && p.predictedClass === 1).length,
      falsePositive: predictions.filter(p => p.y === 0 && p.predictedClass === 1).length,
      trueNegative: predictions.filter(p => p.y === 0 && p.predictedClass === 0).length,
      falseNegative: predictions.filter(p => p.y === 1 && p.predictedClass === 0).length
    };
    
    // Sensitivity and Specificity
    const sensitivity = confusionMatrix.truePositive / (confusionMatrix.truePositive + confusionMatrix.falseNegative) || 0;
    const specificity = confusionMatrix.trueNegative / (confusionMatrix.trueNegative + confusionMatrix.falsePositive) || 0;
    
    // Average Partial Effects (APE)
    const ape = predictions.reduce((acc, p) => {
      const z = beta0 + beta1 * p.x;
      const g = modelType === 'logit' ? sigmoid(z) * (1 - sigmoid(z)) : normalPDF(z);
      return acc + g * beta1;
    }, 0) / n;

    return {
      isValid: true,
      beta0,
      beta1,
      predictions,
      logL,
      logL0,
      mcfaddenR2,
      percentCorrect,
      correctCount,
      n,
      confusionMatrix,
      sensitivity,
      specificity,
      ape,
      equation: modelType === 'logit' ? 
        `P(y=1) = 1/(1 + e^(-(${formatNumber(beta0, 2)} + ${formatNumber(beta1, 2)}x))` :
        `P(y=1) = Φ(${formatNumber(beta0, 2)} + ${formatNumber(beta1, 2)}x)`
    };
  }, [dataPoints, modelType, threshold]);

  // ===== Data Management =====
  const addDataPoint = () => {
    if (!setDataPoints) return;
    const lastX = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].x : 0;
    setDataPoints([...dataPoints, { x: lastX + 1, y: 0 }]);
  };

  const removeDataPoint = (index) => {
    if (!setDataPoints) return;
    if (dataPoints.length > 3) {
      setDataPoints(dataPoints.filter((_, i) => i !== index));
    }
  };

  const updateDataPoint = (index, field, value) => {
    if (!setDataPoints) return;
    const newData = [...dataPoints];
    if (field === 'y') {
      const val = Number(value);
      newData[index][field] = val === 0 || val === 1 ? val : 0;
    } else {
      newData[index][field] = Number(value);
    }
    setDataPoints(newData);
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Binary className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Binary Choice Model</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Logit / Probit models for binary outcomes (0/1)
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* ===== LEFT COLUMN: Inputs ===== */}
            <div className="space-y-6">
              {/* Model Type Selection */}
              <div className="space-y-2">
                <Label>Model Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={modelType === 'logit' ? 'default' : 'outline'}
                    onClick={() => setModelType('logit')}
                    className="w-full"
                  >
                    Logit
                  </Button>
                  <Button
                    variant={modelType === 'probit' ? 'default' : 'outline'}
                    onClick={() => setModelType('probit')}
                    className="w-full"
                  >
                    Probit
                  </Button>
                </div>
              </div>

              {/* Threshold */}
              <div className="space-y-2">
                <Label>Classification Threshold</Label>
                <Input 
                  type="number" 
                  value={threshold} 
                  onChange={(e) => setThreshold(Math.min(1, Math.max(0, Number(e.target.value))))}
                  step={0.05}
                  min={0}
                  max={1}
                />
                <p className="text-xs text-gray-400">Default: 0.5 (predict 1 if probability ≥ threshold)</p>
              </div>
            </div>

            {/* ===== RIGHT COLUMN: Results ===== */}
            <div className="space-y-6">
              {!results.isValid ? (
                <Alert>
                  <AlertTitle>Cannot Estimate Model</AlertTitle>
                  <AlertDescription>
                    {results.message || 'Please provide at least 3 data points with binary Y values (0 or 1).'}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Model Summary */}
                  <Card className="p-4">
                    <p className="text-sm font-medium text-gray-500">Model</p>
                    <p className="text-lg font-mono font-semibold">{results.equation}</p>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-gray-500">β₀:</span>
                        <span className="font-mono ml-1">{formatNumber(results.beta0, 3)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">β₁:</span>
                        <span className="font-mono ml-1">{formatNumber(results.beta1, 3)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">n:</span>
                        <span className="font-mono ml-1">{results.n}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Goodness of Fit */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3">
                      <p className="text-xs font-medium text-gray-500">McFadden R²</p>
                      <p className="text-xl font-bold">{formatNumber(results.mcfaddenR2, 3)}</p>
                      <Badge className={`text-[10px] ${
                        results.mcfaddenR2 >= 0.2 ? 'bg-green-100 text-green-800' :
                        results.mcfaddenR2 >= 0.1 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {results.mcfaddenR2 >= 0.2 ? 'Good Fit' :
                         results.mcfaddenR2 >= 0.1 ? 'Moderate Fit' :
                         'Poor Fit'}
                      </Badge>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs font-medium text-gray-500">Correctly Predicted</p>
                      <p className="text-xl font-bold">{results.percentCorrect.toFixed(1)}%</p>
                      <p className="text-xs text-gray-400">{results.correctCount}/{results.n} correct</p>
                    </Card>
                  </div>

                  {/* Confusion Matrix */}
                  <Card className="p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Confusion Matrix</p>
                    <div className="grid grid-cols-3 gap-1 text-center text-xs">
                      <div className="p-1"></div>
                      <div className="p-1 font-medium">Predicted 1</div>
                      <div className="p-1 font-medium">Predicted 0</div>
                      <div className="p-1 font-medium">Actual 1</div>
                      <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                        <span className="font-bold text-green-600">TP: {results.confusionMatrix.truePositive}</span>
                      </div>
                      <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
                        <span className="font-bold text-red-600">FN: {results.confusionMatrix.falseNegative}</span>
                      </div>
                      <div className="p-1 font-medium">Actual 0</div>
                      <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
                        <span className="font-bold text-red-600">FP: {results.confusionMatrix.falsePositive}</span>
                      </div>
                      <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                        <span className="font-bold text-green-600">TN: {results.confusionMatrix.trueNegative}</span>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>Sensitivity: {formatNumber(results.sensitivity, 3)}</span>
                      <span>Specificity: {formatNumber(results.specificity, 3)}</span>
                    </div>
                  </Card>

                  {/* Predictions Table */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Predicted Probabilities</h3>
                    <div className="border rounded-lg max-h-36 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="py-1 px-2">{xLabel}</TableHead>
                            <TableHead className="py-1 px-2">{yLabel}</TableHead>
                            <TableHead className="text-right py-1 px-2">P({yLabel}=1)</TableHead>
                            <TableHead className="text-center py-1 px-2">Predicted</TableHead>
                            <TableHead className="text-center py-1 px-2">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.predictions.map((p, i) => (
                            <TableRow key={i} className="text-xs">
                              <TableCell className="py-1 px-2">{p.x}</TableCell>
                              <TableCell className="py-1 px-2">{p.y}</TableCell>
                              <TableCell className="text-right font-mono py-1 px-2">
                                {formatNumber(p.predictedProb, 3)}
                              </TableCell>
                              <TableCell className="text-center py-1 px-2">
                                {p.predictedClass}
                              </TableCell>
                              <TableCell className="text-center py-1 px-2">
                                {p.correct ? 
                                  <CheckCircle className="h-3.5 w-3.5 text-green-500 inline" /> :
                                  <XCircle className="h-3.5 w-3.5 text-red-500 inline" />
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Log-Likelihood */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                    <Card className="p-2">
                      <span className="font-medium">Log-Likelihood:</span>
                      <span className="ml-1 font-mono">{formatNumber(results.logL, 2)}</span>
                    </Card>
                    <Card className="p-2">
                      <span className="font-medium">Null Log-Likelihood:</span>
                      <span className="ml-1 font-mono">{formatNumber(results.logL0, 2)}</span>
                    </Card>
                  </div>

                  {/* Warning about small sample */}
                  {results.n < 10 && (
                    <Alert variant="default" className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                      <AlertDescription className="text-xs">
                        <span className="font-medium">Small Sample Warning:</span> With only {results.n} observations, 
                        MLE estimates may be unreliable. Consider collecting more data for robust inference.
                      </AlertDescription>
                    </Alert>
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

export default BinaryChoiceModel;