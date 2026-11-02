const message = document.getElementById("message");
const button = document.getElementById("analyzeBtn");

function formatPrice(value) {
    return Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function analyzeStock() {
    const ticker = document.getElementById("ticker").value;
    const period = document.getElementById("period").value;

    button.disabled = true;
    button.textContent = "ANALYZING...";
    message.className = "message";
    message.textContent = "Downloading stock data and training the prediction model...";

    try {
        const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ticker, period})
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to analyze this stock.");
        }

        document.getElementById("price").textContent = formatPrice(data.current_price);
        document.getElementById("accuracy").textContent = data.accuracy + "%";
        document.getElementById("rsi").textContent = data.rsi;
        document.getElementById("prediction").textContent = data.prediction;

        const predictionElement = document.getElementById("prediction");
        predictionElement.style.color =
            data.prediction === "UP" ? "#39d98a" : "#ff667a";

        document.getElementById("change").textContent =
            (data.change >= 0 ? "+" : "") + data.change + "% latest daily change";

        document.getElementById("confidence").textContent =
            "Estimated " + Math.max(data.up_probability, data.down_probability) + "% probability";

        document.getElementById("upValue").textContent = data.up_probability + "%";
        document.getElementById("downValue").textContent = data.down_probability + "%";

        document.getElementById("upBar").style.width = data.up_probability + "%";
        document.getElementById("downBar").style.width = data.down_probability + "%";

        drawCharts(data.history);

        document.getElementById("updated").textContent =
            "Updated " + data.last_updated;

        message.textContent = "Analysis completed successfully for " + ticker + ".";
    } catch (error) {
        message.className = "message error";
        message.textContent = "Error: " + error.message;
    } finally {
        button.disabled = false;
        button.textContent = "ANALYZE STOCK";
    }
}

function drawCharts(history) {
    const dates = history.map(item => item.date);
    const prices = history.map(item => item.price);
    const volumes = history.map(item => item.volume);

    const layout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: {color: "#8492a6"},
        margin: {l: 55, r: 20, t: 15, b: 45},
        xaxis: {gridcolor: "#263244", zerolinecolor: "#263244"},
        yaxis: {gridcolor: "#263244", zerolinecolor: "#263244"},
        showlegend: false
    };

    Plotly.react("priceChart", [{
        x: dates,
        y: prices,
        type: "scatter",
        mode: "lines",
        line: {color: "#39d98a", width: 2},
        fill: "tozeroy",
        fillcolor: "rgba(57,217,138,0.07)"
    }], layout, {responsive: true, displayModeBar: false});

    Plotly.react("volumeChart", [{
        x: dates,
        y: volumes,
        type: "bar",
        marker: {color: "#6d9cff"}
    }], {
        ...layout,
        margin: {l: 55, r: 15, t: 10, b: 40}
    }, {responsive: true, displayModeBar: false});
}

window.addEventListener("DOMContentLoaded", analyzeStock);
