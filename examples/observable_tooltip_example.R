library(spacetimeview)

set.seed(123)
n_points <- 200

# some example weather data
data <- data.frame(
  lat = runif(n_points, min = -40, max = 40),
  lng = runif(n_points, min = -120, max = 120),
  timestamp = rep(seq(as.POSIXct("2023-01-01"), by = "days", length.out = 50), 4),
  temperature = runif(n_points, min = -10, max = 40),
  humidity = runif(n_points, min = 20, max = 95),
  pressure = runif(n_points, min = 980, max = 1030),
  wind_speed = runif(n_points, min = 0, max = 25)
)

histogram_code <- "
Plot.plot({
    marks: [
        Plot.rectY(
            data,
            Plot.binX({y: 'count'}, {x: 'temperature', fill: 'steelblue'})
        ),
        Plot.ruleY([0])
    ],
    x: {
        label: 'Temperature (°C)',
        grid: true
    },
    y: {
        label: 'Count',
        grid: true
    },
    title: 'Temperature Distribution',
    width: 400,
    height: 300
})
"

plot1 <- spacetimeview(
  data = data,
  column_to_plot = 'temperature',
  style = 'Summary',
  aggregate = 'MEAN',
  observable = histogram_code,
  header_title = 'Weather Data - Histogram Tooltips'
)

scatter_code <- "
Plot.plot({
    marks: [
        Plot.dot(
            data,
            {x: 'temperature', y: 'humidity', fill: 'orange', opacity: 0.7}
        ),
        Plot.linearRegressionY(
            data, 
            {x: 'temperature', y: 'humidity', stroke: 'red'}
        )
    ],
    x: {
        label: 'Temperature (°C)',
        grid: true
    },
    y: {
        label: 'Humidity (%)',
        grid: true
    },
    title: 'Temperature vs Humidity',
    width: 400,
    height: 300
})
"

plot2 <- spacetimeview(
  data = data,
  column_to_plot = 'humidity',
  style = 'Scatter',
  observable = scatter_code,
  header_title = 'Weather Data - Scatter Plot Tooltips'
)


timeseries_code <- "
Plot.plot({
    marks: [
        Plot.lineY(data, {x: 'timestamp', y: 'temperature', stroke: 'blue'}),
        Plot.dot(data, {x: 'timestamp', y: 'temperature', fill: 'blue', r: 2})
    ],
    x: {
        label: 'Date',
        type: 'time'
    },
    y: {
        label: 'Temperature (°C)',
        grid: true
    },
    title: 'Temperature Over Time',
    width: 400,
    height: 300
})
"


plot3 <- spacetimeview(
  data = data,
  column_to_plot = 'temperature',
  style = 'Summary',
  aggregate = 'MEAN',
  observable = timeseries_code,
  header_title = 'Weather Data - Time Series Tooltips'
)


boxplot_code <- "
Plot.plot({
    marks: [
        Plot.boxY(
            [
                ...data.map(
                    d => ({variable: 'Temperature', value: d.temperature})
                ),
                ...data.map(
                    d => ({variable: 'Humidity', value: d.humidity / 2})
                ),
                ...data.map(
                    d => ({variable: 'Wind Speed', value: d.wind_speed})
                )
            ], 
            {x: 'variable', y: 'value', fill: 'variable'}
        )
    ],
    x: {
        label: 'Variable'
    },
    y: {
        label: 'Value',
        grid: true
    },
    title: 'Weather Variables Comparison',
    color: {
        legend: true
    },
    width: 400,
    height: 300
})
"

plot4 <- spacetimeview(
  data = data,
  column_to_plot = 'wind_speed',
  style = 'Summary',
  aggregate = 'MEAN',
  observable = boxplot_code,
  header_title = 'Weather Data - Box Plot Tooltips'
)

# display all seperated by tabs
tabs <- plot1 + plot2 + plot3 + plot4

names(tabs) <- c("Histogram", "Scatter", "Time Series", "Box Plot")

print(tabs)