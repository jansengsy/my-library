// Global constants
export let globalChartData = {};

export function addToGlobalCharts(data, uid) {
    globalChartData[uid] = data;
}

export function getFromGlobalChartsData(uid) {
    return globalChartData[uid];
}

export function clearChartDrawArea(id) {
    const container = d3.select(`#container_${id}`);
    container.selectAll(`.legend_${id}`).remove();
    container.selectAll(".chart_svg").remove();
}

// Example data: type = "area", width = 100, height = 100, margin = { top: 5, bottom: 5, left: 5, right: 5 }, uid = D7g9dbbshs70f0D899, colours = ["#ff0000", "#ab12ff", "#0fa2f4"]
export function drawLegend(type, width, height, margin, uid, labels, colours) {

    const legendIconSize = 10;
    const rowHeight = 15;
    const legendMargin = 10;
    const legendWidth = width + margin.left + margin.right - legendMargin * 2;
    let legendItemsArray = [];
    let legendRowCurrentWidth = 0;
    let legendCurrentRow = 0;
    let legendRows = 0;

    labels.forEach((item, i) => {

        const itemWidth = legendIconSize + getStringLengthInPixels(item) + 20; // 20 represents the gap between items
        item = item.replaceAll(" ", "_");

        // If the legend item would fit into the width we're happy
        if (legendWidth > legendRowCurrentWidth + itemWidth) {
            legendItemsArray[i] = {item, legendCurrentRow, itemWidth, legendRowCurrentWidth};
            legendRowCurrentWidth += itemWidth;
        } else { // If it would overflow we start a new legend row
            legendCurrentRow += 1;
            legendRows += 1;
            legendRowCurrentWidth = 0;
            legendItemsArray[i] = {item, legendCurrentRow, itemWidth, legendRowCurrentWidth};
            legendRowCurrentWidth = itemWidth;
        }
    });

    const legendContainer = d3.select(`#chart_${uid}`)
        .append("g")
        .attr("class", `legend_${uid}`)
        .attr("transform", `translate(0, ${height + margin.top + margin.bottom - 60})`) // 60 represents the minimum legend height

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
            `translate(${d.legendRowCurrentWidth}, ${legendIconSize / 2})`
        });

    legendItems.append("text")
        .attr("x", legendIconSize + 5) // Adjust the x-position of the text factoring the icon and a gap between
        .attr("y", 9) // Adjust the y-position of the text to center vertically
        .style("font-size", "14px")
        .style("font-family", "Calibri")
        .attr("transform", (d, i) => {
            `translate(${d.legendRowCurrentWidth}, 0)`
        })
		.text(d => d.item.replaceAll("_", " "));
}

export function handleLegendIn(type, e, uid) {
    if (type === "area") {
        d3.select(`#chart_${uid}`).selectAll(`.${e.target.__data__.item}`).attr("fill", "yellow");
    } else if (type === "snail") {
        const portfolioClass = e.target.__data__.item.replaceAll(" ", "_").replaceAll("/", "-").replaceAll(".", "");
        d3.select(`#chart_${uid}`).selectAll(`.${portfolioClass}`).attr("stroke-width", 4);
        d3.select(`#chart_${uid}`).selectAll(`circle.${portfolioClass}`).attr("r", 7);
    }
}

export function handleLegendOut(type, e, uid) {
    if (type === "area") {
        const asset = e.target.__data__;
        d3.select(`#chart_${uid}`).selectAll(`.${asset.item}`).attr("fill", `#${globalChartData[uid].Colours[asset.item.replaceAll("_", " ")]}`);
    } else if (type === "snail") {
        const portfolioClass = e.target.__data__.item.replaceAll(" ", "_").replaceAll("/", "-").replaceAll(".", "");
        d3.select(`#chart_${uid}`).selectAll(`.${portfolioClass}`).attr("stroke-width", 2);
        d3.select(`#chart_${uid}`).selectAll(`circle.${portfolioClass}`).attr("r", 5);
    }
}

export function getStringLengthInPixels(string) {
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
