# Example demonstrating custom factor colors with spacetimeview
library(spacetimeview)

# Create sample data with categorical variables
set.seed(123)
sample_data <- data.frame(
  lat = runif(200, -30, 30),
  lng = runif(200, -100, 100),
  timestamp = seq(as.POSIXct("2023-01-01"), by = "days", length.out = 200),
  species = sample(c("Species A", "Species B", "Species C", "Species D"), 200, replace = TRUE),
  habitat = sample(c("Forest", "Grassland", "Wetland"), 200, replace = TRUE),
  count = rpois(200, 10)
)

# Example 1: Custom colors for species
# Define custom colors for each species
species_colors <- c("#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4")

plot1 <- spacetimeview(
  data = sample_data,
  column_to_plot = "species",
  factor_colors = list(species = species_colors),
  header_title = "Custom Species Colors",
  summary_radius = 50000
)

# Example 2: Custom colors for habitat types
# Define custom colors for each habitat
habitat_colors <- c("#8B4513", "#228B22", "#4682B4")  # Brown for Forest, Green for Grassland, Blue for Wetland

plot2 <- spacetimeview(
  data = sample_data,
  column_to_plot = "habitat", 
  factor_colors = list(habitat = habitat_colors),
  header_title = "Custom Habitat Colors",
  summary_radius = 50000
)

# Example 3: Multiple factor columns with custom colors
plot3 <- spacetimeview(
  data = sample_data,
  column_to_plot = "species",
  filter_column = "habitat",
  factor_colors = list(
    species = c("#E74C3C", "#3498DB", "#2ECC71", "#F39C12"),
    habitat = c("#8B4513", "#228B22", "#4682B4")
  ),
  header_title = "Multiple Custom Factor Colors",
  summary_radius = 50000
)

# Display the plots
print("Example 1: Custom species colors")
print(plot1)

print("Example 2: Custom habitat colors") 
print(plot2)

print("Example 3: Multiple factor colors")
print(plot3)

# Note: Without factor_colors, the system would use the default colorbrewer interpolation
# With factor_colors, you have full control over the exact colors used for each factor level 