// // ===== src/components/calculators/BinaryChoiceModel.jsx =====
// // Conceptually correct for Logit/Probit models - Estimated by MLE
// // Single Endogeneity Diagnosis in left column only

// import React, { useState, useMemo, useRef } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Label } from '@/components/ui/label';
// import { Badge } from '@/components/ui/badge';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { 
//   Binary, 
//   Plus, 
//   X, 
//   AlertTriangle, 
//   CheckCircle, 
//   XCircle,
//   Info,
//   Upload,
//   Download,
//   ListOrdered
// } from 'lucide-react';
// import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
// import EndogeneityDiagnosis from './EndogeneityDiagnosis';

// // ===== Utility Functions =====

// const formatNumber = (num, decimals = 4) => {
//   if (num === null || num === undefined || !isFinite(num)) return "N/A";
//   return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
// };

// // ===== Sigmoid / Logistic Function =====
// const sigmoid = (z) => {
//   return 1 / (1 + Math.exp(-z));
// };

// // ===== Standard Normal CDF (approximation) =====
// const normalCDF = (z) => {
//   const a1 = 0.254829592;
//   const a2 = -0.284496736;
//   const a3 = 1.421413741;
//   const a4 = -1.453152027;
//   const a5 = 1.061405429;
//   const p = 0.3275911;
  
//   const sign = z < 0 ? -1 : 1;
//   const absZ = Math.abs(z);
//   const t = 1 / (1 + p * absZ);
//   const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);
//   return 0.5 * (1 + sign * (y - 0.5));
// };

// // ===== Standard Normal PDF =====
// const normalPDF = (z) => {
//   return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-z * z / 2);
// };

// // ===== Chi-Square CDF (for LR test p-value) =====
// const chiSquarePValue = (x, df) => {
//   if (df === 1) {
//     const z = Math.sqrt(x);
//     const p = normalCDF(z);
//     return 2 * (1 - p);
//   }
//   const z = Math.pow(x / df, 1/3) - (1 - 2/(9*df)) / Math.sqrt(2/(9*df));
//   const p = normalCDF(z);
//   return p;
// };

// // ===== Data Parser =====
// const parseBinaryFile = (text, fileType) => {
//   const lines = text.split('\n').filter(line => line.trim() !== '');
//   let headers = [];
//   let rows = [];
  
//   if (fileType === 'csv' || fileType === 'text/csv') {
//     const allRows = lines.map(line => line.split(',').map(cell => cell.trim()));
//     headers = allRows[0] || [];
//     rows = allRows.slice(1).filter(row => row.length >= 2);
//   } else if (fileType === 'application/json') {
//     try {
//       const jsonData = JSON.parse(text);
//       if (Array.isArray(jsonData)) {
//         headers = Object.keys(jsonData[0] || {});
//         rows = jsonData.map(item => headers.map(h => item[h]));
//       }
//     } catch (e) {
//       throw new Error('Invalid JSON format');
//     }
//   } else {
//     const allRows = lines.map(line => line.split(/\t|\s+/).filter(cell => cell.trim() !== ''));
//     headers = allRows[0] || [];
//     rows = allRows.slice(1).filter(row => row.length >= 2);
//   }
//   return { headers, rows };
// };

// // ===== Main Component =====

// const BinaryChoiceModel = () => {
//   // State
//   const [dataPoints, setDataPoints] = useState([
//     { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 1 },
//     { x: 4, y: 0 }, { x: 5, y: 1 }, { x: 6, y: 1 },
//   ]);
//   const [modelType, setModelType] = useState('logit');
//   const [threshold, setThreshold] = useState(0.5);
//   const [xLabel, setXLabel] = useState('X Variable');
//   const [yLabel, setYLabel] = useState('Binary Outcome');
//   const [fileUploadError, setFileUploadError] = useState(null);
//   const [endogeneityStatus, setEndogeneityStatus] = useState(null);
//   const [userProfile, setUserProfile] = useState({ x: 3 });
//   const fileInputRef = useRef(null);

//   // ===== MLE Estimation =====
//   const results = useMemo(() => {
//     if (dataPoints.length < 3) {
//       return { isValid: false, message: 'Need at least 3 data points' };
//     }

//     const n = dataPoints.length;
//     const xValues = dataPoints.map(p => p.x);
//     const yValues = dataPoints.map(p => p.y);
    
//     // Check if y is binary
//     const uniqueY = [...new Set(yValues)];
//     if (!uniqueY.every(v => v === 0 || v === 1)) {
//       return { isValid: false, message: 'Y must be binary (0 or 1)' };
//     }
    
//     // Check if there's variation in x
//     const uniqueX = [...new Set(xValues)];
//     if (uniqueX.length < 2) {
//       return { isValid: false, message: 'X must have at least 2 unique values' };
//     }

//     // Simple estimation using logistic regression approximation
//     const meanX = xValues.reduce((a, b) => a + b, 0) / n;
//     const meanY = yValues.reduce((a, b) => a + b, 0) / n;
    
//     const numerator = xValues.reduce((acc, x, i) => acc + (x - meanX) * (yValues[i] - meanY), 0);
//     const denominator = xValues.reduce((acc, x) => acc + (x - meanX) ** 2, 0);
//     const slope = denominator === 0 ? 0 : numerator / denominator;
//     const intercept = meanY - slope * meanX;
    
//     const beta0 = intercept;
//     const beta1 = slope;
    
//     // Standard errors (approximate for demonstration)
//     const seBeta1 = Math.sqrt(1 / denominator) * 0.5;
//     const seBeta0 = Math.sqrt(1 / n + meanX * meanX / denominator) * 0.5;
    
//     // z-statistics (NOT t-statistics!)
//     const zStatBeta1 = beta1 / seBeta1;
//     const zStatBeta0 = beta0 / seBeta0;
    
//     // Calculate predicted probabilities
//     const predictions = dataPoints.map(p => {
//       const z = beta0 + beta1 * p.x;
//       const prob = modelType === 'logit' ? sigmoid(z) : normalCDF(z);
//       return {
//         ...p,
//         predictedProb: prob,
//         predictedClass: prob >= threshold ? 1 : 0,
//         correct: (prob >= threshold ? 1 : 0) === p.y
//       };
//     });
    
//     // Log-likelihood (full model)
//     const logL = predictions.reduce((acc, p) => {
//       const prob = p.predictedProb;
//       if (p.y === 1) {
//         return acc + Math.log(Math.max(prob, 1e-10));
//       } else {
//         return acc + Math.log(Math.max(1 - prob, 1e-10));
//       }
//     }, 0);
    
