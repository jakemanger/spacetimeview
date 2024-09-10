#' Spacetimeview
#'
#' The `spacetimeview` function creates an interactive spatial-temporal visualization using HTML widgets. It is designed to plot geographical data with a time component, making it suitable for applications like tracking the movement of objects over time or visualizing changes in geographical data.
#'
#' @param data A data frame, `sf`, `stars`, or `SpatRaster` object containing the data to visualize. Must include columns for latitude, longitude, and time.
#' @param lat_name Character. Name of the latitude column. Defaults to 'auto', which attempts to automatically detect the correct column.
#' @param lng_name Character. Name of the longitude column. Defaults to 'auto', which attempts to automatically detect the correct column.
#' @param time_column_name Character. Name of the time column. Defaults to 'auto', which attempts to automatically detect the correct column.
#' @param initialColumnToPlot Character. Name of the initial column to plot. Defaults to NULL, in which case the first plottable column is selected automatically.
#' @param plottable_columns Character vector. Names of columns that can be plotted. Defaults to NULL, in which case all columns except for the required columns are considered plottable.
#' @param ... Additional parameters to pass to the React component.
#' @param width Character. Width of the widget. Defaults to '100vw'.
#' @param height Character. Height of the widget. Defaults to '100vh'.
#' @param elementId Character. ID of the HTML element to attach the widget to. Defaults to NULL.
#' 
#' @import htmlwidgets
#'
#' @export
#'
#' @example
#' # Example usage:
#' # Create a sample data frame with latitude, longitude, and time
#' data <- data.frame(
#'   lat = runif(100, min = -30, max = 30),
#'   lng = runif(100, min = -100, max = 100),
#'   time = seq(as.POSIXct("2023-01-01"), by = "days", length.out = 100),
#'   value = runif(100, min=0, max=10)
#' )
#'
#' # Generate the plot using spacetimeview
#' plot <- spacetimeview(data)
#'
#' # Save the plot as an HTML file
#' htmlwidgets::saveWidget(plot, "spacetime_plot.html")
spacetimeview <- function(
    data,
    lat_name = 'auto',
    lng_name = 'auto',
    time_column_name = 'auto',
    initialSummaryRadius = 'auto',
    initialColumnToPlot = NULL,
    plottable_columns = NULL,
    ..., 
    width = '100vw', 
    height = '100vh', 
    elementId = NULL
) {
  
  # columns we need to make for the js widget to work
  required_cols = c(
    'lat',
    'lng'
  ) 
  
  if (inherits(data, 'SpatRaster')) {
    print('Constructing input from terra object...')
    
    coords <- terra::xyFromCell(data, 1:terra::ncell(data))
    values <- terra::values(data)
    
    data_sf <- sf::st_as_sf(data.frame(
      lng = coords[,1],
      lat = coords[,2],
      values
    ), coords = c("lng", "lat"), crs = terra::crs(data))
    
    # Ensure it is in a lat/lng CRS
    if (!sf::st_is_longlat(data_sf)) {
      data_sf <- sf::st_transform(data_sf, "+proj=longlat +datum=WGS84")
    }
    
    coordinates <- sf::st_coordinates(data_sf)
    rest_of_data <- sf::st_drop_geometry(data_sf)
    
    data <- data.frame(
      lng = coordinates[,1],
      lat = coordinates[,2]
    )
    data <- cbind(data, rest_of_data)
  }
  
  if (inherits(data, 'stars')) {
    print('Constructing input from stars object...')
    
    coords <- sf::st_coordinates(data)
    values <- as.data.frame(stars::st_as_stars(data))
    
    data_sf <- sf::st_as_sf(data.frame(
      lng = coords[,1],
      lat = coords[,2],
      values
    ), coords = c("lng", "lat"), crs = sf::st_crs(data))
    
    # Ensure it is in a lat/lng CRS
    if (!sf::st_is_longlat(data_sf)) {
      data_sf <- sf::st_transform(data_sf, "+proj=longlat +datum=WGS84")
    }
    
    coordinates <- sf::st_coordinates(data_sf)
    rest_of_data <- sf::st_drop_geometry(data_sf)
    
    data <- data.frame(
      lng = coordinates[,1],
      lat = coordinates[,2]
    )
    data <- cbind(data, rest_of_data)
  }
  
  if (inherits(data, 'sf')) {
    print('Constructing input from sf object...')
    
    # Ensure it is in a lat/lng CRS
    if (!sf::st_is_longlat(data)) {
      data <- sf::st_transform(data, "+proj=longlat +datum=WGS84")
    }
    
    coordinates <- sf::st_coordinates(data)
    rest_of_data <- sf::st_drop_geometry(data)
    
    data <- data.frame(
      lng = coordinates[,1],
      lat = coordinates[,2]
    )
    data <- cbind(data, rest_of_data)
  }
  
  if (time_column_name == 'auto') {
    # First, try to identify columns that could be date/time based on their names
    possible_time_columns <- names(data)[grepl("time|date", names(data), ignore.case = TRUE)]
    
    # Attempt to convert these columns to date/time objects
    for (col in possible_time_columns) {
      if (!lubridate::is.timepoint(data[[col]])) {
        parsed_col <- try(lubridate::parse_date_time(data[[col]], orders = c("Ymd HMS", "Ymd", "HMS")), silent = TRUE)
        if (!inherits(parsed_col, "try-error")) {
          data[[col]] <- parsed_col
        }
      }
    }
    
    # Re-check which columns are now recognized as date/time objects
    possible_time_columns <- names(data)[sapply(data, function(col) {
      lubridate::is.timepoint(col)
    })]
    
    if (length(possible_time_columns) > 0) {
      time_column_name <- possible_time_columns[1]  # Pick the first detected time column
      message(paste0("Auto-detected time column: `", time_column_name, "`"))
    } else {
      stop("No time column detected automatically. Please specify `time_column_name` explicitly.")
    }
  }
  
  if (time_column_name %in% colnames(data)) {
    # if supplied,
    # make sure timestamp is in the correct format
    is_datetime <- lubridate::is.timepoint(data[,time_column_name])
    
    if (!is_datetime) {
      stop(paste0('The `', time_column_name, '` time column was not a POSIXct, POSIXlt, or Date object.'))
    }
    
    # then convert to timestamp format needed by js
    data$timestamp <- format(data[,time_column_name], "%Y/%m/%d %H:%M:%OS2")
  }
    
  normalize_lat_lng_names <- function(data, lat_name, lng_name) {
    if (lat_name == 'auto') {
      lat_possible_names <- c('lat', 'LAT', 'latitude', 'Latitude', 'LATITUDE', 'y', 'Y')
      # Find the matching column names for latitude
      lat_name <- lat_possible_names[which(lat_possible_names %in% names(data))]
      # Rename the columns if a match is found
      if (length(lat_name) > 0) {
        names(data)[names(data) == lat_name[1]] <- 'lat'
      }
    } else {
      nms <- names(data)
      nms[nms == lat_name] <- 'lat'
      names(data) <- nms
    }
    
    if (lng_name == 'auto') {
      lng_possible_names <- c('lng', 'LNG', 'longitude', 'Longitude', 'LONGITUDE', 'long', 'LONG', 'x', 'X')
      # Find the matching column names for longitude
      lng_name <- lng_possible_names[which(lng_possible_names %in% names(data))]
      if (length(lng_name) > 0) {
        names(data)[names(data) == lng_name[1]] <- 'lng'
      }
    } else {
      nms <- names(data)
      nms[nms == lng_name] <- 'lng'
      names(data) <- nms
    }
    
    return(data)
  }
  
  data <- normalize_lat_lng_names(
    data,
    lat_name = lat_name,
    lng_name = lng_name
  )
  
  if (is.null(plottable_columns)) {
    plottable_columns <- names(data)[!(names(data) %in% c(required_cols, time_column_name))]
  }
  
  if (length(plottable_columns) == 0) {
    warning(
      paste(
        'There were no columns to plot in the dataset.',
        'Found columns were:', paste(names(data), collapse=', ')
      )
    )
    initialColumnToPlot = NaN
  } else if (!('initialColumnToPlot' %in% list(...))) {
    initialColumnToPlot = plottable_columns[1]
    warning(
      paste0(
        'initialColumnToPlot was not specified. ',
        'Defaulting to `', initialColumnToPlot, '`'
      )
    )
  }
  
  if (initialSummaryRadius == 'auto') {
    distances <- c()
    for (i in 1:(nrow(data) - 1)) {
      dist <- haversine_dist(
        data$lat[i], data$lng[i],
        data$lat[i + 1], data$lng[i + 1]
      )
      distances <- c(distances, dist)
    }
    
    # calculate as the average distance
    initialSummaryRadius <- mean(distances) / 12 
  }
  
  # print('Reformatting data as list to be put in JS')
  data_list <- purrr::transpose(data)
  print('Starting ReactR plot')
  # describe a React component to send to the browser for rendering.
  component <- reactR::component(
    "SpaceTimeViewer",
    list(
      data = data,
      initialColumnToPlot = initialColumnToPlot,
      initialSummaryRadius = initialSummaryRadius,
      ...
    )
  )
  
  # create widget
  htmlwidgets::createWidget(
    name = 'spacetimeview',
    reactR::reactMarkup(component),
    width = width,
    height = height,
    package = 'spacetimeview',
    elementId = elementId
  )
}


