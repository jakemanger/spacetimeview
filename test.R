library(tidyverse)
library(sf)
library(spacetimeview)

output_file_path <- './'
 
# Data for one species (Bubas bison)
bison_daily_predictions <-
  readRDS(str_c(output_file_path, "Bubas bison_2010_11_daily_presence_predictions.rds")) |>
  mutate(
    timestamp = date(int_start(dates)), .before = dates
  ) |>
  st_as_sf(crs = st_crs(4326))
 
# Data for another species (Onthophagus taurus)
taurus_daily_predictions <-
  readRDS(str_c(output_file_path, "Onthophagus taurus_2010_11_daily_presence_predictions.rds")) |>
  mutate(
    timestamp = date(int_start(dates)), .before = dates
  ) |>
  st_as_sf(crs = st_crs(4326))
 
# Visualise data
p1 <- spacetimeview(
  bison_daily_predictions,
  time_column_name = "timestamp",
  plottable_columns = c(".pred_1", ".std_error"),
  filter_column='scientificName'
)
 
p2 <- spacetimeview(
  taurus_daily_predictions,
  time_column_name = "timestamp",
  plottable_columns = c(".pred_1", ".std_error"),
  summary_radius = 10000,
  summary_height = 100,
  header_title='Dung Beetles of Australia',
  social_links=c('github'='https://github.com/jakemanger/spacetimeview_dungbeetles'),
  filter_column='scientificName',
  draggableMenu=TRUE
)

# print(p1)
print(p2)