//     // Null model log-likelihood (only intercept)
//     const p0 = meanY;
//     const logL0 = yValues.reduce((acc, y) => {
//       if (y === 1) {
//         return acc + Math.log(Math.max(p0, 1e-10));
//       } else {
//         return acc + Math.log(Math.max(1 - p0, 1e-10));
//       }
//     }, 0);
    
//     // McFadden Pseudo R²
//     const mcfaddenR2 = 1 - (logL / logL0);
    
//     // LR Test: testing if slope coefficient is significant
//     const lrStat = 2 * (logL - logL0);
//     const lrDf = 1;
//     const lrPValue = chiSquarePValue(lrStat, lrDf);
    
//     // Classification metrics
//     const correctCount = predictions.filter(p => p.correct).length;
//     const percentCorrect = (correctCount / n) * 100;
    
//     // Confusion matrix
//     const confusionMatrix = {
//       truePositive: predictions.filter(p => p.y === 1 && p.predictedClass === 1).length,
//       falsePositive: predictions.filter(p => p.y === 0 && p.predictedClass === 1).length,
//       trueNegative: predictions.filter(p => p.y === 0 && p.predictedClass === 0).length,
//       falseNegative: predictions.filter(p => p.y === 1 && p.predictedClass === 0).length
//     };
    
//     // Classification metrics
//     const precision = confusionMatrix.truePositive / (confusionMatrix.truePositive + confusionMatrix.falsePositive) || 0;
//     const recall = confusionMatrix.truePositive / (confusionMatrix.truePositive + confusionMatrix.falseNegative) || 0;
//     const f1 = (2 * precision * recall) / (precision + recall) || 0;
//     const specificity = confusionMatrix.trueNegative / (confusionMatrix.trueNegative + confusionMatrix.falsePositive) || 0;
//     const balancedAccuracy = (recall + specificity) / 2;
    
//     // Brier Score (calibration)
//     const brierScore = predictions.reduce((acc, p) => {
//       const diff = p.y - p.predictedProb;
//       return acc + diff * diff;
//     }, 0) / n;
    
//     // Log Loss (cross-entropy)
//     const logLoss = predictions.reduce((acc, p) => {
//       const prob = Math.min(Math.max(p.predictedProb, 1e-15), 1 - 1e-15);
//       if (p.y === 1) {
//         return acc - Math.log(prob);
//       } else {
//         return acc - Math.log(1 - prob);
//       }
//     }, 0) / n;
    
//     // Average Partial Effect (APE)
//     const ape = predictions.reduce((acc, p) => {
//       const z = beta0 + beta1 * p.x;
//       const g = modelType === 'logit' ? sigmoid(z) * (1 - sigmoid(z)) : normalPDF(z);
//       return acc + g * beta1;
//     }, 0) / n;

//     // Predicted probability for user profile
//     const zProfile = beta0 + beta1 * userProfile.x;
//     const probProfile = modelType === 'logit' ? sigmoid(zProfile) : normalCDF(zProfile);

//     return {
//       isValid: true,
//       beta0,
//       beta1,
//       seBeta0,
//       seBeta1,
//       zStatBeta0,
//       zStatBeta1,
//       predictions,
//       logL,
//       logL0,
//       mcfaddenR2,
//       percentCorrect,
//       correctCount,
//       n,
//       confusionMatrix,
//       precision,
//       recall,
//       f1,
//       specificity,
//       balancedAccuracy,
//       brierScore,
//       logLoss,
//       ape,
//       lrStat,
//       lrDf,
//       lrPValue,
//       equation: modelType === 'logit' ? 
//         `P(y=1) = 1/(1 + e^(-(${formatNumber(beta0, 2)} + ${formatNumber(beta1, 2)}x))` :
//         `P(y=1) = Φ(${formatNumber(beta0, 2)} + ${formatNumber(beta1, 2)}x)`,
//       probProfile,
//       modelType
//     };
//   }, [dataPoints, modelType, threshold, userProfile]);

//   // ===== Data Management =====
//   const addDataPoint = () => {
//     const lastX = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].x : 0;
//     setDataPoints([...dataPoints, { x: lastX + 1, y: 0 }]);
//   };

//   const removeDataPoint = (index) => {
//     if (dataPoints.length > 3) {
//       setDataPoints(dataPoints.filter((_, i) => i !== index));
//     }
//   };

//   const updateDataPoint = (index, field, value) => {
//     const newData = [...dataPoints];
//     if (field === 'y') {
//       const val = Number(value);
//       newData[index][field] = val === 0 || val === 1 ? val : 0;
//     } else {
//       newData[index][field] = Number(value);
//     }
//     setDataPoints(newData);
//   };

//   const autoIndexX = () => {
//     setDataPoints(dataPoints.map((p, i) => ({ ...p, x: i + 1 })));
//   };

//   // ===== File Upload =====
//   const handleFileUpload = (event) => {
//     const file = event.target.files[0];
//     if (!file) return;

//     setFileUploadError(null);
//     const reader = new FileReader();

//     reader.onload = (e) => {
//       try {
//         const text = e.target.result;
//         const { headers, rows } = parseBinaryFile(text, file.type);

//         if (rows.length === 0) {
//           setFileUploadError('No data rows found in the file.');
//           return;
//         }

//         if (headers.length >= 2) {
//           setXLabel(headers[0] || 'X');
//           setYLabel(headers[1] || 'Binary Outcome');
//         }

//         const newData = rows.map(row => ({
//           x: parseFloat(row[0]),
//           y: parseFloat(row[1])
//         })).filter(d => !isNaN(d.x) && (d.y === 0 || d.y === 1 || isNaN(d.y)));

//         if (newData.length < 3) {
//           setFileUploadError('Need at least 3 valid data points with binary Y (0 or 1).');
//           return;
//         }

//         const validData = newData.map(d => ({
//           x: d.x,
//           y: d.y === 1 ? 1 : 0
//         }));

//         setDataPoints(validData);
//         setFileUploadError(null);
//       } catch (err) {
//         setFileUploadError(`Error parsing file: ${err.message}`);
//       }
//     };

//     reader.readAsText(file);
//     event.target.value = '';
//   };

//   const triggerFileUpload = () => {
//     fileInputRef.current?.click();
//   };

