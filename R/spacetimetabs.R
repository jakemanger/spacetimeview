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
spacetimetabs <- function(
  ...,
  tab_titles = NULL,
  width = '100vw',
  height = '100vh',
  elementId = NULL
) {
  # get the spacetimeview objects
  views <- list(...)
  views <- views[[1]]
  # check if the input is from the + operator (SpacetimeviewList)
  if (length(views$views) > 1 && inherits(views, "SpacetimeviewList")) {
    tab_titles <- views$tab_titles %||% tab_titles
    views <- views$views
  }

  # validate
  if (length(views) == 0) {
    stop("No spacetimeview objects provided")
  }
  if (!all(sapply(views, function(x) {
    inherits(x, "spacetimeview")
  }))) {
    stop("All objects must be spacetimeview objects")
  }

  # generate default tab titles if not provided
  if (is.null(tab_titles)) {
    tab_titles <- paste("Tab", seq_along(views))
  } else if (length(tab_titles) != length(views)) {
    warning(
      paste(
        "Number of tab titles does not match number of views.",
        "Using default titles."
      )
    )
    tab_titles <- paste("Tab", seq_along(views))
  }

  # extract configuration from each spacetimeview object
  view_configs <- lapply(views, function(view) {
    config <- view$x$tag$attribs
    return(config)
  })

  # then pass to the SpaceTimeTabs component
  component <- reactR::component("SpaceTimeTabs", list(
    viewConfigs = view_configs,
    titles = tab_titles
  ))

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
  # check if e2 is a spacetimeview object
  if (!inherits(e2, "spacetimeview")) {
    stop("Can only add spacetimeview objects together")
  }

  # check if e1 is already a SpacetimeviewList
  if (inherits(e1, "SpacetimeviewList")) {
    e1$views <- c(e1$views, list(e2))
    return(e1)
  }

  # create a new SpacetimeviewList
  result <- structure(
    list(
      views = list(e1, e2),
      tab_titles = NULL
    ),
    class = c("SpacetimeviewList", "list")
  )

  return(result)
}

#' Print method for SpacetimeviewList
#'
#' Converts a SpacetimeviewList to a spacetimetabs widget and displays it
#'
#' @param x A SpacetimeviewList object
#' @param ... Additional arguments passed to print
#' @return The SpacetimeviewList object (invisibly)
#' @export
print.SpacetimeviewList <- function(x, ...) {
  print(paste('Making SpacetimeTabs widget with', length(x$views), 'views'))
  result <- spacetimetabs(x)
  print(result)
  invisible(x)
}

#' Set tab titles for a SpacetimeviewList using names
#'
#' @param x A SpacetimeviewList object
#' @param value Character vector of tab titles
#' @return The SpacetimeviewList with updated tab titles
#' @export
`names<-.SpacetimeviewList` <- function(x, value) {
  x$tab_titles <- value
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
spacetimetabsOutput <- function(
  outputId,
  width = '100%',
  height = '100%'
){
  htmlwidgets::shinyWidgetOutput(
    outputId,
    'spacetimetabs',
    width,
    height,
    package = 'spacetimeview'
  )
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
