
// ----------------------------------
// PAGE NAVIGATION
// ----------------------------------

const overviewPage = document.getElementById("overviewPage");
const presentationPage = document.getElementById("presentationPage");

const overviewNav = document.getElementById("overviewNav");
const presentationNav = document.getElementById("presentationNav");

function showPage(page) {
    const isOverview = page === "overview";

    overviewPage.hidden = !isOverview;
    presentationPage.hidden = isOverview;

    overviewNav.classList.toggle("active", isOverview);
    presentationNav.classList.toggle("active", !isOverview);
}

overviewNav.addEventListener("click", (event) => {
    event.preventDefault();
    showPage("overview");
});

presentationNav.addEventListener("click", (event) => {
    event.preventDefault();
    showPage("presentation");
});

document.getElementById("startPresentation").addEventListener("click", () => {
    showPage("presentation");
});


// ----------------------------------
// PRESENTATION STAGES
// ----------------------------------

let currentStage = 0;
let latestData = null;

const stages = [
    {
        title: "Dataset & Data Collection",
        heading: "Gathering the market data",
        description:
            "StockCast retrieves historical stock market information through Yahoo Finance using the yfinance Python library.",
        explanation:
            "The user selects a stock and time period. The system downloads historical price and trading-volume records. This dataset becomes the foundation for analysis and prediction.",
        details: [
            ["DATA SOURCE", "Yahoo Finance"],
            ["DATA TYPE", "Historical Daily Data"],
            ["MARKET FIELDS", "Open, High, Low, Close, Volume"]
        ]
    },
    {
        title: "Exploratory Data Analysis",
        heading: "Understanding market behaviour",
        description:
            "Exploratory Data Analysis helps identify trends, price movements, volatility and patterns in the collected stock data.",
        explanation:
            "The system calculates average, maximum and minimum prices, daily returns and volatility. Correlation values help examine relationships between the selected technical indicators.",
        details: [
            ["AVERAGE PRICE", "average_price"],
            ["HIGHEST PRICE", "highest_price"],
            ["LOWEST PRICE", "lowest_price"]
        ]
    },
    {
        title: "Preprocessing & Feature Engineering",
        heading: "Preparing data for learning",
        description:
            "Raw market data is cleaned and transformed into useful features that help the machine learning model identify patterns.",
        explanation:
            "Missing indicator values are removed. The system calculates daily returns, moving averages, volatility, volume changes and RSI. The dataset is divided chronologically into training and testing sets.",
        details: [
            ["USABLE RECORDS", "usable_records"],
            ["TRAINING RECORDS", "train_records"],
            ["TESTING RECORDS", "test_records"]
        ]
    },
    {
        title: "Model Selection & Training",
        heading: "Training the prediction model",
        description:
            "StockCast uses a Random Forest Classifier to learn patterns from historical stock indicators.",
        explanation:
            "The Random Forest algorithm combines multiple decision trees. Each tree contributes to the final classification. The model is trained on historical data and estimates whether the next trading session may close higher or lower.",
        details: [
            ["ALGORITHM", "Random Forest"],
            ["DECISION TREES", "150"],
            ["MAXIMUM DEPTH", "6"]
        ]
    },
    {
        title: "Model Evaluation & Results",
        heading: "Measuring model performance",
        description:
            "The trained model is evaluated using historical test data to understand how well it classifies the direction of stock movement.",
        explanation:
            "Accuracy, precision, recall and F1-score measure different aspects of model performance. A confusion matrix shows correct and incorrect classifications. The final prediction displays the model's estimated probabilities.",
        details: [
            ["ACCURACY", "accuracy"],
            ["PRECISION", "precision"],
            ["F1 SCORE", "f1_score"]
        ]
    }
];