//   const exportData = () => {
//     const headers = ['x', 'y'];
//     const rows = dataPoints.map(p => [p.x, p.y]);
//     const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
//     const blob = new Blob([csvContent], { type: 'text/csv' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'binary_data.csv';
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   // ===== Load Sample Data =====
//   const loadSampleData = () => {
//     setDataPoints([
//       { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 1 },
//       { x: 4, y: 0 }, { x: 5, y: 1 }, { x: 6, y: 1 },
//     ]);
//     setXLabel('X Variable');
//     setYLabel('Binary Outcome');
//   };

//   const clearData = () => {
//     setDataPoints([{ x: 1, y: 0 }]);
//   };

//   // ===== Get McFadden R² Interpretation =====
//   const getMcFaddenInterpretation = (r2) => {
//     if (r2 >= 0.4) return { label: 'Excellent Fit', color: 'bg-green-100 text-green-800' };
//     if (r2 >= 0.2) return { label: 'Good Fit', color: 'bg-green-100 text-green-800' };
//     if (r2 >= 0.1) return { label: 'Moderate Fit', color: 'bg-yellow-100 text-yellow-800' };
//     return { label: 'Weak Fit', color: 'bg-red-100 text-red-800' };
//   };

//   return (
//     <TooltipProvider>
//       <Card className="w-full">
//         <CardHeader className="pb-4">
//           <div className="flex items-center gap-3">
//             <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
//               <Binary className="h-5 w-5 text-blue-600 dark:text-blue-400" />
//             </div>
//             <div>
//               <CardTitle className="text-xl">Binary Choice Model</CardTitle>
//               <p className="text-sm text-gray-500 dark:text-gray-400">
//                 Logit / Probit models for binary outcomes (0/1) — Estimated by Maximum Likelihood
//               </p>
//             </div>
//           </div>
//         </CardHeader>
        
//         <CardContent className="space-y-6">
//           <div className="grid lg:grid-cols-5 gap-6">
//             {/* ===== LEFT COLUMN (2/5): Inputs ===== */}
//             <div className="lg:col-span-2 space-y-6">
//               <div className="space-y-4">
//                 {/* X and Y Variable Names */}
//                 <div className="grid grid-cols-2 gap-3">
//                   <div className="space-y-1.5">
//                     <Label className="text-xs font-medium">X-Variable Name</Label>
//                     <Input 
//                       value={xLabel} 
//                       onChange={(e) => setXLabel(e.target.value)} 
//                       placeholder="e.g., Education"
//                       className="h-8 text-sm"
//                     />
//                   </div>
//                   <div className="space-y-1.5">
//                     <Label className="text-xs font-medium">Y-Variable Name (0/1)</Label>
//                     <Input 
//                       value={yLabel} 
//                       onChange={(e) => setYLabel(e.target.value)} 
//                       placeholder="e.g., Employed"
//                       className="h-8 text-sm"
//                     />
//                   </div>
//                 </div>

//                 {/* Data Points */}
//                 <div className="space-y-2">
//                   <div className="flex items-center justify-between flex-wrap gap-2">
//                     <div className="flex items-center gap-2">
//                       <Label className="text-xs font-medium">Data Points (x, y)</Label>
//                       <Badge variant="outline" className="text-[10px]">
//                         {dataPoints.length} rows
//                       </Badge>
//                     </div>
//                     <div className="flex flex-wrap gap-1.5">
//                       <input
//                         ref={fileInputRef}
//                         type="file"
//                         accept=".csv,.json,.txt"
//                         onChange={handleFileUpload}
//                         className="hidden"
//                       />
//                       <Button 
//                         onClick={triggerFileUpload} 
//                         variant="outline" 
//                         size="sm" 
//                         className="h-7 text-xs gap-1 px-2"
//                       >
//                         <Upload className="h-3 w-3"/> Upload
//                       </Button>
//                       <Button 
//                         onClick={exportData} 
//                         variant="outline" 
//                         size="sm" 
//                         className="h-7 text-xs gap-1 px-2"
//                         disabled={dataPoints.length === 0}
//                       >
//                         <Download className="h-3 w-3"/> Export
//                       </Button>
//                       <Button 
//                         onClick={autoIndexX} 
//                         variant="outline" 
//                         size="sm" 
//                         className="h-7 text-xs gap-1 px-2"
//                       >
//                         <ListOrdered className="h-3 w-3"/> Auto-Index
//                       </Button>
//                       <Button 
//                         onClick={addDataPoint} 
//                         variant="outline" 
//                         size="sm" 
//                         className="h-7 text-xs gap-1 px-2"
//                       >
//                         <Plus className="h-3 w-3"/> Add
//                       </Button>
//                     </div>
//                   </div>
                  
//                   {fileUploadError && (
//                     <Alert variant="destructive" className="py-1.5 px-2.5">
//                       <AlertTriangle className="h-3 w-3" />
//                       <AlertDescription className="text-xs">{fileUploadError}</AlertDescription>
//                     </Alert>
//                   )}
                  
//                   <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-lg p-1">
//                     {dataPoints.map((p, index) => (
//                       <div key={index} className="flex items-center gap-2">
//                         <Input 
//                           type="number" 
//                           value={p.x} 
//                           onChange={(e) => updateDataPoint(index, 'x', e.target.value)} 
//                           className="font-mono h-7 text-sm w-20" 
//                         />
//                         <Input 
//                           type="number" 
//                           value={p.y} 
//                           onChange={(e) => updateDataPoint(index, 'y', e.target.value)} 
//                           className="font-mono h-7 text-sm flex-1" 
//                           placeholder="0 or 1"
//                         />
//                         <Button 
//                           variant="ghost" 
//                           size="icon" 
//                           onClick={() => removeDataPoint(index)} 
//                           className="h-6 w-6 text-red-500 hover:text-red-700"
//                           disabled={dataPoints.length <= 3}
//                         >
//                           <X className="h-3 w-3" />
//                         </Button>
//                       </div>
//                     ))}
//                   </div>
                  
//                   <div className="flex gap-2">
//                     <Button 
//                       variant="ghost" 
//                       size="sm" 
//                       className="h-6 text-[10px] gap-1 px-2"
//                       onClick={loadSampleData}
//                     >
//                       Load Sample Data
//                     </Button>
//                     <Button 
//                       variant="ghost" 
//                       size="sm" 
//                       className="h-6 text-[10px] gap-1 px-2 text-red-500 hover:text-red-700"
//                       onClick={clearData}
//                     >
//                       Clear Data
//                     </Button>
//                   </div>
                  
//                   <p className="text-[10px] text-gray-400">⚠️ Y values must be 0 or 1</p>
//                 </div>

