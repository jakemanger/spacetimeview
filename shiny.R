library(shiny)
library(spacetimeview)


options(shiny.maxRequestSize = 100 * 1024^2) # incraese file size limit


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
