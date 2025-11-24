import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, CreditCard, BrainCircuit, DollarSign, Briefcase, Calculator, PieChart } from 'lucide-react';

import CashflowForecaster from '../components/calculators/CashflowForecaster';
import BreakEvenAnalysis from '../components/calculators/BreakEvenAnalysis';
import ScenarioTester from '../components/calculators/ScenarioTester';
import LoanAmortization from '../components/calculators/LoanAmortization';
import WorkingCapitalCCC from '../components/calculators/WorkingCapitalCCC';
import ProjectDCF from '../components/calculators/ProjectDCF';
import SimpleLinearRegression from '../components/calculators/SimpleLinearRegression';
import MultipleLinearRegression from '../components/calculators/MultipleLinearRegression';
import ProfitMaximization from '../components/calculators/ProfitMaximization';
import OptimalPricingConstantElasticity from '../components/calculators/OptimalPricingConstantElasticity';
import InterestRateSensitivity from '../components/calculators/InterestRateSensitivity';
import CAPMPortfolioAnalyzer from '../components/calculators/CAPMPortfolioAnalyzer';
import PortfolioAnalysisToolkit from '../components/calculators/PortfolioAnalysisToolkit';

const calculatorComponents = {
  'cashflow': { component: CashflowForecaster, title: 'Cashflow Forecaster' },
  'breakeven': { component: BreakEvenAnalysis, title: 'Break-Even Analysis' },
  'scenario': { component: ScenarioTester, title: 'Scenario Tester' },
  'loan': { component: LoanAmortization, title: 'Loan Amortization' },
  'working-capital': { component: WorkingCapitalCCC, title: 'Working Capital Optimizer' },
  'dcf': { component: ProjectDCF, title: 'DCF Valuation Model' },
  'regression': { component: SimpleLinearRegression, title: 'Simple Linear Regression' },
  'multi-regression': { component: MultipleLinearRegression, title: 'Multiple Regression' },
  'profit-max': { component: ProfitMaximization, title: 'Profit Maximization' },
  'optimal-pricing': { component: OptimalPricingConstantElasticity, title: 'Optimal Pricing (Constant ε)' },
  'interest-sensitivity': { component: InterestRateSensitivity, title: 'Interest Rate Sensitivity' },
  'capm': { component: CAPMPortfolioAnalyzer, title: 'CAPM & Portfolio Analyzer' },
  'portfolio-toolkit': { component: PortfolioAnalysisToolkit, title: 'Portfolio Analysis Toolkit' },
};

const WelcomeDashboard = () => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Welcome to the SME Finance & Economics Suite</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                    Select a calculator from the sidebar on the left to get started. Pin your most-used tools by clicking the ⭐ icon for quick access.
                </p>
            </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cashflow Tools</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">Forecasting, scenario analysis, and break-even points.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Financing Tools</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">Loan planning and interest rate stress-testing.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Portfolio Analysis</CardTitle>
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">Multi-asset optimization and risk analysis.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Econometrics</CardTitle>
                    <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">Statistical modeling and forecasting.</p>
                </CardContent>
            </Card>
        </div>
    </div>
);

export default function Dashboard() {
  const [activeCalculatorId, setActiveCalculatorId] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      setActiveCalculatorId(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Set initial state

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const ActiveCalculator = activeCalculatorId ? calculatorComponents[activeCalculatorId]?.component : null;

  return (
    <Layout>
      {ActiveCalculator ? <ActiveCalculator /> : <WelcomeDashboard />}
    </Layout>
  );
}