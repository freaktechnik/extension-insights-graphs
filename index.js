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
    x = d3.scaleTime().rangeRound([0, width]),
    y = d3.scaleLinear().rangeRound([height, 0]),
    parseTime = d3.timeParse("%Y-%m-%d"),
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
    const data = d3.csvParse(reader.result);
    const statSelect = document.getElementById("stat");
    for(const child of statSelect.children) {
        if(child.value) {
            child.remove();
        }
    }
    const printableCols = data.columns.filter((c) => !ignoredCols.includes(c));
    for(const column of printableCols) {
        const opt = new Option(column);
        statSelect.append(opt);
    }
    color.domain(printableCols);
    const mapLine = (d) => line(data.map((p) => ({
        Date: parseTime(p.Date),
        value: parseInt(p[d], 10)
    })));
    activeLines.length = 0;
    lines.selectAll('.line-group')
        .data(printableCols).enter()
        .append("path")
            .attr('class', 'line-group')
            .attr("fill", "none")
            .attr("stroke", (d) => color(d))
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("data-legend", (d) => d)
            .attr('d', mapLine);
    let dataL = 0;
    const legends = legend.selectAll('.legend-entry')
        .data(printableCols).enter()
            .append('g')
            .attr('class', 'legend-entry')
            .attr('transform', (d, i) => `translate(0,${i * 20})`);
    legends.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', color)
    legends.append('text')
        .attr('x', 20)
        .attr('y', 10)
        .text((d) => d);
    x.domain(d3.extent(data, (d) => parseTime(d.Date)));
    statSelect.addEventListener("change", () => {
        if(!statSelect.value) {
            return;
        }
        const yExtent = d3.extent(data, (d) => parseInt(d[statSelect.value], 10)),
            oldExtent = y.domain();
        y.domain([ Math.min(yExtent[0], oldExtent[0]), Math.max(yExtent[1], oldExtent[1]) ]);
        activeLines.push(statSelect.value);
        lines.selectAll('.line-group')
            .data(activeLines)
            .attr('d', mapLine);

        xAxis.call(d3.axisBottom(x));
        yAxis.call(d3.axisLeft(y));

        legend.selectAll('.legend-entry').data(activeLines);
    });
});

document.getElementById("source").addEventListener("input", (e) => {
    const file = e.target.files[0];
    reader.readAsText(file);
});
