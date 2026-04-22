# Probabilistics Football Prediction Engine: A Bivariate Poisson Model

## 1. Execute Summary

- Briefly explain the goal of the project: to build a decoupled predictive engine that calculates football match probabilities to identify positive Expected Value (EV) in sports betting markets.

## 2. Data Engineering & ETL Pipeline

- **Data Source:** Raw SQLite database containing +3000 European football matches.
- **Extration & Transformation:** Use of Python (Pandas) and SQL (JOIN operations) to clean historical data.
- **Storage:** Migration of clean datasets to a **PostgreSQL** relational database for production readiness.

## 3. Mathematical Framework

Football goals can be modeled as independent discrete events occurring in a fixed interval of time. Therefore, we utilize the **Poisson Distribution** to calculate the probability of each team scoring $k$ goals.
The Probability Mass Function (PMF) used is:
$$P(X=k) = \frac{\lambda^k e^{-\lambda}}{k!}$$

Where $\lambda$ (Expected Goals) is calculated dynamically using Common Table Expressions (CTEs) in PostgreSQL based on:

1. League Average Goals
2. Team Attack Strength
3. Team Defense Strength

## 4. Backtesting and Risk Analysis

- **Accuracy:** The model was tested against historical data, achieving an accuracy of **53.26%** in predicting the Exact Match Result (Home/Draw/Away).
- **Value Betting (Expected Value):** By comparing the model's probabilities against Bet365 historical odds, we identified 436 instances of positive Expected Value ($EV > 1.10$), demonstrating a clear statistical edge over the market.

## 5. System Architecture (Upcoming)

- **Backend:** REST API built with FastAPI (Python).
- **Frontend:** Interactive dashboard built with Next.js (React).
- **Deployment:** Containerized environment using Docker.
