import React from 'react';
import {Line} from 'react-chartjs-2';
import { Slider } from '@material-ui/core';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';

import LineChartUtils from '../utils/LineChartUtils';
import AnnotationRenderer from '../utils/AnnotationRenderer';  
import DefaultConfig from '../utils/ChartConfig';

import '../styles/SolowModelScreen.css';

const NUM_DECIMALS = 4;

function SolowSlider(props){
    return (
        <div className="sliderContainer">
            <div className="slider">
                <Slider value={props.data.getValue()} 
                        min={props.data.bounds[0]}
                        max={props.data.bounds[1]}
                        step={0.0001}
                        onChange={props.data.onChange} 
                />
            </div>
            <p>{props.data.valueString} = {props.data.getValue().toFixed(NUM_DECIMALS)}</p>
            <div style={{display: "flex", alignItems:"center", marginLeft:"0.5rem"}}>
                <HelpOutlineIcon className="sliderHelpIcon" style={{fontSize:"1.5rem"}}/>
                <div className="sliderTooltip">{props.data.info}</div>
            </div>
        </div>
    )
}

const NUM_DATA_POINTS = 10;
const errors = [
    "",
    "k* is out of range for the graph",
    "i* is out of range for the graph",
    "y* is out of range for the graph"
]
const NO_ERROR = 0;
const K_OUT_OF_BOUNDS = 1;
const I_OUT_OF_BOUNDS = 2;
const Y_OUT_OF_BOUNDS = 3;

let solowConfig = JSON.parse(JSON.stringify(DefaultConfig));
solowConfig.title.text = "Solow Model";
solowConfig.scales.xAxes[0].scaleLabel.labelString = "Capital per worker (k)";
solowConfig.scales.xAxes[0].ticks.min = 0;
solowConfig.scales.yAxes[0].scaleLabel.labelString = "Output per worker (y)";
solowConfig.scales.yAxes[0].ticks.min = 0;
solowConfig.legend.display = false;
solowConfig.legendCallback = function(chart) {
    return <ul>
                {chart.data.datasets.map(set=>{
                    return <li key={set.label} className="legendItem">
                        <div className="legendColor" style={{backgroundColor: set.borderColor}}/>
                        <p>{set.label}</p>
                        <div className="legendTooltip" dangerouslySetInnerHTML={{__html: set.info}} style={{backgroundColor: set.borderColor}}/>
                    </li>
                })}
            </ul>
}

const DEFAULT_VALUES = {
    s: 0.5,
    A: 1.5,
    b: 0.5, 
    delta: 0.3,
    n: 0.3
}

