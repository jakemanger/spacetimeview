devtools::load_all()

# Create sample datasets
data1 <- data.frame(
  lat = runif(100, min = -30, max = 30),
  lng = runif(100, min = -100, max = 100),
  time = seq(as.POSIXct("2023-01-01"), by = "days", length.out = 100),
  value = runif(100, min = 0, max = 10),
  temperature = runif(100, min = 5, max = 35)
)

data2 <- data.frame(
  lat = runif(100, min = 30, max = 60),
  lng = runif(100, min = -50, max = 50),
  time = seq(as.POSIXct("2023-01-01"), by = "days", length.out = 100),
  value = runif(100, min = 10, max = 20),
  humidity = runif(100, min = 30, max = 90)
)

data3 <- data.frame(
  lat = runif(100, min = -60, max = -30),
  lng = runif(100, min = 0, max = 150),
  time = seq(as.POSIXct("2023-01-01"), by = "days", length.out = 100),
  value = runif(100, min = 20, max = 30),
  precipitation = runif(100, min = 0, max = 50)
)

# Create individual spacetimeview objects
view1 <- spacetimeview(
  data = data1, 
  style = "Summary",
  header_title = "Region 1 Data",
  column_to_plot = "value"
)

view2 <- spacetimeview(
  data = data2, 
  style = "Scatter",
  header_title = "Region 2 Data",
  column_to_plot = "value"
)

view3 <- spacetimeview(
  data = data3, 
  header_title = "Region 3 Data",
  column_to_plot = "value"
)

# Method 1: Using the spacetimetabs function directly
tabs1 <- spacetimetabs(
  view1, view2, view3,
  tab_titles = c("Region 1", "Region 2", "Region 3"),
  width = "100%",
  height = "600px"
)

print(tabs1)

# # Method 2: Using the + operator
# combined_views <- view1 + view2 + view3
# tabs2 <- spacetimetabs(combined_views)

# # Set custom tab titles for the combined views
# combined_views_with_titles <- view1 + view2 + view3 %>%
#   set_tab_titles(c("South Region", "North Region", "Antarctica"))
# tabs3 <- spacetimetabs(combined_views_with_titles)

# # Save the widget to an HTML file
# htmlwidgets::saveWidget(tabs3, "spacetime_tabs_example.html")

# # Display in R
# tabs3 