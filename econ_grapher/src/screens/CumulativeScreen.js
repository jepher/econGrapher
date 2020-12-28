import React from 'react';
import {Scatter} from 'react-chartjs-2';
import { Slider } from '@material-ui/core';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';

import LineChartUtils from '../utils/LineChartUtils';
import AnnotationRenderer from '../utils/AnnotationRenderer';  
import DefaultConfig from '../utils/ChartConfig';

import '../styles/CumulativeScreen.css';

const NUM_DECIMALS = 4;

function CumulativeSlider(props){
    return (
        <div className="sliderContainer">
            <p>{props.data.valueString} = {props.data.getValue().toFixed(NUM_DECIMALS)}</p>
            <div className="slider">
                <Slider value={props.data.getValue()} 
                        min={props.data.bounds[0]}
                        max={props.data.bounds[1]}
                        step={0.0001}
                        onChange={props.data.onChange} 
                />
            </div>
        </div>
    )
}

const NUM_DATA_POINTS = 2;

const NO_ERROR = 0;
const R_OUT_OF_BOUNDS = 1;
const INFLATION_OUT_OF_BOUNDS = 2;
const OUTPUT_OUT_OF_BOUNDS = 3;
const UNEMPLOYMENT_OUT_OF_BOUNDS = 4;
const displayMessages = [
    "",
    "r is out of range for the graph",
    "\u03C0 is out of range for the graph",
    "Y is out of range for the graph",
    "U is out of range for the graph",
]

var mpConfig = JSON.parse(JSON.stringify(DefaultConfig));
mpConfig.title.text = "MP Curve";
mpConfig.legend.display = false;
mpConfig.scales.xAxes[0].scaleLabel.labelString = "Inflation rate (\u03C0)";
mpConfig.scales.yAxes[0].scaleLabel.labelString = "Real interest rate (r)";
mpConfig.layout.padding.bottom = 20;
// mpConfig.scales.xAxes[0].ticks.display = true;
// mpConfig.scales.yAxes[0].ticks.display = true;

var isConfig = JSON.parse(JSON.stringify(mpConfig));
isConfig.title.text = "IS Curve";
isConfig.scales.xAxes[0].scaleLabel.labelString = "Aggregate output (Y)";

var adConfig = JSON.parse(JSON.stringify(isConfig));
adConfig.title.text = "AD Curve";
adConfig.scales.yAxes[0].scaleLabel.labelString = "Inflation rate (\u03C0)";
adConfig.scales.yAxes[0].ticks.beginAtZero = false;

var pcConfig = JSON.parse(JSON.stringify(adConfig));
pcConfig.title.text = "Phillips Curve";
pcConfig.scales.xAxes[0].scaleLabel.labelString = "Unemployment rate (U)";
pcConfig.scales.yAxes[0].ticks.beginAtZero = false;

var okunsConfig = JSON.parse(JSON.stringify(pcConfig));
okunsConfig.title.text = "Okun's Law";
okunsConfig.scales.yAxes[0].scaleLabel.labelString = "Aggregate output (Y)";

const VERTICAL_ANNOTATION_OFFSET = 20;
const HORIZONTAL_ANNOTATION_OFFSET = 35;
const annotationColor = "#e01bda";

