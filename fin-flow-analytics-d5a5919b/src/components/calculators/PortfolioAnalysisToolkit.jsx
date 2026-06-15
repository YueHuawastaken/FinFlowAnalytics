
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LineChart, Line } from 'recharts';
import { BarChart3, Plus, X, Download, FileText, Settings, Target, TrendingUp, Shield, Zap, Info, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

// Asset categories with default correlations and characteristics
const ASSET_CATEGORIES = {
  'growth_stock': {
    name: 'Growth Stock',
    defaultReturn: 0.12,
    defaultVolatility: 0.25,
    defaultBeta: 1.3,
    correlations: { growth_stock: 0.8, value_stock: 0.7, bond: 0.1, commodity: 0.3, reit: 0.6 }
  },
  'value_stock': {
    name: 'Value Stock', 
    defaultReturn: 0.10,
    defaultVolatility: 0.20,
    defaultBeta: 1.0,
    correlations: { growth_stock: 0.7, value_stock: 0.8, bond: 0.15, commodity: 0.25, reit: 0.5 }
  },
  'bond': {
    name: 'Bond',
    defaultReturn: 0.04,
    defaultVolatility: 0.05,
    defaultBeta: 0.1,
    correlations: { growth_stock: 0.1, value_stock: 0.15, bond: 0.9, commodity: -0.1, reit: 0.2 }
  },
  'commodity': {
    name: 'Commodity',
    defaultReturn: 0.08,
    defaultVolatility: 0.30,
    defaultBeta: 0.5,
    correlations: { growth_stock: 0.3, value_stock: 0.25, bond: -0.1, commodity: 0.7, reit: 0.4 }
  },
  'reit': {
    name: 'REIT',
    defaultReturn: 0.09,
    defaultVolatility: 0.22,
    defaultBeta: 0.8,
    correlations: { growth_stock: 0.6, value_stock: 0.5, bond: 0.2, commodity: 0.4, reit: 0.8 }
  }
};

const formatPercent = (value, decimals = 2) => {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
};

const formatNumber = (value, decimals = 2) => {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  return value.toFixed(decimals);
};

const formatAlpha = (value) => {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${(Math.abs(value) * 100).toFixed(2)}%`;
};

// Matrix operations for portfolio calculations
const matrixMultiply = (A, B) => {
  const result = Array(A.length).fill().map(() => Array(B[0].length).fill(0));
  return result.map((row, i) => {
    return row.map((val, j) => {
      return A[i].reduce((sum, elm, k) => sum + elm * B[k][j], 0);
    });
  });
};

const matrixTranspose = (matrix) => {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
};

// Portfolio optimization calculations
const calculatePortfolioMetrics = (weights, returns, correlationMatrix, volatilities, riskFreeRate) => {
  if (!weights || !returns || weights.length !== returns.length) return null;
  
  // Expected portfolio return
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0);
  
  // Portfolio variance calculation: w^T * Σ * w
  let portfolioVariance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      const correlation = correlationMatrix[i] && correlationMatrix[i][j] !== undefined 
        ? correlationMatrix[i][j] 
        : (i === j ? 1 : 0.3); // Default correlation if matrix is incomplete
      portfolioVariance += weights[i] * weights[j] * volatilities[i] * volatilities[j] * correlation;
    }
  }
  
  const portfolioVolatility = Math.sqrt(portfolioVariance);
  
  // Correct Sharpe Ratio and add Return-to-Risk Ratio
  const sharpeRatio = portfolioVolatility > 0 ? (portfolioReturn - riskFreeRate) / portfolioVolatility : 0;
  const returnToRiskRatio = portfolioVolatility > 0 ? portfolioReturn / portfolioVolatility : 0;
  
  return {
    expectedReturn: portfolioReturn,
    volatility: portfolioVolatility,
    sharpeRatio: sharpeRatio,
    returnToRiskRatio: returnToRiskRatio,
    variance: portfolioVariance
  };
};

// Generate efficient frontier points
const generateEfficientFrontier = (assets, correlationMatrix, riskFreeRate, numPoints = 50) => {
  if (assets.length < 2) return [];
  
  const returns = assets.map(a => a.expectedReturn / 100);
  const volatilities = assets.map(a => a.volatility / 100);
  
  // To perform a proper efficient frontier, one would use quadratic programming.
  // For demonstration, a simple grid search over returns is used.
  // This will not generate the true efficient frontier for N assets, but a subset of points.
  const frontierPoints = [];
  const minReturn = Math.min(...returns);
  const maxReturn = Math.max(...returns);

  // Consider a range beyond just the asset returns to find points for multi-asset portfolios
  const targetReturns = Array.from({ length: numPoints }).map((_, i) => 
    minReturn + (maxReturn - minReturn) * (i / (numPoints - 1))
  );

  // Simple approximation: For each target return, iterate to find a decent portfolio.
  // This is a placeholder for a true quadratic optimization solver.
  for (const targetR of targetReturns) {
    let bestVolatility = Infinity;
    let bestWeights = new Array(assets.length).fill(0);

    // Naive Monte Carlo search for demonstration purposes
    for (let i = 0; i < 2000; i++) { // More iterations for better approximation
        const randomWeights = new Array(assets.length).fill(0).map(() => Math.random());
        const sum = randomWeights.reduce((a, b) => a + b, 0);
        const normalizedWeights = randomWeights.map(w => w / sum);

        const metrics = calculatePortfolioMetrics(normalizedWeights, returns, correlationMatrix, volatilities, riskFreeRate);
        if (metrics) {
            // Check if this portfolio's return is close to targetR and has lower volatility
            if (Math.abs(metrics.expectedReturn - targetR) < 0.005 && metrics.volatility < bestVolatility) {
                bestVolatility = metrics.volatility;
                bestWeights = normalizedWeights;
            }
        }
    }
    
    if (bestVolatility !== Infinity) {
        const bestMetrics = calculatePortfolioMetrics(bestWeights, returns, correlationMatrix, volatilities, riskFreeRate);
        if (bestMetrics) {
            frontierPoints.push({
                volatility: bestMetrics.volatility,
                expectedReturn: bestMetrics.expectedReturn,
                sharpeRatio: bestMetrics.sharpeRatio,
                weights: bestWeights
            });
        }
    }
  }

  // Sort by volatility to draw the frontier properly
  return frontierPoints.sort((a, b) => a.volatility - b.volatility);
};


// Find maximum Sharpe ratio portfolio (simplified)
const findMaxSharpePortfolio = (assets, correlationMatrix, riskFreeRate) => {
  if (assets.length === 0) return null;
  
  const returns = assets.map(a => a.expectedReturn / 100);
  const volatilities = assets.map(a => a.volatility / 100);
  
  let bestWeights = new Array(assets.length).fill(0);
  let bestSharpe = -Infinity;
  
  // Simple grid search optimization (for demonstration, a real optimizer would use e.g. scipy.optimize)
  for (let iterations = 0; iterations < 10000; iterations++) { // Increased iterations for better search
    const randomWeights = new Array(assets.length).fill(0).map(() => Math.random());
    const sum = randomWeights.reduce((a, b) => a + b, 0);
    const normalizedWeights = randomWeights.map(w => w / sum);
    
    const metrics = calculatePortfolioMetrics(normalizedWeights, returns, correlationMatrix, volatilities, riskFreeRate);
    if (metrics && metrics.sharpeRatio > bestSharpe) {
      bestSharpe = metrics.sharpeRatio;
      bestWeights = normalizedWeights;
    }
  }
  
  const optimalMetrics = calculatePortfolioMetrics(bestWeights, returns, correlationMatrix, volatilities, riskFreeRate);
  return {
    weights: bestWeights,
    metrics: optimalMetrics
  };
};

// Custom tooltip for Efficient Frontier Chart
const EfficientFrontierTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-white border rounded-lg shadow-lg dark:bg-gray-800 text-sm">
        <p className="font-semibold">Portfolio Point</p>
        <p className="text-blue-600">{`Expected Return: ${formatPercent(data.expectedReturn)}`}</p>
        <p className="text-purple-600">{`Risk: ${formatPercent(data.volatility)}`}</p>
        <p className="text-green-600">{`Sharpe Ratio: ${formatNumber(data.sharpeRatio, 3)}`}</p>
      </div>
    );
  }
  return null;
};

export default function PortfolioAnalysisToolkit() {
  const [assets, setAssets] = useState([
    { id: 1, label: 'US Large Cap', expectedReturn: 10, volatility: 15, beta: 1.0, category: 'value_stock' },
    { id: 2, label: 'US Bonds', expectedReturn: 4, volatility: 5, beta: 0.1, category: 'bond' },
    { id: 3, label: 'International', expectedReturn: 12, volatility: 20, beta: 1.2, category: 'growth_stock' }
  ]);

  // Initialize weights equally or to a fixed sensible sum. With 3 assets, 0.6, 0.3, 0.1 sums to 1.
  const [currentWeights, setCurrentWeights] = useState([0.6, 0.3, 0.1]);
  const [originalWeights, setOriginalWeights] = useState([0.6, 0.3, 0.1]);
  const [constraints, setConstraints] = useState({}); // New state variable as per outline
  
  // Enhanced correlation system
  const [correlationMode, setCorrelationMode] = useState('category'); // 'category' or 'manual'
  const [manualCorrelationMatrix, setManualCorrelationMatrix] = useState([]);
  
  const [riskFreeRate, setRiskFreeRate] = useState(3);
  const [benchmark, setBenchmark] = useState({
    label: 'S&P 500',
    return: 10,
    volatility: 16
  });

  // Store the optimal portfolio to prevent recalculation on apply
  const [storedOptimalPortfolio, setStoredOptimalPortfolio] = useState(null);

  // Initialize/re-initialize manualCorrelationMatrix when assets change
  useEffect(() => {
    if (assets.length === 0) {
      setManualCorrelationMatrix([]);
      return;
    }

    const newMatrix = [];
    for (let i = 0; i < assets.length; i++) {
      newMatrix[i] = [];
      for (let j = 0; j < assets.length; j++) {
        if (i === j) {
          newMatrix[i][j] = 1.0;
        } else {
          const categoryI = assets[i].category;
          const categoryJ = assets[j].category;
          const defaultCorrelation = ASSET_CATEGORIES[categoryI]?.correlations?.[categoryJ] ?? 0.3;
          newMatrix[i][j] = defaultCorrelation;
        }
      }
    }
    setManualCorrelationMatrix(newMatrix);
  }, [assets]); // Dependency only on assets

  // Generate correlation matrix based on mode
  const effectiveCorrelationMatrix = useMemo(() => {
    if (assets.length === 0) return [];
    
    if (correlationMode === 'category') {
      // Category-based defaults (beginner mode)
      const matrix = [];
      for (let i = 0; i < assets.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < assets.length; j++) {
          if (i === j) {
            matrix[i][j] = 1.0; // Diagonal is always 1
          } else {
            const categoryI = assets[i].category;
            const categoryJ = assets[j].category;
            
            // Get default correlation from category definitions
            const defaultCorrelation = ASSET_CATEGORIES[categoryI]?.correlations?.[categoryJ] ?? 0.3;
            matrix[i][j] = defaultCorrelation;
          }
        }
      }
      return matrix;
    } else {
      // Manual mode - use user-defined matrix
      return manualCorrelationMatrix;
    }
  }, [assets, correlationMode, manualCorrelationMatrix]);

  // Update manual correlation with validation
  const updateManualCorrelation = useCallback((i, j, value) => {
    let numValue = parseFloat(value);
    if (isNaN(numValue)) return; // Allow empty string momentarily during input, but don't process NaN

    // Clamp value between -1 and 1
    numValue = Math.max(-1, Math.min(1, numValue));
    
    setManualCorrelationMatrix(prev => {
      const newMatrix = prev.map(row => [...row]);
      // Ensure diagonal remains 1 (though input should be disabled for diagonals)
      if (i === j) {
        newMatrix[i][j] = 1.0;
      } else {
        newMatrix[i][j] = numValue;
        newMatrix[j][i] = numValue; // Ensure symmetry
      }
      return newMatrix;
    });
  }, []);

  // Get correlation cell color for visual feedback
  const getCorrelationCellColor = useCallback((value) => {
    if (value > 0.5) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    if (value > 0) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    if (value < -0.3) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
  }, []);

  // Portfolio calculations
  const portfolioAnalysis = useMemo(() => {
    if (assets.length === 0) return null;
    
    const riskFreeRateDecimal = riskFreeRate / 100;
    
    // Current portfolio metrics
    const currentMetrics = calculatePortfolioMetrics(
      currentWeights, 
      assets.map(a => a.expectedReturn / 100),
      effectiveCorrelationMatrix,
      assets.map(a => a.volatility / 100),
      riskFreeRateDecimal
    );
    
    // Calculate optimal portfolio only if not stored or if assets/correlations changed
    let optimalPortfolio = storedOptimalPortfolio;
    if (!optimalPortfolio || optimalPortfolio.assetHash !== JSON.stringify(assets) + JSON.stringify(effectiveCorrelationMatrix)) {
      optimalPortfolio = findMaxSharpePortfolio(assets, effectiveCorrelationMatrix, riskFreeRateDecimal);
      if (optimalPortfolio) {
        optimalPortfolio.assetHash = JSON.stringify(assets) + JSON.stringify(effectiveCorrelationMatrix);
      }
      setStoredOptimalPortfolio(optimalPortfolio);
    }
    
    // Efficient frontier
    const efficientFrontier = generateEfficientFrontier(assets, effectiveCorrelationMatrix, riskFreeRateDecimal);
    
    // Benchmark metrics
    const benchmarkReturn = benchmark.return / 100;
    const benchmarkVolatility = benchmark.volatility / 100;
    const portfolioBeta = assets.reduce((sum, asset, index) => {
      const weight = currentWeights[index] || 0;
      return sum + weight * (asset.beta || 0);
    }, 0);
    const portfolioCapmReturn = riskFreeRateDecimal + portfolioBeta * (benchmarkReturn - riskFreeRateDecimal);
    const portfolioAlpha = currentMetrics.expectedReturn - portfolioCapmReturn;
    const portfolioTreynor = portfolioBeta !== 0 ? (currentMetrics.expectedReturn - riskFreeRateDecimal) / portfolioBeta : 0;
    const benchmarkTreynor = benchmarkReturn - riskFreeRateDecimal; // Benchmark treated as market proxy with beta=1
    const mSquared = riskFreeRateDecimal + (currentMetrics.sharpeRatio * benchmarkVolatility);
    const assetsWithAlpha = assets.map((asset, index) => {
      const assetReturn = asset.expectedReturn / 100;
      const assetCapm = riskFreeRateDecimal + (asset.beta || 0) * (benchmarkReturn - riskFreeRateDecimal);
      const alpha = assetReturn - assetCapm;
      return {
        ...asset,
        alpha,
        currentWeight: currentWeights[index] || 0
      };
    });
    const positiveAlphaAssets = assetsWithAlpha.filter(asset => asset.alpha > 0);
    const negativeAlphaAssets = assetsWithAlpha.filter(asset => asset.alpha < 0);
    const positiveAlphaWeight = positiveAlphaAssets.reduce((sum, asset) => sum + asset.currentWeight, 0);
    const maxBeta = Math.max(2.0, 1, portfolioBeta, ...assets.map(a => a.beta || 0));
    const smlYMax = Math.max(0.20, benchmarkReturn, currentMetrics.expectedReturn, ...assetsWithAlpha.map(a => a.expectedReturn / 100));
    const smlLine = [
      { beta: 0, expectedReturn: riskFreeRateDecimal },
      { beta: maxBeta, expectedReturn: riskFreeRateDecimal + maxBeta * (benchmarkReturn - riskFreeRateDecimal) }
    ];
    const smlScatter = [
      { name: benchmark.label, beta: 1, expectedReturn: benchmarkReturn, fill: '#2563eb', alpha: 0 },
      { name: 'Current Portfolio', beta: portfolioBeta, expectedReturn: currentMetrics.expectedReturn, fill: '#f59e0b', alpha: portfolioAlpha }
    ].concat(assetsWithAlpha.map(asset => ({
      name: asset.label,
      beta: asset.beta || 0,
      expectedReturn: asset.expectedReturn / 100,
      fill: asset.alpha >= 0 ? '#16a34a' : '#dc2626',
      alpha: asset.alpha
    })));
    const cmlLine = benchmarkVolatility > 0 ? [
      { volatility: 0, expectedReturn: riskFreeRateDecimal },
      { volatility: benchmarkVolatility, expectedReturn: benchmarkReturn }
    ] : [];
    const mSquaredDescription = `M² = Rf + Sharpe × benchmark volatility. Adjusted portfolio return at benchmark risk.`;

    const benchmarkMetrics = {
      expectedReturn: benchmarkReturn,
      volatility: benchmarkVolatility,
      sharpeRatio: benchmarkVolatility > 0 ? (benchmarkReturn - riskFreeRateDecimal) / benchmarkVolatility : 0,
      returnToRiskRatio: benchmarkVolatility > 0 ? benchmarkReturn / benchmarkVolatility : 0,
      treynorRatio: benchmarkTreynor,
      alpha: 0
    };
    
    return {
      currentMetrics,
      optimalPortfolio,
      efficientFrontier,
      benchmarkMetrics,
      portfolioBeta,
      portfolioCapmReturn,
      portfolioAlpha,
      portfolioTreynor,
      benchmarkTreynor,
      mSquared,
      mSquaredDescription,
      assetsWithAlpha,
      positiveAlphaAssets,
      negativeAlphaAssets,
      positiveAlphaWeight,
      smlLine,
      smlScatter,
      smlYMax,
      maxBeta,
      cmlLine
    };
  }, [assets, currentWeights, effectiveCorrelationMatrix, benchmark, riskFreeRate, storedOptimalPortfolio]);

  // Asset management functions
  const addAsset = useCallback(() => {
    const newId = Math.max(...assets.map(a => a.id), 0) + 1;
    setAssets(prev => [...prev, {
      id: newId,
      label: `New Asset ${newId}`,
      expectedReturn: 8,
      volatility: 15,
      beta: 1.0,
      category: 'growth_stock'
    }]);
    // When adding a new asset, add a small weight to it and re-normalize
    setCurrentWeights(prev => {
      const newWeights = [...prev, 0.01]; // Start with 1% for new asset
      const sum = newWeights.reduce((a, b) => a + b, 0);
      return newWeights.map(w => w / sum);
    });
  }, [assets]);

  const removeAsset = useCallback((id) => {
    if (assets.length <= 2) return; // Minimum 2 assets required for optimization
    const index = assets.findIndex(a => a.id === id);
    setAssets(prev => prev.filter(a => a.id !== id));
    setCurrentWeights(prev => {
      const newWeights = prev.filter((_, i) => i !== index);
      // Re-normalize after removal
      const sum = newWeights.reduce((a, b) => a + b, 0);
      return sum > 0 ? newWeights.map(w => w / sum) : new Array(assets.length - 1).fill(1 / (assets.length - 1));
    });
  }, [assets]);

  const updateAsset = useCallback((id, field, value) => {
    setAssets(prev => prev.map(asset => 
      asset.id === id ? { ...asset, [field]: value } : asset
    ));
  }, []);

  // Update weight with change tracking and immediate normalization
  const updateWeight = useCallback((index, value) => {
    const newWeights = [...currentWeights];
    newWeights[index] = value; // Value is already 0-1 decimal
    
    // Normalize weights to sum to 1
    const sum = newWeights.reduce((acc, w) => acc + w, 0);
    if (sum > 0) {
      const normalizedWeights = newWeights.map(w => w / sum);
      setCurrentWeights(normalizedWeights);
    }
  }, [currentWeights]);

  // Apply optimal weights
  const applyOptimalWeights = useCallback(() => {
    if (portfolioAnalysis?.optimalPortfolio?.weights) {
      setCurrentWeights([...portfolioAnalysis.optimalPortfolio.weights]);
    }
  }, [portfolioAnalysis]);

  // Reset to equal weights for current asset list
  const resetWeights = useCallback(() => {
    if (assets.length > 0) {
      const equalWeight = 1 / assets.length;
      setCurrentWeights(new Array(assets.length).fill(equalWeight));
    } else {
      setCurrentWeights([]);
    }
  }, [assets]);

  // Check if weight has changed for highlighting
  const hasWeightChanged = useCallback((index) => {
    const current = currentWeights[index] || 0;
    const optimal = portfolioAnalysis?.optimalPortfolio?.weights?.[index] || 0;
    return Math.abs(current - optimal) > 0.001; // Allow for small rounding differences
  }, [currentWeights, portfolioAnalysis]);

  // Get weight change direction for styling
  const getWeightChangeStyle = useCallback((index) => {
    const current = currentWeights[index] || 0;
    const optimal = portfolioAnalysis?.optimalPortfolio?.weights?.[index] || 0;
    const diff = current - optimal;
    
    if (Math.abs(diff) <= 0.001) return ''; // No significant change
    if (diff > 0) return 'bg-red-50 border-l-4 border-l-red-400 dark:bg-red-950/20'; // Higher than optimal
    return 'bg-green-50 border-l-4 border-l-green-400 dark:bg-green-950/20'; // Lower than optimal
  }, [currentWeights, portfolioAnalysis]);

  // Generate optimization insights with correct wording
  const getOptimizationInsights = useMemo(() => {
    if (!portfolioAnalysis?.currentMetrics || !portfolioAnalysis?.optimalPortfolio) {
      return "Optimization analysis not available. Please ensure you have at least 2 assets configured.";
    }

    const currentSharpe = portfolioAnalysis.currentMetrics.sharpeRatio;
    const optimalSharpe = portfolioAnalysis.optimalPortfolio.metrics.sharpeRatio;
    const currentReturn = portfolioAnalysis.currentMetrics.expectedReturn;
    const optimalReturn = portfolioAnalysis.optimalPortfolio.metrics.expectedReturn;
    const currentRisk = portfolioAnalysis.currentMetrics.volatility;
    const optimalRisk = portfolioAnalysis.optimalPortfolio.metrics.volatility;

    const sharpeImprovement = optimalSharpe - currentSharpe;
    const returnDiff = optimalReturn - currentReturn;
    const riskDiff = optimalRisk - currentRisk;

    if (Math.abs(sharpeImprovement) < 0.001 && Math.abs(returnDiff) < 0.001 && Math.abs(riskDiff) < 0.001) {
      return "Your current portfolio is already highly optimized. There's minimal potential for further improvement with the given assets and constraints.";
    }

    let returnText = "";
    let riskText = "";
    
    if (returnDiff > 0.001) {
      returnText = `${formatPercent(Math.abs(returnDiff))} higher expected returns`;
    } else if (returnDiff < -0.001) {
      returnText = `${formatPercent(Math.abs(returnDiff))} lower expected returns`;
    } else {
      returnText = "similar expected returns";
    }

    if (riskDiff > 0.001) {
      riskText = "higher risk";
    } else if (riskDiff < -0.001) {
      riskText = "lower risk";
    } else {
      riskText = "similar risk";
    }

    const sharpeText = sharpeImprovement > 0 ? 
      `improving your risk-adjusted returns (Sharpe Ratio) by ${formatNumber(sharpeImprovement, 3)}` :
      `with a slight decrease in Sharpe Ratio of ${formatNumber(Math.abs(sharpeImprovement), 3)}`;

    return `The optimized portfolio offers ${returnText} with ${riskText}, ${sharpeText}.`;
  }, [portfolioAnalysis]);

  const exportToCsv = useCallback(() => {
    const headers = ['Asset', 'Current Weight', 'Optimal Weight', 'Expected Return', 'Volatility', 'Beta', 'Category'];
    const summaryHeaders = ['', 'Current Portfolio', 'Optimal Portfolio', 'Benchmark'];
    const summaryData = [
        ['Expected Return', portfolioAnalysis?.currentMetrics ? formatPercent(portfolioAnalysis.currentMetrics.expectedReturn) : 'N/A', portfolioAnalysis?.optimalPortfolio ? formatPercent(portfolioAnalysis.optimalPortfolio.metrics.expectedReturn) : 'N/A', portfolioAnalysis?.benchmarkMetrics ? formatPercent(portfolioAnalysis.benchmarkMetrics.expectedReturn) : 'N/A'],
        ['Risk (Volatility)', portfolioAnalysis?.currentMetrics ? formatPercent(portfolioAnalysis.currentMetrics.volatility) : 'N/A', portfolioAnalysis?.optimalPortfolio ? formatPercent(portfolioAnalysis.optimalPortfolio.metrics.volatility) : 'N/A', portfolioAnalysis?.benchmarkMetrics ? formatPercent(portfolioAnalysis.benchmarkMetrics.volatility) : 'N/A'],
        ['Sharpe Ratio', portfolioAnalysis?.currentMetrics ? formatNumber(portfolioAnalysis.currentMetrics.sharpeRatio, 3) : 'N/A', portfolioAnalysis?.optimalPortfolio ? formatNumber(portfolioAnalysis.optimalPortfolio.metrics.sharpeRatio, 3) : 'N/A', portfolioAnalysis?.benchmarkMetrics ? formatNumber(portfolioAnalysis.benchmarkMetrics.sharpeRatio, 3) : 'N/A'],
        ['Return-to-Risk Ratio', portfolioAnalysis?.currentMetrics ? formatNumber(portfolioAnalysis.currentMetrics.returnToRiskRatio, 3) : 'N/A', portfolioAnalysis?.optimalPortfolio ? formatNumber(portfolioAnalysis.optimalPortfolio.metrics.returnToRiskRatio, 3) : 'N/A', portfolioAnalysis?.benchmarkMetrics ? formatNumber(portfolioAnalysis.benchmarkMetrics.returnToRiskRatio, 3) : 'N/A']
    ];
    
    const assetRows = assets.map((asset, i) => [
      asset.label,
      formatPercent(currentWeights[i] || 0), // Use || 0 for safety
      portfolioAnalysis?.optimalPortfolio ? formatPercent(portfolioAnalysis.optimalPortfolio.weights[i] || 0) : 'N/A',
      formatPercent(asset.expectedReturn / 100),
      formatPercent(asset.volatility / 100),
      asset.beta.toString(),
      ASSET_CATEGORIES[asset.category]?.name || asset.category
    ]);

    const csvContent = [
        'Portfolio Summary',
        summaryHeaders.join(','),
        ...summaryData.map(row => row.join(',')),
        '',
        'Asset Details',
        headers.join(','),
        ...assetRows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [assets, currentWeights, portfolioAnalysis]);

  return (
    <TooltipProvider>
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">
              <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl">Portfolio Analysis Toolkit</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Multi-asset portfolio optimization and risk analysis
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportToCsv} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4"/> Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="setup" className="w-full">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <TabsList className="grid w-full grid-cols-5 min-w-[500px] sm:min-w-0">
              <TabsTrigger value="setup" className="text-xs sm:text-sm px-2 sm:px-4">Portfolio Setup</TabsTrigger>
              <TabsTrigger value="correlations" className="text-xs sm:text-sm px-2 sm:px-4">Correlations</TabsTrigger>
              <TabsTrigger value="constraints" className="text-xs sm:text-sm px-2 sm:px-4">Constraints</TabsTrigger>
              <TabsTrigger value="optimization" className="text-xs sm:text-sm px-2 sm:px-4">Optimization</TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs sm:text-sm px-2 sm:px-4">Comparison</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="setup" className="space-y-6 mt-6">
            {/* Asset Management */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="text-base sm:text-lg">Asset Portfolio</CardTitle>
                  <Button onClick={addAsset} className="gap-2 self-start sm:self-auto">
                    <Plus className="h-4 w-4" />
                    Add Asset
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Expected Return (%)</TableHead>
                        <TableHead>Volatility (%)</TableHead>
                        <TableHead>Beta</TableHead>
                        <TableHead>Alpha</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Current Weight (%)</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((asset, index) => (
                        <TableRow key={asset.id} className={getWeightChangeStyle(index)}>
                          <TableCell>
                            <Input
                              value={asset.label}
                              onChange={(e) => updateAsset(asset.id, 'label', e.target.value)}
                              placeholder="Asset name"
                              className="min-w-[100px]"
                            />
                          </TableCell>
                          <TableCell>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={asset.expectedReturn}
                                  onChange={(e) => updateAsset(asset.id, 'expectedReturn', Number(e.target.value) || 0)}
                                  className="font-mono w-20"
                                />
                              </TooltipTrigger>
                              <TooltipContent>Annual expected return based on your analysis</TooltipContent>
                            </UITooltip>
                          </TableCell>
                          <TableCell>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={asset.volatility}
                                  onChange={(e) => updateAsset(asset.id, 'volatility', Number(e.target.value) || 0)}
                                  className="font-mono w-20"
                                />
                              </TooltipTrigger>
                              <TooltipContent>Annualized standard deviation of returns (risk measure)</TooltipContent>
                            </UITooltip>
                          </TableCell>
                          <TableCell>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={asset.beta}
                                  onChange={(e) => updateAsset(asset.id, 'beta', Number(e.target.value) || 0)}
                                  className="font-mono w-20"
                                />
                              </TooltipTrigger>
                              <TooltipContent>Sensitivity to market movements (1.0 = market average)</TooltipContent>
                            </UITooltip>
                          </TableCell>
                          <TableCell className={`font-mono w-20 text-right ${portfolioAnalysis?.assetsWithAlpha?.find(a => a.id === asset.id)?.alpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {portfolioAnalysis?.assetsWithAlpha?.find(a => a.id === asset.id)
                              ? formatAlpha(portfolioAnalysis.assetsWithAlpha.find(a => a.id === asset.id).alpha)
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={asset.category} 
                              onValueChange={(value) => updateAsset(asset.id, 'category', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ASSET_CATEGORIES).map(([key, cat]) => (
                                  <SelectItem key={key} value={key}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1" // for percentage input e.g. 12.3%
                              min="0"
                              max="100"
                              value={(currentWeights[index] * 100).toFixed(1)}
                              onChange={(e) => updateWeight(index, (Number(e.target.value) || 0) / 100)}
                              className="font-mono w-20"
                            />
                          </TableCell>
                          <TableCell>
                            {assets.length > 2 && ( 
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAsset(asset.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {assets.map((asset, index) => (
                    <Card key={asset.id} className={`p-4 ${getWeightChangeStyle(index)}`}>
                      <div className="flex justify-between items-start mb-3">
                        <Input
                          value={asset.label}
                          onChange={(e) => updateAsset(asset.id, 'label', e.target.value)}
                          placeholder="Asset name"
                          className="font-semibold flex-1 mr-2"
                        />
                        {assets.length > 2 && ( 
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAsset(asset.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Expected Return (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={asset.expectedReturn}
                            onChange={(e) => updateAsset(asset.id, 'expectedReturn', Number(e.target.value) || 0)}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Volatility (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={asset.volatility}
                            onChange={(e) => updateAsset(asset.id, 'volatility', Number(e.target.value) || 0)}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Beta</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={asset.beta}
                            onChange={(e) => updateAsset(asset.id, 'beta', Number(e.target.value) || 0)}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Current Weight (%)</Label>
                          <Input
                            type="number"
                            step="0.1" // for percentage input e.g. 12.3%
                            min="0"
                            max="100"
                            value={(currentWeights[index] * 100).toFixed(1)}
                            onChange={(e) => updateWeight(index, (Number(e.target.value) || 0) / 100)}
                            className="font-mono"
                          />
                        </div>
                        </div>
                        <div className="space-y-2 col-span-2 mt-3">
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={asset.category}
                            onValueChange={(value) => updateAsset(asset.id, 'category', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ASSET_CATEGORIES).map(([key, cat]) => (
                                <SelectItem key={key} value={key}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                    </Card>
                  ))}
                </div>

                {/* Weight Controls */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  <Button onClick={applyOptimalWeights} variant="default" size="sm" className="gap-2">
                    <Target className="h-4 w-4" />
                    Apply Optimal Weights
                  </Button>
                  <Button onClick={resetWeights} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reset Weights
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-100 border-l-2 border-l-green-400 rounded-sm"></div>
                      <span>Below optimal</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-100 border-l-2 border-l-red-400 rounded-sm"></div>
                      <span>Above optimal</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benchmark Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Benchmark Comparison</CardTitle>
                <p className="text-sm text-gray-500">Define a benchmark to compare your portfolio performance against</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Benchmark Name</Label>
                    <Input
                      value={benchmark.label}
                      onChange={(e) => setBenchmark(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g., S&P 500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Return (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={benchmark.return}
                      onChange={(e) => setBenchmark(prev => ({ ...prev, return: Number(e.target.value) || 0 }))}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Volatility (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={benchmark.volatility}
                      onChange={(e) => setBenchmark(prev => ({ ...prev, volatility: Number(e.target.value) || 0 }))}
                      className="font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Global Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Global Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Risk-Free Rate (%)</Label>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Input
                          type="number"
                          step="0.01"
                          value={riskFreeRate}
                          onChange={(e) => setRiskFreeRate(Number(e.target.value) || 0)}
                          className="font-mono"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Used to calculate Sharpe ratios (e.g., current Treasury bill rate)</TooltipContent>
                    </UITooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="correlations" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Asset Correlation Matrix</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Define how assets move together (-1 = opposite, +1 = same direction)
                    </p>
                  </div>
                  
                  {/* Correlation Mode Toggle */}
                  <div className="flex items-center gap-3">
                    <Label htmlFor="correlation-mode" className="text-sm font-medium">
                      Correlation Mode:
                    </Label>
                    <Select value={correlationMode} onValueChange={setCorrelationMode}>
                      <SelectTrigger id="correlation-mode" className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="category">Category Defaults</SelectItem>
                        <SelectItem value="manual">Manual Entry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Mode Description */}
                <div className="mb-4">
                  {correlationMode === 'category' ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Category Defaults Mode:</strong> Correlations are automatically calculated based on asset categories using financial best practices. 
                        Switch to "Manual Entry" to customize individual correlations.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Manual Entry Mode:</strong> Edit individual correlation values. Values must be between -1.00 and +1.00. 
                        The matrix automatically maintains symmetry and diagonal values of 1.00.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Correlation Matrix */}
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32 sticky left-0 bg-white dark:bg-gray-950 z-10">Asset</TableHead>
                          {assets.map((asset) => (
                            <TableHead key={asset.id} className="text-center min-w-24">
                              <div className="truncate max-w-20" title={asset.label}>
                                {asset.label}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assets.map((rowAsset, i) => (
                          <TableRow key={rowAsset.id}>
                            <TableCell className="font-medium sticky left-0 bg-white dark:bg-gray-950 z-10">
                              <div className="truncate max-w-28" title={rowAsset.label}>
                                {rowAsset.label}
                              </div>
                            </TableCell>
                            {assets.map((colAsset, j) => {
                              const correlationValue = effectiveCorrelationMatrix[i]?.[j] || 0;
                              const isDiagonal = i === j;
                              const isDisabled = correlationMode === 'category' || isDiagonal;
                              
                              return (
                                <TableCell key={colAsset.id} className="p-1">
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      {correlationMode === 'manual' && !isDiagonal ? (
                                        <Input
                                          type="number"
                                          min="-1"
                                          max="1"
                                          step="0.01"
                                          value={correlationValue.toFixed(2)}
                                          onChange={(e) => updateManualCorrelation(i, j, e.target.value)}
                                          className={`w-20 h-8 text-xs text-center font-mono ${getCorrelationCellColor(correlationValue)}`}
                                          aria-label={`Correlation between ${rowAsset.label} and ${colAsset.label}`}
                                        />
                                      ) : (
                                        <div className={`
                                          w-20 h-8 flex items-center justify-center text-xs font-mono rounded border
                                          ${isDiagonal ? 'bg-gray-100 dark:bg-gray-800 font-bold' : getCorrelationCellColor(correlationValue)}
                                          ${isDisabled ? 'opacity-75 cursor-not-allowed' : 'cursor-default'}
                                        `}>
                                          {correlationValue.toFixed(2)}
                                        </div>
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {isDiagonal ? 
                                        'Diagonal values are always 1.00 (perfect self-correlation)' :
                                        correlationMode === 'category' ? 
                                          'Switch to Manual Entry to customize this value' :
                                          `Correlation between ${rowAsset.label} and ${colAsset.label}`
                                      }
                                    </TooltipContent>
                                  </UITooltip>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Correlation Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 dark:bg-green-900/20 rounded"></div>
                    <span>Strong Positive (&gt;0.5)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/20 rounded"></div>
                    <span>Weak Positive (0.0 to 0.5)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/20 rounded"></div>
                    <span>Weak Negative (-0.3 to 0.0)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 dark:bg-red-900/20 rounded"></div>
                    <span>Strong Negative (&lt;-0.3)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="constraints" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Portfolio Constraints</CardTitle>
                <p className="text-sm text-gray-500">Set minimum and maximum allocation limits for risk management</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Constraint functionality is for future development. These inputs do not currently affect optimization.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Individual Asset Limits</h4>
                    {assets.map((asset, index) => (
                      <div key={asset.id} className="space-y-2">
                        <Label className="text-sm">{asset.label}</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Min %</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="0"
                              className="font-mono text-sm"
                              disabled
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Max %</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="100"
                              className="font-mono text-sm"
                              disabled
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Category Limits</h4>
                    {Object.entries(ASSET_CATEGORIES).map(([key, category]) => {
                      const hasAssets = assets.some(a => a.category === key);
                      if (!hasAssets) return null;
                      
                      return (
                        <div key={key} className="space-y-2">
                          <Label className="text-sm">{category.name}</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-500">Min %</Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                placeholder="0"
                                className="font-mono text-sm"
                                disabled
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-500">Max %</Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                placeholder="100"
                                className="font-mono text-sm"
                                disabled
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6 mt-6">
            {portfolioAnalysis && (
              <>
                {/* Optimization Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Current Portfolio</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Expected Return:</span>
                        <span className="font-semibold">{portfolioAnalysis.currentMetrics ? formatPercent(portfolioAnalysis.currentMetrics.expectedReturn) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk (Volatility):</span>
                        <span className="font-semibold">{portfolioAnalysis.currentMetrics ? formatPercent(portfolioAnalysis.currentMetrics.volatility) : 'N/A'}</span>
                      </div>
                       <div className="flex justify-between items-center">
                        <UITooltip>
                          <TooltipTrigger className="flex items-center gap-1 cursor-help">
                            <Info className="h-3 w-3 text-gray-400" />
                            <span>Sharpe Ratio:</span>
                          </TooltipTrigger>
                          <TooltipContent>Excess return per unit of risk, adjusted for the risk-free rate.</TooltipContent>
                        </UITooltip>
                        <span className="font-semibold">{portfolioAnalysis.currentMetrics ? formatNumber(portfolioAnalysis.currentMetrics.sharpeRatio, 3) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <UITooltip>
                          <TooltipTrigger className="flex items-center gap-1 cursor-help">
                            <Info className="h-3 w-3 text-gray-400" />
                            <span>Return-to-Risk Ratio:</span>
                          </TooltipTrigger>
                          <TooltipContent>Total return divided by volatility, without risk-free adjustment.</TooltipContent>
                        </UITooltip>
                        <span className="font-semibold">{portfolioAnalysis.currentMetrics ? formatNumber(portfolioAnalysis.currentMetrics.returnToRiskRatio, 3) : 'N/A'}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Optimal Portfolio</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Expected Return:</span>
                        <span className="font-semibold text-green-600">{portfolioAnalysis.optimalPortfolio ? formatPercent(portfolioAnalysis.optimalPortfolio.metrics.expectedReturn) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk (Volatility):</span>
                        <span className="font-semibold text-green-600">{portfolioAnalysis.optimalPortfolio ? formatPercent(portfolioAnalysis.optimalPortfolio.metrics.volatility) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <UITooltip>
                          <TooltipTrigger className="flex items-center gap-1 cursor-help">
                            <Info className="h-3 w-3 text-gray-400" />
                            <span>Sharpe Ratio:</span>
                          </TooltipTrigger>
                          <TooltipContent>Excess return per unit of risk, adjusted for the risk-free rate.</TooltipContent>
                        </UITooltip>
                        <span className="font-semibold text-green-600">{portfolioAnalysis.optimalPortfolio ? formatNumber(portfolioAnalysis.optimalPortfolio.metrics.sharpeRatio, 3) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <UITooltip>
                          <TooltipTrigger className="flex items-center gap-1 cursor-help">
                            <Info className="h-3 w-3 text-gray-400" />
                            <span>Return-to-Risk Ratio:</span>
                          </TooltipTrigger>
                          <TooltipContent>Total return divided by volatility, without risk-free adjustment.</TooltipContent>
                        </UITooltip>
                        <span className="font-semibold text-green-600">{portfolioAnalysis.optimalPortfolio ? formatNumber(portfolioAnalysis.optimalPortfolio.metrics.returnToRiskRatio, 3) : 'N/A'}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Optimization Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Optimization Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        {getOptimizationInsights}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Efficient Frontier Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Efficient Frontier</CardTitle>
                    <p className="text-sm text-gray-500">Risk-return profiles for all efficient portfolio combinations</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis 
                            type="number"
                            dataKey="volatility"
                            domain={['dataMin - 0.01', 'dataMax + 0.01']}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => formatPercent(value)}
                            label={{ value: 'Risk (Volatility)', position: 'insideBottom', offset: -5, style: { fontSize: '12px' } }}
                          />
                          <YAxis 
                            type="number"
                            dataKey="expectedReturn"
                            domain={['dataMin - 0.01', 'dataMax + 0.01']}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => formatPercent(value)}
                            label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                          />
                          <Tooltip content={<EfficientFrontierTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          
                          {/* Efficient Frontier Line */}
                          <Scatter 
                            name="Efficient Frontier" 
                            data={portfolioAnalysis.efficientFrontier} 
                            fill="#8884d8" 
                            fillOpacity={0.6}
                            shape="circle" // Explicitly defining shape
                            r={3}
                          />
                          
                          {/* Current Portfolio */}
                          {portfolioAnalysis.currentMetrics && (
                            <Scatter
                              name="Current Portfolio"
                              data={[{
                                volatility: portfolioAnalysis.currentMetrics.volatility,
                                expectedReturn: portfolioAnalysis.currentMetrics.expectedReturn,
                                sharpeRatio: portfolioAnalysis.currentMetrics.sharpeRatio
                              }]}
                              fill="#f59e0b" // Amber
                              shape="circle"
                              r={8}
                            />
                          )}
                          
                          {/* Optimal Portfolio */}
                          {portfolioAnalysis.optimalPortfolio && (
                            <Scatter
                              name="Optimal Portfolio"
                              data={[{
                                volatility: portfolioAnalysis.optimalPortfolio.metrics.volatility,
                                expectedReturn: portfolioAnalysis.optimalPortfolio.metrics.expectedReturn,
                                sharpeRatio: portfolioAnalysis.optimalPortfolio.metrics.sharpeRatio
                              }]}
                              fill="#10b981" // Green
                              shape="star"
                              r={8}
                            />
                          )}
                          
                          {/* Benchmark */}
                          {portfolioAnalysis.benchmarkMetrics && (
                            <Scatter
                              name={benchmark.label}
                              data={[{
                                volatility: portfolioAnalysis.benchmarkMetrics.volatility,
                                expectedReturn: portfolioAnalysis.benchmarkMetrics.expectedReturn,
                                sharpeRatio: portfolioAnalysis.benchmarkMetrics.sharpeRatio
                              }]}
                              fill="#dc2626" // Red
                              shape="diamond"
                              r={8}
                            />
                          )}
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Allocation Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Allocation Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset</TableHead>
                            <TableHead className="text-right">Current Weight</TableHead>
                            <TableHead className="text-right">Optimal Weight</TableHead>
                            <TableHead className="text-right">Difference</TableHead>
                            <TableHead className="text-right">Expected Return</TableHead>
                            <TableHead className="text-right">Risk</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assets.map((asset, index) => {
                            const currentWeight = currentWeights[index] || 0;
                            const optimalWeight = portfolioAnalysis.optimalPortfolio?.weights[index] || 0;
                            const difference = optimalWeight - currentWeight;
                            
                            return (
                              <TableRow key={asset.id}>
                                <TableCell className="font-medium">{asset.label}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatPercent(currentWeight)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold text-green-600">
                                  {formatPercent(optimalWeight)}
                                </TableCell>
                                <TableCell className={`text-right font-mono ${
                                  difference > 0.001 ? 'text-green-600' : 
                                  difference < -0.001 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {difference > 0 ? '+' : ''}{formatPercent(difference)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatPercent(asset.expectedReturn / 100)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatPercent(asset.volatility / 100)}
                                </TableCell>
                                <TableCell className={`text-right font-mono ${portfolioAnalysis.assetsWithAlpha[index]?.alpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatAlpha(portfolioAnalysis.assetsWithAlpha[index]?.alpha)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden space-y-3">
                      {assets.map((asset, index) => {
                        const currentWeight = currentWeights[index] || 0;
                        const optimalWeight = portfolioAnalysis.optimalPortfolio?.weights[index] || 0;
                        const difference = optimalWeight - currentWeight;
                        
                        return (
                          <Card key={asset.id} className="p-3">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-sm">{asset.label}</h4>
                              <Badge 
                                variant={
                                  difference > 0.001 ? 'default' : 
                                  difference < -0.001 ? 'destructive' : 'secondary'
                                }
                              >
                                {difference > 0 ? '+' : ''}{formatPercent(difference)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-gray-500">Current Weight</p>
                                <p className="font-mono font-semibold">{formatPercent(currentWeight)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Optimal Weight</p>
                                <p className="font-mono font-semibold text-green-600">{formatPercent(optimalWeight)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Expected Return</p>
                                <p className="font-mono">{formatPercent(asset.expectedReturn / 100)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Risk</p>
                                <p className="font-mono">{formatPercent(asset.volatility / 100)}</p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6 mt-6">
            {portfolioAnalysis && (
              <>
                {/* Performance Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Performance Summary</CardTitle>
                    <p className="text-sm text-gray-500">Compare your current portfolio against the optimized version and benchmark</p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Portfolio</TableHead>
                            <TableHead className="text-right">Expected Return</TableHead>
                            <TableHead className="text-right">Risk (Volatility)</TableHead>
                            <TableHead className="text-right">Sharpe Ratio</TableHead>
                            <TableHead className="text-right">Return-to-Risk</TableHead>
                            <TableHead className="text-right">Alpha</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Current Portfolio</TableCell>
                            <TableCell className="text-right font-mono">
                              {portfolioAnalysis.currentMetrics ? formatPercent(portfolioAnalysis.currentMetrics.expectedReturn) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {portfolioAnalysis.currentMetrics ? formatPercent(portfolioAnalysis.currentMetrics.volatility) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {portfolioAnalysis.currentMetrics ? formatNumber(portfolioAnalysis.currentMetrics.sharpeRatio, 3) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {portfolioAnalysis.currentMetrics ? formatNumber(portfolioAnalysis.currentMetrics.returnToRiskRatio, 3) : 'N/A'}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${portfolioAnalysis.portfolioAlpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {portfolioAnalysis.portfolioAlpha !== undefined ? formatAlpha(portfolioAnalysis.portfolioAlpha) : 'N/A'}
                            </TableCell>
                          </TableRow>
                          
                          <TableRow className="bg-green-50 dark:bg-green-950/20">
                            <TableCell className="font-medium">Optimized Portfolio</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-green-600">
                              {portfolioAnalysis.optimalPortfolio ? formatPercent(portfolioAnalysis.optimalPortfolio.metrics.expectedReturn) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {portfolioAnalysis.optimalPortfolio ? formatPercent(portfolioAnalysis.optimalPortfolio.metrics.volatility) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-green-600">
                              {portfolioAnalysis.optimalPortfolio ? formatNumber(portfolioAnalysis.optimalPortfolio.metrics.sharpeRatio, 3) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {portfolioAnalysis.optimalPortfolio ? formatNumber(portfolioAnalysis.optimalPortfolio.metrics.returnToRiskRatio, 3) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              N/A
                            </TableCell>
                          </TableRow>
                          
                          <TableRow>
                            <TableCell className="font-medium">{benchmark.label}</TableCell>
                            <TableCell className="text-right font-mono">
                              {portfolioAnalysis.benchmarkMetrics ? formatPercent(portfolioAnalysis.benchmarkMetrics.expectedReturn) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {portfolioAnalysis.benchmarkMetrics ? formatPercent(portfolioAnalysis.benchmarkMetrics.volatility) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {portfolioAnalysis.benchmarkMetrics ? formatNumber(portfolioAnalysis.benchmarkMetrics.sharpeRatio, 3) : 'N/A'}
                            </TableCell>
                             <TableCell className="text-right font-mono">
                              {portfolioAnalysis.benchmarkMetrics ? formatNumber(portfolioAnalysis.benchmarkMetrics.returnToRiskRatio, 3) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-blue-600">
                              {portfolioAnalysis.benchmarkMetrics ? formatAlpha(portfolioAnalysis.benchmarkMetrics.alpha) : '0.00%'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Attribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Performance Attribution (Chapter 8)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800">
                        <p className="text-sm text-gray-600">Portfolio Alpha</p>
                        <p className={`text-xl font-semibold ${portfolioAnalysis.portfolioAlpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatAlpha(portfolioAnalysis.portfolioAlpha)}
                        </p>
                        <p className="text-xs text-gray-500">Actual return minus CAPM benchmark return</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800">
                        <p className="text-sm text-gray-600">Positive Alpha Assets</p>
                        <p className="text-xl font-semibold text-green-600">{portfolioAnalysis.positiveAlphaAssets.length}</p>
                        <p className="text-xs text-gray-500">of {assets.length} assets</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800">
                        <p className="text-sm text-gray-600">Positive Alpha Weight</p>
                        <p className="text-xl font-semibold text-green-600">{formatPercent(portfolioAnalysis.positiveAlphaWeight)}</p>
                        <p className="text-xs text-gray-500">Portfolio weight in positive-alpha assets</p>
                      </div>
                    </div>
                    <div className="mt-4 p-4 rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300">
                      <p className="font-semibold mb-2">Interpretation</p>
                      <p>{portfolioAnalysis.portfolioAlpha >= 0 ? 'This portfolio has skill in stock selection and has outperformed its benchmark on a risk-adjusted basis.' : 'This portfolio has underperformed its benchmark on a risk-adjusted basis, suggesting selection or timing may need review.'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Risk-Adjusted Performance</CardTitle>
                    <p className="text-sm text-gray-500">Treynor and M² measures compared with benchmark performance</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                        <p className="text-sm text-gray-600">Portfolio Treynor</p>
                        <p className="text-xl font-semibold text-blue-700">{portfolioAnalysis.portfolioTreynor ? formatNumber(portfolioAnalysis.portfolioTreynor, 3) : 'N/A'}</p>
                        <p className="text-xs text-gray-500">(Return - Rf) / β_portfolio</p>
                      </div>
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40">
                        <p className="text-sm text-gray-600">Benchmark Treynor</p>
                        <p className="text-xl font-semibold text-green-700">{portfolioAnalysis.benchmarkTreynor ? formatNumber(portfolioAnalysis.benchmarkTreynor, 3) : 'N/A'}</p>
                        <p className="text-xs text-gray-500">Benchmark excess return per unit beta</p>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40">
                        <p className="text-sm text-gray-600">M² (Modigliani-Modigliani)</p>
                        <p className="text-xl font-semibold text-yellow-800">{formatPercent(portfolioAnalysis.mSquared)}</p>
                        <p className="text-xs text-gray-500">Adjusted return at benchmark risk</p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                      <p className="font-semibold mb-2">Metric explanations</p>
                      <p className="mb-1"><strong>Treynor Ratio:</strong> Measures excess return relative to systematic risk (beta).</p>
                      <p className="mb-1"><strong>M²:</strong> Converts Sharpe ratio into a risk-adjusted return using benchmark volatility.</p>
                      <p><strong>Jensen's Alpha:</strong> Portfolio outperformance relative to the CAPM expected return.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Security Market Line (SML)</CardTitle>
                    <p className="text-sm text-gray-500">Beta vs expected return for assets, portfolio, and benchmark</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis 
                            dataKey="beta" 
                            type="number"
                            domain={[0, portfolioAnalysis.maxBeta]}
                            tick={{ fontSize: 12 }}
                            label={{ value: 'Beta', position: 'insideBottom', offset: -5, style: { fontSize: '12px' } }}
                          />
                          <YAxis 
                            dataKey="expectedReturn" 
                            type="number"
                            domain={[0, portfolioAnalysis.smlYMax]}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => formatPercent(value)}
                            label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                          />
                          <Tooltip formatter={(value) => formatPercent(value)} cursor={{ strokeDasharray: '3 3' }} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Line 
                            type="linear"
                            data={portfolioAnalysis.smlLine}
                            dataKey="expectedReturn"
                            stroke="#0f766e"
                            dot={false}
                            strokeWidth={3}
                            name="SML"
                          />
                          <Scatter 
                            name="Assets & Portfolio"
                            data={portfolioAnalysis.smlScatter}
                            fill="#f59e0b"
                            shape="circle"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Capital Market Line (CML)</CardTitle>
                    <p className="text-sm text-gray-500">Volatility vs expected return for the risk-free asset and market benchmark</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis 
                            type="number"
                            dataKey="volatility"
                            domain={[0, Math.max(portfolioAnalysis.benchmarkMetrics.volatility, portfolioAnalysis.currentMetrics.volatility, 0.05)]}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => formatPercent(value)}
                            label={{ value: 'Volatility', position: 'insideBottom', offset: -5, style: { fontSize: '12px' } }}
                          />
                          <YAxis 
                            type="number"
                            dataKey="expectedReturn"
                            domain={[0, Math.max(portfolioAnalysis.benchmarkMetrics.expectedReturn, portfolioAnalysis.currentMetrics.expectedReturn, 0.1)]}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => formatPercent(value)}
                            label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                          />
                          <Tooltip formatter={(value) => formatPercent(value)} cursor={{ strokeDasharray: '3 3' }} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Line 
                            type="linear"
                            data={portfolioAnalysis.cmlLine}
                            dataKey="expectedReturn"
                            stroke="#7c3aed"
                            dot={false}
                            strokeWidth={3}
                            name="CML"
                          />
                          <Scatter 
                            name="Current Portfolio"
                            data={[{ volatility: portfolioAnalysis.currentMetrics.volatility, expectedReturn: portfolioAnalysis.currentMetrics.expectedReturn }]}
                            fill="#f59e0b"
                            shape="circle"
                          />
                          <Scatter 
                            name="Benchmark"
                            data={[{ volatility: portfolioAnalysis.benchmarkMetrics.volatility, expectedReturn: portfolioAnalysis.benchmarkMetrics.expectedReturn }]}
                            fill="#2563eb"
                            shape="diamond"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Optimization Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Optimization Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {portfolioAnalysis.currentMetrics && portfolioAnalysis.optimalPortfolio ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                            <p className="text-sm text-gray-600">Return Change</p>
                            <p className="text-lg font-bold text-blue-600">
                              {formatPercent(
                                portfolioAnalysis.optimalPortfolio.metrics.expectedReturn - 
                                portfolioAnalysis.currentMetrics.expectedReturn
                              )}
                            </p>
                          </div>
                          
                          <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                            <p className="text-sm text-gray-600">Risk Change</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatPercent(
                                portfolioAnalysis.optimalPortfolio.metrics.volatility - 
                                portfolioAnalysis.currentMetrics.volatility
                              )}
                            </p>
                          </div>
                          
                          <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                            <p className="text-sm text-gray-600">Sharpe Change</p>
                            <p className="text-lg font-bold text-purple-600">
                              {formatNumber(
                                portfolioAnalysis.optimalPortfolio.metrics.sharpeRatio - 
                                portfolioAnalysis.currentMetrics.sharpeRatio, 3
                              )}
                            </p>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                            <p className="text-sm text-gray-600">Treynor Ratio</p>
                            <p className="text-lg font-bold text-yellow-700">
                              {portfolioAnalysis.portfolioTreynor ? formatNumber(portfolioAnalysis.portfolioTreynor, 3) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Analysis:</strong> {getOptimizationInsights}
                          </AlertDescription>
                        </Alert>
                      </>
                    ) : (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Analysis data not available. Ensure portfolio setup is complete and valid.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
