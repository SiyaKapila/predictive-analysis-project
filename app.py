import streamlit as st
import yfinance as yf
import pandas as pd
import numpy as np
import plotly.graph_objects as go

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

st.set_page_config(page_title="StockCast", page_icon="📈", layout="wide")

st.title("StockCast")
st.caption("Explore historical stock trends and estimate the next trading day's direction.")
st.warning(
    "Educational project only. Predictions are uncertain and are not investment advice. "
    "The model uses historical market data and does not guarantee future results."
)

DEFAULT_TICKERS = {
    "Reliance Industries": "RELIANCE.NS",
    "Tata Consultancy Services": "TCS.NS",
    "Infosys": "INFY.NS",
    "HDFC Bank": "HDFCBANK.NS",
    "Apple": "AAPL",
    "Microsoft": "MSFT",
}

FEATURES = [
    "return_1d",
    "return_5d",
    "ma_ratio_5",
    "ma_ratio_20",
    "volatility_5",
    "volatility_20",
    "volume_change",
    "rsi_14",
]


@st.cache_data(ttl=900)
def get_stock_data(ticker: str, period: str) -> pd.DataFrame:
    data = yf.download(
        ticker,
        period=period,
        interval="1d",
        auto_adjust=True,
        progress=False,
        threads=False,
    )

    if data.empty:
        return pd.DataFrame()

    # Recent yfinance versions can return multi-level column names.
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    required = ["Close", "Volume"]
    if not all(column in data.columns for column in required):
        return pd.DataFrame()

    data = data[required].copy()
    data = data.dropna()
    data["Close"] = pd.to_numeric(data["Close"], errors="coerce")
    data["Volume"] = pd.to_numeric(data["Volume"], errors="coerce")
    return data.dropna()


def calculate_rsi(series: pd.Series, window: int = 14) -> pd.Series:
    change = series.diff()
    gains = change.clip(lower=0)
    losses = -change.clip(upper=0)

    average_gain = gains.rolling(window).mean()
    average_loss = losses.rolling(window).mean()

    relative_strength = average_gain / average_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + relative_strength))
    return rsi.fillna(50)


def make_features(data: pd.DataFrame) -> pd.DataFrame:
    result = data.copy()
    close = result["Close"]

    result["return_1d"] = close.pct_change()
    result["return_5d"] = close.pct_change(5)
    result["ma_ratio_5"] = close / close.rolling(5).mean() - 1
    result["ma_ratio_20"] = close / close.rolling(20).mean() - 1
    result["volatility_5"] = result["return_1d"].rolling(5).std()
    result["volatility_20"] = result["return_1d"].rolling(20).std()
    result["volume_change"] = result["Volume"].pct_change().replace(
        [np.inf, -np.inf], np.nan
    )
    result["rsi_14"] = calculate_rsi(close)

    # Target: 1 if the next trading day's closing price is higher, otherwise 0.
    result["target"] = (close.shift(-1) > close).astype(int)
    result.loc[close.shift(-1).isna(), "target"] = np.nan

    result = result.replace([np.inf, -np.inf], np.nan)
    return result


def money(value: float) -> str:
    return f"{value:,.2f}"


with st.sidebar:
    st.header("Stock settings")
    selected_name = st.selectbox("Choose a stock", list(DEFAULT_TICKERS.keys()))
    ticker = DEFAULT_TICKERS[selected_name]
    period = st.selectbox("Historical data period", ["1y", "2y", "5y", "10y"], index=2)
    st.caption(f"Ticker: {ticker}")
    refresh = st.button("Refresh data")

if refresh:
    get_stock_data.clear()

with st.spinner("Downloading historical stock data..."):
    raw_data = get_stock_data(ticker, period)

if raw_data.empty or len(raw_data) < 80:
    st.error(
        "Stock data could not be loaded or there is not enough history. "
        "Check your internet connection or try another stock."
    )
    st.stop()

