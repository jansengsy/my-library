// Global constants
let globalChartData$1 = {};

function addToGlobalCharts(data, uid) {
    globalChartData$1[uid] = data;
}

function getFromGlobalChartsData(uid) {
    return globalChartData$1[uid];
}

function clearChartDrawArea(id) {
    const container = d3.select(`#container_${id}`);
    container.selectAll(`.legend_${id}`).remove();
    container.selectAll(".chart_svg").remove();
}

// Example data: type = "area", width = 100, height = 100, margin = { top: 5, bottom: 5, left: 5, right: 5 }, uid = D7g9dbbshs70f0D899, colours = ["#ff0000", "#ab12ff", "#0fa2f4"]
function drawLegend(type, width, height, margin, uid, labels, colours) {

    const legendIconSize = 10;
    const rowHeight = 15;
    const legendMargin = 10;
    const legendWidth = width + margin.left + margin.right - legendMargin * 2;
    let legendItemsArray = [];
    let legendRowCurrentWidth = 0;
    let legendCurrentRow = 0;

    labels.forEach((item, i) => {

        const itemWidth = legendIconSize + getStringLengthInPixels(item) + 20; // 20 represents the gap between items
        item = item.replaceAll(" ", "_");

        // If the legend item would fit into the width we're happy
        if (legendWidth > legendRowCurrentWidth + itemWidth) {
            legendItemsArray[i] = {item, legendCurrentRow, itemWidth, legendRowCurrentWidth};
            legendRowCurrentWidth += itemWidth;
        } else { // If it would overflow we start a new legend row
            legendCurrentRow += 1;
            legendRowCurrentWidth = 0;
            legendItemsArray[i] = {item, legendCurrentRow, itemWidth, legendRowCurrentWidth};
            legendRowCurrentWidth = itemWidth;
        }
    });

    const legendContainer = d3.select(`#chart_${uid}`)
        .append("g")
        .attr("class", `legend_${uid}`)
        .attr("transform", `translate(0, ${height + margin.top + margin.bottom - 60})`); // 60 represents the minimum legend height

    const legendItems = legendContainer.selectAll(".legend-item")
        .data(legendItemsArray)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", d => `translate(${legendMargin + d.legendRowCurrentWidth}, ${rowHeight * d.legendCurrentRow})`)
        .on("mouseenter", e => handleLegendIn(type, d3.event, uid))
        .on("mouseout", e => handleLegendOut(type, d3.event, uid));

    legendItems.append("rect")
        .attr("width", legendIconSize)
        .attr("height", legendIconSize)
        .attr("fill", (d, i) => `${colours[i]}`)
        .attr("transform", (d, i) => {
            `translate(${d.legendRowCurrentWidth}, ${legendIconSize / 2})`;
        });

    legendItems.append("text")
        .attr("x", legendIconSize + 5) // Adjust the x-position of the text factoring the icon and a gap between
        .attr("y", 9) // Adjust the y-position of the text to center vertically
        .style("font-size", "14px")
        .style("font-family", "Calibri")
        .attr("transform", (d, i) => {
            `translate(${d.legendRowCurrentWidth}, 0)`;
        })
		.text(d => d.item.replaceAll("_", " "));
}

function handleLegendIn(type, e, uid) {
    if (type === "area") {
        d3.select(`#chart_${uid}`).selectAll(`.${e.target.__data__.item}`).attr("fill", "yellow");
    } else if (type === "snail") {
        const portfolioClass = e.target.__data__.item.replaceAll(" ", "_").replaceAll("/", "-").replaceAll(".", "");
        d3.select(`#chart_${uid}`).selectAll(`.${portfolioClass}`).attr("stroke-width", 4);
        d3.select(`#chart_${uid}`).selectAll(`circle.${portfolioClass}`).attr("r", 7);
    }
}

function handleLegendOut(type, e, uid) {
    if (type === "area") {
        const asset = e.target.__data__;
        d3.select(`#chart_${uid}`).selectAll(`.${asset.item}`).attr("fill", `#${globalChartData$1[uid].Colours[asset.item.replaceAll("_", " ")]}`);
    } else if (type === "snail") {
        const portfolioClass = e.target.__data__.item.replaceAll(" ", "_").replaceAll("/", "-").replaceAll(".", "");
        d3.select(`#chart_${uid}`).selectAll(`.${portfolioClass}`).attr("stroke-width", 2);
        d3.select(`#chart_${uid}`).selectAll(`circle.${portfolioClass}`).attr("r", 5);
    }
}

