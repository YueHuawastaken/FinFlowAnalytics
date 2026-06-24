// // export default EconometricsDiagnosis;
// import React, { useState, useMemo } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { 
//   ComposedChart, 
//   Scatter, 
//   Line, 
//   XAxis, 
//   YAxis, 
//   CartesianGrid, 
//   Tooltip, 
//   ResponsiveContainer,
//   ReferenceLine
// } from 'recharts';
// import { 
//   AlertTriangle, 
//   CheckCircle, 
//   XCircle, 
//   TrendingUp, 
//   Activity,
//   Sigma,
//   BarChart as BarChartIcon,
//   Info,
//   Eye,
//   EyeOff,
//   FileText
// } from 'lucide-react';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// // ===== Utility Functions =====

// const formatNumber = (num, decimals = 4) => {
//   if (num === null || num === undefined || !isFinite(num)) return "N/A";
//   return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
// };

// const formatNumberCompact = (num, decimals = 2) => {
//   if (num === null || num === undefined || !isFinite(num)) return "N/A";
//   if (Math.abs(num) >= 1000000) {
//     return (num / 1000000).toFixed(decimals) + 'M';
//   }
//   if (Math.abs(num) >= 1000) {
//     return (num / 1000).toFixed(decimals) + 'K';
//   }
//   return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
// };

// const getDiagnosticBadge = (value, thresholds) => {
//   if (value <= thresholds.good) {
//     return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Good</Badge>;
//   } else if (value <= thresholds.warning) {
//     return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Warning</Badge>;
//   } else {
//     return <Badge variant="destructive">Needs Attention</Badge>;
//   }
// };

// // ===== Main Component =====

// const EconometricsDiagnosis = ({ 
//   dataPoints = [], 
//   regressionResults = null,
//   modelType = 'simple',
//   independentVariables = [],
//   dependentVariable = '',
//   onRecommendationApply = null,
//   defaultExpanded = false,
//   compact = false
// }) => {
//   // State for expanded sections
//   const [expandedSections, setExpandedSections] = useState({
//     basic: true,
//     heteroskedasticity: false,
//     residuals: false,
//     outliers: false,
//     specification: false
//   });

//   const toggleSection = (section) => {
//     setExpandedSections(prev => ({
//       ...prev,
//       [section]: !prev[section]
//     }));
//   };

//   // ===== DIAGNOSTIC CALCULATIONS =====
  
//   const diagnostics = useMemo(() => {
//     if (!dataPoints || dataPoints.length < 2 || !regressionResults?.isValid) {
//       return { isValid: false, message: 'Need at least 2 data points and a valid regression model' };
//     }

//     const n = dataPoints.length;
//     const results = { isValid: true };
    
//     // 1. SAMPLE SIZE DIAGNOSTICS
//     results.sampleSize = {
//       n: n,
//       status: n < 10 ? 'warning' : n < 30 ? 'info' : 'good',
//       message: n < 10 ? 'Very small sample (n<10) - results may be unreliable' :
//                n < 30 ? 'Moderate sample size - acceptable but consider more data' :
//                'Good sample size - results should be reliable',
//       recommendation: n < 10 ? 'Collect at least 10-30 data points for more reliable results' :
//                        n < 30 ? 'Consider adding more data to improve precision' :
//                        'Sample size is adequate'
//     };

//     // 2. RESIDUAL CALCULATIONS
//     if (regressionResults.residuals) {
//       const residuals = regressionResults.residuals;
//       const se = regressionResults.standardErrorEstimate || 
//                  Math.sqrt(residuals.reduce((acc, r) => acc + r.residual ** 2, 0) / (n - 2));
      
//       const standardizedResiduals = residuals.map(r => ({
//         ...r,
//         standardized: se !== 0 ? r.residual / se : 0
//       }));
      
//       results.residuals = {
//         raw: residuals,
//         standardized: standardizedResiduals,
//         se: se,
//         outliers: standardizedResiduals.filter(r => Math.abs(r.standardized) > 2),
//         maxResidual: Math.max(...residuals.map(r => Math.abs(r.residual))),
//         sse: residuals.reduce((acc, r) => acc + r.residual ** 2, 0),
//         // For residual plot
//         residualPlotData: residuals.map((r, i) => ({
//           fitted: regressionResults.intercept + regressionResults.slope * r.x,
//           residual: r.residual,
//           x: r.x
//         }))
//       };
      
//       // 3. OUTLIER DIAGNOSTICS
//       results.outliers = {
//         count: results.residuals.outliers.length,
//         observations: results.residuals.outliers,
//         status: results.residuals.outliers.length === 0 ? 'good' : 
//                 results.residuals.outliers.length <= 1 ? 'warning' : 'needs_attention',
//         message: results.residuals.outliers.length === 0 ? 'No outliers detected' :
//                  results.residuals.outliers.length <= 1 ? 'One potential outlier detected' :
//                  `${results.residuals.outliers.length} outliers detected - may affect results`,
//         recommendation: results.residuals.outliers.length > 0 ? 
//                         'Consider removing or investigating outlier observations' :
//                         'Data appears clean'
//       };
//     }

//     // 4. HETEROSKEDASTICITY (Breusch-Pagan Test - works with n>=6)
//     if (regressionResults.residuals && dataPoints.length >= 6) {
//       const residuals = regressionResults.residuals;
//       const squaredResiduals = residuals.map(r => r.residual ** 2);
//       const xValues = dataPoints.map(p => p.x);
      
//       const meanX = xValues.reduce((a, b) => a + b, 0) / n;
//       const meanY = squaredResiduals.reduce((a, b) => a + b, 0) / n;
      
//       const numerator = xValues.reduce((acc, x, i) => 
//         acc + (x - meanX) * (squaredResiduals[i] - meanY), 0
//       );
//       const denominator = xValues.reduce((acc, x) => 
//         acc + (x - meanX) ** 2, 0
//       );
      
//       if (denominator !== 0) {
//         const slope = numerator / denominator;
//         const intercept = meanY - slope * meanX;
        
//         const sst = squaredResiduals.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
//         const sse_aux = squaredResiduals.reduce((acc, y, i) => {
//           const predicted = intercept + slope * xValues[i];
//           return acc + (y - predicted) ** 2;
//         }, 0);
//         const rSquaredAux = sst === 0 ? 0 : 1 - (sse_aux / sst);
        
//         const k = 1;
//         const fStat = sst === 0 ? 0 : (rSquaredAux / k) / ((1 - rSquaredAux) / (n - k - 1));
        
//         // Lower threshold for small samples
//         const isHeteroskedastic = fStat > 3.5 && rSquaredAux > 0.1;
        
//         results.heteroskedasticity = {
//           test: 'Breusch-Pagan (Simplified)',
//           fStatistic: fStat,
//           rSquared: rSquaredAux,
//           isHeteroskedastic: isHeteroskedastic,
//           status: isHeteroskedastic ? 'needs_attention' : 'good',
//           message: isHeteroskedastic ? 
//                     'Evidence of heteroskedasticity detected' :
//                     'No strong evidence of heteroskedasticity',
//           recommendation: isHeteroskedastic ?
//                           'Consider using robust standard errors or Weighted Least Squares' :
//                           'Homoskedasticity assumption appears reasonable'
//         };
//       }
//     }

//     // 5. AUTOCORRELATION (Durbin-Watson)
//     if (regressionResults.residuals && dataPoints.length >= 4) {
//       const residuals = regressionResults.residuals.map(r => r.residual);
//       let numerator_dw = 0;
//       let denominator_dw = 0;
      
//       for (let i = 1; i < residuals.length; i++) {
//         numerator_dw += (residuals[i] - residuals[i-1]) ** 2;
//       }
//       denominator_dw = residuals.reduce((acc, r) => acc + r ** 2, 0);
      
//       const durbinWatson = denominator_dw === 0 ? 2 : numerator_dw / denominator_dw;
      
//       results.autocorrelation = {
//         test: 'Durbin-Watson',
//         statistic: durbinWatson,
//         status: durbinWatson < 1.5 || durbinWatson > 2.5 ? 'warning' : 'good',
//         message: durbinWatson < 1.5 ? 'Positive autocorrelation detected' :
//                  durbinWatson > 2.5 ? 'Negative autocorrelation detected' :
//                  'No strong evidence of autocorrelation',
//         recommendation: durbinWatson < 1.5 || durbinWatson > 2.5 ?
//                         'Consider using Newey-West standard errors or AR models' :
//                         'No action needed'
//       };
//     }