export default class CumulativeScreen extends React.Component{
    constructor(props){
        super(props);
        this.mpChartReference = React.createRef();
        this.isChartReference = React.createRef();
        this.adChartReference = React.createRef();
        this.pcChartReference = React.createRef();
        this.okunsChartReference = React.createRef();

        this.mpPlugin = {
            id: "mpPlugin",
            // draw annotation lines
            afterDatasetDraw: chart => {
                if(this.state.displayMessage.mp !== NO_ERROR) return;

                const lineChartUtils = new LineChartUtils(chart);
                const options = lineChartUtils.options;
                const ctx = chart.ctx;
            
                const optionsHandler = new AnnotationRenderer(ctx, options);
                optionsHandler.shadow();
            
                let [, bottom, left,] = lineChartUtils.getChartBoundaries();

                // r horizontal line
                let selectedInflation = this.calculateMPInflation(this.state.mpVars.r);
                let mpPoint = lineChartUtils.calculatePointPixels(selectedInflation, this.state.mpVars.r);
                optionsHandler.drawLineOffsetAnnotation(
                    mpPoint[1],
                    left,
                    mpPoint[0],
                );
                optionsHandler.writeAnnotation(
                    "r = " + this.state.mpVars.r.toFixed(2),
                    left - HORIZONTAL_ANNOTATION_OFFSET,
                    mpPoint[1],
                    annotationColor 
                )

                // inflation vertical line
                optionsHandler.drawLineHeightAnnotation(
                    mpPoint[0],
                    bottom,
                    mpPoint[1],
                );
                optionsHandler.writeAnnotation(
                    "\u03C0 = " + selectedInflation.toFixed(2),
                    mpPoint[0],
                    bottom + VERTICAL_ANNOTATION_OFFSET,
                    annotationColor 
                )
            }
        };
        this.isPlugin = {
            id: "isPlugin",
            // draw annotation lines
            afterDatasetDraw: chart => {
                if(this.state.displayMessage.is !== NO_ERROR) return;

                const lineChartUtils = new LineChartUtils(chart);
                const options = lineChartUtils.options;
                const ctx = chart.ctx;
            
                const optionsHandler = new AnnotationRenderer(ctx, options);
                optionsHandler.shadow();
            
                let [, bottom, left,] = lineChartUtils.getChartBoundaries();

                // r horizontal line
                let mpPoint = lineChartUtils.calculatePointPixels(this.state.adVars.Y, this.state.mpVars.r);
                optionsHandler.drawLineOffsetAnnotation(
                    mpPoint[1],
                    left,
                    mpPoint[0],
                );
                optionsHandler.writeAnnotation(
                    "r = " + this.state.mpVars.r.toFixed(2),
                    left - HORIZONTAL_ANNOTATION_OFFSET,
                    mpPoint[1],
                    annotationColor 
                )

                // Y vertical line
                optionsHandler.drawLineHeightAnnotation(
                    mpPoint[0],
                    bottom,
                    mpPoint[1],
                );
                optionsHandler.writeAnnotation(
                    "Y = " + this.state.adVars.Y.toFixed(2),
                    mpPoint[0],
                    bottom + VERTICAL_ANNOTATION_OFFSET,
                    annotationColor 
                )
            }
        };
        this.adPlugin = {
            id: "adPlugin",
            // draw annotation lines
            afterDatasetDraw: chart => {
                if(this.state.displayMessage.ad !== NO_ERROR) return;

                const lineChartUtils = new LineChartUtils(chart);
                const options = lineChartUtils.options;
                const ctx = chart.ctx;
            
                const optionsHandler = new AnnotationRenderer(ctx, options);
                optionsHandler.shadow();
            
                let [, bottom, left,] = lineChartUtils.getChartBoundaries();

                // Y vertical line
                let adPoint = lineChartUtils.calculatePointPixels(this.state.adVars.Y, this.state.pcVars.inflation);
                optionsHandler.drawLineHeightAnnotation(
                    adPoint[0],
                    bottom,
                    adPoint[1],
                );
                optionsHandler.writeAnnotation(
                    "Y = " + this.state.adVars.Y.toFixed(2),
                    adPoint[0],
                    bottom + VERTICAL_ANNOTATION_OFFSET,
                    annotationColor 
                )

                // inflation horizontal line
                optionsHandler.drawLineOffsetAnnotation(
                    adPoint[1],
                    left,
                    adPoint[0],
                );
                optionsHandler.writeAnnotation(
                    "\u03C0 = " + this.state.pcVars.inflation.toFixed(2),
                    left - HORIZONTAL_ANNOTATION_OFFSET,
                    adPoint[1],
                    annotationColor 
                )
            }
        };
        this.pcPlugin = {
            id: "pcPlugin",
            // draw annotation lines
            afterDatasetDraw: chart => {
                if(this.state.displayMessage.pc !== NO_ERROR) return;

                const lineChartUtils = new LineChartUtils(chart);
                const options = lineChartUtils.options;
                const ctx = chart.ctx;
            
                const optionsHandler = new AnnotationRenderer(ctx, options);
                optionsHandler.shadow();
            
                let [, bottom, left,] = lineChartUtils.getChartBoundaries();

                // inflation horizontal line
                let pcPoint = lineChartUtils.calculatePointPixels(this.state.okunsVars.U, this.state.pcVars.inflation);
                optionsHandler.drawLineOffsetAnnotation(
                    pcPoint[1],
                    left,
                    pcPoint[0],
                );
                optionsHandler.writeAnnotation(
                    "\u03C0 = " + this.state.pcVars.inflation.toFixed(2),
                    left - HORIZONTAL_ANNOTATION_OFFSET,
                    pcPoint[1],
                    annotationColor 
                )

                // U vertical line
                optionsHandler.drawLineHeightAnnotation(
                    pcPoint[0],
                    bottom,
                    pcPoint[1],
                );
                optionsHandler.writeAnnotation(
                    "U = " + this.state.okunsVars.U.toFixed(2),
                    pcPoint[0],
                    bottom + VERTICAL_ANNOTATION_OFFSET,
                    annotationColor 
                )
            }
        };
        this.okunsPlugin = {
            id: "okunsPlugin",
            // draw annotation lines
            afterDatasetDraw: chart => {
                if(this.state.displayMessage.okuns !== NO_ERROR) return;

                const lineChartUtils = new LineChartUtils(chart);
                const options = lineChartUtils.options;
                const ctx = chart.ctx;
            
                const optionsHandler = new AnnotationRenderer(ctx, options);
                optionsHandler.shadow();
            
                let [, bottom, left,] = lineChartUtils.getChartBoundaries();

                // Y horizontal line
                let selectedY = this.calculateOkunsCurve(this.state.okunsVars.U);
                let okunsPoint = lineChartUtils.calculatePointPixels(this.state.okunsVars.U, selectedY);
                optionsHandler.drawLineOffsetAnnotation(
                    okunsPoint[1],
                    left,
                    okunsPoint[0],
                );
                optionsHandler.writeAnnotation(
                    "Y = " + selectedY.toFixed(2),
                    left - HORIZONTAL_ANNOTATION_OFFSET,
                    okunsPoint[1],
                    annotationColor 
                )

                // U vertical line
                optionsHandler.drawLineHeightAnnotation(
                    okunsPoint[0],
                    bottom,
                    okunsPoint[1],
                );
                optionsHandler.writeAnnotation(
                    "U = " + this.state.okunsVars.U.toFixed(2),
                    okunsPoint[0],
                    bottom + VERTICAL_ANNOTATION_OFFSET,
                    annotationColor 
                )
            }
        };

        this.state = {
            mpVars: {
                r: 2, // real interest rate
                lambda: 1.1, //responsiveness of real interest rate to inflation rate
                r_auto: 2, // autonomous component of the real interest rate
            },
            isVars:{
                slope: -1,
                constant: 10,
                offset: 0
            },
            adVars: {
                slope: 1,
                constant: 0,
                offset: 0,
                Y: 10, // output
            },
            pcVars:{
                inflation: 2,
                expectedInflation: 10,
                U_n: 2,
                omega: 0.7, // sensitivity of inflation to changes in the unemployment gap
                rho: 0, // price shocks
            },
            okunsVars:{
                slope: -1,
                constant: 0,
                offset: 0,
                Y_P: 16,
                U: 2, // rate of unemployment
            },
            datasets:{
                mp: [
                    {
                        label: 'MP curve',
                        function: this.calculateMPCurve,
                    }
                ],
                is: [
                    {
                        label: 'IS curve',
                        function: this.calculateISCurve,
                    }
                ],
                ad: [
                    {
                        label: 'AD curve',
                        function: this.calculateADCurve,
                    }
                ],
                pc: [
                    {
                        label: 'Phillips curve',
                        function: this.calculatePCCurve,
                    }
                ],
                okuns: [
                    {
                        label: "Okun's law",
                        function: this.calculateOkunsCurve,
                    }
                ],
            },
            displayMessage: {
              mp: NO_ERROR,
              is: NO_ERROR,
              ad: NO_ERROR,
              pc: NO_ERROR,
              okuns: NO_ERROR,
            },
        };

        // populate datasets
        for (const graph in this.state.datasets) {
            this.state.datasets[graph].forEach(set=>{
                set.data = new Array(NUM_DATA_POINTS);
                set.borderColor = "rgb(255, 163, 15)";
                set.borderWidth = 2; 
                set.fill = false;
                set.pointRadius = 0;
                set.pointHoverRadius = 0;
                set.tension = 0;
                set.showLine = true;
            })
        }        

        this.graphs = {
            mp: {
                id: "mpCurve",
                swap: false,
                step: 10,
                chartReference: this.mpChartReference,
                plugin: this.mpPlugin,
                options: mpConfig,
                getMessage: this.getMPMessage,
                data:{
                    datasets: this.state.datasets.mp
                }
            },
            is: {
                id: "isCurve",
                swap: false,
                step: 10,
                chartReference: this.isChartReference,
                plugin: this.isPlugin,
                options: isConfig,
                getMessage: this.getISMessage,
                data: {
                    datasets: this.state.datasets.is
                }
            },
            ad: {
                id: "adCurve",
                swap: true,
                step: 10,
                chartReference: this.adChartReference,
                plugin: this.adPlugin,
                options: adConfig,
                getMessage: this.getADMessage,
                data: {
                    datasets: this.state.datasets.ad
                }
            },
            pc: {
                id: "pcCurve",
                swap: false,
                step: 10,
                chartReference: this.pcChartReference,
                plugin: this.pcPlugin,
                options: pcConfig,
                getMessage: this.getPCMessage,
                data:{
                    datasets: this.state.datasets.pc
                }
            },
            okuns:{
                id: "okunsCurve",
                swap: false,
                step: 10,
                chartReference: this.okunsChartReference,
                plugin: this.okunsPlugin,
                options: okunsConfig,
                getMessage: this.getOkunsMessage,
                data:{
                    datasets: this.state.datasets.okuns
                }
            }
        };

        this.sliderData = {
            mp: [
                {
                    getValue: this.getR,
                    valueString: "r",
                    bounds: [0, 10],
                    onChange: this.handleRChange,
                },
                {
                    getValue: this.getLambda,
                    valueString: "\u03BB",
                    bounds: [-2, 2],
                    onChange: this.handleLambdaChange,
                },
                {
                    getValue: this.getRAuto,
                    valueString: "r\u0305",
                    bounds: [0, 5],
                    onChange: this.handleRAutoChange,
                },
            ],
            is:[
                {
                    getValue: this.getISOffset,
                    valueString: "IS curve offset",
                    bounds: [-5, 5],
                    onChange: this.handleISOffsetChange,
                },
            ],
            ad:[
                {
                    getValue: this.getYPotential,
                    valueString: "Y\u1D3E",
                    bounds: [0, 10],
                    onChange: this.handleYPotentialChange,
                },
            ],
            pc:[
                {
                    getValue: this.getUNatural,
                    valueString: "U\u2099",
                    bounds: [0, 10],
                    onChange: this.handleUNaturalChange,
                },
            ],
        }
    }

