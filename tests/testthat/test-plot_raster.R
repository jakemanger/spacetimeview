test_that("plotting terra raster data works", {
  tif = system.file("tif/L7_ETMs.tif", package = "stars")
  r <- terra::rast(tif)
  # should auto convert raster without error
  expect_no_error(spacetimeview(r))
})

test_that("plotting stars raster data works", {
  tif = system.file("tif/L7_ETMs.tif", package = "stars")
  r <- stars::read_stars(tif)
  # should auto convert raster without error
  expect_no_error(spacetimeview(r))
})