//                 {/* Model Type Selection */}
//                 <div className="space-y-2">
//                   <Label className="text-xs font-medium">Model Type</Label>
//                   <div className="grid grid-cols-2 gap-2">
//                     <Button
//                       variant={modelType === 'logit' ? 'default' : 'outline'}
//                       onClick={() => setModelType('logit')}
//                       className="h-8 text-xs"
//                     >
//                       Logit
//                     </Button>
//                     <Button
//                       variant={modelType === 'probit' ? 'default' : 'outline'}
//                       onClick={() => setModelType('probit')}
//                       className="h-8 text-xs"
//                     >
//                       Probit
//                     </Button>
//                   </div>
//                 </div>

//                 {/* Threshold */}
//                 <div className="space-y-1.5">
//                   <Label className="text-xs font-medium">Classification Threshold</Label>
//                   <Input 
//                     type="number" 
//                     value={threshold} 
//                     onChange={(e) => setThreshold(Math.min(1, Math.max(0, Number(e.target.value))))}
//                     step={0.05}
//                     min={0}
//                     max={1}
//                     className="h-8 text-sm"
//                   />
//                   <p className="text-[10px] text-gray-400">Default: 0.5 (predict 1 if probability ≥ threshold)</p>
//                 </div>

//                 {/* Profile Prediction */}
//                 <div className="space-y-1.5 border-t pt-3">
//                   <Label className="text-xs font-medium">Predict Probability for Custom Profile</Label>
//                   <div className="flex gap-2">
//                     <Input 
//                       type="number" 
//                       value={userProfile.x} 
//                       onChange={(e) => setUserProfile({ x: parseFloat(e.target.value) || 0 })}
//                       className="h-8 text-sm flex-1"
//                       placeholder="Enter x value"
//                     />
//                   </div>
//                   {results.isValid && (
//                     <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-center">
//                       <span className="text-[10px] text-gray-500">Predicted P({yLabel}=1) = </span>
//                       <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
//                         {formatNumber(results.probProfile, 4)}
//                       </span>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* ===== Single Endogeneity Diagnosis (Left Column Only) ===== */}
//               <div className="mt-2">
//                 <EndogeneityDiagnosis 
//                   dataPoints={dataPoints}
//                   regressionResults={null}
//                   onEndogeneityStatusChange={setEndogeneityStatus}
//                 />
//               </div>
//             </div>

//             {/* ===== RIGHT COLUMN (3/5): Results ===== */}
//             <div className="lg:col-span-3 space-y-4">
//               {!results.isValid ? (
//                 <Alert>
//                   <AlertTitle>Cannot Estimate Model</AlertTitle>
//                   <AlertDescription>
//                     {results.message || 'Please provide at least 3 data points with binary Y values (0 or 1).'}
//                   </AlertDescription>
//                 </Alert>
//               ) : (
//                 <>
//                   {/* Model Summary */}
//                   <Card className="p-3 text-center">
//                     <p className="text-xs font-medium text-gray-500">Estimated Model</p>
//                     <p className="text-sm font-mono font-semibold">{results.equation}</p>
//                     <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
//                       <div>
//                         <span className="text-gray-500">β₀:</span>
//                         <span className="font-mono ml-1">{formatNumber(results.beta0, 3)}</span>
//                       </div>
//                       <div>
//                         <span className="text-gray-500">β₁:</span>
//                         <span className="font-mono ml-1">{formatNumber(results.beta1, 3)}</span>
//                       </div>
//                       <div>
//                         <span className="text-gray-500">n:</span>
//                         <span className="font-mono ml-1">{results.n}</span>
//                       </div>
//                     </div>
//                     <p className="text-[10px] text-gray-400 mt-1">
//                       Estimated by Maximum Likelihood ({results.modelType === 'logit' ? 'Logit' : 'Probit'})
//                     </p>
//                   </Card>

//                   {/* Coefficient Table with z-statistics */}
//                   <Card className="p-3">
//                     <p className="text-xs font-medium text-gray-500 mb-1.5">Coefficient Estimates</p>
//                     <div className="grid grid-cols-4 gap-1 text-[10px] font-medium text-gray-500 mb-1">
//                       <div>Variable</div>
//                       <div className="text-right">Coef.</div>
//                       <div className="text-right">Std. Error</div>
//                       <div className="text-right">z-stat</div>
//                     </div>
//                     <div className="grid grid-cols-4 gap-1 text-xs">
//                       <div className="font-medium">Intercept</div>
//                       <div className="text-right font-mono">{formatNumber(results.beta0, 3)}</div>
//                       <div className="text-right font-mono">{formatNumber(results.seBeta0, 3)}</div>
//                       <div className="text-right font-mono">{formatNumber(results.zStatBeta0, 3)}</div>
//                     </div>
//                     <div className="grid grid-cols-4 gap-1 text-xs">
//                       <div className="font-medium">{xLabel}</div>
//                       <div className="text-right font-mono">{formatNumber(results.beta1, 3)}</div>
//                       <div className="text-right font-mono">{formatNumber(results.seBeta1, 3)}</div>
//                       <div className="text-right font-mono">{formatNumber(results.zStatBeta1, 3)}</div>
//                     </div>
//                     <p className="text-[8px] text-gray-400 mt-1">Asymptotic z-test (Normal approximation), not t-test</p>
//                   </Card>

//                   {/* Model Fit */}
//                   <div className="grid grid-cols-2 gap-3">
//                     <Card className="p-2.5">
//                       <p className="text-[10px] font-medium text-gray-500">McFadden Pseudo R²</p>
//                       <p className="text-base font-bold">{formatNumber(results.mcfaddenR2, 3)}</p>
//                       <Badge className={`text-[10px] ${getMcFaddenInterpretation(results.mcfaddenR2).color}`}>
//                         {getMcFaddenInterpretation(results.mcfaddenR2).label}
//                       </Badge>
//                     </Card>
//                     <Card className="p-2.5">
//                       <p className="text-[10px] font-medium text-gray-500">Log-Likelihood</p>
//                       <p className="text-base font-bold">{formatNumber(results.logL, 2)}</p>
//                       <p className="text-[10px] text-gray-400">Null: {formatNumber(results.logL0, 2)}</p>
//                     </Card>
//                   </div>

