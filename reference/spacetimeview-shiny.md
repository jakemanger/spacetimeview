# Shiny bindings for spacetimeview

Output and render functions for using spacetimeview within Shiny
applications and interactive Rmd documents.

## Usage

``` r
spacetimeviewOutput(outputId, width = "100%", height = "100%")

renderSpacetimeview(expr, env = parent.frame(), quoted = FALSE)
```

## Arguments

- outputId:

  output variable to read from

- width, height:

  Must be a valid CSS unit (like `'100%'`, `'400px'`, `'auto'`) or a
  number, which will be coerced to a string and have `'px'` appended.

- expr:

  An expression that generates a spacetimeview

- env:

  The environment in which to evaluate `expr`.

- quoted:

  Is `expr` a quoted expression (with
  [`quote()`](https://rdrr.io/r/base/substitute.html))? This is useful
  if you want to save an expression in a variable.

## Examples

``` r
library(shiny)
#> Error in library(shiny): there is no package called ‘shiny’
library(spacetimeview)


options(shiny.maxRequestSize = 100 * 1024^2) # increase file size limit


ui <- fluidPage(
  titlePanel("Interactive Space-Time Visualization"),
  
  sidebarLayout(
    sidebarPanel(
      fileInput("file", "Upload CSV File", accept = ".csv"),
      selectInput("plot_type", "Plot Type:", choices = c("Summary", "Scatter"), selected = "Summary"),
      selectInput("aggregate", "Aggregate Method:", choices = c("SUM", "MEAN", "COUNT"), selected = "MEAN"),
      numericInput("radius", "Cell Radius:", value = 50000, min = 1000, step = 5000),
      sliderInput("speed", "Animation Speed:", min = 0.5, max = 5, value = 1, step = 0.5),
      selectInput("theme", "Theme:", choices = c("light", "dark"), selected = "light")
    ),
    mainPanel(
      spacetimeviewOutput("plot", width='100%', height='90vh')
    )
  )
)
#> Error in fluidPage(titlePanel("Interactive Space-Time Visualization"),     sidebarLayout(sidebarPanel(fileInput("file", "Upload CSV File",         accept = ".csv"), selectInput("plot_type", "Plot Type:",         choices = c("Summary", "Scatter"), selected = "Summary"),         selectInput("aggregate", "Aggregate Method:", choices = c("SUM",             "MEAN", "COUNT"), selected = "MEAN"), numericInput("radius",             "Cell Radius:", value = 50000, min = 1000, step = 5000),         sliderInput("speed", "Animation Speed:", min = 0.5, max = 5,             value = 1, step = 0.5), selectInput("theme", "Theme:",             choices = c("light", "dark"), selected = "light")),         mainPanel(spacetimeviewOutput("plot", width = "100%",             height = "90vh")))): could not find function "fluidPage"

server <- function(input, output, session) {
  # load data
  data <- reactive({
    req(input$file)
    read.csv(input$file$datapath)
  })
  
  # render plot
  output$plot <- renderSpacetimeview({
    req(data())
    spacetimeview(
      data = data(),
      style = input$plot_type,
      aggregate = input$aggregate,
      summary_radius = input$radius,
      animation_speed = input$speed,
      theme = input$theme
    )
  })
}

shinyApp(ui, server)
#> Error in shinyApp(ui, server): could not find function "shinyApp"
```
