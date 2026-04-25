# Premier League Predictor: Bivariate Poisson Engine

## 1. Executive Summary

This project aims to build a decoupled predictive engine that calculates football match probabilities to identify positive Expected Value (EV) in sports betting markets. Moving beyond static analysis, it functions as a full-stack interactive dashboard, processing historical data to deliver real-time statistical insights, exact score projections, and contextual form analysis.

## 2. System Architecture & Tech Stack

The project is decoupled into three main layers to ensure scalability and performance:

- **Database (PostgreSQL):** Migration from a raw SQLite dataset to a relational database. It stores +3000 historical matches and utilizes SQL Views to dynamically calculate team offensive and defensive strengths.
- **Backend (FastAPI - Python):** A RESTful API that handles the mathematical processing. It calculates expected goals (λ) and generates the Poisson probability matrices.
- **Frontend (Next.js - React):** A responsive, client-side dashboard styled with Tailwind CSS. It features a dark/light mode toggle, dynamic tabs for 1X2 probabilities, exact score projections, and an automated interpretation engine.

## 3. Mathematical Framework

Football goals can be modeled as independent discrete events occurring in a fixed interval of time. Therefore, we utilize the **Poisson Distribution** to calculate the probability of each team scoring $k$ goals.

The Probability Mass Function (PMF) used is:
$$P(X=k) = \frac{\lambda^k e^{-\lambda}}{k!}$$

Where $\lambda$ (Expected Goals) is calculated dynamically using formulas that involve:

1. League Average Goals (Home & Away)
2. Team Attack Strength
3. Team Defense Strength

To calculate the probability of specific outcomes (e.g., Home Win, Draw), the model computes a Bivariate Poisson matrix, summing the probabilities of the corresponding exact scorelines.

## 4. Backtesting and Risk Analysis

- **Accuracy:** The baseline model was tested against historical data, achieving an accuracy of **53.26%** in predicting the Exact Match Result (Home/Draw/Away).
- **Value Betting (Expected Value):** By comparing the model's probabilities against historical bookmaker odds, we identified instances of positive Expected Value ($EV > 1.10$), demonstrating a clear statistical edge over the market.

## 5. How to Run Locally

1. Clone the repository and configure the PostgreSQL database using the provided SQL dump.
2. Start the Backend API: `cd backend` -> `uvicorn main:app --reload` (Runs on port 8000).
3. Start the Frontend Dashboard: `cd frontend` -> `npm run dev` (Runs on port 3000).
