# devtools::install_github("jakemanger/spacetimeview")
# devtools::install_github("jdberson/dungfaunaR")
# library(spacetimeview)
devtools::load_all()
library(dungfaunaR)

# load your data
data('dungfauna_occurrence')
# select the columns we need
dungfauna_occurrence <- dungfauna_occurrence[
  ,
  c(
    'decimalLatitude', 
    'decimalLongitude',
    'eventDate_collect',
    'scientificName', 
    'individualCount', 
    'occurrenceStatus', 
    'locationID_site', 
    'county'
  )
]

# now make your dashboard in one line of code
p <- spacetimeview(
  dungfauna_occurrence,
  summary_radius = 10000,
  summary_height = 100,
  header_title='Dung Beetles of Australia',
  social_links=c('github'='https://github.com/jakemanger/spacetimeview_dungbeetles'),
  filter_column='scientificName',
  draggableMenu=TRUE
)

print(p)