export default class SolowModelScreen extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            s: DEFAULT_VALUES.s, // saving rate
            A: DEFAULT_VALUES.A, // total factor productivity
            b: DEFAULT_VALUES.b, // output elasticity of capital
            delta: DEFAULT_VALUES.delta, // depreciation rate 
            n: DEFAULT_VALUES.n, // population growth 
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Output curve',
                        function: this.calculateOutputCurve,
                        getFunctionString: ()=>("y<sub>t</sub> = " + (Math.round(this.state.A * Math.pow(10, NUM_DECIMALS)) / Math.pow(10, NUM_DECIMALS)) + "k<sub>t</sub><sup>" + (Math.round(this.state.b * Math.pow(10, NUM_DECIMALS)) / Math.pow(10, NUM_DECIMALS)) + "</sup>"),
                        cubicInterpolationMode: 'monotone',
                        info: "The output curve shows the relationship between output per worker and capital per worker. The general equation for the output curve is y<sub>t</sub> = Ak<sub>t</sub><sup>b</sup>, so as capital per worker increases, output per worker increases."
                    },
                    {
                        label: 'Investment curve',
                        function: this.calculateInvestmentCurve,
                        getFunctionString: ()=>("i<sub>t</sub> = " + (Math.round((this.state.s * this.state.A) * Math.pow(10, NUM_DECIMALS)) / Math.pow(10, NUM_DECIMALS)) + "k<sub>t</sub><sup>" + (Math.round(this.state.b * Math.pow(10, NUM_DECIMALS)) / Math.pow(10, NUM_DECIMALS)) + "</sup>"),
                        cubicInterpolationMode: 'monotone',
                        info: "The investment curve reveals the relationship between per capita investment and capital per worker. The general equation for the investment curve is i<sub>t</sub> = sAk<sub>t</sub><sup>b</sup>, so as capital per worker increases, per capita investment increases."
                    },
                    {
                        label: 'Depreciation curve',
                        function: this.calculateDepreciationCurve,
                        getFunctionString: ()=>("Depreciation = " + (Math.round((this.state.delta + this.state.n) * Math.pow(10, NUM_DECIMALS)) / Math.pow(10, NUM_DECIMALS)) + "k<sub>t</sub>"),
                        lineTension: 0,
                        info: "The depreciation curve shows the relationship between loss of capital and capital per worker. The general equation for the depreciation curve is (&delta; + n)k<sub>t</sub>, so as capital per worker increases, depreciation increases."
                    },
                ]
            },
            chartLegend: "",
            errNo: 0
        }
        
        // populate dataset
        var data = this.state.data;
        data.labels = new Array(NUM_DATA_POINTS);
        for(var i = 0; i <= NUM_DATA_POINTS; i++)
            data.labels[i] = i;

        var colors = ["rgb(20, 245, 50)", "rgb(35, 187, 247)", "rgb(237, 67, 55)"];
        data.datasets.forEach((set, i)=>{
            set.data = new Array(NUM_DATA_POINTS);
            set.borderColor = colors[i];
            set.borderWidth = 2; 
            set.fill = false;
            set.pointRadius = 0;
            set.pointHoverRadius = 0;
        })
        
        this.chartReference = React.createRef();
        this.sliderData = [
            {
                getValue: this.getS,
                valueString: "s",
                bounds: [0, 1],
                onChange: this.handleSavingChange,
                info: "The saving rate (s) is the fixed percentage of the consumer's income that they save every year. The saving rate must be between 0 and 1."
            },
            {
                getValue: this.getA,
                valueString: "A",
                bounds: [0.0001, 3],
                onChange: this.handleProductivityChange,
                info: "Total factor productivity (A) is a positive value that represents how productive capital and labor in an economy are together. Total factor productivity can be affected by supply shocks."
            },
            {
                getValue: this.getB,
                valueString: "b",
                bounds: [0, 1],
                onChange: this.handleElasticityChange,
                info: "Elasticity of capital (b) is a value that measures the responsiveness of output to a change in the level of capital. The elasticity of capital must be between 0 and 1."
            },
            {
                getValue: this.getDelta,
                valueString: String.fromCharCode(948),
                bounds: [0, 1],
                onChange: this.handleDepreciationChange,
                info: "The depreciation rate (" + String.fromCharCode(948) + ") is the fixed percentage of capital resources such as machines and factories that wear out each year. The depreciation rate must be between 0 and 1."
            },
            {
                getValue: this.getN,
                valueString: "n",
                bounds: [0, 1],
                onChange: this.handlePopGrowthChange,
                info: "The population growth rate (n) is the yearly percentage growth of workers in the labor force, assuming the number of workers grows at the same rate as the overall population. The population growth rate must be between 0 and 1."
            },
        ];      

        // set solowConfig tooltips
        solowConfig.tooltips = {
            enabled: false,
            mode: 'nearest',
            intersect: false,
            callbacks: {
                title: function(tooltipItem, data) {
                    return data.datasets[tooltipItem[0].datasetIndex].label;
                },
                label: function(tooltipItem, data) {
                    return data.datasets[tooltipItem.datasetIndex].getFunctionString();
                },
            },
            custom: function(tooltipModel) {
                // Tooltip Element
                var tooltipEl = document.getElementById('chartjs-tooltip');
        
                // Create element on first render
                if (!tooltipEl) {
                    tooltipEl = document.createElement('div');
                    tooltipEl.id = 'chartjs-tooltip';
                    tooltipEl.innerHTML = '<table></table>';
                    document.body.appendChild(tooltipEl);
                }
        
                // Hide if no tooltip
                if (tooltipModel.opacity === 0) {
                    tooltipEl.style.opacity = 0;
                    return;
                }
        
                // Set caret Position
                tooltipEl.classList.remove('above', 'below', 'no-transform');
                if (tooltipModel.yAlign) {
                    tooltipEl.classList.add(tooltipModel.yAlign);
                } else {
                    tooltipEl.classList.add('no-transform');
                }
        
                function getBody(bodyItem) {
                    return bodyItem.lines;
                }
        
                // Set Text
                if (tooltipModel.body) {
                    var titleLines = tooltipModel.title || [];
                    var bodyLines = tooltipModel.body.map(getBody);
        
                    var innerHtml = '<thead>';
        
                    titleLines.forEach(function(title) {
                        innerHtml += '<tr><th>' + title + '</th></tr>';
                    });
                    innerHtml += '</thead><tbody>';
        
                    bodyLines.forEach(function(body, i) {
                        var colors = tooltipModel.labelColors[i];
                        var style = 'background:' + colors.backgroundColor;
                        style += '; border-color:' + colors.borderColor;
                        style += '; border-width: 2px';
                        var span = '<span style="' + style + '"></span>';
                        innerHtml += '<tr><td>' + span + body + '</td></tr>';
                    });
                    innerHtml += '</tbody>';
        
                    var tableRoot = tooltipEl.querySelector('table');
                    tableRoot.innerHTML = innerHtml;
                }
        
                // `this` will be the overall tooltip
                var position = this._chart.canvas.getBoundingClientRect();
        
                // Display, position, and set styles for font
                tooltipEl.style.opacity = 1;
                tooltipEl.style.position = 'absolute';
                tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
                tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                tooltipEl.style.fontFamily = tooltipModel._bodyFontFamily;
                tooltipEl.style.fontSize = tooltipModel.bodyFontSize + 'px';
                tooltipEl.style.fontStyle = tooltipModel._bodyFontStyle;
                tooltipEl.style.padding = tooltipModel.yPadding + 'px ' + tooltipModel.xPadding + 'px';
                tooltipEl.style.pointerEvents = 'none';
            }
        }
        
        this.solowPlugin = {
            id: "solowPlugin",
            // draw annotation lines
            afterDatasetDraw: chart => {
                if(this.state.errNo === K_OUT_OF_BOUNDS) return;
                const lineChartUtils = new LineChartUtils(chart);
                const options = lineChartUtils.options;
                const ctx = chart.ctx;
            
                const optionsHandler = new AnnotationRenderer(ctx, options);
                optionsHandler.shadow();
            
                const annotationColor = "#ff2626";
                let kEquilibrium = this.calculateEquilibrium();
                let yEquilibrium = this.calculateOutputCurve(kEquilibrium);
                let yEquilibriumPoint = lineChartUtils.calculatePointPixels(kEquilibrium, yEquilibrium);
                let iEquilibrium = this.calculateInvestmentCurve(kEquilibrium);
                let iEquilibriumPoint = lineChartUtils.calculatePointPixels(kEquilibrium, iEquilibrium);
                let [, bottom, left,] = lineChartUtils.getChartBoundaries();

                // k* vertical line
                optionsHandler.drawLineHeightAnnotation(
                    yEquilibriumPoint[0],
                    bottom,
                    yEquilibriumPoint[1]
                );
                optionsHandler.writeAnnotation(
                    "k* = " + kEquilibrium.toFixed(2),
                    yEquilibriumPoint[0],
                    bottom + 20,
                    annotationColor
                )

                // i* horizontal line
                if(this.state.errNo === I_OUT_OF_BOUNDS) return;
                 optionsHandler.drawLineOffsetAnnotation(
                    iEquilibriumPoint[1],
                    left,
                    iEquilibriumPoint[0],
                );
                optionsHandler.writeAnnotation(
                    "i* = " + iEquilibrium.toFixed(2),
                    left - 35,
                    iEquilibriumPoint[1],
                    annotationColor 
                )

                // y* horizontal line
                if(this.state.errNo === Y_OUT_OF_BOUNDS) return;
                optionsHandler.drawLineOffsetAnnotation(
                    yEquilibriumPoint[1],
                    left,
                    yEquilibriumPoint[0]
                );
                optionsHandler.writeAnnotation(
                    "y* = " + yEquilibrium.toFixed(2),
                    left - 35,
                    yEquilibriumPoint[1],
                    annotationColor
                )
            }
        }
    }

    getS = () => (this.state.s);
    getA = () => (this.state.A);
    getB = () => (this.state.b);
    getDelta = () => (this.state.delta);
    getN = () => (this.state.n);

    calculateEquilibrium = () => (Math.pow(this.state.s * this.state.A / (this.state.delta + this.state.n), 1 / (1 - this.state.b)))
    calculateInvestmentCurve = k => (this.state.s * this.state.A * Math.pow(k, this.state.b))
    calculateDepreciationCurve = k => ((this.state.delta + this.state.n) * k)
    calculateOutputCurve = k => (this.state.A * Math.pow(k, this.state.b))

    updateData(){
        this.setState(prevState =>{
            var data = prevState.data;
            for (var i = 0; i < data.datasets.length; i++) {
                for (var j = 0; j < NUM_DATA_POINTS; j++) {
                    var fct = data.datasets[i].function,
                        x = data.labels[j],
                        y = fct(x);
                    data.datasets[i].data[j] = y;
                }
            }
            return {data};
        }) 
    }
    
    checkError(kEquilibrium, yEquilibrium, iEquilibrium){
        // check if graph is correct
        const lineChartUtils = new LineChartUtils(this.chartReference.current.chartInstance);
        let [xTickMin, xTickMax, yTickMin, yTickMax] = lineChartUtils.getTickBounds();
        if(kEquilibrium > xTickMax || kEquilibrium < xTickMin)
            this.setState({errNo: K_OUT_OF_BOUNDS})
        else if(iEquilibrium > yTickMax || iEquilibrium < yTickMin)
            this.setState({errNo: I_OUT_OF_BOUNDS})
        else if(yEquilibrium > yTickMax || yEquilibrium < yTickMin)
            this.setState({errNo: Y_OUT_OF_BOUNDS})
        else
            this.setState({errNo: NO_ERROR})
    }

    handleChange = () =>{
        new Promise(resolve =>{
            this.updateData();
            resolve();
        }).then(()=>{
            let kEquilibrium = this.calculateEquilibrium();
            let yEquilibrium = this.calculateOutputCurve(kEquilibrium);
            let iEquilibrium = this.calculateInvestmentCurve(kEquilibrium);
    
            // check for graph errors
            this.checkError(kEquilibrium, yEquilibrium, iEquilibrium);
    
            this.chartReference.current.chartInstance.update();
        })
    }

    handleSavingChange = (event, newValue) => {
        this.setState({s: newValue}, 
            () => {
                this.handleChange();
            });
    }

    handleProductivityChange = (event, newValue) => {
        this.setState({A: newValue}, 
            () => {
                this.handleChange();
            });
    }

    handleElasticityChange = (event, newValue) => {
        this.setState({b: newValue}, 
            () => {
                this.handleChange();
            });
    }

    handleDepreciationChange = (event, newValue) => {
        this.setState({delta: newValue}, 
            () => {
                this.handleChange();
            });
    }

    handlePopGrowthChange = (event, newValue) => {
        this.setState({n: newValue}, 
            () => {
                this.handleChange();
            });
    }

    reset = () => {
        this.setState({s: DEFAULT_VALUES.s, A: DEFAULT_VALUES.A, b: DEFAULT_VALUES.b, delta: DEFAULT_VALUES.delta, n: DEFAULT_VALUES.n}, () => {
            this.handleChange();
        })
    }

    componentDidMount(){
        // generate legend
        this.setState({chartLegend: this.chartReference.current.chartInstance.generateLegend()});
        this.updateData();
    }

    render() {
        return (
        <div id="solowScreen" className="screen">
            <div className="graphPanel">
                <div className="graphContainer">
                    <Line
                        ref={this.chartReference}
                        data={this.state.data}
                        plugins={[this.solowPlugin]}
                        options={solowConfig}  
                    />
                </div>
                <div className="legendContainer">
                    {this.state.chartLegend}
                </div>
            </div>
            <div className="userInterface">
                <div className="sliderSection">
                    {this.sliderData.map((data, i) =>
                        <SolowSlider key={"slider" + i} data={data}/>
                    )}
                    <div className="resetButton" onClick={this.reset}>Reset</div>
                </div>
                <div>
                    <div className="errorDisplay" style={{opacity: this.state.errNo === NO_ERROR ? 0 : 1}}>
                        <div style={{display:"flex", alignItem:"center"}}>
                            <ErrorOutlineIcon/>
                            {errors[this.state.errNo]}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        );
    }
}