//     // 6. NORMALITY
//     if (regressionResults.residuals && dataPoints.length >= 4) {
//       const residuals = regressionResults.residuals.map(r => r.residual).sort((a, b) => a - b);
//       const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
      
//       const variance = residuals.reduce((acc, r) => acc + (r - mean) ** 2, 0) / residuals.length;
//       const stdDev = Math.sqrt(variance);
      
//       const skewness = stdDev === 0 ? 0 : 
//         residuals.reduce((acc, r) => acc + (r - mean) ** 3, 0) / (residuals.length * stdDev ** 3);
      
//       const kurtosis = stdDev === 0 ? 3 :
//         residuals.reduce((acc, r) => acc + (r - mean) ** 4, 0) / (residuals.length * stdDev ** 4);
      
//       const isNormal = Math.abs(skewness) < 1 && Math.abs(kurtosis - 3) < 1;
      
//       results.normality = {
//         skewness: skewness,
//         kurtosis: kurtosis,
//         isNormal: isNormal,
//         status: isNormal ? 'good' : 'warning',
//         message: isNormal ? 'Residuals appear approximately normal' :
//                  'Residuals show signs of non-normality',
//         recommendation: isNormal ? 'Normality assumption appears reasonable' :
//                         'Consider robust methods or data transformation'
//       };
//     }

//     // 7. MODEL SPECIFICATION
//     if (regressionResults.residuals && dataPoints.length >= 6) {
//       const fitted = dataPoints.map(p => regressionResults.intercept + regressionResults.slope * p.x);
//       const residuals = regressionResults.residuals.map(r => r.residual);
      
//       const fittedSquared = fitted.map(f => f ** 2);
//       const meanFitSq = fittedSquared.reduce((a, b) => a + b, 0) / fittedSquared.length;
//       const meanRes = residuals.reduce((a, b) => a + b, 0) / residuals.length;
      
//       const numReset = fittedSquared.reduce((acc, fs, i) => 
//         acc + (fs - meanFitSq) * (residuals[i] - meanRes), 0
//       );
//       const denReset = fittedSquared.reduce((acc, fs) => acc + (fs - meanFitSq) ** 2, 0) *
//                        residuals.reduce((acc, r) => acc + (r - meanRes) ** 2, 0);
      
//       const correlation = denReset === 0 ? 0 : numReset / Math.sqrt(denReset);
      
//       results.specification = {
//         test: 'Ramsey RESET (Simplified)',
//         correlation: correlation,
//         status: Math.abs(correlation) < 0.3 ? 'good' : 'warning',
//         message: Math.abs(correlation) < 0.3 ? 'No strong evidence of misspecification' :
//                  'Possible model misspecification detected',
//         recommendation: Math.abs(correlation) >= 0.3 ?
//                         'Consider adding polynomial terms or transforming variables' :
//                         'Model specification appears adequate'
//       };
//     }

//     // 8. R² DIAGNOSTICS
//     if (regressionResults.rSquared !== undefined) {
//       const r2 = regressionResults.rSquared;
//       results.rSquared = {
//         value: r2,
//         status: r2 >= 0.8 ? 'good' : r2 >= 0.6 ? 'warning' : 'needs_attention',
//         message: r2 >= 0.8 ? 'Strong fit - model explains most variation' :
//                  r2 >= 0.6 ? 'Moderate fit - acceptable but room for improvement' :
//                  'Weak fit - model explains little variation',
//         recommendation: r2 < 0.6 ? 
//                         'Consider adding more relevant variables or trying non-linear models' :
//                         'Fit is acceptable'
//       };
//     }

//     // 9. SLOPE SIGNIFICANCE
//     if (regressionResults.tStatisticSlope !== undefined) {
//       const tStat = Math.abs(regressionResults.tStatisticSlope);
//       const df = dataPoints.length - 2;
//       const isSignificant = tStat > 2.0;
      
//       results.slopeSignificance = {
//         tStatistic: tStat,
//         isSignificant: isSignificant,
//         status: isSignificant ? 'good' : 'warning',
//         message: isSignificant ? 'Slope is statistically significant' :
//                  'Slope may not be statistically significant',
//         recommendation: !isSignificant ?
//                         'Consider collecting more data or refining the model' :
//                         'Slope is significant'
//       };
//     }

//     // 10. OVERALL ASSESSMENT
//     const warnings = [];
//     if (results.sampleSize?.status === 'warning') warnings.push('sampleSize');
//     if (results.outliers?.status === 'warning' || results.outliers?.status === 'needs_attention') warnings.push('outliers');
//     if (results.heteroskedasticity?.status === 'needs_attention') warnings.push('heteroskedasticity');
//     if (results.autocorrelation?.status === 'warning') warnings.push('autocorrelation');
//     if (results.normality?.status === 'warning') warnings.push('normality');
//     if (results.specification?.status === 'warning') warnings.push('specification');
//     if (results.rSquared?.status === 'needs_attention') warnings.push('rSquared');
    
//     results.overall = {
//       warnings: warnings.length,
//       status: warnings.length === 0 ? 'good' :
//               warnings.length <= 2 ? 'warning' : 'needs_attention',
//       message: warnings.length === 0 ? 'All diagnostics look good - model is reliable' :
//                warnings.length <= 2 ? 'Minor issues detected - proceed with caution' :
//                'Multiple issues detected - model may be unreliable',
//       recommendation: warnings.length > 0 ?
//                       'Address the identified issues for more reliable results' :
//                       'No immediate action needed'
//     };

//     return results;
//   }, [dataPoints, regressionResults]);

//   // ===== RENDER FUNCTIONS =====

//   const renderSectionToggle = (title, section, icon) => (
//     <div 
//       className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 rounded"
//       onClick={() => toggleSection(section)}
//     >
//       <div className="flex items-center gap-2">
//         {icon}
//         <span className="font-medium text-sm">{title}</span>
//         {diagnostics[section]?.status === 'good' && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
//         {diagnostics[section]?.status === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
//         {diagnostics[section]?.status === 'needs_attention' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
//       </div>
//       {expandedSections[section] ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
//     </div>
//   );

//   const renderDiagnosticCard = (title, value, status, message, recommendation) => {
//     const statusColors = {
//       good: 'border-green-200 bg-green-50 dark:bg-green-900/20',
//       warning: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20',
//       needs_attention: 'border-red-200 bg-red-50 dark:bg-red-900/20'
//     };
    
//     const statusIcons = {
//       good: <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />,
//       warning: <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />,
//       needs_attention: <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
//     };

//     const paddingClass = compact ? 'p-2.5' : 'p-4';
//     const textSizeClass = compact ? 'text-xs' : 'text-sm';

//     return (
//       <Card className={`${paddingClass} border-l-4 ${statusColors[status] || statusColors.good} overflow-hidden`}>
//         <div className="flex items-start justify-between gap-2">
//           <div className="flex-1 min-w-0">
//             <div className="flex items-center gap-2">
//               <span className={`${textSizeClass} font-medium truncate`}>{title}</span>
//               {statusIcons[status]}
//             </div>
//             {value !== undefined && value !== null && (
//               <p className={`${compact ? 'text-base' : 'text-2xl'} font-bold mt-0.5 truncate`}>
//                 {typeof value === 'number' ? formatNumber(value, 2) : value}
//               </p>
//             )}
//             <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-600 dark:text-gray-400 mt-0.5 break-words`}>
//               {message}
//             </p>
//             {recommendation && (
//               <div className={`mt-1.5 p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded ${compact ? 'text-[10px]' : 'text-xs'}`}>
//                 <span className="font-medium">💡 Recommendation: </span>
//                 <span className="break-words">{recommendation}</span>
//               </div>
//             )}
//           </div>
//         </div>
//       </Card>
//     );
//   };

//   // ===== MAIN RENDER =====

//   if (!diagnostics.isValid) {
//     return (
//       <Card className="w-full">
//         <CardContent className="p-4">
//           <Alert>
//             <AlertTriangle className="h-4 w-4" />
//             <AlertTitle>Cannot Run Diagnostics</AlertTitle>
//             <AlertDescription>
//               {diagnostics.message || 'Please run a regression first with at least 2 data points.'}
//             </AlertDescription>
//           </Alert>
//         </CardContent>
//       </Card>
//     );
//   }

