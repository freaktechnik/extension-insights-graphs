# extension-insights-graphs
Simple fully client-side line-chart generator for Twitch Extension Insight CSV files

Uses d3js to parse and draw lines based on the data in the CSV. Ignores the trailing 0 lines when an extension doesn't have a year's worth of data yet.

## Why do I have to manually download the CSV
Because JS is not allowed to load the CSV's content in your browser. Which makes
sense, so you have to download the CSV and can then select it to generate the
graphs from.

## Where do the calculated stats come from
*Installed Channels* is calculated from the daily installs and uninstalls. *Linked Accounts* is calculated from daily unique identity links and unlinks. These numbers only account for the data present in the CSV, so if the extension has existed for longer than the stats in the CSV contain, a base amount of things is missing.

The *Currently live channels* number comes from going through all pages of the [live channels with the extension activated endpoint](https://dev.twitch.tv/docs/extensions/reference/#get-live-channels-with-extension-activated). The request are made with the extension's client ID.
