import { clearChartDrawArea, drawLegend, handleLegendIn, handleLegendOut, getStringLengthInPixels, addToGlobalCharts, getFromGlobalChartsData } from "../utils";

// Initial creation (this is a step for the C3 pipeline but, for now, D3 charts need this)
export function createRealTimeAreaChart(data) {
    return "area";
}

export function area(c) {

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
    addToGlobalCharts(c, uid)

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
export function realTimeAreaChartOnResize(data) {
    updateRealTimeAreaChart(globalChartData[data.uid.replace("chart_", "")]);
}

export function highlightAsset(asset, uid) {
    d3.select(`#chart_${uid}`).selectAll(`.${asset.item}`).attr("fill", "yellow");
}

export function unhighlightAsset(asset, uid) {
    d3.select(`#chart_${uid}`).selectAll(`.${asset.item}`).attr("fill", `#${globalChartData[uid].Colours[asset.item.replaceAll("_", " ")]}`);
}