//   const cardPadding = compact ? 'p-3' : 'p-6';

//   return (
//     <TooltipProvider>
//       <Card className="w-full">
//         <CardHeader className={compact ? 'pb-2 pt-3 px-3' : 'pb-4'}>
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className={`p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900`}>
//                 <Activity className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600 dark:text-purple-400`} />
//               </div>
//               <div>
//                 <CardTitle className={`${compact ? 'text-sm' : 'text-xl'}`}>Econometric Diagnostics</CardTitle>
//                 {!compact && (
//                   <p className="text-sm text-gray-500 dark:text-gray-400">
//                     Check the reliability of your regression model
//                   </p>
//                 )}
//               </div>
//             </div>
//             <Badge className={`${compact ? 'text-[10px] px-2 py-0.5' : 'text-lg px-4 py-2'} ${
//               diagnostics.overall?.status === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
//               diagnostics.overall?.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
//               'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
//             }`}>
//               {diagnostics.overall?.status === 'good' ? '✅ Healthy' :
//                diagnostics.overall?.status === 'warning' ? '⚠️ Caution' :
//                '❌ Needs Attention'}
//             </Badge>
//           </div>
//         </CardHeader>

//         <CardContent className={cardPadding}>
//           <div className="space-y-4">
//             {/* Overall Assessment */}
//             <Alert variant="default" className={`border-l-4 ${
//               diagnostics.overall?.status === 'good' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
//               diagnostics.overall?.status === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
//               'border-red-500 bg-red-50 dark:bg-red-950/20'
//             } ${compact ? 'py-1.5 px-2.5' : 'py-3 px-4'}`}>
//               <div className="flex items-start gap-2">
//                 {diagnostics.overall?.status === 'good' && <CheckCircle className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-green-500 flex-shrink-0 mt-0.5`} />}
//                 {diagnostics.overall?.status === 'warning' && <AlertTriangle className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-yellow-500 flex-shrink-0 mt-0.5`} />}
//                 {diagnostics.overall?.status === 'needs_attention' && <XCircle className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-red-500 flex-shrink-0 mt-0.5`} />}
//                 <div className="min-w-0">
//                   <AlertTitle className={`${compact ? 'text-sm' : 'text-lg'} break-words`}>
//                     {diagnostics.overall?.message}
//                   </AlertTitle>
//                   <AlertDescription className={`${compact ? 'text-[10px]' : 'text-sm'} mt-0.5 break-words`}>
//                     {diagnostics.overall?.recommendation}
//                     {diagnostics.overall?.warnings > 0 && (
//                       <span className="block mt-0.5">
//                         {diagnostics.overall.warnings} issue{diagnostics.overall.warnings > 1 ? 's' : ''} detected
//                       </span>
//                     )}
//                   </AlertDescription>
//                 </div>
//               </div>
//             </Alert>

//             {/* Section 1: Basic Diagnostics */}
//             <div className="space-y-2">
//               <div 
//                 className="flex items-center justify-between cursor-pointer"
//                 onClick={() => toggleSection('basic')}
//               >
//                 <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-semibold flex items-center gap-2`}>
//                   <FileText className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
//                   Basic Diagnostics
//                   <Badge variant="outline" className={`${compact ? 'text-[8px] px-1.5' : 'text-xs'}`}>Always Visible</Badge>
//                 </h3>
//                 <Button variant="ghost" size="sm" className={compact ? 'h-6 w-6 p-0' : ''}>
//                   {expandedSections.basic ? <Eye className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} /> : <EyeOff className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />}
//                 </Button>
//               </div>
              
//               {expandedSections.basic && (
//                 <div className="grid grid-cols-1 gap-2">
//                   {diagnostics.sampleSize && renderDiagnosticCard(
//                     'Sample Size',
//                     `n = ${diagnostics.sampleSize.n}`,
//                     diagnostics.sampleSize.status,
//                     diagnostics.sampleSize.message,
//                     diagnostics.sampleSize.recommendation
//                   )}
                  
//                   {diagnostics.rSquared && renderDiagnosticCard(
//                     'R-Squared',
//                     diagnostics.rSquared.value,
//                     diagnostics.rSquared.status,
//                     diagnostics.rSquared.message,
//                     diagnostics.rSquared.recommendation
//                   )}
                  
//                   {diagnostics.slopeSignificance && renderDiagnosticCard(
//                     'Slope Significance',
//                     `t = ${diagnostics.slopeSignificance.tStatistic}`,
//                     diagnostics.slopeSignificance.status,
//                     diagnostics.slopeSignificance.message,
//                     diagnostics.slopeSignificance.recommendation
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Section 2: Heteroskedasticity */}
//             <div className="border-t pt-3">
//               {renderSectionToggle('Heteroskedasticity Tests', 'heteroskedasticity', <TrendingUp className="h-3.5 w-3.5" />)}
//               {expandedSections.heteroskedasticity && (
//                 <div className="mt-2">
//                   {diagnostics.heteroskedasticity ? (
//                     <div className="grid grid-cols-1 gap-2">
//                       {renderDiagnosticCard(
//                         'Breusch-Pagan Test',
//                         `F = ${diagnostics.heteroskedasticity.fStatistic}`,
//                         diagnostics.heteroskedasticity.status,
//                         diagnostics.heteroskedasticity.message,
//                         diagnostics.heteroskedasticity.recommendation
//                       )}
//                       <Card className={`${compact ? 'p-2.5' : 'p-4'}`}>
//                         <p className={`${compact ? 'text-[10px]' : 'text-sm'} font-medium text-gray-500`}>Auxiliary R²</p>
//                         <p className={`${compact ? 'text-base' : 'text-2xl'} font-bold`}>
//                           {formatNumber(diagnostics.heteroskedasticity.rSquared, 3)}
//                         </p>
//                         <p className={`${compact ? 'text-[8px]' : 'text-xs'} text-gray-400 mt-0.5`}>
//                           R² from regressing squared residuals on x
//                         </p>
//                       </Card>
//                     </div>
//                   ) : (
//                     <Alert className="py-1.5 px-2.5">
//                       <Info className="h-3.5 w-3.5" />
//                       <AlertDescription className="text-xs">
//                         Need at least 6 data points for heteroskedasticity test. 
//                         Current sample: {dataPoints.length} observations.
//                       </AlertDescription>
//                     </Alert>
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Section 3: Residual Analysis */}
//             <div className="border-t pt-3">
//               {renderSectionToggle('Residual Analysis', 'residuals', <Sigma className="h-3.5 w-3.5" />)}
//               {expandedSections.residuals && diagnostics.residuals && (
//                 <div className="mt-2 space-y-3">
//                   <div className="grid grid-cols-3 gap-2">
//                     <Card className={`${compact ? 'p-2' : 'p-3'}`}>
//                       <p className={`${compact ? 'text-[8px]' : 'text-xs'} font-medium text-gray-500 truncate`}>Std. Error (Se)</p>
//                       <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold truncate`}>
//                         {formatNumberCompact(diagnostics.residuals.se, 2)}
//                       </p>
//                     </Card>
//                     <Card className={`${compact ? 'p-2' : 'p-3'}`}>
//                       <p className={`${compact ? 'text-[8px]' : 'text-xs'} font-medium text-gray-500 truncate`}>Max Residual</p>
//                       <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold truncate`}>
//                         {formatNumberCompact(diagnostics.residuals.maxResidual, 2)}
//                       </p>
//                     </Card>
//                     <Card className={`${compact ? 'p-2' : 'p-3'}`}>
//                       <p className={`${compact ? 'text-[8px]' : 'text-xs'} font-medium text-gray-500 truncate`}>SSE</p>
//                       <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold truncate`}>
//                         {formatNumberCompact(diagnostics.residuals.sse, 2)}
//                       </p>
//                     </Card>
//                   </div>
                  