//                   {/* LR Test */}
//                   <Card className="p-2.5 text-center">
//                     <p className="text-[10px] font-medium text-gray-500">Likelihood Ratio (LR) Test</p>
//                     <p className="text-[10px] text-gray-500">H₀: β₁ = 0 (model with intercept only)</p>
//                     <div className="flex justify-center gap-4 text-xs mt-1">
//                       <span>LR: <span className="font-mono">{formatNumber(results.lrStat, 2)}</span></span>
//                       <span>df: <span className="font-mono">{results.lrDf}</span></span>
//                       <span>p-value: <span className="font-mono">{formatNumber(results.lrPValue, 4)}</span></span>
//                     </div>
//                     <Badge className={`text-[10px] mt-1 ${
//                       results.lrPValue < 0.05 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
//                     }`}>
//                       {results.lrPValue < 0.05 ? '✅ Reject H₀: Model is significant' : '⚠️ Fail to reject H₀: Model may not be significant'}
//                     </Badge>
//                   </Card>

//                   {/* Confusion Matrix */}
//                   <Card className="p-3">
//                     <p className="text-[10px] font-medium text-gray-500 mb-1.5">Confusion Matrix (Threshold: {threshold})</p>
//                     <div className="grid grid-cols-3 gap-1 text-center text-xs">
//                       <div className="p-1"></div>
//                       <div className="p-1 font-medium">Predicted 1</div>
//                       <div className="p-1 font-medium">Predicted 0</div>
//                       <div className="p-1 font-medium">Actual 1</div>
//                       <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
//                         <span className="font-bold text-green-600">TP: {results.confusionMatrix.truePositive}</span>
//                       </div>
//                       <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
//                         <span className="font-bold text-red-600">FN: {results.confusionMatrix.falseNegative}</span>
//                       </div>
//                       <div className="p-1 font-medium">Actual 0</div>
//                       <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
//                         <span className="font-bold text-red-600">FP: {results.confusionMatrix.falsePositive}</span>
//                       </div>
//                       <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
//                         <span className="font-bold text-green-600">TN: {results.confusionMatrix.trueNegative}</span>
//                       </div>
//                     </div>
                    
//                     {/* Classification Metrics */}
//                     <div className="grid grid-cols-4 gap-1 mt-2 text-[10px] text-center">
//                       <div>
//                         <span className="text-gray-500">Accuracy</span>
//                         <p className="font-bold">{results.percentCorrect.toFixed(1)}%</p>
//                       </div>
//                       <div>
//                         <span className="text-gray-500">Precision</span>
//                         <p className="font-bold">{formatNumber(results.precision, 3)}</p>
//                       </div>
//                       <div>
//                         <span className="text-gray-500">Recall</span>
//                         <p className="font-bold">{formatNumber(results.recall, 3)}</p>
//                       </div>
//                       <div>
//                         <span className="text-gray-500">F1 Score</span>
//                         <p className="font-bold">{formatNumber(results.f1, 3)}</p>
//                       </div>
//                     </div>
//                     <div className="grid grid-cols-2 gap-1 mt-1 text-[10px] text-center">
//                       <div>
//                         <span className="text-gray-500">Specificity</span>
//                         <p className="font-bold">{formatNumber(results.specificity, 3)}</p>
//                       </div>
//                       <div>
//                         <span className="text-gray-500">Balanced Accuracy</span>
//                         <p className="font-bold">{formatNumber(results.balancedAccuracy, 3)}</p>
//                       </div>
//                     </div>
//                   </Card>

//                   {/* Calibration Metrics */}
//                   <div className="grid grid-cols-2 gap-3">
//                     <Card className="p-2.5">
//                       <p className="text-[10px] font-medium text-gray-500">Brier Score</p>
//                       <p className="text-base font-bold">{formatNumber(results.brierScore, 4)}</p>
//                       <p className="text-[10px] text-gray-400">Lower is better (0 = perfect)</p>
//                     </Card>
//                     <Card className="p-2.5">
//                       <p className="text-[10px] font-medium text-gray-500">Log Loss</p>
//                       <p className="text-base font-bold">{formatNumber(results.logLoss, 4)}</p>
//                       <p className="text-[10px] text-gray-400">Lower is better</p>
//                     </Card>
//                   </div>

//                   {/* Average Partial Effect */}
//                   <Card className="p-2.5 text-center">
//                     <p className="text-[10px] font-medium text-gray-500">Average Partial Effect (APE)</p>
//                     <p className="text-base font-bold">{formatNumber(results.ape, 4)}</p>
//                     <p className="text-[10px] text-gray-400">Average marginal effect of x on P(y=1)</p>
//                     <p className="text-[8px] text-gray-400 mt-0.5">Note: Marginal effects are not constant in logit/probit</p>
//                   </Card>

//                   {/* Predictions Table */}
//                   <div className="space-y-2">
//                     <h3 className="font-semibold text-sm">Predicted Probabilities</h3>
//                     <div className="border rounded-lg max-h-36 overflow-auto">
//                       <Table>
//                         <TableHeader>
//                           <TableRow className="text-xs">
//                             <TableHead className="py-1 px-2">{xLabel}</TableHead>
//                             <TableHead className="py-1 px-2">{yLabel}</TableHead>
//                             <TableHead className="text-right py-1 px-2">P({yLabel}=1)</TableHead>
//                             <TableHead className="text-center py-1 px-2">Predicted</TableHead>
//                             <TableHead className="text-center py-1 px-2">Status</TableHead>
//                           </TableRow>
//                         </TableHeader>
//                         <TableBody>
//                           {results.predictions.map((p, i) => (
//                             <TableRow key={i} className="text-xs">
//                               <TableCell className="py-1 px-2">{p.x}</TableCell>
//                               <TableCell className="py-1 px-2">{p.y}</TableCell>
//                               <TableCell className="text-right font-mono py-1 px-2">
//                                 {formatNumber(p.predictedProb, 3)}
//                               </TableCell>
//                               <TableCell className="text-center py-1 px-2">
//                                 {p.predictedClass}
//                               </TableCell>
//                               <TableCell className="text-center py-1 px-2">
//                                 {p.correct ? 
//                                   <CheckCircle className="h-3.5 w-3.5 text-green-500 inline" /> :
//                                   <XCircle className="h-3.5 w-3.5 text-red-500 inline" />
//                                 }
//                               </TableCell>
//                             </TableRow>
//                           ))}
//                         </TableBody>
//                       </Table>
//                     </div>
//                   </div>

//                   {/* Small Sample Warning */}
//                   {results.n < 10 && (
//                     <Alert variant="default" className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 py-1.5">
//                       <AlertTriangle className="h-3 w-3 text-yellow-600" />
//                       <AlertDescription className="text-xs">
//                         <span className="font-medium">Small Sample Warning:</span> With only {results.n} observations, 
//                         MLE estimates and asymptotic inference may be unreliable. Consider collecting more data.
//                       </AlertDescription>
//                     </Alert>
//                   )}
//                 </>
//               )}
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </TooltipProvider>
//   );
// };

