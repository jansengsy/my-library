export function createRealTimeLineChart(data) {
	
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

export function updateRealTimeLineChart(data) {

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