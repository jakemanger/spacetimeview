library(dungfaunaR)

# Load the data
data('dungfauna_occurrence')

# Select the required columns
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

# Write the data to a CSV file
write.csv(dungfauna_occurrence, file = "dungfauna_occurrence.csv", row.names = FALSE)

# Message to confirm success
cat("The dataset has been saved as 'dungfauna_occurrence.csv' in your working directory.\n")
