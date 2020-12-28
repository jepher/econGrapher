import React from 'react';
import {Scatter} from 'react-chartjs-2';
import { Slider } from '@material-ui/core';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';

import LineChartUtils from '../utils/LineChartUtils';
import AnnotationRenderer from '../utils/AnnotationRenderer';  
import DefaultConfig from '../utils/ChartConfig';

import '../styles/SIModelScreen.css';

const NUM_DECIMALS = 4;

function SISlider(props){
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
const STEP = 10;

const NO_ERROR = 0;
const SI_OUT_OF_BOUNDS = 1;
const R_OUT_OF_BOUNDS = 2;
const displayMessages = [
    "",
    "S*, I* is out of range for the graph",
    "r* is out of range for the graph",
]

const CLOSED_ECONOMY = 0;
const OPEN_ECONOMY_SMALL = 1;
const OPEN_ECONOMY_LARGE = 2;
const DEFAULT_R_W = 2;
var economyOptionButtons = [
    {
        text: "Closed economy",
        value: CLOSED_ECONOMY
    },
    {
        text: "Small open economy",
        value: OPEN_ECONOMY_SMALL
    },
    {
        text: "Large open economy",
        value: OPEN_ECONOMY_LARGE 
    }
]  

var siConfigDomestic = JSON.parse(JSON.stringify(DefaultConfig));
siConfigDomestic.title.text = "Domestic Saving and Investment";
siConfigDomestic.scales.xAxes[0].scaleLabel.labelString = "Desired saving and investment";
siConfigDomestic.scales.xAxes[0].ticks.min = 0;
siConfigDomestic.scales.xAxes[0].ticks.display = true;
siConfigDomestic.legend.display = false;
siConfigDomestic.scales.yAxes[0].scaleLabel.labelString = "Real interest rate (r)";
siConfigDomestic.scales.yAxes[0].ticks.min = 0;
siConfigDomestic.scales.xAxes[0].ticks.display = true;

var siConfigWorld = JSON.parse(JSON.stringify(siConfigDomestic));
siConfigWorld.title.text = "World Saving and Investment";
siConfigWorld.legendCallback = function(chart) {
    return <ul>
        {chart.data.datasets.map(set=>{
            return <li key={set.label} className="legendItem">
                <div className="legendColor" style={{backgroundColor: set.borderColor}}/>
                <p>{set.label}</p>
            </li>
        })}
    </ul>
}

const VERTICAL_ANNOTATION_OFFSET = 20;
const HORIZONTAL_ANNOTATION_OFFSET = 35;
const annotationColor = "#e01bda";

export default class SIModelScreen extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            domesticVars: {
                Y: 9, // aggregate output
                C_auto: 8, // autonomous consumption
                G: 6, // government consumption
                T: 3, // net taxes
                I_auto: 10, // autonomous investment
                savingOffset: 0, 
                investmentOffset: 0,
                data: {
                    datasets: []
                }
            },
            worldVars: {
                Y: 9, // aggregate output
                C_auto: 8, // autonomous consumption
                G: 6, // government consumption
                T: 3, // net taxes
                I_auto: 10, // autonomous investment
                savingOffset: 0, 
                investmentOffset: 0,
                data: {
                    datasets: []
                }
            },
            r_w: DEFAULT_R_W, // world real interest rate
            worldOffset: 0,
            economyType: CLOSED_ECONOMY,
            displayMessage: NO_ERROR,
            chartLegend: "",
        }
        // populate datasets
        var colors = ["rgb(255, 163, 15)", "rgb(35, 187, 247)"];
        var graphs = [this.state.domesticVars, this.state.worldVars];
        graphs.forEach(graph =>{
            graph.data.datasets = [
                {
                    label: 'Saving curve',
                    function: (r)=>(this.calculateSavingCurve(r, graph)),
                },
                {
                    label: 'Investment curve',
                    function:(r)=>(this.calculateInvestmentCurve(r, graph)),
                },
            ]
            graph.data.datasets.forEach((set, i)=>{
                set.data = new Array(NUM_DATA_POINTS);
                set.borderColor = colors[i];
                set.borderWidth = 2; 
                set.fill = false;
                set.pointRadius = 0;
                set.pointHoverRadius = 0;
                set.tension = 0;
                set.showLine = true;
            })
        })        

        this.domesticChartReference = React.createRef();
        this.worldChartReference = React.createRef();

        this.sliderData = [
            {
                getValue: this.getSavingOffset,
                valueString: "Saving curve offset",
                bounds: [-5, 5],
                onChange: this.handleSavingChange,
            },
            {
                getValue: this.getInvestmentOffset,
                valueString: "Investment curve offset",
                bounds: [-5, 5],
                onChange: this.handleInvestmentChange,
            },
        ];
        this.domesticPlugin = {
            id: "domesticPlugin",
            // draw annotation lines
            afterDatasetDraw: chart => {
                const lineChartUtils = new LineChartUtils(chart);
                const options = lineChartUtils.options;
                const ctx = chart.ctx;
            
                const optionsHandler = new AnnotationRenderer(ctx, options);
                optionsHandler.shadow();
            
                let rEquilibrium = this.calculateEquilibrium();
                let siEquilibrium = this.calculateInvestmentCurve(rEquilibrium, this.state.domesticVars);
                let equilibriumPoint = lineChartUtils.calculatePointPixels(siEquilibrium, rEquilibrium);
                let [, bottom, left,] = lineChartUtils.getChartBoundaries();

                // r* horizontal line
                if(this.state.displayMessage === R_OUT_OF_BOUNDS) return;
                if(this.state.economyType === CLOSED_ECONOMY){
                    optionsHandler.drawLineOffsetAnnotation(
                        equilibriumPoint[1],
                        left,
                        equilibriumPoint[0],
                    );
                    optionsHandler.writeAnnotation(
                        "r* = " + rEquilibrium.toFixed(2),
                        left - HORIZONTAL_ANNOTATION_OFFSET,
                        equilibriumPoint[1],
                        annotationColor 
                    )
                }

                if(this.state.displayMessage === R_OUT_OF_BOUNDS) return;
                if(this.state.economyType !== CLOSED_ECONOMY){
                    let investment = this.calculateInvestmentCurve(this.state.r_w, this.state.domesticVars);
                    let saving = this.calculateSavingCurve(this.state.r_w, this.state.domesticVars);
                    let furthestX = Math.max(investment, saving);
                    let rWPoint = lineChartUtils.calculatePointPixels(furthestX, this.state.r_w);
                    
                    // r_w horizontal line
                    optionsHandler.drawLineOffsetAnnotation(
                        rWPoint[1],
                        left,
                        rWPoint[0],
                    );
                    optionsHandler.writeAnnotation(
                        "r\u1D42 = " + this.state.r_w.toFixed(2),
                        left - HORIZONTAL_ANNOTATION_OFFSET,
                        rWPoint[1],
                        annotationColor 
                    )

                    // net exports line
                    var deficitColor = "#f54c4c";
                    var surplusColor = "#0eab00";
                    var isNxPositive = this.state.r_w > rEquilibrium;
                    let nxPoint1 = lineChartUtils.calculatePointPixels(Math.min(investment, saving), this.state.r_w);
                    let nxPoint2 = lineChartUtils.calculatePointPixels(Math.max(investment, saving), this.state.r_w);
                    let sign = isNxPositive ? -1 : 1;
                    let annotationPoint = [(nxPoint1[0] + nxPoint2[0]) / 2, nxPoint1[1] + 20 * sign]
                    optionsHandler.drawHorizontalLine(
                        nxPoint1[1],
                        nxPoint1[0],
                        nxPoint2[0],
                        isNxPositive ? surplusColor : deficitColor
                    );
                    optionsHandler.drawVerticalLine(
                        nxPoint1[0],
                        nxPoint1[1] - 5,
                        nxPoint1[1] + 5,
                        isNxPositive ? surplusColor : deficitColor
                    );
                    optionsHandler.drawVerticalLine(
                        nxPoint2[0],
                        nxPoint2[1] - 5,
                        nxPoint2[1] + 5,
                        isNxPositive ? surplusColor : deficitColor
                    );
                    optionsHandler.writeAnnotation(
                        "NX: " + (isNxPositive ? "surplus" : "deficit"),
                        annotationPoint[0],
                        annotationPoint[1],
                        isNxPositive ? surplusColor : deficitColor 
                    ) 
                }

                // S*, I* vertical line
                if(this.state.economyType !== CLOSED_ECONOMY || this.state.displayMessage === SI_OUT_OF_BOUNDS) return;
                optionsHandler.drawLineHeightAnnotation(
                    equilibriumPoint[0],
                    bottom,
                    equilibriumPoint[1]
                );
                optionsHandler.writeAnnotation(
                    "S*, I* = " + siEquilibrium.toFixed(2),
                    equilibriumPoint[0],
                    bottom + VERTICAL_ANNOTATION_OFFSET,
                    annotationColor
                )
            }
        };
        this.worldPlugin = {
            id: "worldPlugin",
            // draw annotation lines
            afterDatasetDraw: chart => {
                const lineChartUtils = new LineChartUtils(chart);
                const options = lineChartUtils.options;
                const ctx = chart.ctx;
            
                const optionsHandler = new AnnotationRenderer(ctx, options);
                optionsHandler.shadow();
            
                let [, , left,] = lineChartUtils.getChartBoundaries();

                // r_w horizontal line
                if(this.state.displayMessage === R_OUT_OF_BOUNDS) return;
                if(this.state.economyType !== CLOSED_ECONOMY){
                    let furthestX = Math.max(this.calculateInvestmentCurve(this.state.r_w, this.state.worldVars), this.calculateSavingCurve(this.state.r_w, this.state.worldVars));
                    let rWPoint = lineChartUtils.calculatePointPixels(furthestX, this.state.r_w);
                    optionsHandler.drawLineOffsetAnnotation(
                        rWPoint[1],
                        left,
                        rWPoint[0],
                    );
                    optionsHandler.writeAnnotation(
                        "r\u1D42 = " + this.state.r_w.toFixed(2),
                        left - HORIZONTAL_ANNOTATION_OFFSET,
                        rWPoint[1],
                        annotationColor 
                    )
                }
            }
        }
    }

    getSavingOffset = () => (this.state.domesticVars.savingOffset);
    getInvestmentOffset = () => (this.state.domesticVars.investmentOffset);

    // get equilibrium real interest rate
    calculateEquilibrium = () => ((this.state.domesticVars.I_auto + this.state.domesticVars.G - 2 * this.state.domesticVars.Y + this.state.domesticVars.C_auto + this.state.domesticVars.T + this.state.domesticVars.investmentOffset - this.state.domesticVars.savingOffset) / 2)
    calculateWorldEquilibrium = () => ((this.state.worldVars.I_auto + this.state.worldVars.G - 2 * this.state.worldVars.Y + this.state.worldVars.C_auto + this.state.worldVars.T + this.state.worldVars.investmentOffset - this.state.worldVars.savingOffset) / 2)
    calculateSavingCurve = (r, data) => (data.Y - data.C_auto + (data.Y - data.T) + r - data.G + data.savingOffset);
    calculateInvestmentCurve = (r, data) => (data.I_auto - r + data.investmentOffset);
    // get r_w for large open economy
    calculateRW = () =>{
        var r = this.calculateEquilibrium();
        var worldEquilibriumR = this.calculateWorldEquilibrium();
        var sign = worldEquilibriumR < r ? -1 : 1;

        var d1 = this.calculateSavingCurve(r, this.state.domesticVars);
        var d2 = this.calculateInvestmentCurve(r, this.state.domesticVars);
        var w1 = this.calculateSavingCurve(r, this.state.worldVars);
        var w2 = this.calculateInvestmentCurve(r, this.state.worldVars);

        var diff = Math.abs(Math.abs(d1 - d2) - Math.abs(w1 - w2));
        var step = Math.max(0.0025, diff / 10);
        var epsilon = 0.005;

        while(diff > epsilon){
            r += step * sign;
            d1 = this.calculateSavingCurve(r, this.state.domesticVars);
            d2 = this.calculateInvestmentCurve(r, this.state.domesticVars);
            w1 = this.calculateSavingCurve(r, this.state.worldVars);
            w2 = this.calculateInvestmentCurve(r, this.state.worldVars);
            diff = Math.abs(Math.abs(d1 - d2) - Math.abs(w1 - w2));
            step = Math.max(0.0025, diff / 10);
        }
        return r;
    }

    updateData(){
        this.setState(prevState => {
            var domesticVars = prevState.domesticVars;
            var worldVars = prevState.worldVars;
            var datasets = [domesticVars.data, worldVars.data]
            datasets.forEach(data=>{
                for (var i = 0; i < data.datasets.length; i++) {
                    for (var j = 0; j < NUM_DATA_POINTS; j++) {
                        var fct = data.datasets[i].function,
                            y = j * STEP,
                            x = fct(y);
                        data.datasets[i].data[j] = {x, y};
                    }
                }
            })
            return {domesticVars, worldVars}
        })
    }
    
    checkError(siEquilibrium, rEquilibrium){
        // check if graph is correct
        const lineChartUtils = new LineChartUtils(this.domesticChartReference.current.chartInstance);
        let [xTickMin, xTickMax, yTickMin, yTickMax] = lineChartUtils.getTickBounds();
        if(siEquilibrium > xTickMax || siEquilibrium < xTickMin)
            this.setState({displayMessage: SI_OUT_OF_BOUNDS})
        else if(rEquilibrium > yTickMax || rEquilibrium < yTickMin)
            this.setState({displayMessage: R_OUT_OF_BOUNDS})
        else
            this.setState({displayMessage: NO_ERROR})
    }

    handleChange = () =>{
        new Promise(resolve =>{
            this.updateData();
            let rEquilibrium = this.calculateEquilibrium();
            let siEquilibrium = this.calculateInvestmentCurve(rEquilibrium, this.state.domesticVars);

            if(this.state.economyType === OPEN_ECONOMY_LARGE)
                this.setState({r_w: this.calculateRW()})

            // check for graph errors
            this.checkError(siEquilibrium, rEquilibrium);
            resolve();
        }).then(()=>{
            // keep axis scales synchronized between the two graphs
            this.worldChartReference.current.chartInstance.chart.options.scales.xAxes[0].ticks.max = this.domesticChartReference.current.chartInstance.scales["x-axis-0"].max;
            this.worldChartReference.current.chartInstance.chart.options.scales.yAxes[0].ticks.max = this.domesticChartReference.current.chartInstance.scales["y-axis-0"].max;

            this.domesticChartReference.current.chartInstance.update();
            this.worldChartReference.current.chartInstance.update();
        })
    }
        
    handleSavingChange = (event, newValue) => {
        this.setState((prevState)=>{
            var domesticVars = prevState.domesticVars;
            domesticVars.savingOffset = newValue;
            return {domesticVars};
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

    handleWorldOffsetChange = (event, newValue) => {
        this.setState((prevState)=>{
            var worldVars = prevState.worldVars;
            worldVars.investmentOffset = newValue;
            worldVars.savingOffset = -newValue;
            return {worldVars};
        }, () => {
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
        this.setState({chartLegend: this.worldChartReference.current.chartInstance.generateLegend()});
        this.updateData();
    }

    render() {
        return (
        <div id="siScreen" className="screen">
            <div className="graphPanel">
                <div className="graphContainer">
                    <Scatter
                        ref={this.domesticChartReference}
                        data={this.state.domesticVars.data}
                        plugins={[this.domesticPlugin]}
                        options={siConfigDomestic}
                    />
                </div>
                <div className="graphContainer" style={{display: this.state.economyType === OPEN_ECONOMY_LARGE ? "block" : "none"}}>
                    <Scatter
                        ref={this.worldChartReference}
                        data={this.state.worldVars.data}
                        plugins={[this.worldPlugin]}
                        options={siConfigWorld}
                    />
                </div>
                <div className="legendContainer">
                    {this.state.chartLegend}
                </div>
            </div>
            <div className="userInterface">
                <div className="sliderSection">
                    <div style={{display:"flex", justifyContent:"center", width: "100%"}}>
                        <div className="errorDisplay" style={{opacity: this.state.displayMessage === NO_ERROR ? 0 : 1}}>
                            <div style={{display:"flex", alignItem:"center"}}>
                                <ErrorOutlineIcon style={{marginRight:"0.5rem"}}/>
                                {displayMessages[this.state.displayMessage]}
                            </div>
                        </div>
                    </div>
                    
                    {this.sliderData.map((data, i) =>
                        <SISlider key={"slider" + i} data={data}/>
                    )}
                    <div style={{width: "100%", display: "flex", justifyContent: "center", alignItems: "center"}}>
                        <div className="resetButton" onClick={this.reset}>Reset</div>
                    </div>
                </div>
                <div className="optionsSection">
                    <p style={{fontWeight: 500, fontSize: "1.3rem", margin: 0}}>Pick economy type:</p>
                    <div className="buttonSection">
                        {economyOptionButtons.map((option, i) => {
                                return <div className="optionButton" onClick={()=>{
                                    this.setState({economyType: option.value, r_w: DEFAULT_R_W, worldOffset: 0}, ()=>{
                                        this.handleChange()
                                    })
                                }} 
                                key={"optionBtn" + option.value}
                                style={{backgroundColor: this.state.economyType === i ? "#69cdff" : "#b3b3b3"}}>
                                    {option.text}
                                </div>
                        })}
                    </div>
                    <div className="openEconomyInputSection">
                        <div className="openEconomyInput" style={{display: this.state.economyType === OPEN_ECONOMY_SMALL ? "block" : "none"}}>
                            <p>r<sup>W</sup> = {this.state.r_w.toFixed(NUM_DECIMALS)}</p>
                            <div className="openEconomySlider">
                                <Slider value={this.state.r_w} 
                                        min={0}
                                        max={10}
                                        step={0.0001}
                                        onChange={this.handleWorldRChange} 
                                />
                            </div>
                        </div>
                        <div className="openEconomyInput" style={{display: this.state.economyType === OPEN_ECONOMY_LARGE ? "block" : "none"}}>
                            <p>World equilibrium offset = {this.state.worldVars.investmentOffset.toFixed(NUM_DECIMALS)}</p>
                            <div className="openEconomySlider">
                                <Slider value={this.state.worldVars.investmentOffset} 
                                        min={-10}
                                        max={10}
                                        step={0.0001}
                                        onChange={this.handleWorldOffsetChange} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
                
        </div>
        );
    }
}
