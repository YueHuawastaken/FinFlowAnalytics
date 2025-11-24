
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Star, StarOff, TrendingUp, CreditCard, BrainCircuit, DollarSign, Briefcase, Calculator, Target, FlaskConical, Building2, LineChart, BarChart3, Percent, Activity, PieChart, Zap } from 'lucide-react';

const calculatorCategories = [
  {
    title: 'Cash Flow Analysis',
    icon: TrendingUp,
    calculators: [
      { id: 'cashflow', name: 'Cashflow Forecaster', icon: TrendingUp, description: '12-month cash position projections' },
      { id: 'breakeven', name: 'Break-Even Analysis', icon: Target, description: 'Find profitability threshold' },
      { id: 'scenario', name: 'Scenario Tester', icon: FlaskConical, description: 'What-if analysis tool' },
    ]
  },
  {
    title: 'Financing & Investment',
    icon: CreditCard,
    calculators: [
      { id: 'loan', name: 'Loan Amortization', icon: CreditCard, description: 'Payment schedules & interest analysis' },
      { id: 'dcf', name: 'DCF Valuation Model', icon: LineChart, description: 'Investment appraisal & NPV analysis' },
      { id: 'interest-sensitivity', name: 'Interest Rate Sensitivity', icon: Percent, description: 'Rate change impact analysis' },
    ]
  },
  {
    title: 'Portfolio Management',
    icon: PieChart, // Icon for the new category
    calculators: [
      { id: 'capm', name: 'CAPM & Portfolio Analyzer', icon: PieChart, description: 'Two-asset risk-return analysis' },
      { id: 'portfolio-toolkit', name: 'Portfolio Analysis Toolkit', icon: BarChart3, description: 'Multi-asset optimization platform' },
    ]
  },
  {
    title: 'Operational Efficiency',
    icon: Briefcase,
    calculators: [
      { id: 'working-capital', name: 'Working Capital CCC', icon: Building2, description: 'Cash conversion cycle optimizer' },
    ]
  },
  {
    title: 'Economics & Forecasting',
    icon: BrainCircuit,
    calculators: [
      { id: 'regression', name: 'Simple Linear Regression', icon: BarChart3, description: 'Trend analysis & forecasting' },
      { id: 'multi-regression', name: 'Multiple Regression', icon: Activity, description: 'Multi-variable analysis' },
      { id: 'profit-max', name: 'Profit Maximization', icon: DollarSign, description: 'Optimal pricing & quantity' },
      { id: 'optimal-pricing', name: 'Optimal Pricing (Constant ε)', icon: Zap, description: 'Elasticity-based pricing' },
    ]
  }
];

export default function Sidebar({ onClose }) {
  const [pinnedCalculators, setPinnedCalculators] = useState([]);
  const [activeCalculator, setActiveCalculator] = useState('');

  React.useEffect(() => {
    // Get active calculator from URL hash
    const hash = window.location.hash.substring(1);
    setActiveCalculator(hash);
    
    // Listen for hash changes
    const handleHashChange = () => {
      setActiveCalculator(window.location.hash.substring(1));
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const togglePin = (calculatorId) => {
    setPinnedCalculators(prev => 
      prev.includes(calculatorId) 
        ? prev.filter(id => id !== calculatorId)
        : [...prev, calculatorId]
    );
  };

  const navigateToCalculator = (calculatorId) => {
    window.location.hash = calculatorId;
    if (onClose) onClose(); // Close sidebar on mobile after selection
  };

  const pinnedItems = pinnedCalculators.map(pinnedId => {
    for (const category of calculatorCategories) {
      const calc = category.calculators.find(c => c.id === pinnedId);
      if (calc) return calc;
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex h-14 sm:h-16 items-center justify-between px-4 border-b">
        <div className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-sm">Finance Suite</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Pinned Section */}
          {pinnedItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                Pinned Tools
              </h3>
              {pinnedItems.map((calc) => (
                <Button
                  key={calc.id}
                  variant={activeCalculator === calc.id ? "default" : "ghost"}
                  className="w-full justify-start h-auto p-3 text-left"
                  onClick={() => navigateToCalculator(calc.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <calc.icon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{calc.name}</div>
                      <div className="text-xs text-gray-500 truncate">{calc.description}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(calc.id);
                      }}
                    >
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                    </Button>
                  </div>
                </Button>
              ))}
            </div>
          )}

          {/* Calculator Categories */}
          {calculatorCategories.map((category) => (
            <div key={category.title} className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 flex items-center gap-2">
                <category.icon className="h-3 w-3" />
                {category.title}
              </h3>
              <div className="space-y-1">
                {category.calculators.map((calc) => (
                  <Button
                    key={calc.id}
                    variant={activeCalculator === calc.id ? "default" : "ghost"}
                    className="w-full justify-start h-auto p-3 text-left"
                    onClick={() => navigateToCalculator(calc.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <calc.icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{calc.name}</div>
                        <div className="text-xs text-gray-500 truncate">{calc.description}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(calc.id);
                        }}
                      >
                        {pinnedCalculators.includes(calc.id) ? (
                          <Star className="h-3 w-3 fill-current text-yellow-500" />
                        ) : (
                          <StarOff className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="text-xs text-gray-500 text-center">
          <div className="font-medium mb-1">SME Finance Suite</div>
          <div>Professional financial analysis tools</div>
        </div>
      </div>
    </div>
  );
}
