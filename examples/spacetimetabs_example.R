devtools::load_all()

# make some example datasets
data1 <- data.frame(
  lat = runif(100, min = -30, max = 30),
  lng = runif(100, min = -100, max = 100),
  time = seq(as.POSIXct("2023-01-01"), by = "days", length.out = 100),
  temperature = runif(100, min = 5, max = 35),
  another_column = runif(100, min = 0, max = 10)
)

data2 <- data.frame(
  lat = runif(100, min = 30, max = 60),
  lng = runif(100, min = -50, max = 50),
  time = seq(as.POSIXct("2023-01-01"), by = "days", length.out = 100),
  humidity = runif(100, min = 30, max = 90),
  another_column = runif(100, min = 10, max = 20)
)

data3 <- data.frame(
  lat = runif(100, min = -60, max = -30),
  lng = runif(100, min = 0, max = 150),
  time = seq(as.POSIXct("2023-01-01"), by = "days", length.out = 100),
  precipitation = runif(100, min = 0, max = 50),
  another_column = runif(100, min = 20, max = 30)
)

# create individual spacetimeview objects
view1 <- spacetimeview(
  data = data1, 
  style = "Summary",
  header_title = "Region 1 Data",
  column_to_plot = "temperature"
)

view2 <- spacetimeview(
  data = data2, 
  style = "Scatter",
  header_title = "Region 2 Data",
  column_to_plot = "humidity"
)

view3 <- spacetimeview(
  data = data3, 
  header_title = "Region 3 Data",
  column_to_plot = "precipitation"
)

# combine views with the + operator
# (creates a SpacetimeviewList)
combined_views <- view1 + view2 + view3

# set tab titles
names(combined_views) <- c("Temperature", "Humidity", "Precipitation")

# print the combined views - this will create a spacetimetabs component
print(combined_views)