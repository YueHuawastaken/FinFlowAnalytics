import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './app.js';

const payloads = {
  'cashflow-forecaster': { startingCash: 50000, autoMode: true, baseRevenue: 25000, baseExpense: 20000, revenueGrowth: 2, expenseGrowth: 1.5 },
  'break-even-pricing': { fixedCosts: 50000, pricePerUnit: 120, variableCostPerUnit: 70, expectedSales: 1500, demandIntercept: 200, demandSlope: 0.08, competitorCount: '2-5', differentiated: 'yes', competitionFocus: 'price', barrierToEntry: 'no', useRecommendations: true },
  'scenario-tester': { startingCash: 50000, baseRevenue: 25000, baseExpense: 20000, revenueGrowth: 2, expenseGrowth: 1, revenueChange: 10, expenseChange: -5 },
  'loan-amortization': { principal: 250000, annualRate: 6.5, termYears: 30, paymentsPerYear: 12, extraPayment: 0 },
  dcf: { initialInvestments: [-100000], operatingCashFlows: [30000, 35000, 40000, 25000], salvageValue: 10000, periodicity: 'annual', discountRate: 0.12, useWACC: false },
  'interest-rate-sensitivity': { principal: 250000, baseAPR: 6.5, termYears: 30, paymentsPerYear: 12, testRange: 3, stepSize: 0.25 },
  'capm-portfolio': { riskFreeRate: 0.03, marketReturn: 0.10, marketStdDev: 0.16, betaA: 1.2, muA: 0.12, sigmaA: 0.20, betaB: 0.8, muB: 0.08, sigmaB: 0.15, correlation: 0.3, weightA: 0.6 },
  'portfolio-analysis': { assets: [{ expectedReturn: 10, volatility: 15, beta: 1 }, { expectedReturn: 4, volatility: 5, beta: 0.1 }], weights: [0.6, 0.4], correlationMatrix: [[1, 0.15], [0.15, 1]], riskFreeRate: 3 },
  'working-capital-ccc': { currentAssets: 150000, currentLiabilities: 80000, inventory: 40000, accountsReceivable: 55000, accountsPayable: 45000, annualCreditSales: 1200000, annualCOGS: 750000, daysBasis: 365 },
  'simple-regression': { dataPoints: [{ x: 1, y: 2500 }, { x: 2, y: 2800 }, { x: 3, y: 3100 }], forecastHorizon: 2, confidenceLevel: 95 },
  'multiple-regression': { data: [{ y: 300, x1: 10, x2: 20 }, { y: 350, x1: 12, x2: 25 }, { y: 400, x1: 15, x2: 28 }, { y: 480, x1: 18, x2: 35 }], forecastHorizon: 2, forecastInputs: { x1: 28, x2: 50, x1Growth: 0.05, x2Growth: 0.03 } },
  'profit-maximization': { demandA: 100, demandB: 0.5, fixedCost: 500, marginalCost: 20 },
  'optimal-pricing': { mode: 'known_epsilon', marginalCost: 10, knownElasticity: 2, calibP0: 25, calibQ0: 100 }
};