function getStageValue(stageIndex, key) {
    if (!latestData) return "Run stock analysis first";

    if (stageIndex === 0) {
        const dataset = latestData.dataset;

        const values = {
            source: dataset.source,
            period: dataset.period,
            records: dataset.records,
            dates: `${dataset.first_date} to ${dataset.last_date}`
        };

        return values[key] ?? "—";
    }

    if (stageIndex === 1) {
        return latestData.eda[key] ?? "—";
    }

    if (stageIndex === 2) {
        return latestData.preprocessing[key] ?? "—";
    }

    if (stageIndex === 3) {
        return latestData.model[key] ?? "—";
    }

    if (stageIndex === 4) {
        return latestData.evaluation[key] ?? "—";
    }

    return "—";
}


function renderStage(index) {
    currentStage = index;

    const stage = stages[index];

    document.getElementById("stageNumber").textContent =
        `STAGE ${String(index + 1).padStart(2, "0")} / 05`;

    document.getElementById("stageProgress").textContent =
        `${(index + 1) * 20}% COMPLETE`;

    document.getElementById("progressFill").style.width =
        `${(index + 1) * 20}%`;

    document.querySelectorAll(".stage-link").forEach((button, i) => {
        button.classList.toggle("active", i === index);
    });

    const detailItems = stage.details.map(([label, key]) => {
        let value;

        if (index === 0) {
            value = getStageValue(index, key);
        } else if (index === 1) {
            value = getStageValue(index, key);
        } else if (index === 2) {
            value = getStageValue(index, key);
        } else if (index === 3) {
            value = getStageValue(index, key);
        } else {
            value = getStageValue(index, key);
            if (typeof value === "number") {
                value = `${value}%`;
            }
        }

        return `
            <div class="detail-box">
                <span>${label}</span>
                <strong>${value ?? "—"}</strong>
            </div>
        `;
    }).join("");

    let extraContent = "";

    if (index === 0 && latestData) {
        extraContent = `
            <div class="explanation-box">
                <h3>Dataset information</h3>
                <p>
                    Source: ${latestData.dataset.source}<br>
                    Selected stock: ${latestData.dataset.ticker}<br>
                    Records collected: ${latestData.dataset.records}<br>
                    Date range: ${latestData.dataset.first_date}
                    to ${latestData.dataset.last_date}
                </p>
            </div>
        `;
    }

    if (index === 1 && latestData) {
        const eda = latestData.eda;

        extraContent = `
            <div class="explanation-box">
                <h3>Additional analysis</h3>
                <p>
                    Average daily return: ${eda.average_daily_return}%<br>
                    Daily volatility: ${eda.daily_volatility}%<br>
                    Missing values in downloaded data: ${eda.missing_values}
                </p>
            </div>
        `;
    }

    if (index === 2 && latestData) {
        const prep = latestData.preprocessing;

        extraContent = `
            <div class="explanation-box">
                <h3>Features created</h3>
                <p>${prep.features.join(" · ")}</p>
                <br>
                <p>
                    Dataset split: ${prep.split}<br>
                    Removed records: ${prep.removed_records}
                </p>
            </div>
        `;
    }

    if (index === 3 && latestData) {
        const importance = latestData.model.feature_importance;

        extraContent = `
            <div class="explanation-box">
                <h3>Feature importance</h3>
                <p>
                    Relative importance calculated by the trained Random Forest model:
                </p>
                <br>
                ${importance.map(item => `
                    <p>${item.feature}: ${item.importance}%</p>
                `).join("")}
            </div>
        `;
    }

    if (index === 4 && latestData) {
        const evaluation = latestData.evaluation;
        const matrix = evaluation.confusion_matrix;

        extraContent = `
            <div class="explanation-box">
                <h3>Confusion matrix</h3>
                <p>
                    Rows represent actual classes and columns represent predicted classes.
                </p>
                <br>
                <p>
                    Actual DOWN → Predicted DOWN: ${matrix[0][0]}<br>
                    Actual DOWN → Predicted UP: ${matrix[0][1]}<br>
                    Actual UP → Predicted DOWN: ${matrix[1][0]}<br>
                    Actual UP → Predicted UP: ${matrix[1][1]}
                </p>
                <br>
                <p>
                    Evaluated on ${evaluation.evaluation_records} historical test records.
                </p>
            </div>
        `;
    }

    if (!latestData) {
        extraContent += `
            <div class="explanation-box">
                <h3>Live project results</h3>
                <p>
                    Run a stock analysis from the Overview page to populate
                    this stage with actual calculated results.
                </p>
            </div>
        `;
    }

    document.getElementById("stageDetails").innerHTML = `
        <div class="eyebrow">${stage.title.toUpperCase()}</div>
        <h2>${stage.heading}</h2>
        <p>${stage.description}</p>
        <div class="detail-grid">${detailItems}</div>
        <div class="explanation-box">
            <h3>What happens in this stage?</h3>
            <p>${stage.explanation}</p>
        </div>
        ${extraContent}
    `;

    document.getElementById("previousStage").disabled = index === 0;

    document.getElementById("nextStage").textContent =
        index === stages.length - 1 ? "Back to overview →" : "Next stage →";
}


