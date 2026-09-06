# FinFlow Analytics

FinFlow Analytics contains the existing Vite/React frontend and a separate Express REST API. The API is stateless and runs without Vite or a browser, making it deployable to Render.

## Local startup

```bash
npm install
cp .env.example .env
npm run dev       # Frontend: http://localhost:5173
npm start         # API: http://localhost:3000
```

Verification commands:

```bash
npm run build
npm run lint
npm run test:api
```

`PORT` defaults to `3000`; `NODE_ENV` selects the environment; `FRONTEND_ORIGIN` is a comma-separated CORS allowlist. Do not commit `.env`.

## API conventions

`GET /api/health` returns `{"status":"ok","service":"finflow-analytics-api"}`. `GET /api` returns the calculator list. Each calculation endpoint accepts JSON and returns:

```json
{"success":true,"calculator":"dcf","result":{"npv":1234.56}}
```

Invalid requests return JSON with HTTP `400`:

```json
{"success":false,"calculator":"dcf","error":{"code":"INVALID_INPUT","message":"..."}}
```

## Calculator endpoints

All endpoints use `POST`. Listed fields are required unless noted. Each `result` contains numeric outputs and the schedules or series produced by the relevant calculator.

| Endpoint | Required request fields | Key result fields |
| --- | --- | --- |
| `/api/cashflow-forecaster` | `startingCash`, `autoMode`; auto: `baseRevenue`, `baseExpense`, `revenueGrowth`, `expenseGrowth`; manual: 12-item `manualRevenues`, `manualExpenses` | `results`, totals, `endingBalance`, `minCash`, `negativeMonths`, `hasRisk` |
| `/api/break-even-pricing` | costs, price, sales, demand parameters, `competitorCount`, `differentiated`, `competitionFocus`, `barrierToEntry`, `useRecommendations` | market structure, recommendations, break-even results, expected profit |
| `/api/scenario-tester` | cash balance, base revenue/expense/growth, revenue and expense changes | base/scenario cashflows, comparison, impact |
| `/api/loan-amortization` | `principal`, `annualRate`, `termYears`, `paymentsPerYear`, `extraPayment` | payment, schedules, interest totals and savings |
| `/api/dcf` | `initialInvestments`, `operatingCashFlows`, `salvageValue`, `periodicity`, `discountRate`, `useWACC`; WACC inputs when enabled | NPV, IRR, payback periods, cashflow chart data, recommendation |
| `/api/interest-rate-sensitivity` | `principal`, `baseAPR`, `termYears`, `paymentsPerYear`, `testRange`, `stepSize` | base payment and interest, APR scenarios |
| `/api/capm-portfolio` | decimal market/asset rates, betas, volatility, correlation, weight | CAPM, alpha, portfolio metrics, frontier |
| `/api/portfolio-analysis` | assets with return/volatility/beta, normalized weights, correlation matrix, percent risk-free rate | portfolio metrics, beta, CAPM alpha, per-asset alpha |
| `/api/working-capital-ccc` | balance sheet fields, annual sales/COGS, `daysBasis` | working capital, ratios, DSO/DIO/DPO/CCC |
| `/api/simple-regression` | `{x,y}` data points, integer horizon, confidence level | coefficients, fit stats, residuals, forecasts |
| `/api/multiple-regression` | `{x1,x2,y}` rows, integer horizon, forecast inputs/growth | coefficients, fit stats, residuals, forecasts |
| `/api/profit-maximization` | demand intercept/slope, fixed and marginal costs | optimum, profit, elasticity, break-even |
| `/api/optimal-pricing` | mode, marginal cost and either known elasticity calibration or two observed points | elasticity, demand constant, optimum, markup |

Example DCF request:

```bash
curl -X POST http://localhost:3000/api/dcf -H 'content-type: application/json' -d '{"initialInvestments":[-100000],"operatingCashFlows":[30000,35000,40000,25000],"salvageValue":10000,"periodicity":"annual","discountRate":0.12,"useWACC":false}'
```

## AI Finance Agent Integration

Call `GET /api` at startup to discover endpoint names. Select the calculator for the requested analysis, submit its documented JSON object, and consume `result` only after confirming `success: true`. A `400 INVALID_INPUT` response provides machine-readable feedback for correcting assumptions; the agent should never parse UI text or HTML.

## Render deployment

Create a Render Blueprint from this repository. `render.yaml` runs `npm install`, starts with `npm start`, and checks `/api/health`. Set `FRONTEND_ORIGIN` in Render to the Netlify URL or a comma-separated allowlist. Render supplies `PORT` automatically.