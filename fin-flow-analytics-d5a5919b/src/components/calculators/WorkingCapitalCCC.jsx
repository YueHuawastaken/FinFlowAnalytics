import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Building2, AlertTriangle, CheckCircle, Info, BarChart3, Clock } from 'lucide-react';

const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || !isFinite(num)) {
    return "N/A";
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatCurrency = (value) => {
    if (typeof value !== 'number' || !isFinite(value)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const getDiagnostic = (value, thresholds, higherIsBetter = false) => {
  if (value === null || !isFinite(value)) return { level: 'nodata', message: 'Not available' };
  
  const good = higherIsBetter ? thresholds.ok : thresholds.good;
  const alert = higherIsBetter ? thresholds.good : thresholds.ok;

  if (value < good) return { level: 'good', message: 'Excellent' };
  if (value >= good && value < alert) return { level: 'ok', message: 'Acceptable' };
  return { level: 'alert', message: 'Needs Attention' };
};

const DiagnosticBadge = ({ diagnostic }) => {
  const styles = {
    good: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    ok: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    alert: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    nodata: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  };
  const Icon = {
    good: CheckCircle,
    ok: Info,
    alert: AlertTriangle,
    nodata: Info
  }[diagnostic.level];
  return (
    <Badge className={`gap-1 ${styles[diagnostic.level]}`}>
      <Icon className="h-3 w-3" />
      {diagnostic.message}
    </Badge>
  );
};

export default function WorkingCapitalCCC() {
  const [currentAssets, setCurrentAssets] = useState(150000);
  const [currentLiabilities, setCurrentLiabilities] = useState(80000);
  const [inventory, setInventory] = useState(40000);
  const [accountsReceivable, setAccountsReceivable] = useState(55000);
  const [accountsPayable, setAccountsPayable] = useState(45000);
  const [annualCreditSales, setAnnualCreditSales] = useState(1200000);
  const [annualCOGS, setAnnualCOGS] = useState(750000);
  const [daysBasis, setDaysBasis] = useState('365');

  const calculations = useMemo(() => {
    const workingCapital = currentAssets - currentLiabilities;
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : null;
    const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : null;

    const days = Number(daysBasis);
    const dailySales = annualCreditSales > 0 ? annualCreditSales / days : 0;
    const dailyCOGS = annualCOGS > 0 ? annualCOGS / days : 0;

    const DSO = dailySales > 0 ? accountsReceivable / dailySales : null;
    const DIO = dailyCOGS > 0 ? inventory / dailyCOGS : null;
    const DPO = dailyCOGS > 0 ? accountsPayable / dailyCOGS : null;

    const CCC = (DSO !== null && DIO !== null && DPO !== null) ? DSO + DIO - DPO : null;

    return {
      workingCapital,
      currentRatio,
      quickRatio,
      DSO,
      DIO,
      DPO,
      CCC
    };
  }, [currentAssets, currentLiabilities, inventory, accountsReceivable, accountsPayable, annualCreditSales, annualCOGS, daysBasis]);
  
  const diagnostics = {
    currentRatio: getDiagnostic(calculations.currentRatio, { good: 1, ok: 2 }, true),
    quickRatio: getDiagnostic(calculations.quickRatio, { good: 0.5, ok: 1 }, true),
    DSO: getDiagnostic(calculations.DSO, { good: 30, ok: 60 }),
    DIO: getDiagnostic(calculations.DIO, { good: 45, ok: 90 }),
    DPO: getDiagnostic(calculations.DPO, { good: 30, ok: 45 }, true),
    CCC: getDiagnostic(calculations.CCC, { good: 30, ok: 60 })
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900">
            <Building2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Working Capital & Cash Conversion Cycle</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Assess operational efficiency and short-term liquidity
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Inputs Section */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Assets ($)</Label>
                <Input type="number" value={currentAssets} onChange={(e) => setCurrentAssets(Number(e.target.value))} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Current Liabilities ($)</Label>
                <Input type="number" value={currentLiabilities} onChange={(e) => setCurrentLiabilities(Number(e.target.value))} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Inventory ($)</Label>
                <Input type="number" value={inventory} onChange={(e) => setInventory(Number(e.target.value))} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Accounts Receivable ($)</Label>
                <Input type="number" value={accountsReceivable} onChange={(e) => setAccountsReceivable(Number(e.target.value))} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Accounts Payable ($)</Label>
                <Input type="number" value={accountsPayable} onChange={(e) => setAccountsPayable(Number(e.target.value))} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Annual Credit Sales ($)</Label>
                <Input type="number" value={annualCreditSales} onChange={(e) => setAnnualCreditSales(Number(e.target.value))} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Annual COGS ($)</Label>
                <Input type="number" value={annualCOGS} onChange={(e) => setAnnualCOGS(Number(e.target.value))} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Days in Year</Label>
                <RadioGroup defaultValue="365" value={daysBasis} onValueChange={setDaysBasis} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="365" id="d365" />
                    <Label htmlFor="d365">365</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="360" id="d360" />
                    <Label htmlFor="d360">360</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
               <Card className="p-4">
                  <p className="text-sm font-medium text-gray-500">Working Capital</p>
                  <p className="text-2xl font-bold">{formatCurrency(calculations.workingCapital)}</p>
               </Card>
               <Card className="p-4">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-500">Current Ratio</p>
                    <DiagnosticBadge diagnostic={diagnostics.currentRatio} />
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(calculations.currentRatio)}</p>
               </Card>
               <Card className="p-4">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-500">Quick Ratio</p>
                    <DiagnosticBadge diagnostic={diagnostics.quickRatio} />
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(calculations.quickRatio)}</p>
               </Card>
            </div>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold flex items-center gap-2"><Clock className="h-5 w-5"/> Cash Conversion Cycle (CCC)</p>
                <DiagnosticBadge diagnostic={diagnostics.CCC} />
              </div>
              <p className="text-4xl font-bold text-center py-4">{formatNumber(calculations.CCC, 1)} <span className="text-2xl font-medium">days</span></p>
              
              <div className="flex justify-around text-center mt-2">
                <div>
                  <p className="text-sm text-gray-500">DSO</p>
                  <p className="text-lg font-semibold">{formatNumber(calculations.DSO, 1)}</p>
                </div>
                <p className="text-lg font-semibold">+</p>
                <div>
                  <p className="text-sm text-gray-500">DIO</p>
                  <p className="text-lg font-semibold">{formatNumber(calculations.DIO, 1)}</p>
                </div>
                <p className="text-lg font-semibold">-</p>
                <div>
                  <p className="text-sm text-gray-500">DPO</p>
                  <p className="text-lg font-semibold">{formatNumber(calculations.DPO, 1)}</p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Days Sales Outstanding</p>
                  <DiagnosticBadge diagnostic={diagnostics.DSO} />
                </div>
                <p className="text-2xl font-bold">{formatNumber(calculations.DSO, 1)} <span className="text-lg">days</span></p>
                <p className="text-xs text-gray-500">Time to collect receivables</p>
              </Card>
              <Card className="p-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Days Inventory Outstanding</p>
                  <DiagnosticBadge diagnostic={diagnostics.DIO} />
                </div>
                <p className="text-2xl font-bold">{formatNumber(calculations.DIO, 1)} <span className="text-lg">days</span></p>
                <p className="text-xs text-gray-500">Time to sell inventory</p>
              </Card>
              <Card className="p-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Days Payables Outstanding</p>
                  <DiagnosticBadge diagnostic={diagnostics.DPO} />
                </div>
                <p className="text-2xl font-bold">{formatNumber(calculations.DPO, 1)} <span className="text-lg">days</span></p>
                <p className="text-xs text-gray-500">Time to pay suppliers</p>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}