//                   {/* Residuals vs Fitted Plot - FIXED */}
//                   <Card className={`${compact ? 'p-2' : 'p-4'}`}>
//                     <p className={`${compact ? 'text-[10px]' : 'text-sm'} font-medium text-gray-500 mb-1`}>Residuals vs Fitted Values</p>
//                     <div className={`${compact ? 'h-40' : 'h-64'} w-full`}>
//                       <ResponsiveContainer width="100%" height="100%">
//                         <ComposedChart data={diagnostics.residuals.residualPlotData}>
//                           <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
//                           <XAxis 
//                             dataKey="fitted" 
//                             label={{ value: 'Fitted Values', position: 'bottom', fontSize: compact ? 9 : 11 }}
//                             tick={{ fontSize: compact ? 8 : 11 }}
//                             domain={['auto', 'auto']}
//                           />
//                           <YAxis 
//                             label={{ value: 'Residuals', angle: -90, position: 'left', fontSize: compact ? 9 : 11 }}
//                             tick={{ fontSize: compact ? 8 : 11 }}
//                           />
//                           <Tooltip 
//                             formatter={(value) => formatNumber(value, 2)}
//                             labelFormatter={(label) => `Fitted: ${formatNumber(label, 2)}`}
//                           />
//                           <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
//                           <Scatter 
//                             name="Residuals" 
//                             dataKey="residual" 
//                             fill="#8884d8" 
//                             shape="circle"
//                           />
//                         </ComposedChart>
//                       </ResponsiveContainer>
//                     </div>
//                   </Card>
//                 </div>
//               )}
//             </div>

//             {/* Section 4: Outliers */}
//             <div className="border-t pt-3">
//               {renderSectionToggle('Outlier Detection', 'outliers', <BarChartIcon className="h-3.5 w-3.5" />)}
//               {expandedSections.outliers && diagnostics.outliers && (
//                 <div className="mt-2 space-y-2">
//                   {renderDiagnosticCard(
//                     'Outlier Status',
//                     diagnostics.outliers.count,
//                     diagnostics.outliers.status,
//                     diagnostics.outliers.message,
//                     diagnostics.outliers.recommendation
//                   )}
                  
//                   {diagnostics.outliers.observations.length > 0 && (
//                     <div className="border rounded-lg overflow-auto max-h-36">
//                       <Table>
//                         <TableHeader>
//                           <TableRow className="text-xs">
//                             <TableHead className="py-1 px-2">X</TableHead>
//                             <TableHead className="py-1 px-2">Actual Y</TableHead>
//                             <TableHead className="py-1 px-2">Predicted</TableHead>
//                             <TableHead className="text-right py-1 px-2">Std. Residual</TableHead>
//                           </TableRow>
//                         </TableHeader>
//                         <TableBody>
//                           {diagnostics.outliers.observations.map((r, i) => (
//                             <TableRow key={i} className="bg-red-50 dark:bg-red-900/20 text-xs">
//                               <TableCell className="py-1 px-2">{r.x}</TableCell>
//                               <TableCell className="py-1 px-2">{formatNumber(r.actual, 2)}</TableCell>
//                               <TableCell className="py-1 px-2">{formatNumber(r.predicted, 2)}</TableCell>
//                               <TableCell className="text-right py-1 px-2 font-bold text-red-600">
//                                 {formatNumber(r.standardized, 2)}
//                               </TableCell>
//                             </TableRow>
//                           ))}
//                         </TableBody>
//                       </Table>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Section 5: Specification Tests */}
//             <div className="border-t pt-3">
//               {renderSectionToggle('Model Specification', 'specification', <Info className="h-3.5 w-3.5" />)}
//               {expandedSections.specification && (
//                 <div className="mt-2 grid grid-cols-1 gap-2">
//                   {diagnostics.autocorrelation && renderDiagnosticCard(
//                     'Autocorrelation (Durbin-Watson)',
//                     diagnostics.autocorrelation.statistic,
//                     diagnostics.autocorrelation.status,
//                     diagnostics.autocorrelation.message,
//                     diagnostics.autocorrelation.recommendation
//                   )}
//                   {diagnostics.normality && renderDiagnosticCard(
//                     'Normality Check',
//                     `Skew: ${formatNumber(diagnostics.normality.skewness, 2)} | Kurt: ${formatNumber(diagnostics.normality.kurtosis, 2)}`,
//                     diagnostics.normality.status,
//                     diagnostics.normality.message,
//                     diagnostics.normality.recommendation
//                   )}
//                   {diagnostics.specification && renderDiagnosticCard(
//                     'RESET Test (Simplified)',
//                     `Corr: ${formatNumber(diagnostics.specification.correlation, 3)}`,
//                     diagnostics.specification.status,
//                     diagnostics.specification.message,
//                     diagnostics.specification.recommendation
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </TooltipProvider>
//   );
// };

// export default EconometricsDiagnosis;
// ===== src/components/calculators/EconometricsDiagnosis.jsx =====
// Enhanced with BLUE Assessment and Measurement Error Detection

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ComposedChart, 
  Scatter, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Activity,
  Sigma,
  BarChart as BarChartIcon,
  Info,
  Eye,
  EyeOff,
  FileText,
  Award,
  Ruler
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ===== Utility Functions =====

