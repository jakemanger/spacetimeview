# spacetimeview

## Overview

spacetimeview generates an interactive space time data dashboard in one
line of code. You provide the data with a column of sf space objects and a 
column of times and spacetimeview will turn it into an interactive plot.

You can use the plot as a static website html file to share with others
(hostable for free on services like github pages) or as an interactive html 
widget to explore your data.


## Installation
```R
devtools::install_github('jakemanger/spacetimeview')
```

## Usage

### Make your dashboard

Load your data with GPS coordinates and datetimes

```R
library(spacetimeview)

d <- read.csv('https://raw.githubusercontent.com/uber-web/kepler.gl-data/master/earthquakes/data.csv')
d <- d[,c('Latitude', 'Longitude', 'DateTime', 'Magnitude')]
names(d) <- c('lat', 'lng', 'timestamp', 'magnitude')
spacetimeview(d)
```

View it in RStudio

GIF


and save it as a html web page 



## Development
1. Clone this repository
```R
git clone 
```
   
2. Load the package for development
```R
devtools::load_all()
```

or install the R package

```R
renv::activate()
devtools::document()
devtools::install(quick = TRUE)
library(spacetimeview)
```

3. Enjoy the package

```R
# histogram
data <- read.csv('https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv')
spacetimeview(data = data)

# histogram over time plot
data <- read.csv('https://raw.githubusercontent.com/uber-web/kepler.gl-data/master/earthquakes/data.csv')
data <- data[,c('Latitude', 'Longitude', 'DateTime', 'Magnitude')]
names(data) <- c('lat', 'lng', 'timestamp', 'magnitude')
spacetimeview(data = data)
```

4. See a more complicated example at `example.R`


## Development

This project was built with the `reactR` package. See here for development instructions
from `reactR` https://cran.r-project.org/web/packages/reactR/vignettes/intro_htmlwidgets.html

### Dependencies

- Nodejs (install with nvm)
- Yarn (install with npm)
- Install dependencies with yarn
```
yarn install
```


### Workflow

1. If you need to install a javascript dependency, install a javascript package with
```bash
yarn add PACKAGE_NAME
```
replacing `PACKAGE_NAME` with the package you are adding.

2. If you need to edit any javascript or R files, edit them now.

3. Pack the js files to inst/htmlwidgets/...

```bash
yarn run webpack
```

4. Load the package for development
```R
devtools::load_all()
```

or install the R package

```R
renv::activate()
devtools::document()
devtools::install(quick = TRUE)
library(spacetimeview)
```

5. Enjoy the package

```R
# histogram
data <- read.csv('https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv')
spacetimeview(data = data)

# histogram over time plot
data <- read.csv('https://raw.githubusercontent.com/uber-web/kepler.gl-data/master/earthquakes/data.csv')
data <- data[,c('Latitude', 'Longitude', 'DateTime', 'Magnitude')]
names(data) <- c('lat', 'lng', 'timestamp', 'magnitude')
spacetimeview(data = data)
```

6. See a more complicated example at `example.R`
