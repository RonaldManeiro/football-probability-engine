# Premier League Predictor: Bivariate Poisson Engine ⚽📊

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://premier-league-predictor-rho.vercel.app/)
[![Backend](https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge&logo=render)](https://premier-league-api-98bw.onrender.com/equipos)
[![Database](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=for-the-badge&logo=postgresql)](https://neon.tech/)

> 🚀 **Live Demo:** [Visit the live web application here](https://premier-league-predictor-rho.vercel.app/)

## 1. Executive Summary

This project aims to build a decoupled predictive engine that calculates football match probabilities to identify positive Expected Value (EV) in sports betting markets. Moving beyond static analysis, it functions as an actuarial risk management dashboard, processing historical data to deliver real-time statistical insights, exact score projections, and contextual form analysis.

Developed as an applied statistical research project, the engine avoids subjective bias by relying entirely on quantitative modeling, transforming sports markets into a manageable investment portfolio.

## 2. System Architecture & Cloud Tech Stack

The project operates on a modern, decoupled Three-Tier Architecture, fully deployed to the cloud:

- **Database (Neon.tech - Serverless PostgreSQL):** Migration from a raw SQLite dataset to a cloud relational database. It stores +3000 historical matches and utilizes dynamic SQL Views (`team_strengths`) to calculate team offensive and defensive inertia without overloading the backend memory.
- **Backend API (Render - FastAPI / Python):** A RESTful API that handles the heavy mathematical processing. It uses **SciPy** and **NumPy** to calculate expected goals (λ), generate Bivariate Poisson probability matrices, and apply dependency adjustments.
- **Frontend Client (Vercel - Next.js / React):** A responsive, client-side dashboard styled with **Tailwind CSS**. It features asynchronous stochastic data visualization using **Recharts**, dynamically rendering Probability Mass Functions (PMF), 1X2 market limits, and an automated interpretation engine for risk management.

## 3. Mathematical Framework

### The Poisson Process

Football goals are modeled as discrete events occurring in a continuous interval of time (t = 90 min). We utilize the **Poisson Distribution** to calculate the probability of a team scoring k goals. The Probability Mass Function (PMF) is defined as:

$$P(X=k) = \frac{\lambda^k e^{-\lambda}}{k!}$$

Where λ (Expected Goals) is dynamically derived from:

1. League Average Goals
2. Team Attack Strength (Parametric deviation)
3. Opponent Defense Weakness

### Dixon-Coles Adjustment & Bivariate Matrix

To calculate match outcomes (Home Win, Draw, Away Win), the model generates a Bivariate Poisson matrix using `np.outer`. However, to correct the standard assumption of independence and accurately capture the tactical friction of low-scoring draws (0-0, 1-1), a dependency parameter (ρ = -0.06) is applied following the **Dixon-Coles (1997)** framework.

### Risk Management (Kelly Criterion)

To mitigate the risk of ruin (Gambler's Ruin), the system automates capital allocation using the **Kelly Criterion**, suggesting optimal investment fractions only when Positive Expected Value (EV > 0) is detected.

## 4. Empirical Validation & Backtesting

The mathematical engine was subjected to a rigorous backtesting simulation across a historical dataset of European leagues to validate its strategic viability against simulated bookmaker overrounds.

- **Sample Size:** 3,040 official matches.
- **Execution Rule:** Strict EV > 0.05 filter (Value Bet detection only).
- **Total Executed Trades:** 1,063 matches.
- **Strategic Winrate:** 62.46% (664 successful predictions).
- **Cumulative ROI (Return on Investment):** **321.84%**

_These results mathematically demonstrate that the integration of dynamic strength parameters and strict capital management successfully overcomes the negative expected value of the market._

## 5. How to Run Locally

If you want to clone the repository and run the mathematical engine in your local environment, follow these steps:

### Prerequisites

- Python 3.10+
- Node.js (v18+)
- Git
- PostgreSQL

### Installation Steps

**1. Clone the repository:**
`git clone https://github.com/RonaldManeiro/football-probability-engine.git`
`cd football-probability-engine`

**2. Setup the Backend (FastAPI):**
`cd backend`
`python -m venv venv`
`source venv/bin/activate` _(On Windows use: `venv\Scripts\activate`)_
`pip install -r requirements.txt`

_Create a `.env` file in the `backend` folder and add your local PostgreSQL connection string (or use the cloud DB):_
`DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/football_predict_db`

_Run the API:_
`uvicorn main:app --reload --port 8000`

**3. Setup the Frontend (Next.js):**
_Open a new terminal window:_
`cd frontend`
`npm install`

_In your `page.js` or API call functions, ensure the fetch URLs point to `http://127.0.0.1:8000` for local development._

_Run the Client:_
`npm run dev`

Navigate to `http://localhost:3000` to view the dashboard.

---

## 👨‍💻 Author

**Ronald Maneiro**
_Statistics and Actuarial Science Student | Universidad Central de Venezuela (UCV)_

Passionate about data engineering, stochastic processes, and sports analytics.
