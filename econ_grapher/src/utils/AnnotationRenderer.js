export default class AnnotationRenderer {
        constructor(ctx, options) {
        this.ctx = ctx;
        this.options = options;
        }
    
        /**
         * Add shadow on the line from options. Affects all lines on canvas.
         * Shadow Options: shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY.
         */
        shadow() {
        let options = this.options;
        if (options.shadow) {
            let ctx = this.ctx;
            let { shadow } = options;
            const _stroke = ctx.stroke;
            ctx.stroke = function() {
                ctx.save();
                ctx.shadowColor = shadow.color ? shadow.color : "rgba(0,0,0,0.35)";
                ctx.shadowBlur = shadow.blur ? shadow.blur : 10;
                ctx.shadowOffsetX = shadow.offset ? shadow.offset.x : 0;
                ctx.shadowOffsetY = shadow.offset ? shadow.offset.y : 3;
                _stroke.apply(this, arguments);
                ctx.restore();
            };
        }
        }
    
        drawVerticalLine(x, startY, endY, color){
            let ctx = this.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = color;
            ctx.stroke();
            ctx.restore();
        }

        drawHorizontalLine(y, startX, endX, color){
            let ctx = this.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = color;
            ctx.stroke();
            ctx.restore();
        }

        /**
         * Draw the line height annotation to the highest data point on the chart.
         * @param {int} x horizontal coordinate on canvas
         * @param {int} bottomY bottom Y dimension of the chart
         * @param {float} highestDataY highest possible Y value on the chart, taking padding and border offsets into consideration.
         */
        drawLineHeightAnnotation(x, bottomY, highestDataY) {
            let ctx = this.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([10, 10]);
            ctx.moveTo(x, highestDataY);
            ctx.lineTo(x, bottomY);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#a3a3a3";
            ctx.stroke();
            ctx.restore();
        }

        drawLineOffsetAnnotation(y, leftX, offsetX) {
            let ctx = this.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([10, 10]);
            ctx.moveTo(leftX, y);
            ctx.lineTo(offsetX, y);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#a3a3a3";
            ctx.stroke();
            ctx.restore();
        }

        writeAnnotation(text, x, y, color){
            var ctx = this.ctx;
            ctx.font = "normal 16px Helvetica";    
            ctx.color = "red";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = color;
            ctx.fillText(text,x,y);
        }
  }