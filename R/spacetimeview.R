#' Visualize Space-Time Data with an Interactive Map and Plots
#'
#' This function provides a space-time visualization interface for exploring 
#' geospatial and temporal data interactively. Users can toggle between 
#' different plot types (e.g., summary, scatter) and adjust various controls 
#' such as animation speed, radius scale, aggregation method, and theme.
#' The project is built on top of the `deck.gl` and `react-map-gl` packages,
#' using grid aggregation methods to summarize data spatially and temporally, 
#' or via a scatter plot to visualize individual data points.
#'
#' @param data A data frame containing space-time data with columns for 
#'   latitude, longitude, timestamp, and one or more value columns. The data 
#'   frame should include at least "lat", "lng", and "timestamp".
#' @param style Character. Initial plot style, either "summary" for 
#'   aggregated visualizations or "scatter" for individual data points.
#' @param column_to_plot Character. The name of the column to visualize on 
#'   the map. Must be a column present in `data` other than "lat", "lng", 
#'   or "timestamp".
#' @param aggregate Character. Aggregation method for data in summary 
#'   plots. Options are "SUM", "MEAN", "COUNT", "MIN", "MAX", or "MODE".
#' @param repeated_points_aggregate Character. Specifies how to handle 
#'   multiple points at the same location and time. Options include "SUM", 
#'   "MEAN", "COUNT", "MIN", "MAX", and "MODE".
#' @param sticky_range Logical. Whether to keep the min and max color 
#'   values constant across time intervals. Default is `TRUE`.
#' @param summary_radius Numeric. Sets the radius of grid or hexagon 
#'   cells for summary plots. Adjusting this value affects cell size.
#' @param summary_coverage Numeric. Controls the size of grid or hexagon 
#'   cells as a multiple of `summary_radius`. Range is 0 to 1.
#' @param animation_speed Numeric. Speed of time animation, where 
#'   higher values increase the animation speed.
#' @param theme Character. Theme for visualization, either "light" or 
#'   "dark". This setting affects color schemes and overall UI theme.
#' @param radius_scale Numeric. Controls the size of points in scatter 
#'   plots. Larger values increase point radius.
#' @param radius_min_pixels Numeric. Sets the minimum size of scatter plot 
#'   points in pixels, ensuring visibility even when zoomed out.
#' @param summary_style Character. Determines the layout of summary 
#'   plots, either "grid" or "hexagon".
#' @param projection Character. Map projection type, either "mercator" 
#'   or "globe". Adjusts the map display style.
#' @param summary_height Numeric. Sets the height for 3D representation 
#'   of cells in summary plots, adding dimensionality to data.
#' @param color_scheme Character. Color scheme for representing data 
#'   visually. Options align with `colorbrewer` color schemes.
#' @param color_scale_type Character. Type of color scale, either 
#'   "quantize" or "quantile", impacting color distribution on data ranges.
#' @param num_decimals Integer. Number of decimal places shown in the 
#'   color legend.
#' @param factor_levels List. Optional. Provides factor levels for categorical 
#'   data, allowing for customized color mappings and labels.
#' @param factor_icons List. Optional. Provides paths to images for factor levels.
#'   Should be a named list where keys are factor column names, and values are
#'   named lists mapping factor levels to image file paths relative to the 'public'
#'   directory (e.g., list(my_factor_col = list(level1 = "icons/icon1.png", level2 = "icons/icon2.png"))).
#' @param header_logo Character. Optional. URL to the logo displayed in the 
#'   header of the visualization.
#' @param header_title Character. Title displayed in the header, typically 
#'   representing the dataset or application name.
#' @param header_website_link Character. URL link attached to the header title 
#'   or logo, redirecting users to a related website.
#' @param social_links Named list. URLs to social media accounts displayed as 
#'   icons in the header. Supports keys like 'github', 'twitter', 'facebook', 
#'   'linkedin', etc., which map to the respective profile URLs. For example:
#'   `social_links = c(github = "https://github.com/jakemanger", twitter = "https://twitter.com/jakemanger")`
#' @param visible_controls Character vector. List of control names to display in 
#'   the interface. Controls include "column_to_plot", "style", "color_scheme", 
#'   "animation_speed", etc.
#' @param control_names Named list. Custom names for controls as displayed in 
#'   the UI. Keys correspond to control identifiers (e.g., "column_to_plot") and 
#'   values to the display names.
#' @param polygons sf or list object. Optional. Polygons to display on the map,
#'   such as state or country boundaries. Can be an sf object with POLYGON or
#'   MULTIPOLYGON geometry or a list with GeoJSON structure.
#'
#' @return An interactive space-time viewer for visualizing and exploring data.
#' @export
#' @examples
#' library(spacetimeview)
#'
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
#' 
#' # plotting data with a specific aggregate, projection, a header title and social media links
#' plot2 <- spacetimeview(
#'   data = data, 
#'   aggregate = 'MEAN', 
#'   projection = 'mercator', 
#'   header_title = 'BOM Weather Data',
#'   social_links = c(
#'     'github' = 'https://github.com/jakemanger/spacetimeview', 
#'     'twitter' = 'https://twitter.com/jakemanger'
#'   )
#' )
#' 
#' # Save the plot as an HTML file
#' htmlwidgets::saveWidget(plot2, "spacetime_plot_with_website_header.html")
spacetimeview <- function(
    data,
    style = 'Summary',
    column_to_plot = 'value',
    aggregate = 'MEAN',
    repeated_points_aggregate = 'None',
    sticky_range = TRUE,
    summary_radius = 'auto',
    summary_coverage = 1,
    animation_speed = 1,
    theme = 'light',
    radius_scale = 1,
    radius_min_pixels = 3,
    summary_style = 'Hexagon',
    projection = 'Mercator',
    summary_height = 0,
    color_scheme = 'YlOrRd',
    color_scale_type = 'quantize',
    num_decimals = 1,
    factor_levels = NULL,
    factor_icons = NULL,
    header_logo = '',
    header_title = '',
    header_website_link = '',
    social_links = c(),
    visible_controls = c(
      'column_to_plot',
      'style',
      'color_scheme',
      'animation_speed',
      'summary_radius',
      'summary_height',
      'radius_min_pixels',
      'aggregate',
      'filter_column'
    ),
    control_names = c(
      'column_to_plot' = 'Dataset',
      'style' = 'Plot Type',
      'color_scheme' = 'Color Scheme',
      'animation_speed' = 'Animation Speed',
      'summary_radius' = 'Cell Radius',
      'summary_height' = 'Cell Height',
      'radius_min_pixels' = 'Minimum Point Radius',
      'aggregate' = 'Aggregate',
      'filter_column' = 'Filter'
    ),
    filter_column = NULL,
    lat_name = 'auto',
    lng_name = 'auto',
    time_column_name = 'auto',
    plottable_columns = NULL,
    polygons = NULL,
    width = '100vw', 
    height = '100vh', 
    elementId = NULL,
    ...
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
    # remove the original time column
    if (time_column_name != 'timestamp') {
      data <- data[, !(names(data) %in% time_column_name)]
    }
  }
    
  normalize_lat_lng_names <- function(data, lat_name, lng_name) {
    if (lat_name == 'auto') {
      lat_possible_names <- c('lat', 'LAT', 'latitude', 'Latitude', 'LATITUDE', 'y', 'Y', 'decimalLatitude')
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
      lng_possible_names <- c('lng', 'LNG', 'longitude', 'Longitude', 'LONGITUDE', 'long', 'LONG', 'x', 'X', 'decimalLongitude')
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

  factor_levels <- list()

  if (is.null(plottable_columns)) {
    plottable_columns <- names(data)[!(names(data) %in% c(required_cols, time_column_name, 'timestamp'))]
  }

  # now filter data to only include the columns we need
  if ('timestamp' %in% names(data)) {
    data <- data[, c(required_cols, 'timestamp', plottable_columns)]
  } else {
    data <- data[, c(required_cols, plottable_columns)]
  }

  for (col in plottable_columns) {
    # if the plottable column is a character, convert to a factor
    if (is.character(data[[col]])) {
      print(paste0('Converting character column `', col, '` to factor'))
      data[[col]] <- as.factor(data[[col]])
    }

    # if it's a logical column, convert to a factor
    if (is.logical(data[[col]])) {
      print(paste0('Converting logical column `', col, '` to factor'))
      data[[col]] <- as.factor(data[[col]])
    }
    
    # make sure it's not a time column
    if (is.factor(data[[col]]) && col != 'timestamp') {
      print(paste0('Adding factor levels for column `', col, '`'))
      factor_levels[[col]] <- levels(data[[col]])
      # convert to 0-based index for JS
      data[[col]] <- as.integer(data[[col]]) - 1
    }
  }

  if (length(factor_levels) == 0) {
    factor_levels <- NULL
  }
  
  if (length(plottable_columns) == 0) {
    warning(
      paste(
        'There were no columns to plot in the dataset.',
        'Found columns were:', paste(names(data), collapse=', ')
      )
    )
    column_to_plot = NaN
  } else if (column_to_plot == 'value') {
    column_to_plot = plottable_columns[1]
    warning(
      paste0(
        'column_to_plot was not specified. ',
        'Defaulting to `', column_to_plot, '`'
      )
    )
  }
  
  data <- data[order(data$lat, data$lng),]

  if (summary_radius == 'auto') {
    print('Estimating an optimal radius for summary grid cells...')
    distances <- c()
    # sort by lat and long
    for (i in 1:min(10000, (nrow(data) - 1))) {
      dist <- haversine_dist(
        data$lat[i], data$lng[i],
        data$lat[i + 1], data$lng[i + 1]
      )
      distances <- c(distances, dist)
    }
    
    # calculate as the average distance
    summary_radius <- mean(distances) * 8 
  }
  
  # Process polygons if provided
  polygon_data <- NULL
  if (!is.null(polygons)) {
    print("Processing polygon data...")
    if (inherits(polygons, "sf")) {
      # Convert sf polygons to GeoJSON
      if (!sf::st_is_longlat(polygons)) {
        print("Transforming polygon coordinates to WGS84...")
        polygons <- sf::st_transform(polygons, "+proj=longlat +datum=WGS84")
      }
      
      print("Converting sf object to GeoJSON...")
      
      # Try using geojsonsf if available (recommended approach)
      if (requireNamespace("geojsonsf", quietly = TRUE)) {
        print("Using geojsonsf package for conversion...")
        polygon_data <- geojsonsf::sf_geojson(polygons, atomise = FALSE)
      } else {
        # Fallback to sf::st_write approach
        print("Using sf::st_write for conversion (consider installing geojsonsf package for better results)...")
        tmp_file <- tempfile(fileext = ".geojson")
        sf::st_write(polygons, tmp_file, driver = "GeoJSON", delete_dsn = TRUE, quiet = TRUE)
        polygon_data <- paste(readLines(tmp_file), collapse = "\n")
        unlink(tmp_file)
      }
      
      print(paste("Polygon data length:", nchar(polygon_data), "characters"))
    } else if (is.list(polygons)) {
      # Assume it's already in GeoJSON format
      print("Converting list to GeoJSON...")
      polygon_data <- jsonlite::toJSON(polygons, auto_unbox = TRUE)
    } else {
      warning("Polygons must be an sf object or a list in GeoJSON format. Ignoring polygons.")
    }
  }

  # print('Reformatting data as list to be put in JS')
  data_list <- purrr::transpose(data)
  print('Starting ReactR plot')
  # describe a React component to send to the browser for rendering.
  print(paste('plottable columns:', plottable_columns))

  # Function to convert image path to data URI
  image_to_data_uri <- function(file_path) {
    if (!requireNamespace("base64enc", quietly = TRUE)) {
      stop("Package 'base64enc' needed for embedding images. Please install it.", call. = FALSE)
    }
    if (!file.exists(file_path)) {
      warning(paste("Image file not found:", file_path), call. = FALSE)
      return(NULL)
    }
    # Determine MIME type based on file extension
    ext <- tolower(tools::file_ext(file_path))
    mime_type <- switch(ext,
                        png = "image/png",
                        jpg = "image/jpeg",
                        jpeg = "image/jpeg",
                        gif = "image/gif",
                        svg = "image/svg+xml",
                        webp = "image/webp",
                        # Add more types if needed
                        NULL)
    if (is.null(mime_type)) {
       warning(paste("Unsupported image file type:", file_path), call. = FALSE)
       return(NULL)
    }
    base64enc::dataURI(file = file_path, mime = mime_type)
  }

  # Process factor_icons to convert paths to data URIs
  if (!is.null(factor_icons)) {
    print("Processing factor icons...")
    factor_icons_uri <- list()
    for (col_name in names(factor_icons)) {
      if (col_name %in% names(factor_levels)) { # Check if the column is actually a factor
        col_icons <- factor_icons[[col_name]]
        col_icons_uri <- list()
        if (is.list(col_icons)) {
          for (level_name in names(col_icons)) {
            icon_path <- col_icons[[level_name]]
            if (is.character(icon_path) && length(icon_path) == 1) {
               # Construct full path relative to working directory
              full_path <- file.path(getwd(), icon_path) 
              data_uri <- image_to_data_uri(full_path)
              if (!is.null(data_uri)) {
                 # Use the original factor level name from factor_levels as the key
                # Find the original level name corresponding to the provided name
                # This assumes names in factor_icons match names in factor_levels
                if (level_name %in% factor_levels[[col_name]]) {
                    col_icons_uri[[level_name]] <- data_uri
                } else {
                   warning(paste("Level '", level_name, "' for column '", col_name, "' in factor_icons not found in factor_levels. Skipping icon."), call. = FALSE)
                }
              } 
            } else {
               warning(paste("Invalid icon path provided for level '", level_name, "' in column '", col_name, "'. Skipping icon."), call. = FALSE)
            }
          }
        } else {
           warning(paste("factor_icons for column '", col_name, "' should be a named list. Skipping icons for this column."), call. = FALSE)
        }
        if (length(col_icons_uri) > 0) {
          factor_icons_uri[[col_name]] <- col_icons_uri
        }
      } else {
         warning(paste("Column '", col_name, "' provided in factor_icons is not a factor column in the data or not in factor_levels. Skipping icons."), call. = FALSE)
      }
    }
    if (length(factor_icons_uri) > 0) {
       factor_icons <- factor_icons_uri
    } else {
       factor_icons <- NULL # Set back to NULL if no valid icons were processed
    }
  } 
  
  component <- reactR::component(
    "SpaceTimeViewer",
    list(
      data = data,
      initialStyle = style,
      initialColumnToPlot = column_to_plot,
      initialAggregate = aggregate,
      initialRepeatedPointsAggregate = repeated_points_aggregate,
      initialStickyRange = sticky_range,
      initialSummaryRadius = summary_radius,
      initialSummaryCoverage = summary_coverage,
      initialAnimationSpeed = animation_speed,
      initialTheme = theme,
      initialRadiusScale = radius_scale,
      initialRadiusMinPixels = radius_min_pixels,
      initialSummaryStyle = summary_style,
      initialProjection = projection,
      initialSummaryHeight = summary_height,
      initialColorScheme = color_scheme,
      initialColorScaleType = color_scale_type,
      initialNumDecimals = num_decimals,
      factorLevels = factor_levels,
      factorIcons = factor_icons,
      headerLogo = header_logo,
      headerTitle = header_title,
      headerWebsiteLink = header_website_link,
      socialLinks = social_links,
      visibleControls = visible_controls,
      controlNames = control_names,
      initialFilterColumn = filter_column,
      polygons = polygon_data,
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
#' @examples
#' library(shiny)
#' library(spacetimeview)
#' 
#' 
#' options(shiny.maxRequestSize = 100 * 1024^2) # increase file size limit
#' 
#' 
#' ui <- fluidPage(
#'   titlePanel("Interactive Space-Time Visualization"),
#'   
#'   sidebarLayout(
#'     sidebarPanel(
#'       fileInput("file", "Upload CSV File", accept = ".csv"),
#'       selectInput("plot_type", "Plot Type:", choices = c("Summary", "Scatter"), selected = "Summary"),
#'       selectInput("aggregate", "Aggregate Method:", choices = c("SUM", "MEAN", "COUNT"), selected = "MEAN"),
#'       numericInput("radius", "Cell Radius:", value = 50000, min = 1000, step = 5000),
#'       sliderInput("speed", "Animation Speed:", min = 0.5, max = 5, value = 1, step = 0.5),
#'       selectInput("theme", "Theme:", choices = c("light", "dark"), selected = "light")
#'     ),
#'     mainPanel(
#'       spacetimeviewOutput("plot", width='100%', height='90vh')
#'     )
#'   )
#' )
#' 
#' server <- function(input, output, session) {
#'   # load data
#'   data <- reactive({
#'     req(input$file)
#'     read.csv(input$file$datapath)
#'   })
#'   
#'   # render plot
#'   output$plot <- renderSpacetimeview({
#'     req(data())
#'     spacetimeview(
#'       data = data(),
#'       style = input$plot_type,
#'       aggregate = input$aggregate,
#'       summary_radius = input$radius,
#'       animation_speed = input$speed,
#'       theme = input$theme
#'     )
#'   })
#' }
#' 
#' shinyApp(ui, server)
#'
spacetimeviewOutput <- function(outputId, width = '100%', height = '100%') {
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