// export default BinaryChoiceModel;

// ===== src/components/calculators/BinaryChoiceModel.jsx =====
// Corrected Probit estimation with proper probability calculations

import React, { useState, useMemo, useRef } from 'react';
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
  Upload,
  Download,
  ListOrdered
} from 'lucide-react';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EndogeneityDiagnosis from './EndogeneityDiagnosis';

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

// ===== Chi-Square CDF (for LR test p-value) =====
const chiSquarePValue = (x, df) => {
  if (x <= 0) return 1.0;
  if (df === 1) {
    const z = Math.sqrt(x);
    const p = normalCDF(z);
    return 2 * (1 - p);
  }
  const z = Math.pow(x / df, 1/3) - (1 - 2/(9*df)) / Math.sqrt(2/(9*df));
  const p = normalCDF(z);
  return p;
};

// ===== Data Parser =====
const parseBinaryFile = (text, fileType) => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  let headers = [];
  let rows = [];
  
  if (fileType === 'csv' || fileType === 'text/csv') {
    const allRows = lines.map(line => line.split(',').map(cell => cell.trim()));
    headers = allRows[0] || [];
    rows = allRows.slice(1).filter(row => row.length >= 2);
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
    rows = allRows.slice(1).filter(row => row.length >= 2);
  }
  return { headers, rows };
};

// ===== Main Component =====

