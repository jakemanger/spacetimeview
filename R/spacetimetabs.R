#' SpaceTimeTabs
#'
#' Combine spacetimeview objects to create a page with tabs.
#'
#' @param ... spacetimeview objects to combine
#' @param tab_titles Character vector of tab titles. If not provided, default titles will be used.
#' @param split_data Logical. If TRUE, splits data into separate JSON files for lazy loading. Default is TRUE.
#' @param split_by_column Logical. If TRUE and split_data is TRUE, creates separate JSON files for each plottable column (EXPERIMENTAL). Default is FALSE.
#' @param split_initial_column Logical. If TRUE and split_data is TRUE, creates a small JSON file for the initial column so tabs can render before the full tab data loads. Default is TRUE.
#' @param data_dir Character. Directory name for data files relative to HTML output. Default is "data".
#' @param width Width of the widget
#' @param height Height of the widget
#' @param elementId Optional element ID for the widget
#' @import htmlwidgets
#'
#' @export
spacetimetabs <- function(
  ...,
  tab_titles = NULL,
  split_data = TRUE,
  split_by_column = FALSE,  # Default to FALSE - split by tab only (column splitting is experimental)
  split_initial_column = TRUE,
  data_dir = "data",
  width = '100vw',
  height = '100vh',
  elementId = NULL
) {
  # get the spacetimeview objects
  views <- list(...)
  views <- views[[1]]
  # handle input from + operator (SpacetimeviewList)
  if (length(views$views) > 1 && inherits(views, "SpacetimeviewList")) {
    tab_titles <- views$tab_titles %||% tab_titles
    views <- views$views
  }

  # validate input
  if (length(views) == 0) {
    stop("No spacetimeview objects provided")
  }
  if (!all(sapply(views, function(x) {
    inherits(x, "spacetimeview")
  }))) {
    stop("All objects must be spacetimeview objects")
  }

  # use default tab titles if not provided
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

  # extract config from each view
  view_configs <- lapply(seq_along(views), function(i) {
    tryCatch({
      view <- views[[i]]
      config <- view$x$tag$attribs

      # save data to separate json files if split_data is enabled
      if (split_data && !is.null(config$data)) {
      # config$data is in column-oriented format (list where each element is a vector)
      # this is the raw dataframe passed as a list, not purrr::transpose format
      original_data <- config$data

      message(paste("Processing tab", i, "- data has", length(original_data), "columns"))
      if (length(original_data) == 0 || is.null(names(original_data))) {
        message("  No data or unnamed data, skipping...")
        return(config)
      }

      message(paste("  Column names:", paste(names(original_data), collapse=", ")))
      message(paste("  First column length:", length(original_data[[1]])))

      data_columns <- setdiff(names(original_data), c('lat', 'lng', 'timestamp'))
      config$dataColumns <- data_columns

      get_initial_column <- function() {
        initial_col <- config$initialColumnToPlot
        if (!is.null(initial_col) && length(initial_col) > 0 && !is.na(initial_col) && initial_col %in% data_columns) {
          return(initial_col)
        }

        selectable_cols <- config$selectableColumns
        if (!is.null(selectable_cols) && length(selectable_cols) > 0) {
          selectable_cols <- selectable_cols[selectable_cols %in% data_columns]
          if (length(selectable_cols) > 0) {
            return(selectable_cols[1])
          }
        }

        if (length(data_columns) > 0) {
          return(data_columns[1])
        }

        NULL
      }

      get_columns_for_initial_data <- function(initial_col) {
        required_cols <- c('lat', 'lng')
        if ('timestamp' %in% names(original_data)) {
          required_cols <- c(required_cols, 'timestamp')
        }

        initial_cols <- character(0)
        if (!is.null(initial_col) && initial_col %in% names(original_data)) {
          escaped_col <- gsub("([.|()\\^{}+$*?])", "\\\\\\1", initial_col)
          col_pattern <- paste0("^", escaped_col, "(_.*)?$")
          initial_cols <- grep(col_pattern, names(original_data), value = TRUE)
        }

        filter_col <- config$initialFilterColumn
        if (!is.null(filter_col) && length(filter_col) > 0 && !is.na(filter_col) && filter_col %in% names(original_data)) {
          initial_cols <- unique(c(initial_cols, filter_col))
        }

        unique(c(required_cols, initial_cols))
      }

      # create data directory if needed
      if (!dir.exists(data_dir)) {
        dir.create(data_dir, recursive = TRUE)
      }

      if (split_by_column) {
        # split by column: one file per selectable column (experimental)
        selectable_cols <- config$selectableColumns
        if (is.null(selectable_cols)) {
          # use all plottable columns if none specified
          all_cols <- names(original_data)
          selectable_cols <- setdiff(all_cols, c('lat', 'lng', 'timestamp'))
        }

        # create mapping of column name -> file path
        data_files <- list()
        for (col in selectable_cols) {
          # sanitize column name for filename
          safe_col_name <- gsub("[^A-Za-z0-9_]", "_", col)
          filename <- paste0("tab_", i-1, "_", safe_col_name, ".json")
          filepath <- file.path(data_dir, filename)

          # get required base columns
          required_cols <- c('lat', 'lng')
          if ('timestamp' %in% names(original_data)) {
            required_cols <- c(required_cols, 'timestamp')
          }

          # add the column and related columns (like _lower, _upper, _pred_lower, _pred_upper)
          col_pattern <- paste0("^", gsub("([.|()\\^{}+$*?])", "\\\\\\1", col), "(_.*)?$")
          related_cols <- grep(col_pattern, names(original_data), value = TRUE)
          cols_to_include <- unique(c(required_cols, related_cols))

          # extract just these columns
          column_data <- original_data[cols_to_include]

          # write to json in column-oriented format (more compact)
          json_string <- jsonlite::toJSON(
            column_data,
            dataframe = "columns",
            auto_unbox = TRUE,
            digits = config$jsonDigits %||% 3,
            pretty = FALSE
          )
          writeLines(json_string, filepath)

          # store relative path for html
          data_files[[col]] <- filename  # relative to data_dir
        }

        # replace inline data with dataFiles mapping
        config$data <- NULL
        config$dataFiles <- data_files
        config$dataDir <- data_dir

      } else {
        # split by tab only: one file per tab
        filename <- paste0("tab_", i-1, "_data.json")
        filepath <- file.path(data_dir, filename)

        if (split_initial_column) {
          initial_col <- get_initial_column()
          initial_cols <- get_columns_for_initial_data(initial_col)

          if (length(initial_cols) > 0) {
            initial_filename <- paste0("tab_", i-1, "_initial.json")
            initial_filepath <- file.path(data_dir, initial_filename)
            initial_data <- original_data[initial_cols]

            initial_json_string <- jsonlite::toJSON(
              initial_data,
              dataframe = "columns",
              auto_unbox = TRUE,
              digits = config$jsonDigits %||% 3,
              pretty = FALSE
            )
            writeLines(initial_json_string, initial_filepath)
            config$initialDataUrl <- initial_filename
          }
        }

        # write to json in column-oriented format
        json_string <- jsonlite::toJSON(
          original_data,
          dataframe = "columns",
          auto_unbox = TRUE,
          digits = config$jsonDigits %||% 3,
          pretty = FALSE
        )
        writeLines(json_string, filepath)

        # replace inline data with dataUrl
        config$data <- NULL
        config$dataUrl <- filename  # relative to data_dir
        config$dataDir <- data_dir
      }
    }

    return(config)
    }, error = function(e) {
      message(paste("Error processing view", i, ":", e$message))
      traceback()
      stop(e)
    })
  })

  # pass configs to spacetimetabs component
  message(paste("Creating tabs component with", length(view_configs), "views"))

  tryCatch({
    component <- reactR::component("SpaceTimeTabs", list(
      viewConfigs = view_configs,
      titles = tab_titles
    ))

    message("Creating widget...")
    widget <- htmlwidgets::createWidget(
      name = 'spacetimeview',
      reactR::reactMarkup(component),
      width = width,
      height = height,
      package = 'spacetimeview',
      elementId = elementId
    )

    message("Widget created successfully")
    return(widget)
  }, error = function(e) {
    message("Error creating tabs widget:")
    message(e$message)
    print(traceback())
    stop(e)
  })
}

