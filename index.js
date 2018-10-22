const ignoredCols = [
        'Date',
        'Extension Name',
        'Extension Client ID'
    ],
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
    activeLines = [];

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
    const printableCols = data.columns.filter((c) => !ignoredCols.includes(c));
    data = data.slice(0, Math.min(lastIndexWithData + 2, data.length));

    // calculate maths
    let estimatedInstalls = 0;
    let estimatedLinkedAccounts = 0;
    for(const row of data) {
        estimatedInstalls += parseInt(row['Installs'], 10) - parseInt(row['Uninstalls'], 10);
        row['Installed Channels'] = estimatedInstalls;

        estimatedLinkedAccounts += parseInt(row['Unique Account Links'], 10) - parseInt(row['Unique Account Unlinks'], 10);
        row['Linked Accounts'] = estimatedLinkedAccounts;
    }
    printableCols.push('Installed Channels');
    printableCols.push('Linked Accounts');
    document.getElementById("installs").value = estimatedInstalls;
    //TODO ensure it's at least current unique active channels
    document.getElementById("linkedAccounts").value = estimatedLinkedAccounts;

    // undraw graphs and all that.
    const statSelect = document.getElementById("stat");
    for(const child of statSelect.children) {
        if(child.value) {
            child.remove();
        }
    }
    for(const column of printableCols) {
        const opt = new Option(column);
        statSelect.append(opt);
    }
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
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("stroke-width", 1.5)
                .attr("data-legend", (d) => d)
                .attr('d', mapLine);
        lGroup.attr('d', mapLine)

        xAxis.call(d3.axisBottom(x));
        yAxis.call(d3.axisLeft(y));

        const legends = legend.selectAll('.legend-entry')
            .data(activeLines, (d) => d);
        legends.exit().remove();
        const newLegends = legends.enter()
                .append('g')
                .attr('class', 'legend-entry')
                .attr('transform', (d, i) => `translate(0,${i * 20})`)
                .on('mouseover', function(d) {
                    d3.select(this).select('.remove').style('opacity', '1.0');
                })
                .on('mouseout', function(d) {
                    d3.select(this).select('.remove').style('opacity', '0.0');
                });
        legends.attr('transform', (d, i) => `translate(0,${i * 20})`);
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
                        d3.min(activeLines, (e) => d3.min(data, (p) => parseFloat(p[e]))),
                        d3.max(activeLines, (e) => d3.max(data, (p) => parseFloat(p[e])))
                    ]);
                }
                updateGraph();
            });
    };
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
            y.domain(yExtent);
        }
        activeLines.push(statSelect.value);
        updateGraph();
    });
});

document.getElementById("source").addEventListener("input", (e) => {
    const file = e.target.files[0];
    reader.readAsText(file);
});
