test_that("plot lat lng data works", {
  data <- read.csv('https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv')
  expect_no_error(spacetimeview(data = data))
})

test_that("plot lat lng val data works", {
  data <- read.csv('https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv')
  data$val <- 400
  expect_no_error(spacetimeview(data = data))
})

test_that("plot lat lng time with any column data works", {
  # histogram over time plot
  data <- read.csv('https://raw.githubusercontent.com/uber-web/kepler.gl-data/master/earthquakes/data.csv')
  data <- data[,c('Latitude', 'Longitude', 'DateTime', 'Magnitude')]
  names(data) <- c('lat', 'lng', 'timestamp', 'magnitude')
  expect_no_error(spacetimeview(data = data))
})

test_that('accept all common naming of lat and lng', {
  data <- read.csv('https://raw.githubusercontent.com/uber-web/kepler.gl-data/master/earthquakes/data.csv')
  data <- data[,c('Latitude', 'Longitude', 'DateTime', 'Magnitude')]
  
  possible_names <- list(
    c('lat', 'lng', 'timestamp', 'magnitude'),
    c('LAT', 'LNG', 'timestamp', 'magnitude'),
    c('lat', 'long', 'timestamp', 'magnitude'),
    c('LAT', 'LONG', 'timestamp', 'magnitude'),
    c('latitude', 'longitude', 'timestamp', 'magnitude'),
    c('LATITUDE', 'LONGITUDE', 'timestamp', 'magnitude'),
    c('Y', 'X', 'timestamp', 'magnitude'),
    c('y', 'x', 'timestamp', 'magnitude'),
  )
  
  for (possible_name in possible_names) {
    names(data) <- possible_name
    expect_no_error(spacetimeview(data = data))
  }
})

test_that('time column is automatically detected if not provided', {
  data <- read.csv('https://raw.githubusercontent.com/uber-web/kepler.gl-data/master/earthquakes/data.csv')
  data <- data[,c('Latitude', 'Longitude', 'DateTime', 'Magnitude')]
  
  possible_names <- list(
    c('lat', 'lng', 'timestamp', 'magnitude'),
    c('lat', 'lng', 'TIMESTAMP', 'magnitude'),
    c('lat', 'lng', 'time', 'magnitude'),
  )
  
  for (possible_name in possible_names) {
    names(data) <- possible_name
    expect_no_error(spacetimeview(data = data))
  }
})

test_that('time column works correctly if provided', {
  data <- read.csv('https://raw.githubusercontent.com/uber-web/kepler.gl-data/master/earthquakes/data.csv')
  data <- data[,c('Latitude', 'Longitude', 'DateTime', 'Magnitude')]
  
  possible_names <- list(
    c('lat', 'lng', 'timestamp', 'magnitude'),
    c('lat', 'lng', 'TIMESTAMP', 'magnitude'),
    c('lat', 'lng', 'time', 'magnitude'),
  )
  
  for (possible_name in possible_names) {
    names(data) <- possible_name
    expect_no_error(spacetimeview(data = data, time_column_name = possible_name[3]))
    expect_no_warning(spacetimeview(data = data, time_column_name = possible_name[3], message=''))
  }
})