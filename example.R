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
    precip = sum(precip, na.rm = TRUE),
    tmin = min(tmin, na.rm = TRUE),
    tmax = max(tmax, na.rm = TRUE),
    vprp = mean(vprp, na.rm = TRUE),
    solarrad = mean(solarrad, na.rm = TRUE),
    sm = mean(sm, na.rm = TRUE)
  ) %>%
  ungroup() %>%
  rename(timestamp = week)

spacetimeview(
  data = aggregated_data,
  initialSummaryRadius=55000,
  initialAnimationSpeed=10,
  initialSummaryCoverage=1,
  initialAggregate='MEAN'
)