#' Called by HTMLWidgets to produce the widget's root element.
#' @noRd
widget_html.spacetimeview <- function(id, style, class, ...) {
  # Return a single div tag directly
  htmltools::tags$div(
    id = id, class = class, style = style,
    reactR::html_dependency_corejs(),
    reactR::html_dependency_react(),
    reactR::html_dependency_reacttools()
  )
}

#' Shiny bindings for spacetimeview
#'
#' Output and render functions for using spacetimeview within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{'100\%'},
#'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
#'   string and have \code{'px'} appended.
#' @param expr An expression that generates a spacetimeview
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name spacetimeview-shiny
#'
#' @export
spacetimeviewOutput <- function(outputId, width = '100vw', height = '100vh') {
  htmlwidgets::shinyWidgetOutput(outputId, 'spacetimeview', width, height, package = 'spacetimeview')
}

#' @rdname spacetimeview-shiny
#' @export
renderSpacetimeview <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, spacetimeviewOutput, env, quoted = TRUE)
}


# Function to convert degrees to radians
deg2rad <- function(deg) {
  return(deg * pi / 180)
}

# Haversine formula to calculate the distance between two points
haversine_dist <- function(lat1, lng1, lat2, lng2) {
  R <- 6371000  # Radius of the Earth in kilometers
  dlat <- deg2rad(lat2 - lat1)
  dlng <- deg2rad(lng2 - lng1)
  a <- sin(dlat / 2)^2 + cos(deg2rad(lat1)) * cos(deg2rad(lat2)) * sin(dlng / 2)^2
  c <- 2 * atan2(sqrt(a), sqrt(1 - a))
  d <- R * c
  return(d)
}
