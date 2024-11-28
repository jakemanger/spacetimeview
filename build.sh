#!/bin/bash

yarn run build
Rscript -e "devtools::install()"
