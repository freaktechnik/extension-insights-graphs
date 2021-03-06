const ignoredCols = [
        'Date',
        'Extension Name',
        'Extension Client ID'
    ],
    customColDefinitions = {
        "Installed Channels": {
            left: "Installs",
            right: "Uninstalls",
            operation: "+"
        },
        "Linked Accounts": {
            left: "Unique Identity Links",
            right: "Unique Identity Unlinks",
            operation: "+"
        },
        "Install Rate": {
            left: "Installs",
            right: "Extension Details Page Visits",
            operation: "/"
        },
        "Renders per Viewer": {
            left: "Renders",
            right: "Unique Viewers",
            operation: "/"
        }
    },
    stats = {
        installs: "Installed Channels",
        active: "Unique Active Channels",
        linkedAccounts: "Linked Accounts"
    },
    customCols = Object.keys(customColDefinitions),
    reader = new FileReader(),
    svg = d3.select("svg"),
    margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    parseTime = d3.utcParse("%Y-%m-%d"),
    x = d3.scaleTime().rangeRound([0, width]),
    y = d3.scaleLinear().rangeRound([height, 0]),
    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
    yAxis = g.append("g").call(d3.axisLeft(y)),
    xAxis = g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x)),
    color = d3.scaleOrdinal()
        .range(d3.schemeCategory10),
    line = d3.line().x((d) => x(d.Date)).y((d) => y(d.value)),
    lines = g.append('g').attr('class', 'lines'),
    legend = g.append('g').attr('class', 'legend'),
    dots = g.append('g').attr('class', 'dots'),
    activeLines = [],
    statFormatter = new Intl.NumberFormat(),
    dateFormatter = d3.timeFormat('%Y-%m-%d')
    getLiveChannels = (clientID, count = 0, cursor = '') => {
        return fetch(`https://api.twitch.tv/extensions/${clientID}/live_activated_channels?cursor=${cursor}`, {
            headers: {
                "Client-ID": clientID
            }
        }).then((response) => {
            if(response.ok && response.status === 200) {
                return response.json();
            }
            throw new Error(`HTTP error ${response.statusText}`);
        }).then((json) => {
            count += json.channels.length;
            if(json.cursor) {
                return getLiveChannels(clientID, count, json.cursor);
            }
            else {
                return count;
            }
        });
    };

