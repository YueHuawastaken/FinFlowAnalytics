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
  BarChart,
  Bar,
  Cell
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
  Download,
  FileText
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ===== Utility Functions =====

// Format numbers consistently
const formatNumber = (num, decimals = 4) => {
  if (num === null || num === undefined || !isFinite(num)) return "N/A";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// Get badge color based on value
const getDiagnosticBadge = (value, thresholds) => {
  if (value <= thresholds.good) {
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Good</Badge>;
  } else if (value <= thresholds.warning) {
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Warning</Badge>;
  } else {
    return <Badge variant="destructive">Needs Attention</Badge>;
  }
};

// ===== Main Component =====

const EconometricsDiagnosis = ({ 
  dataPoints = [], 
  regressionResults = null,
  modelType = 'simple', // 'simple' or 'multiple'
  independentVariables = [],
  dependentVariable = '',
  onRecommendationApply = null
}) => {
  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    heteroskedasticity: false,
    residuals: false,
    outliers: false,
    specification: false
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
      
      // Standardized residuals
      const standardizedResiduals = residuals.map(r => ({
        ...r,
        standardized: r.residual / se
      }));
      
      results.residuals = {
        raw: residuals,
        standardized: standardizedResiduals,
        se: se,
        // Outliers: |standardized residual| > 2
        outliers: standardizedResiduals.filter(r => Math.abs(r.standardized) > 2),
        // Max residual
        maxResidual: Math.max(...residuals.map(r => Math.abs(r.residual))),
        // Residual sum of squares
        sse: residuals.reduce((acc, r) => acc + r.residual ** 2, 0)
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

    // 4. HETEROSKEDASTICITY (Breusch-Pagan Test - Simple Version)
    if (regressionResults.residuals && dataPoints.length >= 8) {
      const residuals = regressionResults.residuals;
      const squaredResiduals = residuals.map(r => r.residual ** 2);
      const xValues = dataPoints.map(p => p.x);
      
      // Regress squared residuals on x
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
        
        // R² of auxiliary regression
        const sst = squaredResiduals.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
        const sse_aux = squaredResiduals.reduce((acc, y, i) => {
          const predicted = intercept + slope * xValues[i];
          return acc + (y - predicted) ** 2;
        }, 0);
        const rSquaredAux = sst === 0 ? 0 : 1 - (sse_aux / sst);
        
        // F-statistic: F = (R²/k) / ((1-R²)/(n-k-1))
        const k = 1;
        const fStat = (rSquaredAux / k) / ((1 - rSquaredAux) / (n - k - 1));
        
        // Approximate p-value using F distribution
        // For simplicity, use a rule of thumb: F > 4 suggests heteroskedasticity
        const isHeteroskedastic = fStat > 4 && rSquaredAux > 0.1;
        
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

    // 5. AUTOCORRELATION (Durbin-Watson - Simple Version)
    if (regressionResults.residuals && dataPoints.length >= 4) {
      const residuals = regressionResults.residuals.map(r => r.residual);
      let numerator_dw = 0;
      let denominator_dw = 0;
      
      for (let i = 1; i < residuals.length; i++) {
        numerator_dw += (residuals[i] - residuals[i-1]) ** 2;
      }
      denominator_dw = residuals.reduce((acc, r) => acc + r ** 2, 0);
      
      const durbinWatson = denominator_dw === 0 ? 2 : numerator_dw / denominator_dw;
      
      // Rule of thumb: DW near 2 = no autocorrelation, <1 or >3 = concerns
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

    // 6. NORMALITY (Simplified Shapiro-Wilk - quick check)
    if (regressionResults.residuals && dataPoints.length >= 4) {
      const residuals = regressionResults.residuals.map(r => r.residual).sort((a, b) => a - b);
      const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
      
      // Calculate skewness
      const skewness = residuals.reduce((acc, r) => acc + (r - mean) ** 3, 0) / 
                      (residuals.length * Math.pow(
                        residuals.reduce((acc, r) => acc + (r - mean) ** 2, 0) / residuals.length,
                        1.5
                      ));
      
      // Calculate kurtosis
      const kurtosis = residuals.reduce((acc, r) => acc + (r - mean) ** 4, 0) / 
                      Math.pow(residuals.reduce((acc, r) => acc + (r - mean) ** 2, 0) / residuals.length, 2);
      
      // Quick normality check: skewness near 0, kurtosis near 3
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

    // 7. MODEL SPECIFICATION (Ramsey RESET - Simplified)
    if (regressionResults.residuals && dataPoints.length >= 6) {
      // Check for nonlinear patterns by looking at residual vs fitted
      const fitted = dataPoints.map(p => regressionResults.intercept + regressionResults.slope * p.x);
      const residuals = regressionResults.residuals.map(r => r.residual);
      
      // Simple test: correlation between residual and fitted^2
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
      const n = dataPoints.length;
      const df = n - 2;
      const isSignificant = tStat > 2.0; // Rough rule of thumb
      
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

    // 10. OVERALL ASSESSMENT
    const warnings = [];
    if (results.sampleSize?.status === 'warning') warnings.push('sampleSize');
    if (results.outliers?.status === 'warning' || results.outliers?.status === 'needs_attention') warnings.push('outliers');
    if (results.heteroskedasticity?.status === 'needs_attention') warnings.push('heteroskedasticity');
    if (results.autocorrelation?.status === 'warning') warnings.push('autocorrelation');
    if (results.normality?.status === 'warning') warnings.push('normality');
    if (results.specification?.status === 'warning') warnings.push('specification');
    if (results.rSquared?.status === 'needs_attention') warnings.push('rSquared');
    
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
  }, [dataPoints, regressionResults]);

  // ===== RENDER FUNCTIONS =====

  const renderSectionToggle = (title, section, icon) => (
    <div 
      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{title}</span>
        {diagnostics[section]?.status === 'good' && <CheckCircle className="h-4 w-4 text-green-500" />}
        {diagnostics[section]?.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
        {diagnostics[section]?.status === 'needs_attention' && <XCircle className="h-4 w-4 text-red-500" />}
      </div>
      {expandedSections[section] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </div>
  );

  const renderDiagnosticCard = (title, value, status, message, recommendation) => {
    const statusColors = {
      good: 'border-green-200 bg-green-50 dark:bg-green-900/20',
      warning: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20',
      needs_attention: 'border-red-200 bg-red-50 dark:bg-red-900/20'
    };
    
    const statusIcons = {
      good: <CheckCircle className="h-5 w-5 text-green-500" />,
      warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      needs_attention: <XCircle className="h-5 w-5 text-red-500" />
    };

    return (
      <Card className={`p-4 border-l-4 ${statusColors[status] || statusColors.good}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{title}</span>
              {statusIcons[status]}
            </div>
            {value !== undefined && value !== null && (
              <p className="text-2xl font-bold mt-1">{typeof value === 'number' ? formatNumber(value) : value}</p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{message}</p>
            {recommendation && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                <span className="font-medium">💡 Recommendation: </span>
                {recommendation}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // ===== MAIN RENDER =====

  if (!diagnostics.isValid) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
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

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Econometric Diagnostics</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Check the reliability of your regression model
                </p>
              </div>
            </div>
            <Badge className={`text-lg px-4 py-2 ${
              diagnostics.overall?.status === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              diagnostics.overall?.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {diagnostics.overall?.status === 'good' ? '✅ Healthy' :
               diagnostics.overall?.status === 'warning' ? '⚠️ Proceed with Caution' :
               '❌ Needs Attention'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Assessment */}
          <Alert variant="default" className={`border-l-4 ${
            diagnostics.overall?.status === 'good' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
            diagnostics.overall?.status === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
            'border-red-500 bg-red-50 dark:bg-red-950/20'
          }`}>
            <div className="flex items-start gap-3">
              {diagnostics.overall?.status === 'good' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {diagnostics.overall?.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
              {diagnostics.overall?.status === 'needs_attention' && <XCircle className="h-5 w-5 text-red-500" />}
              <div>
                <AlertTitle className="text-lg">{diagnostics.overall?.message}</AlertTitle>
                <AlertDescription className="mt-1">
                  {diagnostics.overall?.recommendation}
                  {diagnostics.overall?.warnings > 0 && (
                    <span className="block mt-2 text-sm">
                      {diagnostics.overall.warnings} issue{diagnostics.overall.warnings > 1 ? 's' : ''} detected
                    </span>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>

          {/* Section 1: Basic Diagnostics (Always Visible) */}
          <div className="space-y-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('basic')}
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Basic Diagnostics
                <Badge variant="outline" className="ml-2">Always Visible</Badge>
              </h3>
              <Button variant="ghost" size="sm">
                {expandedSections.basic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
            
            {expandedSections.basic && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sample Size */}
                {diagnostics.sampleSize && renderDiagnosticCard(
                  'Sample Size',
                  `n = ${diagnostics.sampleSize.n}`,
                  diagnostics.sampleSize.status,
                  diagnostics.sampleSize.message,
                  diagnostics.sampleSize.recommendation
                )}
                
                {/* R² */}
                {diagnostics.rSquared && renderDiagnosticCard(
                  'R-Squared',
                  diagnostics.rSquared.value,
                  diagnostics.rSquared.status,
                  diagnostics.rSquared.message,
                  diagnostics.rSquared.recommendation
                )}
                
                {/* Slope Significance */}
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
          <div className="border-t pt-4">
            {renderSectionToggle('Heteroskedasticity Tests', 'heteroskedasticity', <TrendingUp className="h-4 w-4" />)}
            {expandedSections.heteroskedasticity && diagnostics.heteroskedasticity && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderDiagnosticCard(
                  'Breusch-Pagan Test',
                  `F = ${diagnostics.heteroskedasticity.fStatistic}`,
                  diagnostics.heteroskedasticity.status,
                  diagnostics.heteroskedasticity.message,
                  diagnostics.heteroskedasticity.recommendation
                )}
                <Card className="p-4">
                  <p className="text-sm font-medium text-gray-500">Auxiliary R²</p>
                  <p className="text-2xl font-bold">{formatNumber(diagnostics.heteroskedasticity.rSquared, 3)}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    R² from regressing squared residuals on x
                  </p>
                </Card>
              </div>
            )}
          </div>

          {/* Section 3: Residual Analysis */}
          <div className="border-t pt-4">
            {renderSectionToggle('Residual Analysis', 'residuals', <Sigma className="h-4 w-4" />)}
            {expandedSections.residuals && diagnostics.residuals && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <p className="text-sm font-medium text-gray-500">Standard Error (Se)</p>
                    <p className="text-2xl font-bold">{formatNumber(diagnostics.residuals.se, 2)}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm font-medium text-gray-500">Max Residual</p>
                    <p className="text-2xl font-bold">{formatNumber(diagnostics.residuals.maxResidual, 2)}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm font-medium text-gray-500">SSE</p>
                    <p className="text-2xl font-bold">{formatNumber(diagnostics.residuals.sse, 2)}</p>
                  </Card>
                </div>
                
                {/* Residuals vs Fitted Plot */}
                <Card className="p-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Residuals vs Fitted Values</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={dataPoints.map((p, i) => ({
                        fitted: regressionResults.intercept + regressionResults.slope * p.x,
                        residual: diagnostics.residuals.raw[i]?.residual || 0
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="fitted" label={{ value: 'Fitted Values', position: 'bottom' }} />
                        <YAxis label={{ value: 'Residuals', angle: -90, position: 'left' }} />
                        <Tooltip />
                        <Scatter dataKey="residual" fill="#8884d8" />
                        <Line 
                          data={[{ fitted: -100, residual: 0 }, { fitted: 10000, residual: 0 }]} 
                          dataKey="residual" 
                          stroke="red" 
                          dot={false} 
                          strokeDasharray="3 3"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Section 4: Outliers */}
          <div className="border-t pt-4">
            {renderSectionToggle('Outlier Detection', 'outliers', <BarChartIcon className="h-4 w-4" />)}
            {expandedSections.outliers && diagnostics.outliers && (
              <div className="mt-4 space-y-4">
                {renderDiagnosticCard(
                  'Outlier Status',
                  diagnostics.outliers.count,
                  diagnostics.outliers.status,
                  diagnostics.outliers.message,
                  diagnostics.outliers.recommendation
                )}
                
                {diagnostics.outliers.observations.length > 0 && (
                  <div className="border rounded-lg overflow-auto max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>X</TableHead>
                          <TableHead>Actual Y</TableHead>
                          <TableHead>Predicted Y</TableHead>
                          <TableHead className="text-right">Standardized Residual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diagnostics.outliers.observations.map((r, i) => (
                          <TableRow key={i} className="bg-red-50 dark:bg-red-900/20">
                            <TableCell>{r.x}</TableCell>
                            <TableCell>{formatNumber(r.actual, 2)}</TableCell>
                            <TableCell>{formatNumber(r.predicted, 2)}</TableCell>
                            <TableCell className="text-right font-bold text-red-600">
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
          <div className="border-t pt-4">
            {renderSectionToggle('Model Specification', 'specification', <Info className="h-4 w-4" />)}
            {expandedSections.specification && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Export/Download Button */}
          <div className="border-t pt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default EconometricsDiagnosis;