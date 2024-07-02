library(sf)
library(tidyverse)

devtools::load_all()

data <- readRDS('census_data_2020-07-01_to_2021-06-30.RDS')
data$timestamp <- lubridate::int_start(data$dates)
data <- data[,c('timestamp', 'precip', 'geometry')]
names(data) <- c('timestamp', 'value', 'geometry')

data <- data %>%
  mutate(week = floor_date(timestamp, "week"))

# Group by 'week' and 'geometry', then summarize the 'value' by summing it
aggregated_data <- data %>%
  group_by(week, geometry) %>%
  summarize(value = sum(value, na.rm = TRUE)) %>%
  ungroup() %>%
  rename(timestamp = week)

spacetimeview(
  data = aggregated_data,
  initialHexagonRadius=6000,
  initialAnimationSpeed=10,
  initialHexagonCoverage=5,
  initialAggregate='MEAN'
)
