const ignoredCols = [
        'Date',
        'Extension Name',
        'Extension Client ID'
    ],
    reader = new FileReader();

reader.addEventListener("load", () => {
    const data = d3.csvParse(reader.result);
    const statSelect = document.getElementById("stat");
    for(const child of statSelect.children) {
        if(child.value) {
            child.remove();
        }
    }
    for(const column of data.columns) {
        if(!ignoredCols.includes(column)) {
            const opt = new Option(column);
            statSelect.append(opt);
        }
    }
    statSelect.addEventListener("change", () => {
        if(!statSelect.value) {
            return;
        }
        const svg = d3.select("svg"),
            margin = {top: 20, right: 20, bottom: 30, left: 50},
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom,
            g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
            parseTime = d3.timeFormat("%d-%b-%y"),
            x = d3.scaleTime().rangeRound([0, width]),
            y = d3.scaleLinear().rangeRound([height, 0]),
            line = d3.line().x((d) => parseTime(d.Date)).y((d) => d[statSelect.value]);
        x.domain(d3.extent(data, (d) => d.Date, parseTime));
        y.domain(d3.extent(data, (d) => d[statSelect.value]));
        g.append("g")
                .call(d3.axisLeft(y))
            .append("text")
                .attr("fill", "#000")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", "0.71em")
                .attr("text-anchor", "end")
                .text(statSelect.value);

        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", line);
    });
});

document.getElementById("source").addEventListener("input", (e) => {
    const file = e.target.files[0];
    reader.readAsText(file);
});