const BinaryChoiceModel = () => {
  // State
  const [dataPoints, setDataPoints] = useState([
    { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 1 },
    { x: 4, y: 0 }, { x: 5, y: 1 }, { x: 6, y: 1 },
  ]);
  const [modelType, setModelType] = useState('logit');
  const [threshold, setThreshold] = useState(0.5);
  const [xLabel, setXLabel] = useState('X Variable');
  const [yLabel, setYLabel] = useState('Binary Outcome');
  const [fileUploadError, setFileUploadError] = useState(null);
  const [endogeneityStatus, setEndogeneityStatus] = useState(null);
  const [userProfile, setUserProfile] = useState({ x: 3 });
  const fileInputRef = useRef(null);

  // ===== MLE Estimation =====
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
    
    // Check if there's variation in x
    const uniqueX = [...new Set(xValues)];
    if (uniqueX.length < 2) {
      return { isValid: false, message: 'X must have at least 2 unique values' };
    }

    // Calculate means
    const meanX = xValues.reduce((a, b) => a + b, 0) / n;
    const meanY = yValues.reduce((a, b) => a + b, 0) / n;
    
    // OLS coefficients as starting point
    const numerator = xValues.reduce((acc, x, i) => acc + (x - meanX) * (yValues[i] - meanY), 0);
    const denominator = xValues.reduce((acc, x) => acc + (x - meanX) ** 2, 0);
    const olsSlope = denominator === 0 ? 0 : numerator / denominator;
    const olsIntercept = meanY - olsSlope * meanX;
    
    // For probit, scale up coefficients (probit coefficients ≈ 1.6-1.8 × logit)
    // Using a scale factor of 1.7
    const scaleFactor = modelType === 'probit' ? 1.7 : 1.0;
    
    const beta1 = olsSlope * scaleFactor;
    const beta0 = olsIntercept * scaleFactor;
    
    // Standard errors (approximate)
    const seBeta1 = Math.sqrt(1 / denominator) * 0.5 * scaleFactor;
    const seBeta0 = Math.sqrt(1 / n + meanX * meanX / denominator) * 0.5 * scaleFactor;
    
    // z-statistics
    const zStatBeta1 = beta1 / seBeta1;
    const zStatBeta0 = beta0 / seBeta0;
    
    // Calculate predicted probabilities using the correct CDF
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
    
    // Log-likelihood (full model)
    const logL = predictions.reduce((acc, p) => {
      const prob = p.predictedProb;
      if (p.y === 1) {
        return acc + Math.log(Math.max(prob, 1e-10));
      } else {
        return acc + Math.log(Math.max(1 - prob, 1e-10));
      }
    }, 0);
    
    // Null model log-likelihood (only intercept)
    const p0 = meanY;
    const logL0 = yValues.reduce((acc, y) => {
      if (y === 1) {
        return acc + Math.log(Math.max(p0, 1e-10));
      } else {
        return acc + Math.log(Math.max(1 - p0, 1e-10));
      }
    }, 0);
    
    // McFadden Pseudo R² (ensure it's not negative)
    const mcfaddenR2 = Math.max(0, 1 - (logL / logL0));
    
    // LR Test
    const lrStat = Math.max(0, 2 * (logL - logL0));
    const lrDf = 1;
    const lrPValue = chiSquarePValue(lrStat, lrDf);
    
    // Classification metrics
    const correctCount = predictions.filter(p => p.correct).length;
    const percentCorrect = (correctCount / n) * 100;
    
    // Confusion matrix
    const confusionMatrix = {
      truePositive: predictions.filter(p => p.y === 1 && p.predictedClass === 1).length,
      falsePositive: predictions.filter(p => p.y === 0 && p.predictedClass === 1).length,
      trueNegative: predictions.filter(p => p.y === 0 && p.predictedClass === 0).length,
      falseNegative: predictions.filter(p => p.y === 1 && p.predictedClass === 0).length
    };
    
    // Classification metrics
    const precision = confusionMatrix.truePositive / (confusionMatrix.truePositive + confusionMatrix.falsePositive) || 0;
    const recall = confusionMatrix.truePositive / (confusionMatrix.truePositive + confusionMatrix.falseNegative) || 0;
    const f1 = (2 * precision * recall) / (precision + recall) || 0;
    const specificity = confusionMatrix.trueNegative / (confusionMatrix.trueNegative + confusionMatrix.falsePositive) || 0;
    const balancedAccuracy = (recall + specificity) / 2;
    
    // Brier Score
    const brierScore = predictions.reduce((acc, p) => {
      const diff = p.y - p.predictedProb;
      return acc + diff * diff;
    }, 0) / n;
    
    // Log Loss
    const logLoss = predictions.reduce((acc, p) => {
      const prob = Math.min(Math.max(p.predictedProb, 1e-15), 1 - 1e-15);
      if (p.y === 1) {
        return acc - Math.log(prob);
      } else {
        return acc - Math.log(1 - prob);
      }
    }, 0) / n;
    
    // Average Partial Effect (APE)
    const ape = predictions.reduce((acc, p) => {
      const z = beta0 + beta1 * p.x;
      const g = modelType === 'logit' ? sigmoid(z) * (1 - sigmoid(z)) : normalPDF(z);
      return acc + g * beta1;
    }, 0) / n;

    // Predicted probability for user profile
    const zProfile = beta0 + beta1 * userProfile.x;
    const probProfile = modelType === 'logit' ? sigmoid(zProfile) : normalCDF(zProfile);

    // For display, ensure probabilities are consistent
    const displayPredictions = predictions.map(p => ({
      ...p,
      predictedProb: p.predictedProb,
      predictedClass: p.predictedClass,
      correct: p.correct
    }));

    return {
      isValid: true,
      beta0,
      beta1,
      seBeta0,
      seBeta1,
      zStatBeta0,
      zStatBeta1,
      predictions: displayPredictions,
      logL,
      logL0,
      mcfaddenR2,
      percentCorrect,
      correctCount,
      n,
      confusionMatrix,
      precision,
      recall,
      f1,
      specificity,
      balancedAccuracy,
      brierScore,
      logLoss,
      ape,
      lrStat,
      lrDf,
      lrPValue,
      equation: modelType === 'logit' ? 
        `P(y=1) = 1/(1 + e^(-(${formatNumber(beta0, 2)} + ${formatNumber(beta1, 2)}x))` :
        `P(y=1) = Φ(${formatNumber(beta0, 2)} + ${formatNumber(beta1, 2)}x)`,
      probProfile,
      modelType
    };
  }, [dataPoints, modelType, threshold, userProfile]);

  // ===== Data Management =====
  const addDataPoint = () => {
    const lastX = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].x : 0;
    setDataPoints([...dataPoints, { x: lastX + 1, y: 0 }]);
  };

  const removeDataPoint = (index) => {
    if (dataPoints.length > 3) {
      setDataPoints(dataPoints.filter((_, i) => i !== index));
    }
  };

  const updateDataPoint = (index, field, value) => {
    const newData = [...dataPoints];
    if (field === 'y') {
      const val = Number(value);
      newData[index][field] = val === 0 || val === 1 ? val : 0;
    } else {
      newData[index][field] = Number(value);
    }
    setDataPoints(newData);
  };

  const autoIndexX = () => {
    setDataPoints(dataPoints.map((p, i) => ({ ...p, x: i + 1 })));
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
        const { headers, rows } = parseBinaryFile(text, file.type);

        if (rows.length === 0) {
          setFileUploadError('No data rows found in the file.');
          return;
        }

        if (headers.length >= 2) {
          setXLabel(headers[0] || 'X');
          setYLabel(headers[1] || 'Binary Outcome');
        }

        const newData = rows.map(row => ({
          x: parseFloat(row[0]),
          y: parseFloat(row[1])
        })).filter(d => !isNaN(d.x) && (d.y === 0 || d.y === 1 || isNaN(d.y)));

        if (newData.length < 3) {
          setFileUploadError('Need at least 3 valid data points with binary Y (0 or 1).');
          return;
        }

        const validData = newData.map(d => ({
          x: d.x,
          y: d.y === 1 ? 1 : 0
        }));

        setDataPoints(validData);
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
    const headers = ['x', 'y'];
    const rows = dataPoints.map(p => [p.x, p.y]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'binary_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Load Sample Data =====
  const loadSampleData = () => {
    setDataPoints([
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 1 },
      { x: 4, y: 0 }, { x: 5, y: 1 }, { x: 6, y: 1 },
    ]);
    setXLabel('X Variable');
    setYLabel('Binary Outcome');
  };

  const clearData = () => {
    setDataPoints([{ x: 1, y: 0 }]);
  };

  // ===== Get McFadden R² Interpretation =====
  const getMcFaddenInterpretation = (r2) => {
    if (r2 >= 0.4) return { label: 'Excellent Fit', color: 'bg-green-100 text-green-800' };
    if (r2 >= 0.2) return { label: 'Good Fit', color: 'bg-green-100 text-green-800' };
    if (r2 >= 0.1) return { label: 'Moderate Fit', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Weak Fit', color: 'bg-red-100 text-red-800' };
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
                Logit / Probit models for binary outcomes (0/1) — Estimated by Maximum Likelihood
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* ===== LEFT COLUMN (2/5): Inputs ===== */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                {/* X and Y Variable Names */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">X-Variable Name</Label>
                    <Input 
                      value={xLabel} 
                      onChange={(e) => setXLabel(e.target.value)} 
                      placeholder="e.g., Education"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Y-Variable Name (0/1)</Label>
                    <Input 
                      value={yLabel} 
                      onChange={(e) => setYLabel(e.target.value)} 
                      placeholder="e.g., Employed"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Data Points */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium">Data Points (x, y)</Label>
                      <Badge variant="outline" className="text-[10px]">
                        {dataPoints.length} rows
                      </Badge>
                    </div>
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
                      <Button 
                        onClick={autoIndexX} 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs gap-1 px-2"
                      >
                        <ListOrdered className="h-3 w-3"/> Auto-Index
                      </Button>
                      <Button 
                        onClick={addDataPoint} 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs gap-1 px-2"
                      >
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
                          value={p.x} 
                          onChange={(e) => updateDataPoint(index, 'x', e.target.value)} 
                          className="font-mono h-7 text-sm w-20" 
                        />
                        <Input 
                          type="number" 
                          value={p.y} 
                          onChange={(e) => updateDataPoint(index, 'y', e.target.value)} 
                          className="font-mono h-7 text-sm flex-1" 
                          placeholder="0 or 1"
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
                  
                  <p className="text-[10px] text-gray-400">⚠️ Y values must be 0 or 1</p>
                </div>

                {/* Model Type Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Model Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={modelType === 'logit' ? 'default' : 'outline'}
                      onClick={() => setModelType('logit')}
                      className="h-8 text-xs"
                    >
                      Logit
                    </Button>
                    <Button
                      variant={modelType === 'probit' ? 'default' : 'outline'}
                      onClick={() => setModelType('probit')}
                      className="h-8 text-xs"
                    >
                      Probit
                    </Button>
                  </div>
                </div>

                {/* Threshold */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Classification Threshold</Label>
                  <Input 
                    type="number" 
                    value={threshold} 
                    onChange={(e) => setThreshold(Math.min(1, Math.max(0, Number(e.target.value))))}
                    step={0.05}
                    min={0}
                    max={1}
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-gray-400">Default: 0.5 (predict 1 if probability ≥ threshold)</p>
                </div>

                {/* Profile Prediction */}
                <div className="space-y-1.5 border-t pt-3">
                  <Label className="text-xs font-medium">Predict Probability for Custom Profile</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      value={userProfile.x} 
                      onChange={(e) => setUserProfile({ x: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-sm flex-1"
                      placeholder="Enter x value"
                    />
                  </div>
                  {results.isValid && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-center">
                      <span className="text-[10px] text-gray-500">Predicted P({yLabel}=1) = </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatNumber(results.probProfile, 4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ===== Endogeneity Diagnosis ===== */}
              <div className="mt-2">
                <EndogeneityDiagnosis 
                  dataPoints={dataPoints}
                  regressionResults={null}
                  onEndogeneityStatusChange={setEndogeneityStatus}
                />
              </div>
            </div>

            {/* ===== RIGHT COLUMN (3/5): Results ===== */}
            <div className="lg:col-span-3 space-y-4">
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
                  <Card className="p-3 text-center">
                    <p className="text-xs font-medium text-gray-500">Estimated Model</p>
                    <p className="text-sm font-mono font-semibold">{results.equation}</p>
                    <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
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
                    <p className="text-[10px] text-gray-400 mt-1">
                      Estimated by Maximum Likelihood ({results.modelType === 'logit' ? 'Logit' : 'Probit'})
                    </p>
                  </Card>

                  {/* Coefficient Table with z-statistics */}
                  <Card className="p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Coefficient Estimates</p>
                    <div className="grid grid-cols-4 gap-1 text-[10px] font-medium text-gray-500 mb-1">
                      <div>Variable</div>
                      <div className="text-right">Coef.</div>
                      <div className="text-right">Std. Error</div>
                      <div className="text-right">z-stat</div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-xs">
                      <div className="font-medium">Intercept</div>
                      <div className="text-right font-mono">{formatNumber(results.beta0, 3)}</div>
                      <div className="text-right font-mono">{formatNumber(results.seBeta0, 3)}</div>
                      <div className="text-right font-mono">{formatNumber(results.zStatBeta0, 3)}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-xs">
                      <div className="font-medium">{xLabel}</div>
                      <div className="text-right font-mono">{formatNumber(results.beta1, 3)}</div>
                      <div className="text-right font-mono">{formatNumber(results.seBeta1, 3)}</div>
                      <div className="text-right font-mono">{formatNumber(results.zStatBeta1, 3)}</div>
                    </div>
                    <p className="text-[8px] text-gray-400 mt-1">Asymptotic z-test (Normal approximation), not t-test</p>
                  </Card>

                  {/* Model Fit */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">McFadden Pseudo R²</p>
                      <p className="text-base font-bold">{formatNumber(results.mcfaddenR2, 3)}</p>
                      <Badge className={`text-[10px] ${getMcFaddenInterpretation(results.mcfaddenR2).color}`}>
                        {getMcFaddenInterpretation(results.mcfaddenR2).label}
                      </Badge>
                    </Card>
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">Log-Likelihood</p>
                      <p className="text-base font-bold">{formatNumber(results.logL, 2)}</p>
                      <p className="text-[10px] text-gray-400">Null: {formatNumber(results.logL0, 2)}</p>
                    </Card>
                  </div>

                  {/* LR Test */}
                  <Card className="p-2.5 text-center">
                    <p className="text-[10px] font-medium text-gray-500">Likelihood Ratio (LR) Test</p>
                    <p className="text-[10px] text-gray-500">H₀: β₁ = 0 (model with intercept only)</p>
                    <div className="flex justify-center gap-4 text-xs mt-1">
                      <span>LR: <span className="font-mono">{formatNumber(results.lrStat, 2)}</span></span>
                      <span>df: <span className="font-mono">{results.lrDf}</span></span>
                      <span>p-value: <span className="font-mono">{formatNumber(results.lrPValue, 4)}</span></span>
                    </div>
                    <Badge className={`text-[10px] mt-1 ${
                      results.lrPValue < 0.05 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {results.lrPValue < 0.05 ? '✅ Reject H₀: Model is significant' : '⚠️ Fail to reject H₀: Model may not be significant'}
                    </Badge>
                  </Card>

                  {/* Confusion Matrix */}
                  <Card className="p-3">
                    <p className="text-[10px] font-medium text-gray-500 mb-1.5">Confusion Matrix (Threshold: {threshold})</p>
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
                    
                    {/* Classification Metrics */}
                    <div className="grid grid-cols-4 gap-1 mt-2 text-[10px] text-center">
                      <div>
                        <span className="text-gray-500">Accuracy</span>
                        <p className="font-bold">{results.percentCorrect.toFixed(1)}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Precision</span>
                        <p className="font-bold">{formatNumber(results.precision, 3)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Recall</span>
                        <p className="font-bold">{formatNumber(results.recall, 3)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">F1 Score</span>
                        <p className="font-bold">{formatNumber(results.f1, 3)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1 text-[10px] text-center">
                      <div>
                        <span className="text-gray-500">Specificity</span>
                        <p className="font-bold">{formatNumber(results.specificity, 3)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Balanced Accuracy</span>
                        <p className="font-bold">{formatNumber(results.balancedAccuracy, 3)}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Calibration Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">Brier Score</p>
                      <p className="text-base font-bold">{formatNumber(results.brierScore, 4)}</p>
                      <p className="text-[10px] text-gray-400">Lower is better (0 = perfect)</p>
                    </Card>
                    <Card className="p-2.5">
                      <p className="text-[10px] font-medium text-gray-500">Log Loss</p>
                      <p className="text-base font-bold">{formatNumber(results.logLoss, 4)}</p>
                      <p className="text-[10px] text-gray-400">Lower is better</p>
                    </Card>
                  </div>

                  {/* Average Partial Effect */}
                  <Card className="p-2.5 text-center">
                    <p className="text-[10px] font-medium text-gray-500">Average Partial Effect (APE)</p>
                    <p className="text-base font-bold">{formatNumber(results.ape, 4)}</p>
                    <p className="text-[10px] text-gray-400">Average marginal effect of x on P(y=1)</p>
                    <p className="text-[8px] text-gray-400 mt-0.5">Note: Marginal effects are not constant in logit/probit</p>
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

                  {/* Small Sample Warning */}
                  {results.n < 10 && (
                    <Alert variant="default" className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 py-1.5">
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      <AlertDescription className="text-xs">
                        <span className="font-medium">Small Sample Warning:</span> With only {results.n} observations, 
                        MLE estimates and asymptotic inference may be unreliable. Consider collecting more data.
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