const formatNumber = (num, decimals = 4) => {
  if (num === null || num === undefined || !isFinite(num)) return "N/A";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatNumberCompact = (num, decimals = 2) => {
  if (num === null || num === undefined || !isFinite(num)) return "N/A";
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(decimals) + 'M';
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(decimals) + 'K';
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const getDiagnosticBadge = (value, thresholds) => {
  if (value <= thresholds.good) {
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Good</Badge>;
  } else if (value <= thresholds.warning) {
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Warning</Badge>;
  } else {
    return <Badge variant="destructive">Needs Attention</Badge>;
  }
};

// ============================================
// DIAGNOSTIC FUNCTIONS (DEFINED BEFORE useMemo)
// ============================================

// ===== BLUE ASSESSMENT FUNCTION =====
const assessBLUE = (results, endogeneityStatus, dataType) => {
  const violations = [];
  const details = [];
  
  // Check MLR.1: Linear in parameters
  details.push({ assumption: 'MLR.1: Linear in parameters', status: '✅ Satisfied' });
  
  // Check MLR.2: Random sampling
  if (dataType === 'time-series') {
    violations.push('Random sampling not applicable for time-series data (use TS.1-TS.5 instead)');
    details.push({ assumption: 'MLR.2: Random sampling', status: '⚠️ Not applicable (Time Series)' });
  } else {
    details.push({ assumption: 'MLR.2: Random sampling', status: '✅ Satisfied (assumed)' });
  }
  
  // Check MLR.3: No perfect collinearity
  details.push({ assumption: 'MLR.3: No perfect collinearity', status: '✅ Satisfied (assumed)' });
  
  // Check MLR.4: Zero conditional mean (no endogeneity)
  if (endogeneityStatus && Object.values(endogeneityStatus).some(v => v === true)) {
    violations.push('Endogeneity detected (MLR.4 violated)');
    details.push({ assumption: 'MLR.4: Zero conditional mean', status: '❌ Violated - Endogeneity present' });
  } else {
    details.push({ assumption: 'MLR.4: Zero conditional mean', status: '✅ Satisfied' });
  }
  
  // Check MLR.5: Homoskedasticity
  if (results.heteroskedasticity?.isHeteroskedastic) {
    violations.push('Heteroskedasticity detected (MLR.5 violated)');
    details.push({ assumption: 'MLR.5: Homoskedasticity', status: '❌ Violated' });
  } else {
    details.push({ assumption: 'MLR.5: Homoskedasticity', status: '✅ Satisfied' });
  }
  
  // Check TS.5: No serial correlation (for time series)
  if (dataType === 'time-series' && results.autocorrelation?.status === 'warning') {
    violations.push('Autocorrelation detected (TS.5 violated)');
    details.push({ assumption: 'TS.5: No serial correlation', status: '❌ Violated' });
  } else if (dataType === 'time-series') {
    details.push({ assumption: 'TS.5: No serial correlation', status: '✅ Satisfied' });
  }
  
  // Check MLR.6: Normality (for inference)
  if (results.normality?.status === 'warning') {
    details.push({ assumption: 'MLR.6: Normality', status: '⚠️ Questionable' });
  } else {
    details.push({ assumption: 'MLR.6: Normality', status: '✅ Satisfied' });
  }
  
  const isBLUE = violations.length === 0;
  
  return {
    isBLUE: isBLUE,
    violations: violations,
    details: details,
    status: isBLUE ? 'good' : violations.length <= 2 ? 'warning' : 'needs_attention',
    message: isBLUE ? 
      'All Gauss-Markov assumptions satisfied. OLS is BLUE (Best Linear Unbiased Estimator).' :
      `OLS is NOT BLUE. Violations detected: ${violations.join('; ')}`,
    recommendation: isBLUE ?
      'No action needed. OLS estimators are efficient.' :
      'Consider using alternative estimators: WLS (for heteroskedasticity), IV/2SLS (for endogeneity), or Newey-West (for autocorrelation)',
    summary: isBLUE ? 
      '✅ OLS is BLUE' :
      `⚠️ OLS is NOT BLUE (${violations.length} violation${violations.length > 1 ? 's' : ''})`
  };
};

// ===== MEASUREMENT ERROR / ATTENUATION BIAS DETECTION =====
const detectAttenuationBias = (data, results) => {
  if (!results || !results.slope) {
    return {
      status: 'info',
      message: 'Insufficient information to detect attenuation bias',
      recommendation: 'Ensure you have at least 6 data points',
      summary: 'ℹ️ Insufficient Data'
    };
  }
  
  const n = data.length;
  const slope = Math.abs(results.slope);
  const tStat = Math.abs(results.tStatisticSlope);
  const r2 = results.rSquared;
  const seSlope = results.standardErrorSlope;
  
  let hasAttenuation = false;
  let indicators = [];
  let severity = 'low';
  
  // Check 1: Low t-statistic with high R²
  if (tStat < 3 && r2 > 0.8 && n >= 6) {
    hasAttenuation = true;
    indicators.push('Low t-statistic with high R² suggests possible measurement error');
    severity = 'medium';
  }
  
  // Check 2: Very small slope relative to standard error
  if (seSlope !== 0 && Math.abs(slope / seSlope) < 2 && r2 > 0.7) {
    hasAttenuation = true;
    indicators.push('Slope small relative to standard error (possible attenuation bias)');
    severity = 'high';
  }
  
  // Check 3: Sample size too small to detect
  if (n < 6) {
    indicators.push('Sample size too small for reliable measurement error detection');
  }
  
  // Check 4: R² very high with few observations
  if (r2 > 0.95 && n < 10) {
    indicators.push('Very high R² with small sample - may indicate overfitting rather than attenuation');
  }
  
  return {
    hasAttenuation: hasAttenuation,
    indicators: indicators,
    severity: severity,
    status: hasAttenuation ? 'warning' : indicators.length > 0 ? 'info' : 'good',
    message: hasAttenuation ?
      `⚠️ Potential attenuation bias detected: ${indicators[0]}` :
      indicators.length > 0 ?
        `ℹ️ ${indicators[0]}` :
        'No strong evidence of measurement error or attenuation bias',
    recommendation: hasAttenuation ?
      'Consider using Instrumental Variables (IV) estimation with a second measurement of the variable' :
      indicators.length > 0 && indicators.some(i => i.includes('sample size')) ?
        'Consider collecting more data for reliable detection' :
        'Measurement error appears minimal',
    details: {
      slope: slope,
      tStatistic: tStat,
      rSquared: r2,
      seSlope: seSlope,
      n: n
    },
    summary: hasAttenuation ?
      '⚠️ Possible Attenuation Bias' :
      '✅ No Attenuation Bias Detected'
  };
};

// ============================================
// MAIN COMPONENT
// ============================================

const EconometricsDiagnosis = ({ 
  dataPoints = [], 
  regressionResults = null,
  modelType = 'simple',
  independentVariables = [],
  dependentVariable = '',
  onRecommendationApply = null,
  defaultExpanded = false,
  compact = false,
  endogeneityStatus = null,
  dataType = 'cross-sectional'
}) => {
  
  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    heteroskedasticity: false,
    residuals: false,
    outliers: false,
    specification: false,
    blueAssessment: false,
    measurementError: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // ===== DIAGNOSTIC CALCULATIONS =====
  
  const diagnostics = useMemo(() => {
    if (!dataPoints || dataPoints.length < 2 || !regressionResults?.isValid) {
      return { isValid: false, message: 'Need at least 2 data points and a valid regression model' };
    }

    const n = dataPoints.length;
    const results = { isValid: true };
    
    // 1. SAMPLE SIZE DIAGNOSTICS
    results.sampleSize = {
      n: n,
      status: n < 10 ? 'warning' : n < 30 ? 'info' : 'good',
      message: n < 10 ? 'Very small sample (n<10) - results may be unreliable' :
               n < 30 ? 'Moderate sample size - acceptable but consider more data' :
               'Good sample size - results should be reliable',
      recommendation: n < 10 ? 'Collect at least 10-30 data points for more reliable results' :
                       n < 30 ? 'Consider adding more data to improve precision' :
                       'Sample size is adequate'
    };

    // 2. RESIDUAL CALCULATIONS
    if (regressionResults.residuals) {
      const residuals = regressionResults.residuals;
      const se = regressionResults.standardErrorEstimate || 
                 Math.sqrt(residuals.reduce((acc, r) => acc + r.residual ** 2, 0) / (n - 2));
      
      const standardizedResiduals = residuals.map(r => ({
        ...r,
        standardized: se !== 0 ? r.residual / se : 0
      }));
      
      results.residuals = {
        raw: residuals,
        standardized: standardizedResiduals,
        se: se,
        outliers: standardizedResiduals.filter(r => Math.abs(r.standardized) > 2),
        maxResidual: Math.max(...residuals.map(r => Math.abs(r.residual))),
        sse: residuals.reduce((acc, r) => acc + r.residual ** 2, 0),
        residualPlotData: residuals.map((r, i) => ({
          fitted: regressionResults.intercept + regressionResults.slope * r.x,
          residual: r.residual,
          x: r.x
        }))
      };
      
      // 3. OUTLIER DIAGNOSTICS
      results.outliers = {
        count: results.residuals.outliers.length,
        observations: results.residuals.outliers,
        status: results.residuals.outliers.length === 0 ? 'good' : 
                results.residuals.outliers.length <= 1 ? 'warning' : 'needs_attention',
        message: results.residuals.outliers.length === 0 ? 'No outliers detected' :
                 results.residuals.outliers.length <= 1 ? 'One potential outlier detected' :
                 `${results.residuals.outliers.length} outliers detected - may affect results`,
        recommendation: results.residuals.outliers.length > 0 ? 
                        'Consider removing or investigating outlier observations' :
                        'Data appears clean'
      };
    }

    // 4. HETEROSKEDASTICITY (Breusch-Pagan Test - works with n>=6)
    if (regressionResults.residuals && dataPoints.length >= 6) {
      const residuals = regressionResults.residuals;
      const squaredResiduals = residuals.map(r => r.residual ** 2);
      const xValues = dataPoints.map(p => p.x);
      
      const meanX = xValues.reduce((a, b) => a + b, 0) / n;
      const meanY = squaredResiduals.reduce((a, b) => a + b, 0) / n;
      
      const numerator = xValues.reduce((acc, x, i) => 
        acc + (x - meanX) * (squaredResiduals[i] - meanY), 0
      );
      const denominator = xValues.reduce((acc, x) => 
        acc + (x - meanX) ** 2, 0
      );
      
      if (denominator !== 0) {
        const slope = numerator / denominator;
        const intercept = meanY - slope * meanX;
        
        const sst = squaredResiduals.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
        const sse_aux = squaredResiduals.reduce((acc, y, i) => {
          const predicted = intercept + slope * xValues[i];
          return acc + (y - predicted) ** 2;
        }, 0);
        const rSquaredAux = sst === 0 ? 0 : 1 - (sse_aux / sst);
        
        const k = 1;
        const fStat = sst === 0 ? 0 : (rSquaredAux / k) / ((1 - rSquaredAux) / (n - k - 1));
        
        const isHeteroskedastic = fStat > 3.5 && rSquaredAux > 0.1;
        
        results.heteroskedasticity = {
          test: 'Breusch-Pagan (Simplified)',
          fStatistic: fStat,
          rSquared: rSquaredAux,
          isHeteroskedastic: isHeteroskedastic,
          status: isHeteroskedastic ? 'needs_attention' : 'good',
          message: isHeteroskedastic ? 
                    'Evidence of heteroskedasticity detected' :
                    'No strong evidence of heteroskedasticity',
          recommendation: isHeteroskedastic ?
                          'Consider using robust standard errors or Weighted Least Squares' :
                          'Homoskedasticity assumption appears reasonable'
        };
      }
    }

    // 5. AUTOCORRELATION (Durbin-Watson)
    if (regressionResults.residuals && dataPoints.length >= 4) {
      const residuals = regressionResults.residuals.map(r => r.residual);
      let numerator_dw = 0;
      let denominator_dw = 0;
      
      for (let i = 1; i < residuals.length; i++) {
        numerator_dw += (residuals[i] - residuals[i-1]) ** 2;
      }
      denominator_dw = residuals.reduce((acc, r) => acc + r ** 2, 0);
      
      const durbinWatson = denominator_dw === 0 ? 2 : numerator_dw / denominator_dw;
      
      results.autocorrelation = {
        test: 'Durbin-Watson',
        statistic: durbinWatson,
        status: durbinWatson < 1.5 || durbinWatson > 2.5 ? 'warning' : 'good',
        message: durbinWatson < 1.5 ? 'Positive autocorrelation detected' :
                 durbinWatson > 2.5 ? 'Negative autocorrelation detected' :
                 'No strong evidence of autocorrelation',
        recommendation: durbinWatson < 1.5 || durbinWatson > 2.5 ?
                        'Consider using Newey-West standard errors or AR models' :
                        'No action needed'
      };
    }

    // 6. NORMALITY
    if (regressionResults.residuals && dataPoints.length >= 4) {
      const residuals = regressionResults.residuals.map(r => r.residual).sort((a, b) => a - b);
      const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
      
      const variance = residuals.reduce((acc, r) => acc + (r - mean) ** 2, 0) / residuals.length;
      const stdDev = Math.sqrt(variance);
      
      const skewness = stdDev === 0 ? 0 : 
        residuals.reduce((acc, r) => acc + (r - mean) ** 3, 0) / (residuals.length * stdDev ** 3);
      
      const kurtosis = stdDev === 0 ? 3 :
        residuals.reduce((acc, r) => acc + (r - mean) ** 4, 0) / (residuals.length * stdDev ** 4);
      
      const isNormal = Math.abs(skewness) < 1 && Math.abs(kurtosis - 3) < 1;
      
      results.normality = {
        skewness: skewness,
        kurtosis: kurtosis,
        isNormal: isNormal,
        status: isNormal ? 'good' : 'warning',
        message: isNormal ? 'Residuals appear approximately normal' :
                 'Residuals show signs of non-normality',
        recommendation: isNormal ? 'Normality assumption appears reasonable' :
                        'Consider robust methods or data transformation'
      };
    }

    // 7. MODEL SPECIFICATION
    if (regressionResults.residuals && dataPoints.length >= 6) {
      const fitted = dataPoints.map(p => regressionResults.intercept + regressionResults.slope * p.x);
      const residuals = regressionResults.residuals.map(r => r.residual);
      
      const fittedSquared = fitted.map(f => f ** 2);
      const meanFitSq = fittedSquared.reduce((a, b) => a + b, 0) / fittedSquared.length;
      const meanRes = residuals.reduce((a, b) => a + b, 0) / residuals.length;
      
      const numReset = fittedSquared.reduce((acc, fs, i) => 
        acc + (fs - meanFitSq) * (residuals[i] - meanRes), 0
      );
      const denReset = fittedSquared.reduce((acc, fs) => acc + (fs - meanFitSq) ** 2, 0) *
                       residuals.reduce((acc, r) => acc + (r - meanRes) ** 2, 0);
      
      const correlation = denReset === 0 ? 0 : numReset / Math.sqrt(denReset);
      
      results.specification = {
        test: 'Ramsey RESET (Simplified)',
        correlation: correlation,
        status: Math.abs(correlation) < 0.3 ? 'good' : 'warning',
        message: Math.abs(correlation) < 0.3 ? 'No strong evidence of misspecification' :
                 'Possible model misspecification detected',
        recommendation: Math.abs(correlation) >= 0.3 ?
                        'Consider adding polynomial terms or transforming variables' :
                        'Model specification appears adequate'
      };
    }

    // 8. R² DIAGNOSTICS
    if (regressionResults.rSquared !== undefined) {
      const r2 = regressionResults.rSquared;
      results.rSquared = {
        value: r2,
        status: r2 >= 0.8 ? 'good' : r2 >= 0.6 ? 'warning' : 'needs_attention',
        message: r2 >= 0.8 ? 'Strong fit - model explains most variation' :
                 r2 >= 0.6 ? 'Moderate fit - acceptable but room for improvement' :
                 'Weak fit - model explains little variation',
        recommendation: r2 < 0.6 ? 
                        'Consider adding more relevant variables or trying non-linear models' :
                        'Fit is acceptable'
      };
    }

    // 9. SLOPE SIGNIFICANCE
    if (regressionResults.tStatisticSlope !== undefined) {
      const tStat = Math.abs(regressionResults.tStatisticSlope);
      const df = dataPoints.length - 2;
      const isSignificant = tStat > 2.0;
      
      results.slopeSignificance = {
        tStatistic: tStat,
        isSignificant: isSignificant,
        status: isSignificant ? 'good' : 'warning',
        message: isSignificant ? 'Slope is statistically significant' :
                 'Slope may not be statistically significant',
        recommendation: !isSignificant ?
                        'Consider collecting more data or refining the model' :
                        'Slope is significant'
      };
    }

    // ===== 11. BLUE ASSESSMENT (Gauss-Markov Theorem) =====
    results.blueAssessment = assessBLUE(results, endogeneityStatus, dataType);
    
    // ===== 12. MEASUREMENT ERROR / ATTENUATION BIAS =====
    results.measurementError = detectAttenuationBias(dataPoints, regressionResults);

    // 10. OVERALL ASSESSMENT (UPDATED with new diagnostics)
    const warnings = [];
    if (results.sampleSize?.status === 'warning') warnings.push('sampleSize');
    if (results.outliers?.status === 'warning' || results.outliers?.status === 'needs_attention') warnings.push('outliers');
    if (results.heteroskedasticity?.status === 'needs_attention') warnings.push('heteroskedasticity');
    if (results.autocorrelation?.status === 'warning') warnings.push('autocorrelation');
    if (results.normality?.status === 'warning') warnings.push('normality');
    if (results.specification?.status === 'warning') warnings.push('specification');
    if (results.rSquared?.status === 'needs_attention') warnings.push('rSquared');
    if (results.blueAssessment?.status === 'warning' || results.blueAssessment?.status === 'needs_attention') {
      warnings.push('blueAssessment');
    }
    if (results.measurementError?.status === 'warning' || results.measurementError?.status === 'needs_attention') {
      warnings.push('measurementError');
    }
    
    results.overall = {
      warnings: warnings.length,
      status: warnings.length === 0 ? 'good' :
              warnings.length <= 2 ? 'warning' : 'needs_attention',
      message: warnings.length === 0 ? 'All diagnostics look good - model is reliable' :
               warnings.length <= 2 ? 'Minor issues detected - proceed with caution' :
               'Multiple issues detected - model may be unreliable',
      recommendation: warnings.length > 0 ?
                      'Address the identified issues for more reliable results' :
                      'No immediate action needed'
    };

    return results;
  }, [dataPoints, regressionResults, endogeneityStatus, dataType]);

  // ===== RENDER FUNCTIONS =====

  const renderSectionToggle = (title, section, icon, badge = null) => (
    <div 
      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 rounded"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-sm">{title}</span>
        {badge && <span className="text-[8px]">{badge}</span>}
        {diagnostics[section]?.status === 'good' && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
        {diagnostics[section]?.status === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
        {diagnostics[section]?.status === 'needs_attention' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
        {diagnostics[section]?.status === 'info' && <Info className="h-3.5 w-3.5 text-blue-500" />}
      </div>
      {expandedSections[section] ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
    </div>
  );

  const renderDiagnosticCard = (title, value, status, message, recommendation) => {
    const statusColors = {
      good: 'border-green-200 bg-green-50 dark:bg-green-900/20',
      warning: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20',
      needs_attention: 'border-red-200 bg-red-50 dark:bg-red-900/20',
      info: 'border-blue-200 bg-blue-50 dark:bg-blue-900/20'
    };
    
    const statusIcons = {
      good: <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />,
      warning: <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />,
      needs_attention: <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />,
      info: <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
    };

    const paddingClass = compact ? 'p-2.5' : 'p-4';
    const textSizeClass = compact ? 'text-xs' : 'text-sm';

    if (status === 'info') {
      return (
        <Card className={`${paddingClass} border-l-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20 overflow-hidden`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`${textSizeClass} font-medium truncate`}>{title}</span>
                {statusIcons.info}
              </div>
              {value !== undefined && value !== null && (
                <p className={`${compact ? 'text-base' : 'text-2xl'} font-bold mt-0.5 truncate`}>
                  {typeof value === 'number' ? formatNumber(value, 2) : value}
                </p>
              )}
              <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-600 dark:text-gray-400 mt-0.5 break-words`}>
                {message}
              </p>
              {recommendation && (
                <div className={`mt-1.5 p-1.5 bg-blue-100 dark:bg-blue-800/30 rounded ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  <span className="font-medium">💡 Recommendation: </span>
                  <span className="break-words">{recommendation}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card className={`${paddingClass} border-l-4 ${statusColors[status] || statusColors.good} overflow-hidden`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`${textSizeClass} font-medium truncate`}>{title}</span>
              {statusIcons[status]}
            </div>
            {value !== undefined && value !== null && (
              <p className={`${compact ? 'text-base' : 'text-2xl'} font-bold mt-0.5 truncate`}>
                {typeof value === 'number' ? formatNumber(value, 2) : value}
              </p>
            )}
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-600 dark:text-gray-400 mt-0.5 break-words`}>
              {message}
            </p>
            {recommendation && (
              <div className={`mt-1.5 p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded ${compact ? 'text-[10px]' : 'text-xs'}`}>
                <span className="font-medium">💡 Recommendation: </span>
                <span className="break-words">{recommendation}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderBLUEDetails = (blueData) => {
    if (!blueData || !blueData.details) return null;
    
    return (
      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
        <p className="text-[10px] font-medium text-gray-500 mb-1">Assumptions Check:</p>
        <div className="grid grid-cols-1 gap-0.5">
          {blueData.details.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-[10px] py-0.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className="text-gray-600 dark:text-gray-400">{item.assumption}</span>
              <span className="font-medium">{item.status}</span>
            </div>
          ))}
        </div>
        {blueData.violations.length > 0 && (
          <div className="mt-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 rounded">
            <p className="text-[10px] text-red-600 dark:text-red-400">
              <span className="font-medium">Violations:</span> {blueData.violations.join('; ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderMeasurementErrorDetails = (meData) => {
    if (!meData) return null;
    
    return (
      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          <div>
            <span className="text-gray-500">Slope:</span>
            <span className="ml-1 font-mono">{formatNumber(meData.details?.slope, 2)}</span>
          </div>
          <div>
            <span className="text-gray-500">t-stat:</span>
            <span className="ml-1 font-mono">{formatNumber(meData.details?.tStatistic, 2)}</span>
          </div>
          <div>
            <span className="text-gray-500">R²:</span>
            <span className="ml-1 font-mono">{formatNumber(meData.details?.rSquared, 3)}</span>
          </div>
        </div>
        {meData.indicators && meData.indicators.length > 0 && (
          <div className="mt-1.5 p-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <p className="text-[10px] text-yellow-700 dark:text-yellow-300">
              <span className="font-medium">Indicators:</span> {meData.indicators.join('; ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  // ===== MAIN RENDER =====

  if (!diagnostics.isValid) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot Run Diagnostics</AlertTitle>
            <AlertDescription>
              {diagnostics.message || 'Please run a regression first with at least 2 data points.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const cardPadding = compact ? 'p-3' : 'p-6';

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className={compact ? 'pb-2 pt-3 px-3' : 'pb-4'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900`}>
                <Activity className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600 dark:text-purple-400`} />
              </div>
              <div>
                <CardTitle className={`${compact ? 'text-sm' : 'text-xl'}`}>Econometric Diagnostics</CardTitle>
                {!compact && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Check the reliability of your regression model
                  </p>
                )}
              </div>
            </div>
            <Badge className={`${compact ? 'text-[10px] px-2 py-0.5' : 'text-lg px-4 py-2'} ${
              diagnostics.overall?.status === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              diagnostics.overall?.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {diagnostics.overall?.status === 'good' ? '✅ Healthy' :
               diagnostics.overall?.status === 'warning' ? '⚠️ Caution' :
               '❌ Needs Attention'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className={cardPadding}>
          <div className="space-y-4">
            {/* Overall Assessment */}
            <Alert variant="default" className={`border-l-4 ${
              diagnostics.overall?.status === 'good' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
              diagnostics.overall?.status === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
              'border-red-500 bg-red-50 dark:bg-red-950/20'
            } ${compact ? 'py-1.5 px-2.5' : 'py-3 px-4'}`}>
              <div className="flex items-start gap-2">
                {diagnostics.overall?.status === 'good' && <CheckCircle className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-green-500 flex-shrink-0 mt-0.5`} />}
                {diagnostics.overall?.status === 'warning' && <AlertTriangle className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-yellow-500 flex-shrink-0 mt-0.5`} />}
                {diagnostics.overall?.status === 'needs_attention' && <XCircle className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-red-500 flex-shrink-0 mt-0.5`} />}
                <div className="min-w-0">
                  <AlertTitle className={`${compact ? 'text-sm' : 'text-lg'} break-words`}>
                    {diagnostics.overall?.message}
                  </AlertTitle>
                  <AlertDescription className={`${compact ? 'text-[10px]' : 'text-sm'} mt-0.5 break-words`}>
                    {diagnostics.overall?.recommendation}
                    {diagnostics.overall?.warnings > 0 && (
                      <span className="block mt-0.5">
                        {diagnostics.overall.warnings} issue{diagnostics.overall.warnings > 1 ? 's' : ''} detected
                      </span>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Section 1: Basic Diagnostics */}
            <div className="space-y-2">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('basic')}
              >
                <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-semibold flex items-center gap-2`}>
                  <FileText className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                  Basic Diagnostics
                  <Badge variant="outline" className={`${compact ? 'text-[8px] px-1.5' : 'text-xs'}`}>Always Visible</Badge>
                </h3>
                <Button variant="ghost" size="sm" className={compact ? 'h-6 w-6 p-0' : ''}>
                  {expandedSections.basic ? <Eye className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} /> : <EyeOff className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />}
                </Button>
              </div>
              
              {expandedSections.basic && (
                <div className="grid grid-cols-1 gap-2">
                  {diagnostics.sampleSize && renderDiagnosticCard(
                    'Sample Size',
                    `n = ${diagnostics.sampleSize.n}`,
                    diagnostics.sampleSize.status,
                    diagnostics.sampleSize.message,
                    diagnostics.sampleSize.recommendation
                  )}
                  
                  {diagnostics.rSquared && renderDiagnosticCard(
                    'R-Squared',
                    diagnostics.rSquared.value,
                    diagnostics.rSquared.status,
                    diagnostics.rSquared.message,
                    diagnostics.rSquared.recommendation
                  )}
                  
                  {diagnostics.slopeSignificance && renderDiagnosticCard(
                    'Slope Significance',
                    `t = ${diagnostics.slopeSignificance.tStatistic}`,
                    diagnostics.slopeSignificance.status,
                    diagnostics.slopeSignificance.message,
                    diagnostics.slopeSignificance.recommendation
                  )}
                </div>
              )}
            </div>

            {/* Section 2: Heteroskedasticity */}
            <div className="border-t pt-3">
              {renderSectionToggle('Heteroskedasticity Tests', 'heteroskedasticity', <TrendingUp className="h-3.5 w-3.5" />)}
              {expandedSections.heteroskedasticity && (
                <div className="mt-2">
                  {diagnostics.heteroskedasticity ? (
                    <div className="grid grid-cols-1 gap-2">
                      {renderDiagnosticCard(
                        'Breusch-Pagan Test',
                        `F = ${diagnostics.heteroskedasticity.fStatistic}`,
                        diagnostics.heteroskedasticity.status,
                        diagnostics.heteroskedasticity.message,
                        diagnostics.heteroskedasticity.recommendation
                      )}
                      <Card className={`${compact ? 'p-2.5' : 'p-4'}`}>
                        <p className={`${compact ? 'text-[10px]' : 'text-sm'} font-medium text-gray-500`}>Auxiliary R²</p>
                        <p className={`${compact ? 'text-base' : 'text-2xl'} font-bold`}>
                          {formatNumber(diagnostics.heteroskedasticity.rSquared, 3)}
                        </p>
                        <p className={`${compact ? 'text-[8px]' : 'text-xs'} text-gray-400 mt-0.5`}>
                          R² from regressing squared residuals on x
                        </p>
                      </Card>
                    </div>
                  ) : (
                    <Alert className="py-1.5 px-2.5">
                      <Info className="h-3.5 w-3.5" />
                      <AlertDescription className="text-xs">
                        Need at least 6 data points for heteroskedasticity test. 
                        Current sample: {dataPoints.length} observations.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Residual Analysis */}
            <div className="border-t pt-3">
              {renderSectionToggle('Residual Analysis', 'residuals', <Sigma className="h-3.5 w-3.5" />)}
              {expandedSections.residuals && diagnostics.residuals && (
                <div className="mt-2 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Card className={`${compact ? 'p-2' : 'p-3'}`}>
                      <p className={`${compact ? 'text-[8px]' : 'text-xs'} font-medium text-gray-500 truncate`}>Std. Error (Se)</p>
                      <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold truncate`}>
                        {formatNumberCompact(diagnostics.residuals.se, 2)}
                      </p>
                    </Card>
                    <Card className={`${compact ? 'p-2' : 'p-3'}`}>
                      <p className={`${compact ? 'text-[8px]' : 'text-xs'} font-medium text-gray-500 truncate`}>Max Residual</p>
                      <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold truncate`}>
                        {formatNumberCompact(diagnostics.residuals.maxResidual, 2)}
                      </p>
                    </Card>
                    <Card className={`${compact ? 'p-2' : 'p-3'}`}>
                      <p className={`${compact ? 'text-[8px]' : 'text-xs'} font-medium text-gray-500 truncate`}>SSE</p>
                      <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold truncate`}>
                        {formatNumberCompact(diagnostics.residuals.sse, 2)}
                      </p>
                    </Card>
                  </div>
                  
                  {/* Residuals vs Fitted Plot */}
                  <Card className={`${compact ? 'p-2' : 'p-4'}`}>
                    <p className={`${compact ? 'text-[10px]' : 'text-sm'} font-medium text-gray-500 mb-1`}>Residuals vs Fitted Values</p>
                    <div className={`${compact ? 'h-40' : 'h-64'} w-full`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={diagnostics.residuals.residualPlotData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis 
                            dataKey="fitted" 
                            label={{ value: 'Fitted Values', position: 'bottom', fontSize: compact ? 9 : 11 }}
                            tick={{ fontSize: compact ? 8 : 11 }}
                            domain={['auto', 'auto']}
                          />
                          <YAxis 
                            label={{ value: 'Residuals', angle: -90, position: 'left', fontSize: compact ? 9 : 11 }}
                            tick={{ fontSize: compact ? 8 : 11 }}
                          />
                          <Tooltip 
                            formatter={(value) => formatNumber(value, 2)}
                            labelFormatter={(label) => `Fitted: ${formatNumber(label, 2)}`}
                          />
                          <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
                          <Scatter 
                            name="Residuals" 
                            dataKey="residual" 
                            fill="#8884d8" 
                            shape="circle"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {/* Section 4: Outliers */}
            <div className="border-t pt-3">
              {renderSectionToggle('Outlier Detection', 'outliers', <BarChartIcon className="h-3.5 w-3.5" />)}
              {expandedSections.outliers && diagnostics.outliers && (
                <div className="mt-2 space-y-2">
                  {renderDiagnosticCard(
                    'Outlier Status',
                    diagnostics.outliers.count,
                    diagnostics.outliers.status,
                    diagnostics.outliers.message,
                    diagnostics.outliers.recommendation
                  )}
                  
                  {diagnostics.outliers.observations.length > 0 && (
                    <div className="border rounded-lg overflow-auto max-h-36">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="py-1 px-2">X</TableHead>
                            <TableHead className="py-1 px-2">Actual Y</TableHead>
                            <TableHead className="py-1 px-2">Predicted</TableHead>
                            <TableHead className="text-right py-1 px-2">Std. Residual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {diagnostics.outliers.observations.map((r, i) => (
                            <TableRow key={i} className="bg-red-50 dark:bg-red-900/20 text-xs">
                              <TableCell className="py-1 px-2">{r.x}</TableCell>
                              <TableCell className="py-1 px-2">{formatNumber(r.actual, 2)}</TableCell>
                              <TableCell className="py-1 px-2">{formatNumber(r.predicted, 2)}</TableCell>
                              <TableCell className="text-right py-1 px-2 font-bold text-red-600">
                                {formatNumber(r.standardized, 2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 5: Specification Tests */}
            <div className="border-t pt-3">
              {renderSectionToggle('Model Specification', 'specification', <Info className="h-3.5 w-3.5" />)}
              {expandedSections.specification && (
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {diagnostics.autocorrelation && renderDiagnosticCard(
                    'Autocorrelation (Durbin-Watson)',
                    diagnostics.autocorrelation.statistic,
                    diagnostics.autocorrelation.status,
                    diagnostics.autocorrelation.message,
                    diagnostics.autocorrelation.recommendation
                  )}
                  {diagnostics.normality && renderDiagnosticCard(
                    'Normality Check',
                    `Skew: ${formatNumber(diagnostics.normality.skewness, 2)} | Kurt: ${formatNumber(diagnostics.normality.kurtosis, 2)}`,
                    diagnostics.normality.status,
                    diagnostics.normality.message,
                    diagnostics.normality.recommendation
                  )}
                  {diagnostics.specification && renderDiagnosticCard(
                    'RESET Test (Simplified)',
                    `Corr: ${formatNumber(diagnostics.specification.correlation, 3)}`,
                    diagnostics.specification.status,
                    diagnostics.specification.message,
                    diagnostics.specification.recommendation
                  )}
                </div>
              )}
            </div>

            {/* ===== Section 6: BLUE Assessment ===== */}
            <div className="border-t pt-3">
              {renderSectionToggle(
                'BLUE Assessment', 
                'blueAssessment', 
                <Award className="h-3.5 w-3.5" />,
                <Badge variant="outline" className="text-[8px] px-1">Gauss-Markov</Badge>
              )}
              {expandedSections.blueAssessment && diagnostics.blueAssessment && (
                <div className="mt-2">
                  {renderDiagnosticCard(
                    'Gauss-Markov Theorem',
                    diagnostics.blueAssessment.summary,
                    diagnostics.blueAssessment.status,
                    diagnostics.blueAssessment.message,
                    diagnostics.blueAssessment.recommendation
                  )}
                  {renderBLUEDetails(diagnostics.blueAssessment)}
                </div>
              )}
            </div>

            {/* ===== Section 7: Measurement Error / Attenuation Bias ===== */}
            <div className="border-t pt-3">
              {renderSectionToggle(
                'Measurement Error / Attenuation Bias', 
                'measurementError', 
                <Ruler className="h-3.5 w-3.5" />,
                
              )}
              {expandedSections.measurementError && diagnostics.measurementError && (
                <div className="mt-2">
                  {renderDiagnosticCard(
                    'Attenuation Bias Check',
                    diagnostics.measurementError.summary || 'No detection',
                    diagnostics.measurementError.status,
                    diagnostics.measurementError.message,
                    diagnostics.measurementError.recommendation
                  )}
                  {renderMeasurementErrorDetails(diagnostics.measurementError)}
                  
                  {/* Educational Note about CEV */}
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-[10px]">
                    <p className="font-medium text-gray-700 dark:text-gray-300">📚 Classical Errors-in-Variables (CEV):</p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mt-0.5 space-y-0.5">
                      <li>Measurement error in X causes <strong>attenuation bias</strong> (slope → 0)</li>
                      <li>OLS estimators become <strong>biased and inconsistent</strong></li>
                      <li>Solution: Use <strong>Instrumental Variables (IV)</strong> with a second measurement</li>
                      <li>Measurement error in Y only increases variance (less precise)</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Export/Download Button */}
            <div className="border-t pt-3 flex justify-end">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <FileText className="h-3 w-3" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default EconometricsDiagnosis;