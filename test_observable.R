library(spacetimeview)

set.seed(123)
data <- data.frame(
  lat = runif(100, min = -30, max = 30),
  lng = runif(100, min = -100, max = 100),
  timestamp = seq(as.POSIXct("2025-01-01"), by = "days", length.out = 100),
  temperature = runif(100, min = 10, max = 35),
  humidity = runif(100, min = 30, max = 90)
)

observable_code <- "
Plot.plot({
  marks: [
    Plot.rectY(data, Plot.binX({y: 'count'}, {x: 'temperature', fill: 'steelblue'})),
    Plot.ruleY([0])
  ],
  x: {
    label: 'Temperature (°C)'
  },
  y: {
    label: 'Count'
  },
  width: 400,
  height: 300
})
"

plot <- spacetimeview(
  data = data,
  column_to_plot = 'temperature',
  style = 'Summary',
  aggregate = 'MEAN',
  observable = observable_code,
  header_title = 'Temperature Data with Observable Plot Tooltips'
)

print(plot)