    getR = () => (this.state.mpVars.r);
    getLambda = () => (this.state.mpVars.lambda);
    getRAuto = () => (this.state.mpVars.r_auto);
    getISSlope = () => (this.state.isVars.slope);
    getISOffset = () => (this.state.isVars.offset);
    getADSlope = () => (this.state.adVars.slope);
    getADOffset = () => (this.state.adVars.offset);
    getUNatural = () => (this.state.pcVars.U_n);
    getOmega = () => (this.state.pcVars.omega);
    getRho = () => (this.state.pcVars.rho);
    getOkunsSlope = () => (this.state.okunsVars.slope);
    getOkunsOffset = () => (this.state.okunsVars.offset);

    getMPMessage = () => (this.state.displayMessage.mp);
    getISMessage = () => (this.state.displayMessage.is);
    getADMessage = () => (this.state.displayMessage.ad);
    getPCMessage = () => (this.state.displayMessage.pc);
    getOkunsMessage = () => (this.state.displayMessage.okuns);

    calculateMPInflation = (r) => ((r - this.state.mpVars.r_auto) / this.state.mpVars.lambda)
    calculateMPCurve = (inflation) => (this.state.mpVars.r_auto + this.state.mpVars.lambda * inflation)
    calculateISCurve = (Y) => (this.state.isVars.constant + this.state.isVars.slope * Y + this.state.isVars.offset);
    calculateISOutput = (r) =>((r - this.state.isVars.constant - this.state.isVars.offset) / this.state.isVars.slope);
    calculateADCurve = (Y) => (this.state.adVars.constant + this.state.adVars.slope * Y + this.state.adVars.offset);
    calculatePCCurve = (U) => (this.state.pcVars.expectedInflation - this.state.pcVars.omega * (U - this.state.pcVars.U_n) + this.state.pcVars.rho)
    calculatePCUnemployment = (inflation) => (this.state.pcVars.U_n + (this.state.pcVars.rho + this.state.pcVars.expectedInflation - inflation) / this.state.pcVars.omega)
    calculateOkunsCurve = (U) => (2 * (this.state.pcVars.U_n - U) + this.state.okunsVars.Y_P)
    calculateOkunsUnemployment = (Y) => (-0.5 * (Y - this.state.okunsVars.Y_P) + this.state.pcVars.U_n)

