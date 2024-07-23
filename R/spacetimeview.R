#' Spacetimeview
#'
#' Description
#'
#' @import htmlwidgets
#'
#' @export
spacetimeview <- function(
    data, 
    time_column_name = 'timestamp',
    required_cols = c(
      'lat',
      'lng',
      'timestamp'
    ), 
    initialColumnToPlot = NULL,
    plottable_columns = NULL,
    ..., 
    width = '100vw', 
    height = '100vh', 
    elementId = NULL
) {
  
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
  
  # print('Reformatting data as list to be put in JS')
  data_list <- purrr::transpose(data)
  print('Starting ReactR plot')
  # describe a React component to send to the browser for rendering.
  component <- reactR::component(
    "SpaceTimeViewer",
    list(
      data = data,
      initialColumnToPlot = initialColumnToPlot,
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