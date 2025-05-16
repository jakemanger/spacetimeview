#' SpaceTimeTabs
#'
#' Combine spacetimeview objects to create a page with tabs.
#'
#' @param ... spacetimeview objects to combine
#' @param tab_titles Character vector of tab titles. If not provided, default titles will be used.
#' @param width Width of the widget
#' @param height Height of the widget
#' @param elementId Optional element ID for the widget
#' @import htmlwidgets
#'
#' @export
spacetimetabs <- function(..., tab_titles = NULL, width = NULL, height = NULL, elementId = NULL) {
  # Collect spacetimeview objects
  views <- list(...)
  
  # Check if the input is from the + operator (SpacetimeviewList)
  if (length(views) == 1 && inherits(views[[1]], "SpacetimeviewList")) {
    views <- views[[1]]$views
    tab_titles <- views[[1]]$tab_titles %||% tab_titles
  }
  
  # Validate inputs
  if (length(views) == 0) {
    stop("No spacetimeview objects provided")
  }
  
  # Check that all objects are spacetimeview objects
  # We need to check for class instead of name property
  if (!all(sapply(views, function(x) {
      inherits(x, "spacetimeview") 
    }))) {
    stop("All objects must be spacetimeview objects")
  }
  
  # Generate default tab titles if not provided
  if (is.null(tab_titles)) {
    tab_titles <- paste("Tab", seq_along(views))
  } else if (length(tab_titles) != length(views)) {
    warning("Number of tab titles does not match number of views. Using default titles.")
    tab_titles <- paste("Tab", seq_along(views))
  }
  
  # Extract configuration from each spacetimeview object
  view_configs <- lapply(views, function(view) {
    # The configuration is stored in the tag$attribs of the ReactR markup
    config <- view$x$tag$attribs
    return(config)
  })
  
  # Create a component to send to the browser
  component <- reactR::component("SpaceTimeTabs", list(
    viewConfigs = view_configs,
    titles = tab_titles
  ))
  
  # Create widget
  htmlwidgets::createWidget(
    name = 'spacetimeview',
    reactR::reactMarkup(component),
    width = width,
    height = height,
    package = 'spacetimeview',
    elementId = elementId
  )
}

#' @export
`+.spacetimeview` <- function(e1, e2) {
  # Check if e2 is a spacetimeview object
  if (!inherits(e2, "spacetimeview")) {
    stop("Can only add spacetimeview objects together")
  }
  
  # Check if e1 is already a SpacetimeviewList
  if (inherits(e1, "SpacetimeviewList")) {
    e1$views <- c(e1$views, list(e2))
    return(e1)
  }
  
  # Create a new SpacetimeviewList
  result <- structure(
    list(
      views = list(e1, e2),
      tab_titles = NULL
    ),
    class = c("SpacetimeviewList", "list")
  )
  
  return(result)
}

#' @export
print.SpacetimeviewList <- function(x, ...) {
  cat("SpacetimeviewList with", length(x$views), "views\n")
  invisible(x)
}

#' Set tab titles for a SpacetimeviewList
#'
#' @param x A SpacetimeviewList object
#' @param titles Character vector of tab titles
#' @return The SpacetimeviewList with updated tab titles
#' @export
set_tab_titles <- function(x, titles) {
  if (!inherits(x, "SpacetimeviewList")) {
    stop("x must be a SpacetimeviewList object")
  }
  
  if (length(titles) != length(x$views)) {
    stop("Number of titles must match number of views")
  }
  
  x$tab_titles <- titles
  return(x)
}

#' Called by HTMLWidgets to produce the widget's root element.
#' @noRd
widget_html.spacetimetabs <- function(id, style, class, ...) {
  htmltools::tags$div(
    id = id, class = class, style = style,
    reactR::html_dependency_corejs(),
    reactR::html_dependency_react(),
    reactR::html_dependency_reacttools()
  )
}

#' Shiny bindings for spacetimetabs
#'
#' Output and render functions for using spacetimetabs within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{'100\%'},
#'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
#'   string and have \code{'px'} appended.
#' @param expr An expression that generates a spacetimetabs
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name spacetimetabs-shiny
#'
#' @export
spacetimetabsOutput <- function(outputId, width = '100%', height = '400px'){
  htmlwidgets::shinyWidgetOutput(outputId, 'spacetimetabs', width, height, package = 'spacetimeview')
}

#' @rdname spacetimetabs-shiny
#' @export
renderSpacetimetabs <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, spacetimetabsOutput, env, quoted = TRUE)
}

# Utility for NULL coalescing
`%||%` <- function(x, y) {
  if (is.null(x)) y else x
}