    updateCharts(){
        this.mpChartReference.current.chartInstance.update();
        this.isChartReference.current.chartInstance.update();
        this.adChartReference.current.chartInstance.update();
        this.pcChartReference.current.chartInstance.update();
        this.okunsChartReference.current.chartInstance.update();
    }

    syncAxes(){
        var rTickMax = Math.max(this.mpChartReference.current.chartInstance.chart.scales["y-axis-0"].max, this.isChartReference.current.chartInstance.chart.scales["y-axis-0"].max)
        this.mpChartReference.current.chartInstance.chart.options.scales.yAxes[0].ticks.max = rTickMax;
        this.isChartReference.current.chartInstance.chart.options.scales.yAxes[0].ticks.max = rTickMax;

        var yTickMax = Math.max(this.isChartReference.current.chartInstance.chart.scales["x-axis-0"].max, this.adChartReference.current.chartInstance.chart.scales["x-axis-0"].max)
        this.isChartReference.current.chartInstance.chart.options.scales.xAxes[0].ticks.max = yTickMax;
        this.adChartReference.current.chartInstance.chart.options.scales.xAxes[0].ticks.max = yTickMax;

        var inflationTickMax = Math.max(this.adChartReference.current.chartInstance.chart.scales["y-axis-0"].max, this.pcChartReference.current.chartInstance.chart.scales["y-axis-0"].max)
        this.adChartReference.current.chartInstance.chart.options.scales.yAxes[0].ticks.max = inflationTickMax;
        this.pcChartReference.current.chartInstance.chart.options.scales.yAxes[0].ticks.max = inflationTickMax;
        var inflationTickMin = Math.max(this.adChartReference.current.chartInstance.chart.scales["y-axis-0"].min, this.pcChartReference.current.chartInstance.chart.scales["y-axis-0"].min)
        this.adChartReference.current.chartInstance.chart.options.scales.yAxes[0].ticks.min = inflationTickMin;
        this.pcChartReference.current.chartInstance.chart.options.scales.yAxes[0].ticks.min = inflationTickMin;

        var uTickMax = Math.max(this.pcChartReference.current.chartInstance.chart.scales["x-axis-0"].max, this.okunsChartReference.current.chartInstance.chart.scales["x-axis-0"].max)
        this.pcChartReference.current.chartInstance.chart.options.scales.xAxes[0].ticks.max = uTickMax;
        this.okunsChartReference.current.chartInstance.chart.options.scales.xAxes[0].ticks.max = uTickMax;
    }

