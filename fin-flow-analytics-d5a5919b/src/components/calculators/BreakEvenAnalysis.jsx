
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Target, DollarSign, Shield, AlertTriangle, RotateCcw, Copy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';

const formatNumber = (num, digits = 2) => {
  if (num === null || num === undefined || !isFinite(num)) {
    return 'N/A';
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: digits });
};

const formatCurrency = (num) => {
  if (num === null || num === undefined || !isFinite(num)) {
    return '$0';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
};

const initialState = {
  fixedCosts: 50000,
  pricePerUnit: 120,
  variableCostPerUnit: 70,
  expectedSales: 1500,
  demandIntercept: 200,
  demandSlope: 0.08,
  competitorCount: '2-5',
  differentiated: 'yes',
  competitionFocus: 'price',
  barrierToEntry: 'no',
};

const marketStructureDescription = (structure, options) => {
  switch (structure) {
    case 'Monopoly':
      return 'Single-seller market with strong control over pricing. Set quantity where marginal revenue equals marginal cost, then read price from customer demand.';
    case 'Perfect Competition':
      return 'Many competitors selling similar products and prices are set by the market. Your best guide is marginal cost, not an aggressive price change.';
    case 'Monopolistic Competition':
      return 'Many sellers with differentiated offerings. You have some pricing power, but customers still care about price and value.';
    case 'Cournot Oligopoly':
      return 'A few firms compete mainly on output. Price is shaped by total industry quantity, so think quantity before price.';
    case 'Bertrand Oligopoly':
      return 'A few firms compete mainly on price. Customers compare prices, so your price decision drives quantity.';
    case 'Stackelberg / Leader-Follower':
      return 'One firm leads and others follow. The leader chooses output or strategy first, and rivals react to that choice.';
    default:
      return 'Use the market setup above to see the pricing guidance that fits your business.';
  }
};

const classifyMarket = ({ competitorCount, differentiated, competitionFocus, barrierToEntry }) => {
  // Follow the user's decision tree:
  // 0 or 1 -> Monopoly
  if (competitorCount === '0' || competitorCount === '1') return 'Monopoly';

  // 2-5 competitors -> Cournot if quantity competition, else Bertrand
  if (competitorCount === '2-5') {
    return competitionFocus === 'quantity' ? 'Cournot Oligopoly' : 'Bertrand Oligopoly';
  }

  // 6+ competitors -> Monopolistic Competition if entry barriers exist, otherwise Perfect Competition
  if (competitorCount === '6+') {
    return barrierToEntry === 'yes' ? 'Monopolistic Competition' : 'Perfect Competition';
  }

  // Fallback
  return 'Monopolistic Competition';
};

export default function BreakEvenAnalysis() {
  const [fixedCosts, setFixedCosts] = useState(initialState.fixedCosts);
  const [pricePerUnit, setPricePerUnit] = useState(initialState.pricePerUnit);
  const [variableCostPerUnit, setVariableCostPerUnit] = useState(initialState.variableCostPerUnit);
  const [expectedSales, setExpectedSales] = useState(initialState.expectedSales);
  const [demandIntercept, setDemandIntercept] = useState(initialState.demandIntercept);
  const [demandSlope, setDemandSlope] = useState(initialState.demandSlope);
  const [competitorCount, setCompetitorCount] = useState(initialState.competitorCount);
  const [differentiated, setDifferentiated] = useState(initialState.differentiated);
  const [competitionFocus, setCompetitionFocus] = useState(initialState.competitionFocus);
  const [barrierToEntry, setBarrierToEntry] = useState(initialState.barrierToEntry);
  const [copyText, setCopyText] = useState('Copy');
  const [useRecommendations, setUseRecommendations] = useState(true);

  const {
    contributionMargin,
    breakEvenQuantity,
    breakEvenRevenue,
    marginOfSafetyUnits,
    marginOfSafetyPercent,
    isValid,
    chartData,
    structure,
    pricingLogic,
    recommendedQuantity,
    recommendedPrice,
    expectedRevenue,
    expectedProfit,
    interpretation,
    structureDescription,
    chartLabels,
    error,
    equilibriumPrice,
    equilibriumQuantity,
  } = useMemo(() => {
    const fixedCostsNumber = Number(fixedCosts);
    const variableCostNumber = Number(variableCostPerUnit);
    const priceNumber = Number(pricePerUnit);
    const expectedSalesNumber = Number(expectedSales);
    const demandA = Number(demandIntercept);
    const demandB = Number(demandSlope);

    if (demandA <= 0 || demandB <= 0) {
      return {
        isValid: false,
        chartData: [],
        structure: 'Unknown',
        error: 'Demand intercept and slope must both be greater than zero.',
        contributionMargin: 0,
        breakEvenQuantity: 0,
        breakEvenRevenue: 0,
        marginOfSafetyUnits: 0,
        marginOfSafetyPercent: 0,
      };
    }

    const structure = classifyMarket({ competitorCount, differentiated, competitionFocus, barrierToEntry });

    // Map competitorCount flag to a numeric n used in formulas
    const nMap = { '0': 1, '1': 1, '2-5': 3, '6+': 6 };
    const n = nMap[competitorCount] || 1;

    const isMonopoly = structure === 'Monopoly';
    const isPerfectCompetition = structure === 'Perfect Competition';
    const isCournot = structure === 'Cournot Oligopoly';
    const isBertrand = structure === 'Bertrand Oligopoly';
    const isMonopolistic = structure === 'Monopolistic Competition';

    let recommendedQuantity = null;
    let recommendedPrice = null;
    let eqPrice = null;
    let eqQuantity = null;
    let pricingLogic = marketStructureDescription(structure);

    const MC = variableCostNumber;

    if (isMonopoly) {
      const q = Math.max(0, (demandA - MC) / (2 * demandB));
      const p = Math.max(0, demandA - demandB * q);
      recommendedQuantity = q;
      recommendedPrice = p;
      eqPrice = p;
      eqQuantity = q;
      pricingLogic = 'Monopoly: set output where marginal revenue equals marginal cost (MR = MC).';
    } else if (isCournot) {
      const eachFirm = Math.max(0, (demandA - MC) / (demandB * (n + 1)));
      const totalQ = n * eachFirm;
      const p = Math.max(0, demandA - demandB * totalQ);
      recommendedQuantity = totalQ;
      recommendedPrice = p;
      eqPrice = p;
      eqQuantity = totalQ;
      pricingLogic = 'Cournot oligopoly: firms choose quantities; price falls as the number of firms increases.';
    } else if (isBertrand) {
      if (differentiated === 'no') {
        const p = MC;
        const totalQ = Math.max(0, (demandA - p) / demandB);
        recommendedPrice = p;
        recommendedQuantity = totalQ;
        eqPrice = p;
        eqQuantity = totalQ;
        pricingLogic = 'Bertrand (homogeneous products): competition on price drives price down to marginal cost (P = MC).';
      } else {
        const p = Math.max(0, (demandA + n * MC) / (n + 1));
        const totalQ = Math.max(0, (demandA - p) / demandB);
        recommendedPrice = p;
        recommendedQuantity = totalQ;
        eqPrice = p;
        eqQuantity = totalQ;
        pricingLogic = 'Bertrand (differentiated products): firms can sustain prices above MC; price follows a Nash-type markup.';
      }
    } else if (isMonopolistic) {
      const A = demandB;
      const B = -(demandA - MC);
      const C = fixedCostsNumber;
      const disc = Math.max(0, B * B - 4 * A * C);
      let q = null;
      if (disc >= 0 && A !== 0) {
        const sqrtD = Math.sqrt(disc);
        const r1 = (-B - sqrtD) / (2 * A);
        const r2 = (-B + sqrtD) / (2 * A);
        const candidates = [r1, r2].filter((val) => isFinite(val) && val > 0);
        if (candidates.length > 0) q = Math.max(...candidates);
      }
      if (q === null) {
        const p = MC * 1.2;
        q = Math.max(0, (demandA - p) / demandB);
        recommendedPrice = p;
        recommendedQuantity = q;
        eqPrice = p;
        eqQuantity = q;
        pricingLogic = 'Monopolistic competition (fallback): approximate small markup over MC when closed-form solution unavailable.';
      } else {
        const p = Math.max(0, demandA - demandB * q);
        recommendedPrice = p;
        recommendedQuantity = q;
        eqPrice = p;
        eqQuantity = q;
        pricingLogic = 'Monopolistic competition: long-run entry drives economic profit to zero so price equals average cost (AC).';
      }
    } else if (isPerfectCompetition) {
      const p = MC;
      const totalQ = Math.max(0, (demandA - p) / demandB);
      recommendedPrice = p;
      recommendedQuantity = totalQ;
      eqPrice = p;
      eqQuantity = totalQ;
      pricingLogic = 'Perfect competition: in long run price equals marginal cost (P = MC).';
    } else {
      const q = Math.max(0, (demandA - MC) / (2 * demandB));
      const p = Math.max(0, demandA - demandB * q);
      recommendedQuantity = q;
      recommendedPrice = p;
      eqPrice = p;
      eqQuantity = q;
      pricingLogic = marketStructureDescription(structure);
    }

    // Choose whether to use market recommendations or manual inputs
    const useRecs = useRecommendations;
    const P_used = useRecs && eqPrice !== null ? eqPrice : priceNumber;
    const Q_used = useRecs && eqQuantity !== null ? eqQuantity : expectedSalesNumber;

    if (P_used <= variableCostNumber) {
      const errorMsg = P_used === variableCostNumber
        ? 'Break-even is infinite. Price per unit must be greater than variable cost per unit.'
        : 'Sale Price per Unit must be greater than Variable Cost per Unit to be profitable.';
      return {
        isValid: false,
        chartData: [],
        structure: 'Unknown',
        error: errorMsg,
        contributionMargin: 0,
        breakEvenQuantity: 0,
        breakEvenRevenue: 0,
        marginOfSafetyUnits: 0,
        marginOfSafetyPercent: 0,
      };
    }

    const contributionMargin = P_used - variableCostNumber;
    const breakEvenQuantity = fixedCostsNumber / contributionMargin;
    const breakEvenRevenue = breakEvenQuantity * P_used;

    let marginOfSafetyUnits = null;
    let marginOfSafetyPercent = null;
    if (Q_used > 0) {
      marginOfSafetyUnits = Q_used - breakEvenQuantity;
      marginOfSafetyPercent = (marginOfSafetyUnits / Q_used) * 100;
    }

    const expectedRevenue = P_used * Q_used;
    const expectedProfit = (P_used - variableCostNumber) * Q_used - fixedCostsNumber;

    const interpretation = `Your market looks most like ${structure}. ${pricingLogic} Based on ${useRecs ? 'market recommendations' : 'your inputs'}, selling ${formatNumber(Q_used)} units at ${formatCurrency(P_used)} yields revenue ${formatCurrency(expectedRevenue)} and profit ${formatCurrency(expectedProfit)}.`;
    const structureDescription = marketStructureDescription(structure);

    const largestQuantity = Math.max(demandA / demandB, (useRecs ? (eqQuantity || 0) : expectedSalesNumber) * 2, breakEvenQuantity, 100);
    const maxQuantity = largestQuantity * 1.4;

    const chartData = [];
    const steps = 50;
    for (let step = 0; step <= steps; step++) {
      const quantity = (maxQuantity / steps) * step;
      const price = Math.max(0, demandA - demandB * quantity);
      const totalRevenue = price * quantity;
      const totalCost = fixedCostsNumber + variableCostNumber * quantity;
      const mr = Math.max(0, demandA - 2 * demandB * quantity);
      chartData.push({
        quantity,
        price,
        totalRevenue,
        totalCost,
        marginalRevenue: mr,
        marginalCost: variableCostNumber,
      });
    }

    return {
      contributionMargin,
      breakEvenQuantity,
      breakEvenRevenue,
      marginOfSafetyUnits,
      marginOfSafetyPercent,
      isValid: true,
      error: null,
      chartData,
      maxQuantity,
      structure,
      pricingLogic,
      recommendedQuantity,
      recommendedPrice,
      expectedRevenue,
      expectedProfit,
      interpretation,
      structureDescription,
      chartLabels: {
        demand: 'Demand Price (P)',
        mr: 'Marginal Revenue',
        mc: 'Marginal Cost',
      },
      equilibriumPrice: eqPrice,
      equilibriumQuantity: eqQuantity,
    };
  }, [fixedCosts, pricePerUnit, variableCostPerUnit, expectedSales, demandIntercept, demandSlope, competitorCount, differentiated, competitionFocus, barrierToEntry, useRecommendations]);

  const handleReset = () => {
    setFixedCosts(initialState.fixedCosts);
    setPricePerUnit(initialState.pricePerUnit);
    setVariableCostPerUnit(initialState.variableCostPerUnit);
    setExpectedSales(initialState.expectedSales);
    setDemandIntercept(initialState.demandIntercept);
    setDemandSlope(initialState.demandSlope);
    setCompetitorCount(initialState.competitorCount);
    setDifferentiated(initialState.differentiated);
    setCompetitionFocus(initialState.competitionFocus);
    setBarrierToEntry(initialState.barrierToEntry);
  };

  const handleCopy = () => {
    const resultsText = `Break-Even & Pricing Strategy Results:\n----------------------------\nMarket Structure: ${structure}\nRecommended Quantity: ${formatNumber(recommendedQuantity)} units\nRecommended Price: $${formatNumber(recommendedPrice)}\nExpected Revenue: $${formatNumber(expectedRevenue)}\nExpected Profit: $${formatNumber(expectedProfit)}\nBreak-Even Point: ${formatNumber(breakEvenQuantity)} units\nBreak-Even Revenue: $${formatNumber(breakEvenRevenue)}\n${expectedSales > 0 && marginOfSafetyUnits !== null ? `Margin of Safety: ${formatNumber(marginOfSafetyUnits)} units (${formatNumber(marginOfSafetyPercent)}%)\n` : ''}`;
    navigator.clipboard.writeText(resultsText);
    setCopyText('Copied!');
    setTimeout(() => setCopyText('Copy'), 2000);
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Break-Even & Pricing Strategy</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Break-even analysis with pricing guidance based on your market.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" size="sm" className="gap-2"><RotateCcw className="h-4 w-4"/> Reset</Button>
              <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2"><Copy className="h-4 w-4"/> {copyText}</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fixed-costs">Total Fixed Costs ($)</Label>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="fixed-costs"
                      type="number"
                      value={fixedCosts}
                      onChange={(e) => setFixedCosts(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="e.g., 50000"
                    />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold">Fixed costs do not change with sales volume.</p>
                      <p className="text-xs italic">Examples: rent, insurance, management salaries.</p>
                    </div>
                  </TooltipContent>
                </UITooltip>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price-per-unit">Selling Price per Unit ($)</Label>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="price-per-unit"
                      type="number"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="e.g., 120"
                    />
                  </TooltipTrigger>
                  <TooltipContent>The price you charge customers for one unit.</TooltipContent>
                </UITooltip>
              </div>

              <div className="space-y-2">
                <Label htmlFor="variable-cost-per-unit">Variable Cost per Unit ($)</Label>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="variable-cost-per-unit"
                      type="number"
                      value={variableCostPerUnit}
                      onChange={(e) => setVariableCostPerUnit(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="e.g., 70"
                    />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold">Variable cost is the extra cost per sale.</p>
                      <p className="text-xs italic">Examples: parts, shipping, commission.</p>
                    </div>
                  </TooltipContent>
                </UITooltip>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected-sales">Expected Sales Volume (Units)</Label>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="expected-sales"
                      type="number"
                      value={expectedSales}
                      onChange={(e) => setExpectedSales(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="e.g., 1500"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Your sales forecast used to estimate safety above break-even.</TooltipContent>
                </UITooltip>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-semibold">Demand Curve</h3>
                <p className="text-xs text-gray-500">Customer demand helps translate quantity into price.</p>
                <div className="grid gap-4 mt-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="demand-intercept">Demand intercept (a)</Label>
                    <Input
                      id="demand-intercept"
                      type="number"
                      value={demandIntercept}
                      onChange={(e) => setDemandIntercept(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="e.g., 200"
                    />
                    <p className="text-xs text-gray-500">Maximum price when quantity is zero.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demand-slope">Demand slope (b)</Label>
                    <Input
                      id="demand-slope"
                      type="number"
                      step="0.01"
                      value={demandSlope}
                      onChange={(e) => setDemandSlope(Number(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="e.g., 0.08"
                    />
                    <p className="text-xs text-gray-500">How much price drops for each extra unit.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-semibold">Market Structure Pricing</h3>
                <p className="text-xs text-gray-500">Answer a few market questions and we will suggest the best pricing logic.</p>
                <div className="grid gap-4 mt-4">
                  <div>
                    <Label htmlFor="competitor-count">How many significant competitors?</Label>
                    <Select value={competitorCount} onValueChange={setCompetitorCount}>
                      <SelectTrigger id="competitor-count">
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 competitors</SelectItem>
                        <SelectItem value="1">1 competitor</SelectItem>
                        <SelectItem value="2-5">2–5 competitors</SelectItem>
                        <SelectItem value="6+">6+ competitors</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="differentiated">Are products highly differentiated?</Label>
                    <Select value={differentiated} onValueChange={setDifferentiated}>
                      <SelectTrigger id="differentiated">
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="competition-focus">Do firms mainly compete on price or quantity?</Label>
                    <Select value={competitionFocus} onValueChange={setCompetitionFocus}>
                      <SelectTrigger id="competition-focus">
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="quantity">Quantity / capacity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="barrier-to-entry">Is it hard for new firms to enter?</Label>
                    <Select value={barrierToEntry} onValueChange={setBarrierToEntry}>
                      <SelectTrigger id="barrier-to-entry">
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="use-recs" checked={useRecommendations} onCheckedChange={(v) => setUseRecommendations(Boolean(v))} />
                    <Label htmlFor="use-recs" className="mb-0">Use market structure recommendations</Label>
                  </div>
                </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {!isValid ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Invalid Input</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-4">
                    <Card className="p-4">
                      <p className="text-sm text-gray-500">Suggested Market Structure</p>
                      <p className="text-2xl font-bold">{structure}</p>
                      <p className="text-sm text-gray-500 mt-2">{structureDescription}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-gray-500">Your Initial Estimates</p>
                      <p className="text-base text-gray-500 mt-2">Selling Price: {formatCurrency(pricePerUnit)} · Expected Sales: {formatNumber(expectedSales)} units</p>
                    </Card>
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4">
                        <p className="text-sm text-gray-500">Recommended Quantity</p>
                        <p className="text-2xl font-bold">{formatNumber(recommendedQuantity)} <span className="text-lg font-medium">units</span></p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-gray-500">Recommended Price</p>
                        <p className="text-2xl font-bold">{formatCurrency(recommendedPrice)}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-gray-500">Expected Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(expectedRevenue)}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-gray-500">Expected Profit</p>
                        <p className={`text-2xl font-bold ${expectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(expectedProfit)}</p>
                      </Card>
                    </div>
                    <p className="text-xs text-gray-500">Based on your market structure, we recommend these values instead of your manual estimates.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4">
                        <p className="text-sm text-gray-500">Break-Even Units</p>
                        <p className="text-2xl font-bold">{formatNumber(breakEvenQuantity)} <span className="text-lg font-medium">units</span></p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-gray-500">Break-Even Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(breakEvenRevenue)}</p>
                      </Card>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4">
                        <p className="text-sm text-gray-500">Margin of Safety</p>
                        <p className={`text-2xl font-bold ${marginOfSafetyUnits !== null && marginOfSafetyUnits < 0 ? 'text-red-600' : ''}`}>
                          {formatNumber(marginOfSafetyUnits)} <span className="text-lg font-medium">units</span>
                        </p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-gray-500">Margin of Safety</p>
                        <p className={`text-2xl font-bold ${marginOfSafetyPercent !== null && marginOfSafetyPercent < 0 ? 'text-red-600' : ''}`}>
                          {formatNumber(marginOfSafetyPercent)}%
                        </p>
                      </Card>
                    </div>
                    <Card className="p-4">
                      <p className="text-sm text-gray-500">Pricing Guidance</p>
                      <p className="text-base mt-2 text-gray-700 dark:text-gray-200">{pricingLogic}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-gray-500">Quick Takeaway</p>
                      <p className="text-base mt-2 text-gray-700 dark:text-gray-200">{interpretation}</p>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    {marginOfSafetyUnits !== null && marginOfSafetyUnits < 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>⚠️ Your expected sales are below break-even</AlertTitle>
                        <AlertDescription>
                          You need to sell {formatNumber(Math.max(0, breakEvenQuantity - (useRecommendations ? recommendedQuantity : expectedSales)))} more units to break even.
                        </AlertDescription>
                      </Alert>
                    )}
                    <h3 className="font-semibold">Market structure chart</h3>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="quantity" tick={{ fontSize: 12 }} label={{ value: 'Quantity', position: 'insideBottom', offset: -5 }} />
                          <YAxis tick={{ fontSize: 12 }} label={{ value: 'Price / Cost', angle: -90, position: 'insideLeft' }} />
                          <Tooltip formatter={(value, name) => [formatCurrency(value), name]} labelFormatter={(label) => `Quantity: ${formatNumber(label)}`} />
                          <Legend />
                          <Line type="monotone" dataKey="price" name={chartLabels.demand} stroke="#2563eb" strokeWidth={2} dot={false} />
                          {['Monopoly', 'Stackelberg / Leader-Follower', 'Cournot Oligopoly'].includes(structure) && (
                            <Line type="monotone" dataKey="marginalRevenue" name={chartLabels.mr} stroke="#ea580c" strokeWidth={2} dot={false} />
                          )}
                          <Line type="monotone" dataKey="marginalCost" name={chartLabels.mc} stroke="#16a34a" strokeWidth={2} dot={false} />
                          {equilibriumPrice !== null && (
                            <ReferenceLine y={equilibriumPrice} stroke="#c026d3" strokeDasharray="4 4" label={{ value: 'Market Price', position: 'insideTopLeft' }} />
                          )}
                          {equilibriumQuantity !== null && (
                            <ReferenceLine x={equilibriumQuantity} stroke="#000" strokeDasharray="4 4" label={{ value: 'Suggested Q', position: 'insideTopLeft' }} />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
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
