#' Serve a spacetimeview widget locally
#'
#' This function saves a widget to a temporary HTML file and serves it
#' using a local web server. This is useful for testing widgets that use
#' lazy-loaded data files, which don't work with the file:// protocol.
#'
#' @param widget A spacetimeview or spacetimetabs widget
#' @param port Port number for the local server (default: 4321)
#' @param browser Whether to open a browser automatically (default: TRUE)
#'
#' @export
serve <- function(widget, port = 4321, browser = TRUE) {
  if (!requireNamespace("servr", quietly = TRUE)) {
    stop("Package 'servr' is required for this function. Install it with: install.packages('servr')")
  }

  tryCatch({
    # convert spacetimeview list to tabs if needed
    if (inherits(widget, "SpacetimeviewList")) {
      message("Converting SpacetimeviewList to spacetimetabs widget...")
      widget <- spacetimetabs(widget)
    }

    message("Step 1: Creating temporary directory...")
    tmp_dir <- tempfile("spacetimeview_")
    dir.create(tmp_dir)
    message("  Temporary directory created: ", tmp_dir)

    message("Step 2: Preparing to save widget...")
    html_file <- file.path(tmp_dir, "index.html")
    message("  HTML file path: ", html_file)

    message("Step 3: Calling htmlwidgets::saveWidget()...")
    htmlwidgets::saveWidget(widget, html_file, selfcontained = FALSE)
    message("  Widget saved successfully")

    # copy data directory if it exists (for lazy-loaded data files)
    if (dir.exists("data")) {
      message("Step 3.5: Copying data directory to temporary directory...")
      data_dest <- file.path(tmp_dir, "data")
      dir.create(data_dest, showWarnings = FALSE)
      data_files <- list.files("data", full.names = TRUE)
      file.copy(data_files, data_dest, overwrite = TRUE)
      message("  Copied ", length(data_files), " data files")
    }

    message("Step 4: Starting HTTP server...")
    message("  Serving widget at http://localhost:", port)
    message("  Press Ctrl+C or Esc to stop the server")

    servr::httd(dir = tmp_dir, port = port, browser = browser)
  }, error = function(e) {
    message("\n=== ERROR IN serve() ===")
    message("Error message: ", e$message)
    message("Error class: ", class(e))
    message("\nWidget structure:")
    print(str(widget, max.level = 2))
    message("\nTraceback:")
    print(traceback())
    stop(e)
  })
}