    updateData(){
        this.setState(prevState => {
            // update annotations
            var adVars = prevState.adVars;
            adVars.Y = this.calculateISOutput(this.state.mpVars.r);
            var pcVars = prevState.pcVars;
            pcVars.inflation = this.calculateADCurve(adVars.Y);
            var okunsVars = prevState.okunsVars;
            okunsVars.U = this.calculatePCUnemployment(pcVars.inflation);

            // update graph data
            var graphs = prevState.datasets;
            for (const key in graphs) {
                var datasets = graphs[key];
                for(var i = 0; i < datasets.length; i++){
                    var set = datasets[i];
                    for (var j = 0; j < NUM_DATA_POINTS; j++) {
                        var fct = set.function;
                        var x, y;
                        if(this.graphs[key].swap){
                            y = j * this.graphs[key].step;
                            x = fct(y);
                        }
                        else{
                            x = j * this.graphs[key].step;
                            y = fct(x);
                        }
                            
                        set.data[j] = {x, y};
                    }
                }
            }  
            return {adVars, pcVars, okunsVars, graphs}
        })
    }
    
    checkError(){
        // mp
        let lineChartUtils = new LineChartUtils(this.mpChartReference.current.chartInstance);
        let [xTickMin, xTickMax, yTickMin, yTickMax] = lineChartUtils.getTickBounds();
        let r = this.state.mpVars.r;
        let selectedInflation = this.calculateMPInflation(r);
        this.setState(prevState=>{
            var displayMessage = prevState.displayMessage;
            if(r > yTickMax || r < yTickMin)
                displayMessage.mp = R_OUT_OF_BOUNDS;
            else if(selectedInflation > xTickMax || selectedInflation < xTickMin)
                displayMessage.mp = INFLATION_OUT_OF_BOUNDS;            
            else
                displayMessage.mp = NO_ERROR;            
            return {displayMessage};
        })

        // is
        lineChartUtils = new LineChartUtils(this.isChartReference.current.chartInstance);
        [xTickMin, xTickMax, yTickMin, yTickMax] = lineChartUtils.getTickBounds();
        let Y = this.state.adVars.Y;
        this.setState(prevState=>{
            var displayMessage = prevState.displayMessage;
            if(r > yTickMax || r < yTickMin)
                displayMessage.is = R_OUT_OF_BOUNDS;
            else if(Y > xTickMax || Y < xTickMin)
                displayMessage.is = OUTPUT_OUT_OF_BOUNDS;            
            else
                displayMessage.is = NO_ERROR;            
            return {displayMessage};
        })

        // ad
        lineChartUtils = new LineChartUtils(this.adChartReference.current.chartInstance);
        [xTickMin, xTickMax, yTickMin, yTickMax] = lineChartUtils.getTickBounds();
        let inflation = this.state.pcVars.inflation;
        this.setState(prevState=>{
            var displayMessage = prevState.displayMessage;
            if(inflation > yTickMax || inflation < yTickMin)
                displayMessage.ad = INFLATION_OUT_OF_BOUNDS;
            else if(Y > xTickMax || Y < xTickMin)
                displayMessage.ad = OUTPUT_OUT_OF_BOUNDS;            
            else
                displayMessage.ad = NO_ERROR;            
            return {displayMessage};
        })
        
        // pc
        lineChartUtils = new LineChartUtils(this.pcChartReference.current.chartInstance);
        [xTickMin, xTickMax, yTickMin, yTickMax] = lineChartUtils.getTickBounds();
        let U = this.state.okunsVars.U;
        this.setState(prevState=>{
            var displayMessage = prevState.displayMessage;
            if(inflation > yTickMax || inflation < yTickMin)
                displayMessage.pc = INFLATION_OUT_OF_BOUNDS;
            else if(U > xTickMax || U < xTickMin)
                displayMessage.pc = UNEMPLOYMENT_OUT_OF_BOUNDS;            
            else
                displayMessage.pc = NO_ERROR;            
            return {displayMessage};
        })
        
        // okuns
        lineChartUtils = new LineChartUtils(this.okunsChartReference.current.chartInstance);
        [xTickMin, xTickMax, yTickMin, yTickMax] = lineChartUtils.getTickBounds();
        Y = this.calculateOkunsCurve(U);
        this.setState(prevState=>{
            var displayMessage = prevState.displayMessage;
            if(Y > yTickMax || Y < yTickMin)
                displayMessage.okuns = OUTPUT_OUT_OF_BOUNDS;
            else if(U > xTickMax || U < xTickMin)
                displayMessage.okuns = UNEMPLOYMENT_OUT_OF_BOUNDS;  
            else
                displayMessage.okuns = NO_ERROR;  
            return {displayMessage};
        })
    }

