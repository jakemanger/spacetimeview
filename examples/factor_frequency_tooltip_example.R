#' Factor Frequency Tooltip Example
#' 
#' This example specifically demonstrates the horizontal bar chart tooltips
#' that show frequency distributions of factor levels in spacetimeview.

library(spacetimeview)
library(dplyr)

# Set seed for reproducibility
set.seed(789)

# Create a dataset with a focus on clustered categorical data
# This will create clear frequency distributions in the tooltips

# Generate a grid of locations
grid_size <- 20
lat_grid <- seq(-20, 20, length.out = grid_size)
lng_grid <- seq(-40, 40, length.out = grid_size)

# Define species for our demonstration (plant species in this example)
species <- c(
  "Quercus alba", "Acer rubrum", "Pinus strobus", "Tsuga canadensis",
  "Betula papyrifera", "Fagus grandifolia", "Populus tremuloides",
  "Fraxinus americana", "Tilia americana", "Prunus serotina",
  "Ulmus americana", "Carya ovata", "Liriodendron tulipifera",
  "Thuja occidentalis", "Picea glauca", "Juniperus virginiana",
  "Acer saccharum", "Quercus rubra", "Pinus resinosa", "Abies balsamea"
)

# Create an empty dataframe to hold our data
survey_data <- data.frame()

# For each grid point, create a cluster of observations
for (i in 1:length(lat_grid)) {
  for (j in 1:length(lng_grid)) {
    center_lat <- lat_grid[i]
    center_lng <- lng_grid[j]
    
    # Determine the dominant species for this location (1-3 species will be common)
    dominant_species <- sample(species, sample(1:3, 1))
    dominant_prob <- 0.7 / length(dominant_species)
    
    # Create probability vector - dominant species are more likely
    species_probs <- rep(0.3 / (length(species) - length(dominant_species)), length(species))
    for (sp in dominant_species) {
      species_probs[which(species == sp)] <- dominant_prob
    }
    
    # Generate between 10-40 observations for this location
    n_obs <- sample(10:40, 1)
    
    # Add random jitter to create a natural-looking cluster
    cluster_data <- data.frame(
      lat = center_lat + rnorm(n_obs, 0, 0.3),
      lng = center_lng + rnorm(n_obs, 0, 0.3),
      # Add timestamps over 2 years
      time = sample(seq(as.POSIXct("2022-01-01"), as.POSIXct("2023-12-31"), by = "days"), 
                    n_obs, replace = TRUE),
      # Species observations with dominant species being more common
      species = factor(sample(species, n_obs, replace = TRUE, prob = species_probs)),
      # Measurements for each specimen
      height = runif(n_obs, 0.5, 30), # height in meters
      diameter = runif(n_obs, 5, 100) # diameter in cm
    )
    
    survey_data <- rbind(survey_data, cluster_data)
  }
}

# Add a conservation status category (another factor to demonstrate)
conservation_status <- c("Least Concern", "Near Threatened", "Vulnerable", 
                         "Endangered", "Critically Endangered")

# Assign conservation status to each species
species_status <- setNames(
  sample(conservation_status, length(species), replace = TRUE, 
         prob = c(0.5, 0.25, 0.15, 0.07, 0.03)),
  species
)

# Add conservation status to the dataset
survey_data$status <- factor(species_status[as.character(survey_data$species)], 
                            levels = conservation_status)

# Create a spacetimeview visualization that shows the species distribution
# This will demonstrate the horizontal bar chart tooltip showing species frequencies
view_species <- spacetimeview(
  data = survey_data,
  style = "Summary", 
  column_to_plot = "species",
  summary_style = "Hexagon",
  summary_radius = 100000, # Adjust based on your data spread
  theme = "light",
  aggregate = "MODE", # Use MODE for categorical data
  color_scheme = "Spectral", # Colorful scheme for many categories
  header_title = "Plant Species Distribution Survey",
  header_website_link = "https://github.com/jakemanger/spacetimeview"
)

# Display the visualization
print(view_species)

# Create another visualization focusing on conservation status
view_status <- spacetimeview(
  data = survey_data,
  style = "Summary", 
  column_to_plot = "status",
  summary_style = "Hexagon", 
  summary_radius = 100000,
  theme = "dark",
  aggregate = "MODE",
  color_scheme = "RdYlGn_r", # Reversed RdYlGn for conservation status (red = endangered)
  header_title = "Conservation Status Distribution"
)

# Display the second visualization
print(view_status)

# Save the visualizations (uncomment to use)
# htmlwidgets::saveWidget(view_species, "species_frequency_example.html")
# htmlwidgets::saveWidget(view_status, "conservation_status_example.html")

# Create a more detailed tooltip frequency example
# Focus specifically on one area with high species diversity
detailed_location <- data.frame(
  lat = rep(0, 500) + rnorm(500, 0, 0.5),
  lng = rep(0, 500) + rnorm(500, 0, 0.5),
  time = sample(seq(as.POSIXct("2022-01-01"), as.POSIXct("2023-12-31"), by = "days"), 
                500, replace = TRUE)
)

# Create a very skewed distribution of species
# This will clearly show the frequency bar chart with some species being much more common
skewed_probabilities <- c(0.3, 0.25, 0.15, 0.1, 0.05, rep(0.01, 15))
detailed_location$species <- factor(sample(species, 500, replace = TRUE, prob = skewed_probabilities))

# Create a special view just for this detailed example
view_detailed <- spacetimeview(
  data = detailed_location,
  style = "Summary",
  column_to_plot = "species",
  summary_style = "Hexagon",
  summary_radius = 50000,
  theme = "light",
  aggregate = "MODE",
  color_scheme = "Set3",
  header_title = "Species Frequency Distribution Tooltip Example",
  projection = "Mercator",
  initial_view_state = list(longitude = 0, latitude = 0, zoom = 7, pitch = 0, bearing = 0)
)

# Display the detailed view
print(view_detailed) 