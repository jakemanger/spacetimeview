
<!-- README.md is generated from README.Rmd. Please edit that file -->

# spacetimeview

<!-- badges: start -->
<!-- badges: end -->

spacetimeview generates an interactive space time data dashboard in one
line of code. You provide the data with columns of GPS coordinates (or
sf geometries) and a column of times and spacetimeview will turn it into
an interactive plot.

You can use the plot as a static website html file to share with others
(hostable for free on services like github pages) or as an interactive
html widget to explore your data.

## Installation

You can install the development version of spacetimeview from
[GitHub](https://github.com/) with:

``` r
# after cloning with `git clone git@github.com:jakemanger/spacetimeview.git`
devtools::load_all()
#> ℹ Loading spacetimeview
# or install from github
# install.packages("devtools")
# devtools::install_github("jakemanger/spacetimeview")
```

## Example

Load your data with GPS coordinates and datetimes:

``` r
library(spacetimeview)
d <- read.csv('https://raw.githubusercontent.com/uber-web/kepler.gl-data/master/earthquakes/data.csv')
d <- d[,c('Latitude', 'Longitude', 'DateTime', 'Magnitude')]
```

Now, in one line of code, generate an interactive plot over space and
time

``` r
spacetimeview(d, summary_radius = 10000, summary_height = 100)
```

![](visualisation.gif)

Note, this interactive plot is also a website, that you can save as a
html file

``` r
htmlwidgets::saveWidget(spacetimeview(d), "my_plot.html")
#> Auto-detected time column: `DateTime`
#> [1] "Converting character column `timestamp` to factor"
#> Warning in spacetimeview(d): column_to_plot was not specified. Defaulting to
#> `Magnitude`
#> [1] "Estimating an optimal radius for summary grid cells..."
#> [1] "Starting ReactR plot"
#> Input to asJSON(keep_vec_names=TRUE) is a named vector. In a future version of jsonlite, this option will not be supported, and named vectors will be translated into arrays instead of objects. If you want JSON object output, please use a named list instead. See ?toJSON.
```

and simply deploy to any website host, even free static site hosts like
Github Pages

``` r
# automate GitHub Pages setup to deploy html files in the `docs` folder
usethis::use_github_pages(branch='main', path='/docs')
#> ✔ Setting active project to "/Users/jakemanger/projects/spacetimeview".
#> ✔ GitHub Pages is publishing from:
#> • URL: "https://jakemanger.github.io/spacetimeview/"
#> • Branch: "main"
#> • Path: "/docs"

# move the my_plot.html we just generated to the docs/plot folder and push it to github
# we use /plot so it doesn't conflict with pkgdown docs
system("mkdir -p docs/")
system("mkdir -p docs/plot")

# move the HTML file into the subdirectory and rename it as index.html for direct access
system("mv ./my_plot.html ./docs/plot/index.html")

# commit and push the changes to GitHub
system("git add docs/plot/index.html")
system("git commit -m 'Deploy spacetimeview widget to GitHub Pages under /plot'")
system("git push")
```

Now if you navigate to the link provided above (e.g.
<https://jakemanger.github.io/spacetimeview/plot>) you should see your
data displayed in a free, responsive and interactive space time view
website.

## Example repositories

If you’d like to check out some nice examples see: -
<https://github.com/jakemanger/spacetimeview_example> - add your project
here
