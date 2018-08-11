const HEX = 16,
    clientId = '1x59tb2nluf1dgnx5aqazviiibft56',
    ignoredCols = [
        'Date',
        'Extension Name',
        'Extension Client ID'
    ];

if(location.hash.length > 1 || localStorage.getItem("token")) {
    let token = localStorage.getItem('token');
    if(localStorage.getItem("state") && location.hash.length > 1) {
        const params = new URLSearchParams(location.hash.substr(1));
        if(params.get('state') === localStorage.getItem('state') && params.get('scope') === 'anayltics:read:extensions') {
            token = params.get('access_token');
            localStorage.setItem("token", token);
            localStorage.removeItem('state');
        }
        else {
            throw new Error("Couldn't authorize");
        }
    }
    else if(!token) {
        throw new Error("Invalid application state");
    }

    document.getElementById("login").hidden = true;
    document.getElementById("graphs").hidden = false;

    const extensionSelect = document.getElementById("extension");
    extensionSelect.addEventListener("change", () => {
        if(extensionSelect.value) {
            fetch(extensionSelect.value).then((response) => {
                if(response.ok && response.status === 200) {
                    return response.text();
                }
                throw new Error("Could not load extension insights");
            }).then((csv) => {
                const data = d3.csvParse(csv);
                const statSelect = document.getElementById("stat");
                for(const child of statSelect.childElements) {
                    child.remove();
                }
                for(const column of data.columns) {
                    if(!ignoredCols.includes(column)) {
                        const opt = new Option(column);
                        statSelect.append(opt);
                    }
                }
                statSelect.addEventListener("change", () => {
                    const svg = d3.select("svg"),
                        margin = {top: 20, right: 20, bottom: 30, left: 50},
                        width = +svg.attr("width") - margin.left - margin.right,
                        height = +svg.attr("height") - margin.top - margin.bottom,
                        g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
                        parseTime = d3.timeParse("%d-%b-%y"),
                        x = d3.scaleTime().rangeRound([0, width]),
                        y = d3.scaleLinear().rangeRound([height, 0]),
                        line = d3.line().x((d) => parseTime(d.Date)).y((d) => d[statSelect.value]);
                    x.domain(d3.extend(data, (d) => parseTime(d.Date)));
                    y.domain(d3.extend(data, (d) => d[statSelect.value]));
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
        }
    });

    fetch(`https://api.twitch.tv/helix/analytics/extensions?type=overview_v2`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }).then((response) => {
        if(response.ok && response.status === 200) {
            return response.json();
        }
        throw new Error(`HTTP error ${response.statusText}`);
    }).then((json) => {
        //TODO pagination
        for(const extension in json.data) {
            if(extension.type === "overview_v2") {
                const opt = new Option(extension.extension_id, extension.URL)
                extensionSelect.append(opt);
            }
        }
        // URLs are no longer valid after 1 minute.
        //TODO instead just request a new url when the extension is selected.
        setTimeout(() => {
            for(const child of extensionSelect.childElements) {
                if(!child.selected) {
                    child.remove();
                }
            }
        }, 60000);
    });
}
else {
    const state = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(HEX);
    localStorage.setItem("state", state);
    document.querySelector("#login button").addEventListener("click", () => {
        window.location = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${window.location}&response_type=token&scope=analytics:read:extensions&state=${state}`;
    });
}