    handleChange = () =>{
        new Promise(resolve =>{
            this.updateData();
            resolve();
        }).then(()=>{
            // // check for graph errors
            this.checkError();
        }).then(()=>{
            this.updateCharts();
            this.syncAxes();
            this.updateCharts();
        })
    }
        
    handleRChange = (event, newValue) => {
        this.setState((prevState)=>{
            var mpVars = prevState.mpVars;
            mpVars.r = newValue;
            return {mpVars};
        }, () => {
            this.handleChange();
        });
    }

    handleInvestmentChange = (event, newValue) => {
        this.setState((prevState)=>{
            var domesticVars = prevState.domesticVars;
            domesticVars.investmentOffset = newValue;
            return {domesticVars};
        }, () => {
            this.handleChange();
        });
    }

    handleWorldRChange = (event, newValue) => {
        const lineChartUtils = new LineChartUtils(this.domesticChartReference.current.chartInstance);
        let [, , , yTickMax] = lineChartUtils.getTickBounds();
        this.setState({r_w: Math.min(yTickMax, newValue)}, () => {
            this.handleChange();
        });
    }

    reset = () => {
        this.setState(prevState => {
            var domesticVars = prevState.domesticVars;
            domesticVars.savingOffset = 0;
            domesticVars.investmentOffset = 0;
            return {domesticVars};
        }, () => {
            this.handleChange();
        })
    }