let server;
let baseUrl;
test.before(() => { server = createApp().listen(0); baseUrl = `http://127.0.0.1:${server.address().port}`; });
test.after(() => server.close());
test('health and API information return JSON', async () => {
  assert.deepEqual(await fetch(`${baseUrl}/api/health`).then((response) => response.json()), { status: 'ok', service: 'finflow-analytics-api' });
  assert.equal((await fetch(`${baseUrl}/api`).then((response) => response.json())).calculators.length, 13);
});
test('malformed JSON returns a structured 400 response', async () => {
  const response = await fetch(`${baseUrl}/api/dcf`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{invalid' });
  const body = await response.json();
  assert.equal(response.status, 400); assert.equal(body.success, false); assert.equal(body.error.code, 'INVALID_INPUT'); assert.equal(body.error.message, 'Request body must be valid JSON.');
});
test('loan final payment is reduced to the remaining balance plus final interest', async () => {
  const response = await fetch(`${baseUrl}/api/loan-amortization`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ principal: 1000, annualRate: 6, termYears: 1, paymentsPerYear: 12, extraPayment: 100 }) });
  const row = (await response.json()).result.extraSchedule.at(-1);
  assert.equal(row.balance, 0); assert.equal(row.payment, row.interest + row.principal); assert.ok(row.payment < 186.06661823027927);
});
const alternatePayloads = {
  'cashflow-forecaster': { startingCash: 10000, autoMode: false, manualRevenues: [5000, 5200, 5400, 5600, 5800, 6000, 6200, 6400, 6600, 6800, 7000, 7200], manualExpenses: [4500, 4700, 4900, 5100, 5300, 5500, 5700, 5900, 6100, 6300, 6500, 6700] },
  'break-even-pricing': { fixedCosts: 10000, pricePerUnit: 80, variableCostPerUnit: 35, expectedSales: 500, demandIntercept: 100, demandSlope: 0.2, competitorCount: '0', differentiated: 'yes', competitionFocus: 'price', barrierToEntry: 'yes', useRecommendations: false },
  'scenario-tester': { startingCash: 25000, baseRevenue: 18000, baseExpense: 16000, revenueGrowth: -1, expenseGrowth: 2, revenueChange: -10, expenseChange: 8 },
  'loan-amortization': { principal: 50000, annualRate: 4.25, termYears: 5, paymentsPerYear: 12, extraPayment: 100 },
  dcf: { initialInvestments: [-50000], operatingCashFlows: [9000, 11000, 14000, 18000], salvageValue: 5000, periodicity: 'quarterly', discountRate: 0.1, useWACC: false },
  'interest-rate-sensitivity': { principal: 50000, baseAPR: 4.25, termYears: 5, paymentsPerYear: 12, testRange: 1, stepSize: 0.3 },
  'capm-portfolio': { riskFreeRate: 0.02, marketReturn: 0.08, marketStdDev: 0.12, betaA: 1.4, muA: 0.11, sigmaA: 0.18, betaB: 0.6, muB: 0.06, sigmaB: 0.1, correlation: -0.2, weightA: 0.35 },
  'portfolio-analysis': { assets: [{ expectedReturn: 8, volatility: 12, beta: 0.9 }, { expectedReturn: 6, volatility: 7, beta: 0.4 }, { expectedReturn: 11, volatility: 20, beta: 1.3 }], weights: [0.4, 0.35, 0.25], correlationMatrix: [[1, 0.2, 0.5], [0.2, 1, 0.1], [0.5, 0.1, 1]], riskFreeRate: 2.5 },
  'working-capital-ccc': { currentAssets: 80000, currentLiabilities: 0, inventory: 20000, accountsReceivable: 10000, accountsPayable: 15000, annualCreditSales: 600000, annualCOGS: 300000, daysBasis: 360 },
  'simple-regression': { dataPoints: [{ x: 1, y: 10 }, { x: 2, y: 14 }, { x: 3, y: 13 }, { x: 4, y: 19 }, { x: 5, y: 21 }], forecastHorizon: 3, confidenceLevel: 99 },
  'multiple-regression': { data: [{ y: 12, x1: 1, x2: 4 }, { y: 16, x1: 2, x2: 1 }, { y: 19, x1: 3, x2: 5 }, { y: 24, x1: 4, x2: 2 }, { y: 29, x1: 5, x2: 6 }], forecastHorizon: 3, forecastInputs: { x1: 6, x2: 3, x1Growth: 0.02, x2Growth: -0.01 } },
  'profit-maximization': { demandA: 75, demandB: 0.3, fixedCost: 2000, marginalCost: 15 },
  'optimal-pricing': { mode: 'estimate_epsilon', marginalCost: 8, p1: 20, q1: 300, p2: 30, q2: 150 }
};

for (const [endpoint, payload] of Object.entries(payloads)) test(`${endpoint} accepts two valid inputs, is deterministic, and rejects invalid input`, async () => {
  const response = await fetch(`${baseUrl}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.success, true);
  const alternateResponse = await fetch(`${baseUrl}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(alternatePayloads[endpoint]) }); const alternateBody = await alternateResponse.json(); assert.equal(alternateResponse.status, 200); assert.equal(alternateBody.success, true);
  const repeatResponse = await fetch(`${baseUrl}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); assert.deepEqual((await repeatResponse.json()).result, body.result);
  const invalid = await fetch(`${baseUrl}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); const invalidBody = await invalid.json(); assert.equal(invalid.status, 400); assert.equal(invalidBody.error.code, 'INVALID_INPUT');
});