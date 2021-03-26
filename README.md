# zaru
Zaru is a system for creating dynamic real-time map visualizations and dashboards. Zaru takes advantage of the latest graphics hardware and leverages tricks for data organization invented at Sasaki to streamline navigation, querying and representation of massive data sets.

## Overview
Zaru uses [geo-png-db](https://github.com/sasakiassociates/geo-png-db) tiles to visualize map data directly on the GPU. The system enables real-time compositing and visualization of potentially giant data sets. Zaru was developed by design firm Sasaki as a better way to understand the relationship between urban amenities and the people who can access them. The platform is powerful and scalable, but requires no back-end infrastructure to run. As a solution for data sharing and visualization it has broad potential and room for creativity.

## Techniques

### Canvas tiles

### GPU-based compositing

### Probabilistic Pixel Mixing

### Real-time mouse inspection


### Zoom-beyond
Data pixels may not be available at finer zoom levels. Zoom-beyond lets users zoom in closer than the data fidelity such that the pixels get rendered as larger blocks. See examples/asdf/asdf-devt-suitability.html.

![Screen capture showing data pixels at a lower resolution than the screen](img/zoom-beyond-14.png)
In this extreme example, data is available at zoom level 11 while the current map display is 3 zooms beyond at level 14. Though not ideal, zoom-beyond can provide valuable insights in the event that more detailed data is unavailable. Layering can be used to help with aesthetics and readability.

## Showcase

See more [examples here](http://maps.sasaki.com/zaru/). Note that not all examples in the showcase are included in this repository. This is pending further code cleanup and refactoring. 
