# extension-insights-graphs
Simple line-chart generator for Twitch Extension Insight CSV files

Uses d3js to parse and draw lines based on the data in the CSV. Ignores the trailing 0 lines when an extension doesn't have a year's worth of data yet.

## Why can't it OAuth and fetch the CSV for me?
CORS, that's why. The CSV files can not be downloaded from within a website in your web browser. While you can OAuth and get a list of CSV files, you can't donwload them as website, you'd need the user to download it and then feed it back to you. So I just left out the OAuth bit.
