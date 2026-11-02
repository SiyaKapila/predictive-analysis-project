# StockCast – Stock Trend Prediction

StockCast is a student predictive-analytics project that uses historical stock-market data
and a Random Forest classifier to estimate whether the next trading day's closing price
may move up or down.

## Features
- Downloads historical stock data using yfinance
- Displays historical closing prices
- Calculates returns, moving-average ratios, volatility, volume change and RSI
- Trains a Random Forest classification model
- Uses a chronological 80/20 train-test split
- Displays test metrics and next-day model probabilities
- Provides an interactive Streamlit dashboard

## Run locally

1. Open Terminal and enter the project folder.
2. Create and activate a virtual environment:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:

   ```bash
   python3 -m pip install -r requirements.txt
   ```

4. Start the dashboard:

   ```bash
   python3 -m streamlit run app.py
   ```

## Example stocks
- Reliance Industries (RELIANCE.NS)
- TCS (TCS.NS)
- Infosys (INFY.NS)
- HDFC Bank (HDFCBANK.NS)
- Apple (AAPL)
- Microsoft (MSFT)

## Important limitation
This is an educational prototype, not financial advice. It predicts direction rather than
an exact future price. Market data can be incomplete or delayed, and model probabilities
are not guaranteed real-world probabilities. Do not use this project alone to make
investment decisions.