reader.addEventListener("load", () => {
    let data = d3.csvParse(reader.result),
        lastIndexWithData = 0;
    for(let d = data.length - 1; d >= 0; --d) {
        const o = data[d];
        let hadSomeData = false;
        for(const i in o) {
            if(!ignoredCols.includes(i)) {
                if(o[i] > 0) {
                    hadSomeData = true;
                    lastIndexWithData = parseInt(d, 10);
                    break;
                }
            }
        }
        if(hadSomeData) {
            break;
        }
    }
    const printableCols = data.columns.filter((c) => !ignoredCols.includes(c)).concat(customCols);
    data = data.slice(0, Math.min(lastIndexWithData + 2, data.length));

    // calculate maths
    const customColData = {};
    for(const col of customCols) {
      customColData[col] = 0;
    }
    for(const row of data.reverse()) {
        for(const col of customCols) {
            const definition = customColDefinitions[col];
            const left = parseInt(row[definition.left], 10);
            const right = parseInt(row[definition.right], 10);
            switch(definition.operation) {
                case "+":
                    customColData[col] += left - right;
                    break;
                case "/":
                    customColData[col] = left / right;
                    break;
            }
        }

        for(const col of customCols) {
            row[col] = customColData[col];
        }
    }
    for(const stat in stats) {
        if(stats.hasOwnProperty(stat)) {
            document.getElementById(stat).value = statFormatter.format(data[data.length - 1][stats[stat]]);
        }
    }
    //TODO ensure installs are at least current unique active channels

    getLiveChannels(data[0]['Extension Client ID']).then((count) => {
        document.getElementById("liveCount").value = statFormatter.format(count);
    });

    // undraw graphs and all that.
    const statGroup = document.getElementById("statgroup");
    for(const child of statGroup.children) {
        if(child.value) {
            child.remove();
        }
    }
    for(const column of printableCols) {
        if(!customCols.includes(column)) {
            const opt = new Option(column);
            statGroup.append(opt);
        }
    }
    statGroup.disabled = false;
    document.getElementById("calcgroup").disabled = false;
    color.domain(printableCols);
    x.domain(d3.extent(data, (d) => parseTime(d.Date)));
    const mapLine = (d) => line(data.map((p) => ({
        Date: parseTime(p.Date),
        value: parseFloat(p[d])
    })));
    activeLines.length = 0;
    const updateGraph = () => {
        const lGroup = lines.selectAll('.line-group')
            .data(activeLines, (d) => d);
        lGroup.exit().remove();
        lGroup.enter()
            .append("path")
                .attr('class', 'line-group')
                .style("fill", "none")
                .style("stroke", color)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("stroke-width", 1.5)
                .attr("data-legend", (d) => d)
                .attr('d', mapLine);
        lGroup.attr('d', mapLine)

        // Add dots, first add the groups for dots per line
        const dGroup = dots.selectAll('.dot-group')
            .data(activeLines, (d) => d);
        dGroup.exit().remove();
        dGroup.enter()
            .append('g')
                .attr('class', 'dot-group')
        // Need to start from scratch to get added/removed nodes. Actually add the dots now.
        const dInst = dots.selectAll('.dot-group').selectAll('circle')
            .data((d) => data.map((p) => ({
                Date: parseTime(p.Date),
                value: parseFloat(p[d]),
                color: color(d),
                label: d
            })));
        dInst.exit().remove();
        dInst.enter()
            .append('circle')
                .attr('r', 5)
                .attr('cx', (d) => x(d.Date))
                .attr('cy', (d) => y(d.value))
                .style('fill', 'none')
                .style('pointer-events', 'all')
                .on('mouseover', function(d) {
                    d3.select(this).style('fill', d.color);
                })
                .on('mouseout', function(d) {
                    d3.select(this).style('fill', 'none');
                })
                .append('title')
                    .text((d) => `${dateFormatter(d.Date)} - ${d.label}: ${statFormatter.format(d.value)}`)
        dInst
            .attr('cx', (d) => x(d.Date))
            .attr('cy', (d) => y(d.value))

        xAxis.call(d3.axisBottom(x));
        yAxis.call(d3.axisLeft(y));

        const legends = legend.selectAll('.legend-entry')
            .data(activeLines, (d) => d);
        legends.exit().remove();
        const newLegends = legends.enter()
                .append('g')
                .attr('class', 'legend-entry')
                .attr('transform', (d, i) => `translate(2,${i * 20})`)
                .on('mouseover', function(d) {
                    d3.select(this).select('.remove').style('opacity', '1.0');
                })
                .on('mouseout', function(d) {
                    d3.select(this).select('.remove').style('opacity', '0.0');
                });
        legends.attr('transform', (d, i) => `translate(2,${i * 20})`);
        newLegends.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 10)
            .attr('height', 10)
            .attr('fill', color)
        newLegends.append('text')
            .attr('x', 20)
            .attr('y', 10)
            .text((d) => d);
        newLegends.append('text')
            .attr('x', 0)
            .attr('y', 10)
            .attr('width', 10)
            .attr('height', 10)
            .attr('class', 'remove')
            .text('🗙')
            .style('opacity', '0.0')
            .style('font-size', '10px')
            .style('cursor', 'pointer')
            .on('click', (d) => {
                activeLines.splice(activeLines.indexOf(d), 1);
                if(activeLines.length) {
                    y.domain([
                        Math.min(0, d3.min(activeLines, (e) => d3.min(data, (p) => parseFloat(p[e])))),
                        d3.max(activeLines, (e) => d3.max(data, (p) => parseFloat(p[e])))
                    ]);
                }
                updateGraph();
            });
    };
    const statSelect = document.getElementById("stat");
    statSelect.addEventListener("change", () => {
        if(!statSelect.value || activeLines.length >= d3.schemeCategory10.length || activeLines.includes(statSelect.value)) {
            return;
        }
        const yExtent = d3.extent(data, (d) => parseFloat(d[statSelect.value]));
        if(activeLines.length > 0) {
            const oldExtent = y.domain();
            y.domain([ Math.min(0, yExtent[0], oldExtent[0]), Math.max(yExtent[1], oldExtent[1]) ]);
        }
        else {
            y.domain([ Math.min(0, yExtent[0]), yExtent[1] ]);
        }
        activeLines.push(statSelect.value);
        updateGraph();
        statSelect.value = '';
    });
});

document.getElementById("source").addEventListener("input", (e) => {
    const file = e.target.files[0];
    reader.readAsText(file);
});
