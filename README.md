# extension-insights-graphs
Simple fully client-side line-chart generator for Twitch Extension Insight CSV files

Uses d3js to parse and draw lines based on the data in the CSV. Ignores the trailing 0 lines when an extension doesn't have a year's worth of data yet.

## Why do I have to manually download the CSV
Because JS is not allowed to load the CSV's content in your browser. Which makes
sense, so you have to download the CSV and can then select it to generate the
graphs from.
