import { clearChartDrawArea, drawLegend, handleLegendIn, handleLegendOut, getStringLengthInPixels, addToGlobalCharts, getFromGlobalChartsData } from "../utils";

// Eventually, this will be passed in as data, but for now these are hardcoded
const snailColours = ["#ff0000", "#a04476", "#936eb1", "#5090cd", "#00a489", "#ff8000", "#28427b"];

// Tooltip DOM elements
let snailTooltip;

export function createRealTimeSnailChart(data) {
    return "snail";
}

export function snail(data) {

    let uid;
    let snailWidth;
    let snailHeight;
    let snailLegendHeight;
    let snailMargin = { top: 5, right: 15, bottom: 35, left: 45, };
    let snailgroupedLines = [];

    uid = data.Name.replace("chart_", "");
    addToGlobalCharts(c, uid)

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
        .attr("stroke-width", .5)

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
        showSnailTooltip(d3.event, d, uid)
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

export function realTimeSnailChartOnResize(data) {
    updateRealTimeSnailChart(globalChartData[data.uid.replace("chart_", "")]);
}

export function handleSnailLegendIn(e, uid) {
    const portfolioClass = e.item.replaceAll(" ", "_").replaceAll("/", "-").replaceAll(".", "");
    d3.select(`#chart_${uid}`).selectAll(`.${portfolioClass}`).attr("stroke-width", 4);
    d3.select(`#chart_${uid}`).selectAll(`circle.${portfolioClass}`).attr("r", 7);
}

export function handleSnailLegendOut(e, uid) {
    const portfolioClass = e.item.replaceAll(" ", "_").replaceAll("/", "-").replaceAll(".", "");
    d3.select(`#chart_${uid}`).selectAll(`.${portfolioClass}`).attr("stroke-width", 2);
    d3.select(`#chart_${uid}`).selectAll(`circle.${portfolioClass}`).attr("r", 5);
}