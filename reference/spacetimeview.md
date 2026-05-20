# Visualize Space-Time Data with an Interactive Map and Plots

This function provides a space-time visualization interface for
exploring geospatial and temporal data interactively. Users can toggle
between different plot types (e.g., summary, scatter) and adjust various
controls such as animation speed, radius scale, aggregation method, and
theme. The project is built on top of the `deck.gl` and `react-map-gl`
packages, using grid aggregation methods to summarize data spatially and
temporally, or via a scatter plot to visualize individual data points.

## Usage

``` r
spacetimeview(
  data,
  style = "Summary",
  column_to_plot = "value",
  aggregate = "MEAN",
  repeated_points_aggregate = "None",
  sticky_range = TRUE,
  summary_radius = "auto",
  summary_coverage = 1,
  animation_speed = 1,
  theme = "light",
  radius_scale = 1,
  radius_min_pixels = 3,
  summary_style = "Hexagon",
  projection = "Mercator",
  summary_height = 0,
  color_scheme = "YlOrRd",
  color_scale_type = "quantize",
  num_decimals = 1,
  factor_levels = NULL,
  factor_icons = NULL,
  factor_colors = NULL,
  header_logo = "",
  header_title = "",
  header_website_link = "",
  social_links = c(),
  visible_controls = c("column_to_plot", "style", "color_scheme", "animation_speed",
    "summary_radius", "summary_height", "radius_min_pixels", "aggregate",
    "filter_column"),
  control_names = c(column_to_plot = "Dataset", style = "Plot Type", color_scheme =
    "Color Scheme", animation_speed = "Animation Speed", summary_radius = "Cell Radius",
    summary_height = "Cell Height", radius_min_pixels = "Minimum Point Radius", aggregate
    = "Aggregate", filter_column = "Filter"),
  filter_column = NULL,
  default_filter_value = NULL,
  lat_name = "auto",
  lng_name = "auto",
  time_column_name = "auto",
  plottable_columns = NULL,
  polygons = NULL,
  width = "100vw",
  height = "100vh",
  elementId = NULL,
  observable = NULL,
  ...
)
```

## Arguments

- data:

  A data frame containing space-time data with columns for latitude,
  longitude, timestamp, and one or more value columns. The data frame
  should include at least "lat", "lng", and "timestamp".

- style:

  Character. Initial plot style, either "summary" for aggregated
  visualizations or "scatter" for individual data points.

- column_to_plot:

  Character. The name of the column to visualize on the map. Must be a
  column present in `data` other than "lat", "lng", or "timestamp".

- aggregate:

  Character. Aggregation method for data in summary plots. Options are
  "SUM", "MEAN", "COUNT", "MIN", "MAX", or "MODE".

- repeated_points_aggregate:

  Character. Specifies how to handle multiple points at the same
  location and time. Options include "SUM", "MEAN", "COUNT", "MIN",
  "MAX", and "MODE".

- sticky_range:

  Logical. Whether to keep the min and max color values constant across
  time intervals. Default is `TRUE`.

- summary_radius:

  Numeric. Sets the radius of grid or hexagon cells for summary plots.
  Adjusting this value affects cell size.

- summary_coverage:

  Numeric. Controls the size of grid or hexagon cells as a multiple of
  `summary_radius`. Range is 0 to 1.

- animation_speed:

  Numeric. Speed of time animation, where higher values increase the
  animation speed.

- theme:

  Character. Theme for visualization, either "light" or "dark". This
  setting affects color schemes and overall UI theme.

- radius_scale:

  Numeric. Controls the size of points in scatter plots. Larger values
  increase point radius.

- radius_min_pixels:

  Numeric. Sets the minimum size of scatter plot points in pixels,
  ensuring visibility even when zoomed out.

- summary_style:

  Character. Determines the layout of summary plots, either "grid" or
  "hexagon".

- projection:

  Character. Map projection type, either "mercator" or "globe". Adjusts
  the map display style.

- summary_height:

  Numeric. Sets the height for 3D representation of cells in summary
  plots, adding dimensionality to data.

