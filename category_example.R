library(sf)
library(tidyverse)

devtools::load_all()

data <- readRDS('census_data_2020-07-01_to_2021-06-30.RDS')
data$timestamp <- lubridate::int_start(data$dates)
data <- data[,c('timestamp', 'precip', 'tmin', 'tmax', 'vprp', 'solarrad', 'sm', 'geometry')]

data <- data %>%
  mutate(week = floor_date(timestamp, "week"))

# Group by 'week' and 'geometry', then summarize columns to plot
aggregated_data <- data %>%
  group_by(week, geometry) %>%
  summarize(
    # make categories
    tmax = case_when(
      tmax < 0 ~ '-0',
      tmax < 10 ~ '0-10',
      tmax < 20 ~ '10-20',
      tmax < 30 ~ '20-30',
      tmax < 40 ~ '30-40',
      TRUE ~ '40+'
    ),
  ) %>%
  ungroup() %>%
  rename(timestamp = week)

spacetimeview(
  data = aggregated_data, 
  initialProjection='Mercator', 
  headerTitle='BOM Weather Data',
  socialLinks=c(
    'github'='https://github.com/jakemanger/spacetimeview', 
    'twitter'='https://twitter.com/jakemanger'
  )
)


# devtools::load_all()
# data <- read.csv('https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv')
# data$val <- 400
# spacetimeview(data = data)