    componentDidMount(){
        this.handleChange();
    }

    render() {
        var count = 0;
        return (
        <div id="cumulativeScreen" className="screen">
            <div className="graphPanel">
                {
                    Array.from(Array(9).keys()).map(i => {
                        if(i === 3)
                            return <div style={{flex: 1}}>
                                <p>Set real inflation rate:</p>
                                <CumulativeSlider data={this.sliderData.mp[0]} key={"slider" + i}/>
                            </div>
                        else if (i === 2 || i === 6 || i === 7)
                            return <div className="graphContainer" key={"filler" + i}/>
                        else{
                            var graph = this.graphs[Object.keys(this.graphs)[count++]] 
                            return <div style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center"}} key={graph.id}>
                                <div className="graphContainer">
                                    <Scatter
                                        ref={graph.chartReference}
                                        data={graph.data}
                                        plugins={[graph.plugin]}
                                        options={graph.options}
                                    />
                                </div>
                                <div className="errorDisplay" style={{opacity: graph.getMessage() === NO_ERROR ? 0 : 1}}>
                                    <div style={{display:"flex", alignItem:"center"}}>
                                        <ErrorOutlineIcon style={{fontSize: "1.3rem", marginRight:"0.3rem"}}/>
                                        {displayMessages[graph.getMessage()]}                                    
                                    </div>
                                </div>
                            </div>
                        }
                    })
                }
            </div>                
        </div>
        );
    }
}