function getStringLengthInPixels(string) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Set font properties for measuring the string width
    const font = "Calibri";
    const fontSize = "14px";
    context.font = `${fontSize} ${font}`;

    // Get the width of the string in pixels
    const stringWidth = context.measureText(string).width;

    canvas.remove();

    return stringWidth;
}

// Initial creation (this is a step for the C3 pipeline but, for now, D3 charts need this)
function createRealTimeAreaChart(data) {
    return "area";
}

function area(c) {

    // Tooltip DOM elements
    let areaTooltip;
    let areaTooltipLineX;
    let areaTooltipLineY;
    let areaWidth;
    let areaHeight;
    let legendHeight;
    let areaMargin = { top: 5, right: 15, bottom: 45, left: 45, };

    let uid;

    uid = c.Name.replace("chart_", "");
    addToGlobalCharts(c, uid);

    const colours = Object.values(c.Colours).map(value => '#' + value);
    
    clearChartDrawArea(uid);

    // Ensure chart data exists
    if (c.RawValues.Default.length < 1) {
        showChartNoData(c);
        return;
    }

    const legendData = c.Labels.Default.map((value) => value.replaceAll(" ", "_"));
    
    // Data values
    let data = c.RawValues.Default;
    const assetCount = legendData.length;
    const time = [];
    
    // SVG Size values:
    areaWidth = d3.select(`#${c.Name}`).node().getBoundingClientRect().width - areaMargin.left - areaMargin.right;
    areaHeight = d3.select(`#${c.Name}`).node().getBoundingClientRect().height - areaMargin.top - areaMargin.bottom;
    legendHeight = 25;

    drawLegend("area", areaWidth, areaHeight, areaMargin, uid, c.Labels.Default, colours);

    /*
        Data arrives like this: 
            [UTC Timestamp, percentage a, percentage b, percentage c]

        Data leaves like this: 
            [ [UTC Timestamp, percentage a], [UTC Timestamp, percentage b], [UTC Timestamp, percentage c] ]
    */
    data = data.flatMap(subArray => {
        const firstValue = subArray[0];
        const remainingValues = subArray.slice(1);
        return remainingValues.map(value => [firstValue, value]);
    });

    // For each datum in data, I add additional information so that it is acessible for tooltips
    data.forEach((d, i) => {
        d.assetType = legendData[i % assetCount];
        d.date = new Date(d[0] * 1000).toLocaleDateString();
        d.percentage = i % assetCount > 0 ? Math.abs(d[1] - data[i - 1][1]) : d[1];
        d.startingPercentage = i > 0 ? data[i - 1][1] : null;
    });

    // Create an array of dates, converted from UTC to JS Date format.
    data.forEach((d, i) => {
        d[0] = d[0] * 1000;
        let date = new Date(d[0]);
        time.push(date);
    });

    // Create the SVG
    const svg = d3.select(`#${c.Name}`)
        .append("g")
        .attr("width", `${areaWidth + areaMargin.left + areaMargin.right}`)
        .attr("height", `${areaHeight + areaMargin.top + areaMargin.bottom}`)
        .attr("class", "chart_svg")
        .attr("transform", `translate(${areaMargin.left}, ${areaMargin.top})`);

    // Set up the scales
    var xScale = d3.scaleTime()
        .domain(d3.extent(time))
        .range([0, areaWidth]);

    const yScale = d3.scaleLinear()
        .domain([100, 0])
        .nice()
        .range([0, areaHeight - areaMargin.bottom - legendHeight]);

    // Area generator
    const area = d3.area()
        .x(d => xScale(d[0]))
        // I have already calculated the starting percentage to make it easier
        .y0(d => d.assetType === legendData[0] ? areaHeight - areaMargin.bottom - legendHeight : yScale(d.startingPercentage))
        .y1(d => yScale(d[1]));

    // Draw the areas
    for (let step = 0; step < data.length - assetCount; step++) {
        svg.append("path")
            .datum([data[step], data[step + assetCount]])
            .attr("d", area)
            .attr("id", "area")
            .attr("class", `area ${legendData[step % assetCount]}`)
            .attr("fill", `#${c.Colours[legendData[step % assetCount].replaceAll("_", " ")]}`);
    }

    // Create the X axis
    var xAxis = d3.axisBottom(xScale);
    xAxis.tickFormat(d3.timeFormat('%b %y'));

    svg.append('g')
        .attr("class", "x-axis")
        .style("color", "black")
        .style("font-size", "10px")
        .attr('transform', `translate(0, ${areaHeight - areaMargin.bottom - legendHeight})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "rotate(45)")
        .style("text-anchor", "start");

    // Create the Y axis
    const yAxis = d3.axisLeft(yScale);
    yAxis.tickFormat(d3.format(".1f"));

    svg.append("g")
        .attr("class", "y-axis")
        .style("color", "black")
        .style("font-size", "10px")
        .call(yAxis);

    // Adding the event listeners to the drawn areas
    d3.selectAll(`#chart_${uid}`)
        .on("mousemove", e => {
            // Draw tooltip
            if (d3.event.target.id === "area") showAreaTooltip(d3.event);
            // Delete tooltip if mouse has left chart area
            else if (d3.event.target.id !== "tooltip-line") hideAreaTooltip();
        });
    
    areaTooltip = d3.select(`#tooltip_${uid}`);
    areaTooltipLineX = d3.select(`#chart_${uid}`).append("line").attr("id", "tooltip-line").attr("stroke", "red").attr("stroke-width", 1).attr("stroke-dasharray", "2,2");
    areaTooltipLineY = d3.select(`#chart_${uid}`).append("line").attr("id", "tooltip-line").attr("stroke", "red").attr("stroke-width", 1).attr("stroke-dasharray", "2,2");

    // Tooltip code
    function showAreaTooltip(e) {

        // Set the position of the tooltip lines
        areaTooltipLineY.style("display", "block").attr("x1", d3.pointer(e)[0]).attr("x2", d3.pointer(e)[0]).attr("y1", 0 + areaMargin.top).attr("y2", areaHeight - areaMargin.bottom + areaMargin.top - legendHeight);
        areaTooltipLineX.style("display", "block").attr("y1", d3.pointer(e)[1]).attr("y2", d3.pointer(e)[1]).attr("x1", 0 + areaMargin.left).attr("x2", areaWidth + areaMargin.left);
    
        const pointData = e.target.__data__[0];
        let tooltipX;
        let tooltipY;
    
        // If we're on the right side of the chart, draw the tooltip toward the left
        if(d3.pointer(e)[0] > areaWidth / 2) {
            tooltipX = d3.pointer(e)[0] - 120;
            tooltipY = d3.pointer(e)[1] + areaMargin.bottom + 15;
        } else {
            tooltipX = d3.pointer(e)[0] + areaMargin.left - areaMargin.right;
            tooltipY = d3.pointer(e)[1] + areaMargin.bottom + 15;
        }
    
        areaTooltip.style("left", tooltipX + "px")
            .style("top", tooltipY + "px");
    
        areaTooltip.style("display", "block");
        areaTooltip.style("color", "black");
    
        const textData = [
            `<b>Asset:</b> ${pointData.assetType.replaceAll("_", " ")}`,
            `<b>Percentage:</b> ${Number(pointData.percentage).toFixed(1)}%`,
            `<b>Date:</b> ${pointData.date}`,
        ];
    
        // For each item in data array, add a line break after
        areaTooltip.html(textData.join("<br>"));
    }
    
    function hideAreaTooltip() {
        areaTooltip.style("display", "none");
        areaTooltip.text("");
        areaTooltipLineX.style("display", "none");
        areaTooltipLineY.style("display", "none");
    }
}

// Unused argument as at the moment this method is shared with c3 charts (which do require this value - will remove later)
function realTimeAreaChartOnResize(data) {
    updateRealTimeAreaChart(globalChartData[data.uid.replace("chart_", "")]);
}

function highlightAsset(asset, uid) {
    d3.select(`#chart_${uid}`).selectAll(`.${asset.item}`).attr("fill", "yellow");
}

function unhighlightAsset(asset, uid) {
    d3.select(`#chart_${uid}`).selectAll(`.${asset.item}`).attr("fill", `#${globalChartData[uid].Colours[asset.item.replaceAll("_", " ")]}`);
}

// Eventually, this will be passed in as data, but for now these are hardcoded
const snailColours = ["#ff0000", "#a04476", "#936eb1", "#5090cd", "#00a489", "#ff8000", "#28427b"];

// Tooltip DOM elements
let snailTooltip;

function createRealTimeSnailChart(data) {
    return "snail";
}

function snail(data) {

    let uid;
    let snailWidth;
    let snailHeight;
    let snailLegendHeight;
    let snailMargin = { top: 5, right: 15, bottom: 35, left: 45, };
    let snailgroupedLines = [];

    uid = data.Name.replace("chart_", "");
    addToGlobalCharts(c, uid);

    clearChartDrawArea(uid);

    // Ensure chart data exists
    if (data.RawValues.Default.length < 1) {
        showChartNoData(data);
        return;
    }
    
    const legendData = data.Labels.Default;

    // Data values
    snailgroupedLines = []; // Resetting each time we redraw otherwise we just keep adding to it
    let currentSubArray = [];

    // Set the dimensions and margins of the chart
    snailWidth = d3.select(`#${data.Name}`).node().getBoundingClientRect().width - snailMargin.left - snailMargin.right;
    snailHeight = d3.select(`#${data.Name}`).node().getBoundingClientRect().height - snailMargin.left - snailMargin.right;
    snailLegendHeight = 25;

    drawLegend("snail", snailWidth, snailHeight, snailMargin, uid, data.Labels.Default, snailColours);

    // Group the lines for each snail
    data.RawValues.Default.forEach(item => {
        if (item[1] === 1) {
            currentSubArray = [item];
            snailgroupedLines.push(currentSubArray);
        } else {
            currentSubArray.push(item);
        }
    });

    // Add the asset name to the lines
    legendData.forEach((asset, i) => {
        snailgroupedLines[i].forEach(line => {
            line[0] = legendData[i];
        });
    });

    const c = snailgroupedLines.length;
    const benchmarkLine = [[...snailgroupedLines[c - 2][0]], [...snailgroupedLines[c - 1][0]]];

    // Calculate the slope and intercept of the line
    const startX = benchmarkLine[0][2];
    const startY = benchmarkLine[0][3];
    const endX = benchmarkLine[1][2];
    const endY = benchmarkLine[1][3];
    const slope = (endY - startY) / (endX - startX);
    const intercept = startY - slope * startX;

    // Calculate the extended line coordinates
    let extendedX1 = 0;
    let extendedY1 = slope * extendedX1 + intercept;
    let extendedX2 = d3.max(snailgroupedLines.flat().map(d => d[d.length - 2]));
    let extendedY2 = slope * extendedX2 + intercept;

    // Update the benchmark line to use these extended coordinates
    benchmarkLine[0][2] = extendedX1;
    benchmarkLine[0][3] = extendedY1;
    benchmarkLine[1][2] = extendedX2;
    benchmarkLine[1][3] = extendedY2;

    const xPoints = snailgroupedLines.flat().map(d => d[d.length - 2]);
    const yPoints = snailgroupedLines.flat().map(d => d[d.length - 1]);
    yPoints.push(extendedY2);

    // Append the SVG element to the body
    const svg = d3.select(`#${data.Name}`)
        .attr("width", `${snailWidth + snailMargin.left + snailMargin.right}`)
        .attr("height", `${snailHeight + snailMargin.top + snailMargin.bottom}`)
        .append("g")
        .attr("class", "chart_svg")
        .attr("transform", `translate(${snailMargin.left}, ${snailMargin.top})`);

    // Set up the scales
    const xScale = d3.scaleLinear()
        .domain([
            d3.min(xPoints),
            d3.max(xPoints),
        ])
        .range([0, snailWidth]);

    const yScale = d3.scaleLinear()
        .domain([
            d3.min(yPoints),
            d3.max(yPoints),
        ])
        .nice()
        .range([snailHeight - snailMargin.bottom - snailLegendHeight, 0]);

    // Create the X axis
    const xAxis = d3.axisBottom(xScale);
    xAxis.tickFormat(d3.format(".1f"));

    svg.append("g")
        .attr("class", "x-axis")
        .style("color", "black")
        .style("font-size", "10px")
        .attr("transform", `translate(0, ${snailHeight - snailLegendHeight - snailMargin.bottom})`)
        .call(xAxis);

    // Create the Y axis
    const yAxis = d3.axisLeft(yScale);
    yAxis.tickFormat(d3.format(".2f"));

    svg.append("g")
        .attr("class", "y-axis")
        .style("color", "black")
        .style("font-size", "10px")
        .call(yAxis);

    d3.select("g#yAxisG").select("path").remove();

    // Create the background grid
    svg.selectAll("xGrid")
        .data(xScale.ticks().slice(0))
        .join("line")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", 0)
        .attr("y2", snailHeight - snailLegendHeight - snailMargin.bottom)
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", .5);

    svg.selectAll("yGrid")
        .data(yScale.ticks().slice(0))
        .join("line")
        .attr("x1", 0)
        .attr("x2", snailWidth)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", .5);

    // Line generator used to draw any lines
    const lineGenerator = d3.line()
        .x(d => xScale(d[2]))
        .y(d => yScale(d[3]));

    // Draw benchmark line
    svg.append("path")
        .datum(benchmarkLine)
        .attr("d", lineGenerator)
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-width", 2);

    // This loop is where the lines and dots for each value are drawn
    snailgroupedLines.forEach((line, i) => {

        // Having a class with spaces or slashes in makes it harder to work with later
        const portfolioName = line[0][0].replaceAll(" ", "_").replaceAll("/", "-").replaceAll(".", "");

        svg.append("path")
            .datum(line)
            .attr("d", lineGenerator)
            .attr("class", "trail")
            .attr("class", portfolioName)
            .attr("fill", "none")
            .attr("stroke", `${snailColours[i]}`)
            .attr("opacity", 1)
            .attr("stroke-width", 2);

        svg.append("circle")
            .attr("class", "dot")
            .attr("class", portfolioName)
            .attr("cx", xScale(line[0][2])) // Final point for each line
            .attr("cy", yScale(line[0][3]))
            .attr("r", 5)
            .attr("fill", `${snailColours[i]}`);
    });

    // All of the paths are given the class "area"
    svg.selectAll(`circle`).on("mouseover", (e, d) => {
        showSnailTooltip(d3.event, d, uid);
    }).on("mouseout", () => hideSnailTooltip());

    // Tooltip methods
    function showSnailTooltip(e, index, uid) {

        snailTooltip = d3.select(`#tooltip_${uid}`);
        data = snailgroupedLines[index][0];
    
        let tooltipX;
    
        if (d3.pointer(e)[0] > snailWidth / 2) {
            tooltipX = d3.pointer(e)[0] - 150;
        } else {
            tooltipX = d3.pointer(e)[0] + snailMargin.left + snailMargin.right;
        }
    
        snailTooltip.style("left", tooltipX + "px")
            .style("top", d3.pointer(e)[1] + snailLegendHeight + "px");
    
        snailTooltip.style("display", "block");
        snailTooltip.style("color", "black");
    
        const textData = [
            `Portfolio: ${data[0]}`,
            `Risk relative to benchmark: ${data[2].toFixed(2)}`,
            `Return % per month: ${data[3].toFixed(2)}%`,
        ];
    
        // For each item in data array, add a line break after
        snailTooltip.html(textData.join("<br>"));
    }
    
    function hideSnailTooltip() {
        snailTooltip.style("display", "none");
        snailTooltip.text("");
    }
}

function realTimeSnailChartOnResize(data) {
    updateRealTimeSnailChart(globalChartData[data.uid.replace("chart_", "")]);
}

function handleSnailLegendIn(e, uid) {
    const portfolioClass = e.item.replaceAll(" ", "_").replaceAll("/", "-").replaceAll(".", "");
    d3.select(`#chart_${uid}`).selectAll(`.${portfolioClass}`).attr("stroke-width", 4);
    d3.select(`#chart_${uid}`).selectAll(`circle.${portfolioClass}`).attr("r", 7);
}

function handleSnailLegendOut(e, uid) {
    const portfolioClass = e.item.replaceAll(" ", "_").replaceAll("/", "-").replaceAll(".", "");
    d3.select(`#chart_${uid}`).selectAll(`.${portfolioClass}`).attr("stroke-width", 2);
    d3.select(`#chart_${uid}`).selectAll(`circle.${portfolioClass}`).attr("r", 5);
}

function createRealTimeLineChart(data) {
	
	if (data.ChartName && data.ChartTypeString && data.UID) {
		return c3.generate({
			bindto: '#' + data.UID,
			data: {
				xs: {
				},
				columns: [
				],
				type: data.ChartTypeString,
				labels: false,
				xSort: false,
				order: null
			},
			interaction: {
				enabled: !data.SuppressUpdate
			},
			point: {
				show: false,
				r: 4
			},
			zoom: {
				enabled: true,
			},
			axis: data.Axis,
			transition: {
				duration: !data.SuppressUpdate ? 250 : 0
			},
			tooltip: {
				show: !data.SuppressUpdate,
				contents: function (d) {
					var $$ = this;
					return createRealtimeToolTip(d, $$, data)
				}
			}
		});
	}

	return null;
}

function updateRealTimeLineChart(data) {

	if (data.Name in realtimecharts) {
		var chart = realtimecharts[data.Name].chart;
		var supressUpdate = realtimecharts[data.Name].suppressupdate;
		var columnValues = [];
		var activeKeys = 0;

		if (typeof data.Colours !== 'undefined' && data.Colours) {
			$.each(data.Colours, function (k, v) {
				if (data.Colours[k]) {
					realtimecharts[data.Name].colours[k] = "#" + data.Colours[k];
				}
			});
		}

		var columnMap = {};

		var maxDate = null;
		var minDate = null;
		var isDateXAxis = chart.internal.config.axis_x_type == "time" || chart.internal.config.axis_x_type == "timeseries";
		//var isDateYAxis = chart.internal.config.axis_y_type == "time" || chart.internal.config.axis_y_type == "timeseries";

		$.each(data.XValues, function (k, v) {
			var iteration = 0;

			var xValues = [];
			var yValues = [];

			xValues.push(k + "_x");
			yValues.push(k);

			$.each(v, function (xk, xv) {
				if ((xv.indexOf("-") >= 0)) {
					var dateObj = Date.parse(xv);
					xValues.push(dateObj);

					if (isDateXAxis) {
						dateObj = moment(dateObj);

						if (minDate == null || dateObj < minDate) {
							minDate = dateObj;
						}

						if (maxDate == null || dateObj > maxDate) {
							maxDate = dateObj;
						}
					}

				} else {
					xValues.push(parseFloat(xv));
				}

				yValues.push(data.YValues[k][iteration]);

				iteration++;
			});

			columnValues.push(xValues);
			columnValues.push(yValues);

			columnMap[k] = k + "_x";

			realtimecharts[data.Name].labels[k] = data.Labels[k];
		});

		chart.load({
			xs: columnMap,
			columns: columnValues,
			colors: realtimecharts[data.Name].colours,
			done: function () {
				setChartAsLoaded(data.Name);
			}
		});

		if (minDate != null && maxDate != null) {
			realtimecharts[data.Name].startdate = minDate;
			realtimecharts[data.Name].enddate = maxDate;
		}

		if (Object.keys(columnMap).length > 1) {
			chart.legend.show();
		} else {
			chart.legend.hide();
		}

		$.each(chart.xs(), function (k, v) {
			if (k in data.XValues) {
				activeKeys++;
			} else {
				chart.unload({
					ids: k
				});
			}
		});

		if (activeKeys == 0) {
			showChartNoData(realtimecharts[data.Name]);
		} else {
			hideChartNoData(realtimecharts[data.Name]);
		}

		hideChartSpinner(realtimecharts[data.Name]);

		setTimeout(function () {
			resizeRealTimeChart(realtimecharts[data.Name], false);
		}, !supressUpdate ? 350 : 0);
	}
}

function createRealTimePieChart(data) {
	if (data.ChartName && data.ChartTypeString && data.UID) {
		return c3.generate({
			bindto: '#' + data.UID,
			data: {
				xs: {
				},
				columns: [
				],
				type: data.ChartTypeString,
				labels: true,
				xSort: false,
				order: null
			},
			interaction: {
				enabled: !data.SuppressUpdate
			},
			point: {
				show: true,
				r: 4
			},
			zoom: {
				enabled: true,
			},
			donut: {
				width: 70,
				expand: !data.SuppressUpdate ? 350 : 0
			},
			transition: {
				duration: !data.SuppressUpdate ? 250 : 0
			},
			tooltip: {
				show: !data.SuppressUpdate,
				contents: function (d) {
					var $$ = this;
					return createRealtimeToolTip(d, $$, data)
				}
			}
		});
	}

	return null;
}

function updateRealTimePieChart(data) {
	if (data.Name in realtimecharts) {
		let chart = realtimecharts[data.Name].chart;
		let supressUpdate = realtimecharts[data.Name].suppressupdate;
		let columnValues = [];

		if (typeof data.Colours !== 'undefined' && data.Colours) {
			$.each(data.Colours, function (k, v) {
				if (data.Colours[k]) {
					realtimecharts[data.Name].colours[k] = "#" + data.Colours[k];
				}
			});
		}

		let displayChart = false;

		$.each(data.XValues, function (k, v) {
			$.each(v, function (xk, xv) {
				if (!displayChart && $.isNumeric(xv) && parseFloat(xv) > 0) {
					displayChart = true;
				}

				columnValues.push([data.Labels[k][xk], parseFloat(xv)]);
				realtimecharts[data.Name].labels[data.Labels[k][xk]] = data.Labels[k][xk];
			});
		});

		if (displayChart) {
			chart.load({
				columns: columnValues,
				colors: realtimecharts[data.Name].colours,
				done: function () {
					setChartAsLoaded(data.Name);
				}
			});

			hideChartNoData(realtimecharts[data.Name]);
		} else {
			showChartNoData(realtimecharts[data.Name]);
		}

		hideChartSpinner(realtimecharts[data.Name]);

		setTimeout(function () {
			resizeRealTimeChart(realtimecharts[data.Name], false);
		}, !supressUpdate ? 350 : 0);
	}
}

function createRealTimeScatterChart(data) {
    if (data.ChartName && data.ChartTypeString && data.UID) {
        return c3.generate({
            bindto: '#' + data.UID,
            data: {
                xs: {
                },
                columns: [
                ],
                type: data.ChartTypeString,
                labels: true,
                xSort: false,
                order: null
            },
            interaction: {
                enabled: !data.SuppressUpdate
            },
            point: {
                show: true,
                r: 4
            },
            zoom: {
                enabled: true,
            },
            axis: data.Axis,
            transition: {
                duration: !data.SuppressUpdate ? 250 : 0
            },
            tooltip: {
                show: !data.SuppressUpdate,
                contents: function (d) {
                    var $$ = this;
                    return createRealtimeToolTip(d, $$, data)
                }
            }
        });
    }

    return null;
}

function updateRealTimeScatterChart(data) {
    if (data.Name in realtimecharts) {
        var chart = realtimecharts[data.Name].chart;
        var supressUpdate = realtimecharts[data.Name].suppressupdate;
        var columnValues = [];
        var activeKeys = 0;

        if (typeof data.Colours !== 'undefined' && data.Colours) {
            $.each(data.Colours, function (k, v) {
                if (data.Colours[k]) {
                    realtimecharts[data.Name].colours[k] = "#" + data.Colours[k];
                }
            });
        }

        var columnMap = {};

        var maxDate = null;
        var minDate = null;
        var isDateXAxis = chart.internal.config.axis_x_type == "time" || chart.internal.config.axis_x_type == "timeseries";
        //var isDateYAxis = chart.internal.config.axis_y_type == "time" || chart.internal.config.axis_y_type == "timeseries";

        $.each(data.XValues, function (k, v) {
            var iteration = 0;

            var xValues = [];
            var yValues = [];

            xValues.push(k + "_x");
            yValues.push(k);

            $.each(v, function (xk, xv) {
                if ((xv.indexOf("-") >= 0)) {
                    var dateObj = Date.parse(xv);
                    xValues.push(dateObj);

                    if (isDateXAxis) {
                        dateObj = moment(dateObj);

                        if (minDate == null || dateObj < minDate) {
                            minDate = dateObj;
                        }

                        if (maxDate == null || dateObj > maxDate) {
                            maxDate = dateObj;
                        }
                    }

                } else {
                    xValues.push(parseFloat(xv));
                }

                yValues.push(data.YValues[k][iteration]);

                iteration++;
            });

            columnValues.push(xValues);
            columnValues.push(yValues);

            columnMap[k] = k + "_x";

            realtimecharts[data.Name].labels[k] = data.Labels[k];
        });

        chart.load({
            xs: columnMap,
            columns: columnValues,
            colors: realtimecharts[data.Name].colours,
            done: function () {
                setChartAsLoaded(data.Name);
            }
        });

        if (minDate != null && maxDate != null) {
            realtimecharts[data.Name].startdate = minDate;
            realtimecharts[data.Name].enddate = maxDate;
        }

        if (Object.keys(columnMap).length > 1) {
            chart.legend.show();
        } else {
            chart.legend.hide();
        }

        $.each(chart.xs(), function (k, v) {
            if (k in data.XValues) {
                activeKeys++;
            } else {
                chart.unload({
                    ids: k
                });
            }
        });

        if (activeKeys == 0) {
            showChartNoData(realtimecharts[data.Name]);
        } else {
            hideChartNoData(realtimecharts[data.Name]);
        }

        hideChartSpinner(realtimecharts[data.Name]);

        setTimeout(function () {
            resizeRealTimeChart(realtimecharts[data.Name], false);
        }, !supressUpdate ? 350 : 0);
    }
}

function createRealTimeDonutChart(data) {
    if (data.ChartName && data.ChartTypeString && data.UID) {
        return c3.generate({
            bindto: '#' + data.UID,
            data: {
                xs: {
                },
                columns: [
                ],
                type: data.ChartTypeString,
                labels: true,
                xSort: false,
                order: null
            },
            interaction: {
                enabled: !data.SuppressUpdate
            },
            point: {
                show: true,
                r: 4
            },
            zoom: {
                enabled: true,
            },
            axis: null,
            donut: {
                width: 70,
                expand: !data.SuppressUpdate ? 350 : 0
            },
            transition: {
                duration: !data.SuppressUpdate ? 250 : 0
            },
            tooltip: {
                show: !data.SuppressUpdate,
                contents: function (d) {
                    var $$ = this;
                    return createRealtimeToolTip(d, $$, data)
                }
            }
        });
    }

    return null;
}

function updateRealTimeDonutChart(data) {
    if (data.Name in realtimecharts) {
        let chart = realtimecharts[data.Name].chart;
        let supressUpdate = realtimecharts[data.Name].suppressupdate;
        let columnValues = [];

        if (typeof data.Colours !== 'undefined' && data.Colours) {
            $.each(data.Colours, function (k, v) {
                if (data.Colours[k]) {
                    realtimecharts[data.Name].colours[k] = "#" + data.Colours[k];
                }
            });
        }

        let displayChart = false;

        $.each(data.XValues, function (k, v) {
            $.each(v, function (xk, xv) {
                if (!displayChart && $.isNumeric(xv) && parseFloat(xv) > 0) {
                    displayChart = true;
                }

                columnValues.push([data.Labels[k][xk], parseFloat(xv)]);
                realtimecharts[data.Name].labels[data.Labels[k][xk]] = data.Labels[k][xk];
            });
        });

        if (displayChart) {
            chart.load({
                columns: columnValues,
                colors: realtimecharts[data.Name].colours,
                done: function () {
                    setChartAsLoaded(data.Name);
                }
            });

            hideChartNoData(realtimecharts[data.Name]);
        } else {
            showChartNoData(realtimecharts[data.Name]);
        }

        hideChartSpinner(realtimecharts[data.Name]);

        setTimeout(function () {
            resizeRealTimeChart(realtimecharts[data.Name], false);
        }, !supressUpdate ? 350 : 0);
    }
}

function updateRealTimeSummarytableChart(data) {
	if (data.Name in realtimecharts) {
		var supressUpdate = realtimecharts[data.Name].suppressupdate;
		var chartdata = realtimecharts[data.Name];
		var tabletarget = $("#" + chartdata.uid);

		if (supressUpdate) {
			tabletarget.html(response);
			hideSummarySpinner(realtimecharts[data.Name]);

			if (data.RawHtml != null) {
				if (tableTarget.length !== 0) {
					tableTarget.html(data.RawHtml);
				}
			}

			chartdata.chart = $("#" + chartdata.uid + " > div > .summary-table-group");
			resizeRealTimeChart(chartdata, true);

			setTimeout(function () {
				setChartAsLoaded(chartdata.uid);
			}, 200);
		} else {
			$.ajax({
				url: '/RealTimeChart/FormatSummaryTable/',
				type: "POST",
				data: {
					tables: data.SummaryTable,
					fold: realtimecharts[data.Name].tabledefinition.fold,
					highlightFirstRow: realtimecharts[data.Name].tabledefinition.highlightfirstrow
				},
				cache: false,
				crossDomain: true,
				xhrFields: {
					withCredentials: true
				},
				success: function (response) {
					hideSummarySpinner(realtimecharts[data.Name]);
					tabletarget.html(response);

					chartdata.chart = $("#" + chartdata.uid + " > div > .summary-table-group");
					resizeRealTimeChart(chartdata, true);
					setUpSummaryTableDrawer(chartdata);

					setChartAsLoaded(chartdata.uid);
				}
			});
		}
	}

	return;
}

export { addToGlobalCharts, area, clearChartDrawArea, createRealTimeAreaChart, createRealTimeDonutChart, createRealTimeLineChart, createRealTimePieChart, createRealTimeScatterChart, createRealTimeSnailChart, drawLegend, getFromGlobalChartsData, getStringLengthInPixels, handleLegendIn, handleLegendOut, handleSnailLegendIn, handleSnailLegendOut, highlightAsset, realTimeAreaChartOnResize, realTimeSnailChartOnResize, snail, unhighlightAsset, updateRealTimeDonutChart, updateRealTimeLineChart, updateRealTimePieChart, updateRealTimeScatterChart, updateRealTimeSummarytableChart };
//# sourceMappingURL=index.js.map