document.querySelectorAll(".stage-link").forEach(button => {
    button.addEventListener("click", () => {
        renderStage(Number(button.dataset.stage));
    });
});

document.getElementById("previousStage").addEventListener("click", () => {
    if (currentStage > 0) {
        renderStage(currentStage - 1);
    }
});

document.getElementById("nextStage").addEventListener("click", () => {
    if (currentStage < stages.length - 1) {
        renderStage(currentStage + 1);
    } else {
        showPage("overview");
    }
});

renderStage(0);


// ----------------------------------
// STOCK ANALYSIS
// ----------------------------------

const analyzeButton = document.getElementById("analyzeBtn");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const results = document.getElementById("results");

analyzeButton.addEventListener("click", analyzeStock);

async function analyzeStock() {
    const ticker = document.getElementById("ticker").value;
    const period = document.getElementById("period").value;

    loading.hidden = false;
    errorBox.hidden = true;
    results.hidden = true;
    analyzeButton.disabled = true;

    try {
        const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ticker, period })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to analyze stock.");
        }

        latestData = data;

        document.getElementById("currentPrice").textContent =
            data.current_price.toLocaleString("en-IN");

        const change = document.getElementById("priceChange");
        change.textContent = `${data.change > 0 ? "+" : ""}${data.change}%`;
        change.style.color = data.change >= 0 ? "#c3ed75" : "#e47e70";

        document.getElementById("accuracy").textContent =
            `${data.accuracy}%`;

        document.getElementById("rsi").textContent =
            data.rsi;

        document.getElementById("prediction").textContent =
            data.prediction;

        document.getElementById("prediction").style.color =
            data.prediction === "UP" ? "#c3ed75" : "#e47e70";

        document.getElementById("predictionProbability").textContent =
            `UP ${data.up_probability}% / DOWN ${data.down_probability}%`;

        renderCharts(data.history);
        results.hidden = false;

        // Refresh the currently selected presentation stage with new data
        renderStage(currentStage);

    } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
    } finally {
        loading.hidden = true;
        analyzeButton.disabled = false;
    }
}


// ----------------------------------
// CHARTS
// ----------------------------------

function renderCharts(history) {
    const dates = history.map(item => item.date);
    const prices = history.map(item => item.price);
    const volumes = history.map(item => item.volume);

    const layout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: {
            color: "#929c90",
            family: "DM Mono"
        },
        margin: {
            l: 50,
            r: 20,
            t: 15,
            b: 40
        },
        xaxis: {
            gridcolor: "#293329",
            zerolinecolor: "#293329"
        },
        yaxis: {
            gridcolor: "#293329",
            zerolinecolor: "#293329"
        },
        autosize: true
    };

    Plotly.newPlot("priceChart", [{
        x: dates,
        y: prices,
        type: "scatter",
        mode: "lines",
        line: {
            color: "#c3ed75",
            width: 2
        },
        fill: "tozeroy",
        fillcolor: "rgba(195,237,117,0.06)"
    }], layout, {
        responsive: true,
        displayModeBar: false
    });

    Plotly.newPlot("volumeChart", [{
        x: dates,
        y: volumes,
        type: "bar",
        marker: {
            color: "#78935b"
        }
    }], layout, {
        responsive: true,
        displayModeBar: false
    });
}