- color_scheme:

  Character. Color scheme for representing data visually. Options align
  with `colorbrewer` color schemes.

- color_scale_type:

  Character. Type of color scale, either "quantize" or "quantile",
  impacting color distribution on data ranges.

- num_decimals:

  Integer. Number of decimal places shown in the color legend.

- factor_levels:

  List. Optional. Provides factor levels for categorical data, allowing
  for customized color mappings and labels.

- factor_icons:

  List. Optional. Provides paths to images for factor levels. Should be
  a named list where keys are factor column names, and values are named
  lists mapping factor levels to image file paths relative to the
  'public' directory (e.g., list(my_factor_col = list(level1 =
  "icons/icon1.png", level2 = "icons/icon2.png"))).

- header_logo:

  Character. Optional. URL to the logo displayed in the header of the
  visualization.

- header_title:

  Character. Title displayed in the header, typically representing the
  dataset or application name.

- header_website_link:

  Character. URL link attached to the header title or logo, redirecting
  users to a related website.

- social_links:

  Named list. URLs to social media accounts displayed as icons in the
  header. Supports keys like 'github', 'twitter', 'facebook',
  'linkedin', etc., which map to the respective profile URLs. For
  example:
  `social_links = c(github = "https://github.com/jakemanger", twitter = "https://twitter.com/jakemanger")`

- visible_controls:

  Character vector. List of control names to display in the interface.
  Controls include "column_to_plot", "style", "color_scheme",
  "animation_speed", etc.

- control_names:

  Named list. Custom names for controls as displayed in the UI. Keys
  correspond to control identifiers (e.g., "column_to_plot") and values
  to the display names.

- default_filter_value:

  Character or numeric vector. Optional. Default values to apply as
  filters when the visualization loads. Should correspond to factor
  level names or numeric values in the filter column.

- polygons:

  sf or list object. Optional. Polygons to display on the map, such as
  state or country boundaries. Can be an sf object with POLYGON or
  MULTIPOLYGON geometry or a list with GeoJSON structure.

- observable:

  Character. Optional. Observable Plot code to be executed in tooltips.
  The code can reference column names from the dataset and will be
  executed with the filtered data for the current location/time. Only
  activated when this parameter is provided.

## Value

An interactive space-time viewer for visualizing and exploring data.

## Examples

``` r
library(spacetimeview)

# Create a sample data frame with latitude, longitude, and time
data <- data.frame(
  lat = runif(100, min = -30, max = 30),
  lng = runif(100, min = -100, max = 100),
  time = seq(as.POSIXct("2023-01-01"), by = "days", length.out = 100),
  value = runif(100, min=0, max=10)
)

# Generate the plot using spacetimeview
plot <- spacetimeview(data)
#> Auto-detected time column: `time`
#> Warning: column_to_plot was not specified. Defaulting to `value`
#> [1] "Automatically determined summary radius: 908381.737136417"
#> Error in data %>% dplyr::mutate(dplyr::across(where(is.numeric) & !where(is.integer),     ~round(.x, json_digits))): could not find function "%>%"

# Save the plot as an HTML file
htmlwidgets::saveWidget(plot, "spacetime_plot.html")
#> Error in x$elementId: object of type 'closure' is not subsettable

# plotting data with a specific aggregate, projection, a header title and social media links
plot2 <- spacetimeview(
  data = data, 
  aggregate = 'MEAN', 
  projection = 'mercator', 
  header_title = 'BOM Weather Data',
  social_links = c(
    'github' = 'https://github.com/jakemanger/spacetimeview', 
    'twitter' = 'https://twitter.com/jakemanger'
  )
)
#> Auto-detected time column: `time`
#> Warning: column_to_plot was not specified. Defaulting to `value`
#> [1] "Automatically determined summary radius: 811328.473099907"
#> Error in data %>% dplyr::mutate(dplyr::across(where(is.numeric) & !where(is.integer),     ~round(.x, json_digits))): could not find function "%>%"

# Save the plot as an HTML file
htmlwidgets::saveWidget(plot2, "spacetime_plot_with_website_header.html")
#> Error: object 'plot2' not found
```
