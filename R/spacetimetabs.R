#' SpaceTimeTabs
#'
#' Combine spacetimeview objects to create a page with tabs.
#'
#' @import htmlwidgets
#'
#' @export
spacetimetabs <- function(message, width = NULL, height = NULL, elementId = NULL) {

  # describe a React component to send to the browser for rendering.
  component <- reactR::reactMarkup(htmltools::tag("div", list(message)))

  # create widget
  htmlwidgets::createWidget(
    name = 'spacetimetabs',
    component,
    width = width,
    height = height,
    package = 'spacetimeview',
    elementId = elementId
  )
}

#' Called by HTMLWidgets to produce the widget's root element.
#' @noRd
widget_html.spacetimetabs <- function(id, style, class, ...) {
  htmltools::tagList(
    # Necessary for RStudio viewer version < 1.2
    reactR::html_dependency_corejs(),
    reactR::html_dependency_react(),
    reactR::html_dependency_reacttools(),
    htmltools::tags$div(id = id, class = class, style = style)
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
