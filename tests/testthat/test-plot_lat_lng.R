test_that("plot lat lng data works", {
  data <- read.csv('https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv')
  spacetimeview(data = data)
})

test_that("plot lat lng val data works", {
  data <- read.csv('https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv')
  data$val <- 400
  spacetimeview(data = data)
})

test_that("plot lat lng time with any column data works", {
  # histogram over time plot
  data <- read.csv('https://raw.githubusercontent.com/uber-web/kepler.gl-data/master/earthquakes/data.csv')
  data <- data[,c('Latitude', 'Longitude', 'DateTime', 'Magnitude')]
  names(data) <- c('lat', 'lng', 'timestamp', 'magnitude')
  spacetimeview(data = data)
})