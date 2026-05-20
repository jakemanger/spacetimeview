# SpaceTimeTabs

Combine spacetimeview objects to create a page with tabs.

## Usage

``` r
spacetimetabs(
  ...,
  tab_titles = NULL,
  split_data = TRUE,
  split_by_column = FALSE,
  split_initial_column = TRUE,
  data_dir = "data",
  width = "100vw",
  height = "100vh",
  elementId = NULL
)
```

## Arguments

- ...:

  spacetimeview objects to combine

- tab_titles:

  Character vector of tab titles. If not provided, default titles will
  be used.

- split_data:

  Logical. If TRUE, splits data into separate JSON files for lazy
  loading. Default is TRUE.

- split_by_column:

  Logical. If TRUE and split_data is TRUE, creates separate JSON files
  for each plottable column (EXPERIMENTAL). Default is FALSE.

- split_initial_column:

  Logical. If TRUE and split_data is TRUE, creates a small JSON file for
  the initial column so tabs can render before the full tab data loads.
  Default is TRUE.

- data_dir:

  Character. Directory name for data files relative to HTML output.
  Default is "data".

- width:

  Width of the widget

- height:

  Height of the widget

- elementId:

  Optional element ID for the widget