featured = make_features(raw_data)
training_data = featured.dropna(subset=FEATURES + ["target"]).copy()

if len(training_data) < 50:
    st.error("Not enough clean data to train the model. Try a longer historical period.")
    st.stop()

# Chronological split: earlier observations train the model; later observations test it.
split_index = int(len(training_data) * 0.8)
train = training_data.iloc[:split_index]
test = training_data.iloc[split_index:]

if train.empty or test.empty:
    st.error("Not enough data for a training and testing split.")
    st.stop()

model = RandomForestClassifier(
    n_estimators=250,
    max_depth=6,
    min_samples_leaf=4,
    random_state=42,
    class_weight="balanced",
)
model.fit(train[FEATURES], train["target"].astype(int))

test_predictions = model.predict(test[FEATURES])
accuracy = accuracy_score(test["target"].astype(int), test_predictions)

latest_features = featured.dropna(subset=FEATURES).iloc[[-1]]
latest_prediction = int(model.predict(latest_features[FEATURES])[0])
probabilities = model.predict_proba(latest_features[FEATURES])[0]
class_to_probability = dict(zip(model.classes_, probabilities))
up_probability = float(class_to_probability.get(1, 0.0))
down_probability = float(class_to_probability.get(0, 0.0))

last_close = float(raw_data["Close"].iloc[-1])
last_date = raw_data.index[-1].strftime("%d %b %Y")

col1, col2, col3, col4 = st.columns(4)
col1.metric("Latest closing price", money(last_close))
col2.metric("Last data date", last_date)
col3.metric("Test accuracy", f"{accuracy:.1%}")
col4.metric("Historical records", f"{len(raw_data):,}")

st.subheader(f"{selected_name}: historical price")
price_chart = go.Figure()
price_chart.add_trace(
    go.Scatter(
        x=raw_data.index,
        y=raw_data["Close"],
        mode="lines",
        name="Adjusted close",
    )
)
price_chart.update_layout(
    xaxis_title="Date",
    yaxis_title="Price",
    height=420,
    margin=dict(l=10, r=10, t=25, b=10),
)
st.plotly_chart(price_chart, use_container_width=True)

st.subheader("Next trading day direction estimate")
left, right = st.columns([1, 2])

with left:
    if latest_prediction == 1:
        st.success("Model estimate: UP")
    else:
        st.error("Model estimate: DOWN")
    st.metric("Estimated probability of an upward move", f"{up_probability:.1%}")
    st.metric("Estimated probability of a downward move", f"{down_probability:.1%}")
    st.caption(
        "These are model probabilities, not reliable real-world odds or a recommendation to trade."
    )

with right:
    probability_chart = go.Figure(
        data=[
            go.Bar(
                x=["Down", "Up"],
                y=[down_probability, up_probability],
                text=[f"{down_probability:.1%}", f"{up_probability:.1%}"],
                textposition="auto",
            )
        ]
    )
    probability_chart.update_layout(
        yaxis_title="Model probability",
        yaxis=dict(range=[0, 1], tickformat=".0%"),
        height=300,
        margin=dict(l=10, r=10, t=25, b=10),
    )
    st.plotly_chart(probability_chart, use_container_width=True)

st.subheader("Model evaluation")
st.write(
    "The model is trained on the earlier 80% of the available observations "
    "and evaluated on the later 20%, preserving time order."
)
report = classification_report(
    test["target"].astype(int),
    test_predictions,
    labels=[0, 1],
    target_names=["Down / unchanged", "Up"],
    output_dict=True,
    zero_division=0,
)
report_df = pd.DataFrame(report).transpose().round(3)
st.dataframe(report_df, use_container_width=True)

with st.expander("View recent historical data"):
    st.dataframe(raw_data.tail(15), use_container_width=True)

st.caption(
    "StockCast is a student predictive-analytics prototype. "
    "Past performance does not predict future results."
)
