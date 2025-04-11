#' Example of SpaceTimeView with Australian States Polygons
#' 
#' This example demonstrates how to use the polygon feature in spacetimeview
#' to display Australian states as an overlay on the map.

library(spacetimeview)
library(sf)
library(dplyr)

# Optional but recommended for better GeoJSON conversion
if (!requireNamespace("geojsonsf", quietly = TRUE)) {
  install.packages("geojsonsf")
  library(geojsonsf)
} else {
  library(geojsonsf)
}

# Download Australian states polygons
# For this example, we'll use the rnaturalearth package to get the Australian states
if (!requireNamespace("rnaturalearth", quietly = TRUE)) {
  install.packages("rnaturalearth")
}
if (!requireNamespace("rnaturalearthdata", quietly = TRUE)) {
  install.packages("rnaturalearthdata")
}

# Get Australia states
aus_states <- rnaturalearth::ne_states(country = "australia", returnclass = "sf")

# Create sample data points across Australia
set.seed(123)
n_points <- 500

# Australia bounds (approximately)
lat_min <- -39
lat_max <- -10
lng_min <- 113
lng_max <- 154

# Generate random points
sample_data <- data.frame(
  lat = runif(n_points, lat_min, lat_max),
  lng = runif(n_points, lng_min, lng_max),
  value = runif(n_points, 0, 100),
  time = seq(as.POSIXct("2023-01-01"), by = "days", length.out = n_points)
)

# Create the SpaceTimeView with polygons
view <- spacetimeview(
  data = sample_data,
  polygons = aus_states,
  style = "Scatter",
  column_to_plot = "value",
  theme = "light",
  projection = "Mercator",
  header_title = "Australia Data with State Boundaries"
)

# Print the widget to display it directly in an R session
print(view)