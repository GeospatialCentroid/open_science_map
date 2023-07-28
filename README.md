# Open Science Map

The Open Science Map is a web interface for showing open science initiatives across the United States.  
These initiatives are submitted by the academic community using the ["Good Practices in Open Scholarship" form](https://docs.google.com/forms/d/1NNXwJavOM0aJMC7r9Qpu43VY6CslqTf0kjQoa0ZvB8g/viewform?ts=6435c794&edit_requested=true).


The web interface has been developed using open-source software which run entirely in the web client without the need for a database.  
This allows free hosting via services like GitHub Pages
A Google Sheet published as a CSV file powers the application, allowing easy updates by those familiar with spreadsheet software.

To view the interface in action, please visit [https://geospatialcentroid.github.io/open_science_map](https://geospatialcentroid.github.io/open_science_map)

# Background
With the need to better view the form submissions for Open Scholarship, this prototype web interface was created.  
These form submissions are then curated for consistency so they can be shared publicly.

The web interface loads an exported CSV file of the curated submissions and parses through the rows and columns of information to create an in-memory database.
This allows basic searching and facet generation capabilities, so users can filter through the submissions.

The ability to view the submissions via a map is designed to help visually see who's doing what and where.

The temporal component of submitted initiatives uses a YYYY-MM-DD format so these submissions can be filtered by date.  
A 'Start date' and 'End date' can be added as appropriate, and if both are the same, only the 'Start date' needs to be entered.

# Future Work
The web interface was designed to flexible in the data that it loads.  
To enable specific functionality like date and map capabilities, specific columns like 'Start date' and 'lat,lng' are needed.

The CSV file can grow or shrink to accommodate the needs of the project, though it should be noted that new columns will show immediately on the web interface.
The *js/index.js* file and *setup_filters* function controls how specific columns are to be handled. These settings could be exported to a settings.js file to make edits to this easier.


# Testing the website locally
To test the web interface locally a web server is required.
To run a local server from the Terminal on OSX or Linux, python can be used.  
With python installed along with the 'http' library, running the command below from the location of the project directory makes this possible.
```
python -m http.server 8000
```
Then navigate to http://localhost:8000/ from your web browser

# Acknowledgements
Caitlin Carter (She/Her), Program Manager, HELIOS

Kimberly Cox-York, PhD (She/Her), Director, Research Integrity Office

Kevin Worthington, MASc (He/Him), Map and (GIS) Data Specialist, Geospatial Centroid

Special thanks to Dan Carver who was the inspiration for the development of the source code this project was adapted from.
[This earlier work can be seen here](https://dcarver1.github.io/cwrUSA_maps/).
