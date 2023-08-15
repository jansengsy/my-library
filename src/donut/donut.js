export function createRealTimeDonutChart(data) {
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

export function updateRealTimeDonutChart(data) {
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