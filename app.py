from flask import Flask, render_template, request, jsonify
import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from datetime import datetime

app = Flask(__name__)

TICKERS = {
    "Apple": "AAPL",
    "Microsoft": "MSFT",
    "NVIDIA": "NVDA",
    "Reliance": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "Infosys": "INFY.NS",
    "HDFC Bank": "HDFCBANK.NS",
    "ICICI Bank": "ICICIBANK.NS"
}

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = -delta.clip(upper=0).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def analyze_stock(ticker, period):
    stock = yf.Ticker(ticker)
    df = stock.history(period=period, auto_adjust=True)

    if df.empty or len(df) < 100:
        raise ValueError("Not enough stock data available. Try another stock or time period.")

    df = df.copy()
    df["Return"] = df["Close"].pct_change()
    df["MA_5"] = df["Close"].rolling(5).mean()
    df["MA_10"] = df["Close"].rolling(10).mean()
    df["MA_20"] = df["Close"].rolling(20).mean()
    df["Volatility"] = df["Return"].rolling(10).std()
    df["Volume_Change"] = df["Volume"].pct_change()
    df["RSI"] = calculate_rsi(df["Close"])

    # Predict whether the next trading session closes higher
    df["Target"] = (df["Close"].shift(-1) > df["Close"]).astype(int)

    features = [
        "Return", "MA_5", "MA_10", "MA_20",
        "Volatility", "Volume_Change", "RSI"
    ]

    clean = df.dropna(subset=features).copy()

    # Remove the last row because its future target is unknown
    training_data = clean.iloc[:-1]

    if len(training_data) < 80:
        raise ValueError("Not enough usable data to train the model.")

    X = training_data[features].replace([np.inf, -np.inf], np.nan)
    y = training_data["Target"]
    valid = X.notna().all(axis=1)
    X = X[valid]
    y = y[valid]

    split = int(len(X) * 0.8)
    if split < 30 or len(X) - split < 10:
        raise ValueError("Not enough data for model evaluation.")

    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=6,
        random_state=42,
        class_weight="balanced"
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions) * 100

    latest = clean.iloc[-1:][features].replace([np.inf, -np.inf], np.nan)
    if latest.isna().any().any():
        raise ValueError("Latest stock indicators are incomplete.")

    probabilities = model.predict_proba(latest)[0]
    classes = list(model.classes_)
    up_probability = float(probabilities[classes.index(1)]) if 1 in classes else 0
    down_probability = float(probabilities[classes.index(0)]) if 0 in classes else 0

    prediction = "UP" if up_probability >= down_probability else "DOWN"

    chart_df = df.dropna(subset=["Close"]).tail(90)

    history = []
    for date, row in chart_df.iterrows():
        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "price": round(float(row["Close"]), 2),
            "volume": int(row["Volume"])
        })

    return {
        "ticker": ticker,
        "prediction": prediction,
        "up_probability": round(up_probability * 100, 2),
        "down_probability": round(down_probability * 100, 2),
        "accuracy": round(accuracy, 2),
        "current_price": round(float(df["Close"].iloc[-1]), 2),
        "change": round(float(df["Close"].pct_change().iloc[-1]) * 100, 2),
        "rsi": round(float(clean["RSI"].iloc[-1]), 2),
        "history": history,
        "last_updated": datetime.now().strftime("%d %b %Y, %I:%M %p")
    }


@app.route("/")
def home():
    return render_template("index.html", tickers=TICKERS, active="dashboard")


@app.route("/market-analysis")
def market_analysis():
    return render_template("index.html", tickers=TICKERS, active="market")


@app.route("/predictions")
def predictions():
    return render_template("index.html", tickers=TICKERS, active="predictions")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    ticker = data.get("ticker", "AAPL")
    period = data.get("period", "1y")

    if ticker not in TICKERS.values():
        return jsonify({"error": "Invalid stock selection."}), 400

    if period not in ["6mo", "1y", "2y", "5y"]:
        return jsonify({"error": "Invalid time period."}), 400

    try:
        result = analyze_stock(ticker, period)
        return jsonify(result)
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/health")
def health():
    return jsonify({"status": "StockCast is running"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

