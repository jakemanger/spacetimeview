library(shiny)
library(spacetimeview) # Assuming spacetimeview is installed

options(shiny.maxRequestSize = 100 * 1024^2) # 100 MB limit


# UI definition
ui <- fluidPage(
  titlePanel("Interactive Space-Time Visualization with spacetimeview"),
  
  sidebarLayout(
    sidebarPanel(
      fileInput("file", "Upload CSV File (lat, lng, time, value)", accept = ".csv"),
      selectInput("plot_type", "Plot Type:", choices = c("Summary", "Scatter"), selected = "Summary"),
      selectInput("aggregate", "Aggregate Method:", 
                  choices = c("SUM", "MEAN", "COUNT", "MIN", "MAX", "MODE"), selected = "MEAN"),
      numericInput("radius", "Grid Cell Radius:", value = 50000, min = 1000, step = 5000),
      sliderInput("speed", "Animation Speed:", min = 0.5, max = 5, value = 1, step = 0.5),
      selectInput("theme", "Theme:", choices = c("light", "dark"), selected = "light"),
      actionButton("refresh", "Refresh Plot")
    ),
    
    mainPanel(
      spacetimeviewOutput("spacetime_plot", width = "100%", height = "80vh")
    )
  )
)

# Server definition
server <- function(input, output, session) {
  
  # Reactive data: Load sample or uploaded data
  data_reactive <- reactive({
    req(input$file)  # Require input file
    tryCatch({
      read.csv(input$file$datapath)
    }, error = function(e) {
      showNotification("Invalid file format. Using sample data.", type = "error")
    })
  })
  
  # Render the spacetimeview plot
  output$spacetime_plot <- renderSpacetimeview({
    input$refresh  # Refresh button trigger
    
    isolate({
      data <- data_reactive()
      spacetimeview(
        data = data,
        style = input$plot_type,
        aggregate = input$aggregate,
        summary_radius = input$radius,
        animation_speed = input$speed,
        theme = input$theme,
        header_title = "Shiny Space-Time Viewer",
        header_logo = "https://shiny.rstudio.com/images/shiny.png",
        social_links = c(github = "https://github.com/jakemanger", twitter = "https://twitter.com/jakemanger")
      )
    })
  })
}

# Run the application
shinyApp(ui = ui, server = server)
