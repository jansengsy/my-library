export function updateRealTimeSummarytableChart(data) {
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