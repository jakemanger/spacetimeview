library(shiny)
library(spacetimeview)

ui <- fluidPage(
  titlePanel("reactR HTMLWidget Example"),
  spacetimeviewOutput('widgetOutput')
)

server <- function(input, output, session) {
  output$widgetOutput <- renderSpacetimeview(
    spacetimeview("Hello world!")
  )
}

shinyApp(ui, server)