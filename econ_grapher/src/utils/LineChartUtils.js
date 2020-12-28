/**
   * @name LineChartUtils
   * LineChartUtils calculates metrics about the chart for annotations.
   * @param chart chartjs instance
   */
export default class LineChartUtils {
    constructor(chart) {
        this.chart = chart;
    }

    /**
     * calculate the highest possible Y value to draw the line to
     * @param {array} pointMetrics array of dimensions
     */
    calculateHighestDataY(pointMetrics) {
        let [bottomY, topY, maxY, tickMax, tickLow, borderWidth] = pointMetrics;
        let yBRatio = bottomY * (maxY - tickLow);
        let tMRatio = yBRatio / (tickMax - tickLow);
        return bottomY - tMRatio + borderWidth * 2 + topY - 9;
    }

    isTooltipActive() {
        return this.tooltip._active && this.tooltip._active.length;
    }

    isPointTooHigh(highestDataY, bottomY, tickLow) {
        if (highestDataY > bottomY) {
            highestDataY = bottomY - tickLow;
        }
        return highestDataY;
    }

    getPointFromDataset(set, activePoint) {
        return set.data[activePoint._index].y
            ? set.data[activePoint._index].y
            : set.data[activePoint._index];
    }

    getPointMetrics(set, point, pointProps) {
        let [maxY, borderWidth] = pointProps;
        if (point > maxY) {
            if (set.borderWidth) {
            borderWidth = set.borderWidth;
            maxY = point - borderWidth;
            } else {
            maxY = point;
            }
        }
        return [maxY, borderWidth];
    }

    getMaximumDimensionsX() {
        const xAxis = this.chart.scales[this.options.xAxis ? this.options.xAxis : "x-axis-0"];
        var tickMax, tickLow;
        if (xAxis.ticksAsNumbers) {
            if(this.chart.config.type === "scatter"){
                tickLow = xAxis.ticksAsNumbers[0]; 
                tickMax = xAxis.ticksAsNumbers[xAxis.ticksAsNumbers.length - 1]; 
            }
            else{
                tickMax = xAxis.ticksAsNumbers[0]; // first index is always the tallest
                tickLow = xAxis.ticksAsNumbers[xAxis.ticksAsNumbers.length - 1]; // lowest tick
            }
        }
        else{
            tickLow = Number(xAxis.ticks[0]);
            tickMax = Number(xAxis.ticks[xAxis.ticks.length - 1]);
        }
        let { left, right } = xAxis;
        return [tickMax, tickLow, left, right];
    }

    getMaximumDimensionsY() {
        const yAxis = this.chart.scales[this.options.yAxis ? this.options.yAxis : "y-axis-0"];
        var tickMax, tickLow;
        if (yAxis.ticksAsNumbers) {
            tickMax = yAxis.ticksAsNumbers[0]; // first index is always the tallest
            tickLow = yAxis.ticksAsNumbers[yAxis.ticksAsNumbers.length - 1]; // lowest tick
        }
        else{
            tickLow = Number(yAxis.ticks[0]);
            tickMax = Number(yAxis.ticks[yAxis.ticks.length - 1]);
        }
        let { top, bottom } = yAxis;
        return [tickMax, tickLow, top, bottom];
    }

    getTickBounds(){
        const xAxis = this.chart.scales[this.options.xAxis ? this.options.xAxis : "x-axis-0"];
        const yAxis = this.chart.scales[this.options.yAxis ? this.options.yAxis : "y-axis-0"];
        var xTickMin, xTickMax, yTickMin, yTickMax;
        if (xAxis.ticksAsNumbers){
            if(this.chart.config.type === "scatter"){
                xTickMin = xAxis.ticksAsNumbers[0]; 
                xTickMax = xAxis.ticksAsNumbers[xAxis.ticksAsNumbers.length - 1]; 
            }
            else{
                xTickMax = xAxis.ticksAsNumbers[0]; // first index is always the tallest
                xTickMin = xAxis.ticksAsNumbers[xAxis.ticksAsNumbers.length - 1]; // lowest tick
            }
        }
        else{
            xTickMax = Number(xAxis.ticks[xAxis.ticks.length - 1]);
            xTickMin = Number(xAxis.ticks[0]);
        }
        if (yAxis.ticksAsNumbers) {
            yTickMax = yAxis.ticksAsNumbers[0];
            yTickMin = yAxis.ticksAsNumbers[yAxis.ticksAsNumbers.length - 1]; 
        }
        else{
            yTickMax = Number(yAxis.ticks[yAxis.ticks.length - 1]);
            yTickMin = Number(yAxis.ticks[0]);
        }

        return [xTickMin, xTickMax, yTickMin, yTickMax];
    }

    getChartBoundaries(){
        const xAxis = this.chart.scales[this.options.xAxis ? this.options.xAxis : "x-axis-0"];
        let { left, right } = xAxis;
        const yAxis = this.chart.scales[this.options.yAxis ? this.options.yAxis : "y-axis-0"];
        let { top, bottom } = yAxis;
        return [top, bottom, left, right];
    }

    calculatePointPixels(label, data){
        let [yTickMax, yTickLow, topY, bottomY] = this.getMaximumDimensionsY();
        let [xTickMax, xTickLow, leftX, rightX] = this.getMaximumDimensionsX();
        let pixelX = leftX + (rightX - leftX) * (label - xTickLow) / (xTickMax - xTickLow);
        let pixelY = topY + (bottomY - topY) * (yTickMax - data) / (yTickMax - yTickLow);
        return [pixelX, pixelY]
    }

    get options() {
        return this.chart.options.lineHeightAnnotation
            ? this.chart.options.lineHeightAnnotation
            : false;
    }

    get tooltip() {
        return this.chart.tooltip;
    }

    get datasets() {
        return this.chart.config.data.datasets;
    }

    get xTicks() {
        return this.chart.scales["x-axis-0"].ticks;
    }

    get yTicks(){
        return this.chart.scales["y-axis-0"].ticks;
    }

    get chartArea() {
        return this.chart.chartArea;
    }
}