#' @export
`+.spacetimeview` <- function(e1, e2) {
  # validate e2 is a spacetimeview object
  if (!inherits(e2, "spacetimeview")) {
    stop("Can only add spacetimeview objects together")
  }

  # add to existing list if e1 is already a SpacetimeviewList
  if (inherits(e1, "SpacetimeviewList")) {
    e1$views <- c(e1$views, list(e2))
    return(e1)
  }

  # create new list
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

#' Plot method for SpacetimeviewList
#'
#' Converts a SpacetimeviewList to a spacetimetabs widget and displays it
#'
#' @param x A SpacetimeviewList object
#' @param ... Additional arguments passed to print
#' @return The SpacetimeviewList object (invisibly)
#' @export
plot.SpacetimeviewList <- function(x, ...) {
  print(paste('Making SpacetimeTabs widget with', length(x$views), 'views'))
  result <- spacetimetabs(x)
  print(result)
  invisible(x)
}

#' Save method for SpacetimeviewList
#'
#' Converts a SpacetimeviewList to a spacetimetabs widget and displays it
#'
#' @param x A SpacetimeviewList object
#' @param file The file path to save the HTML file to
#' @param ... Additional arguments passed to print
#' @return The SpacetimeviewList object (invisibly)
#' @export
save.SpacetimeviewList <- function(x, file, ...) {
  print(paste('Saving SpacetimeTabs widget with', length(x$views), 'views'))
  result <- spacetimetabs(x)
  htmlwidgets::saveWidget(result, file)
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

# null coalescing utility
`%||%` <- function(x, y) {
  if (is.null(x)) y else x
}
