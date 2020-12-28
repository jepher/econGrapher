import React from 'react';
import {Line} from 'react-chartjs-2';
import { Slider } from '@material-ui/core';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';

import LineChartUtils from '../utils/LineChartUtils';
import AnnotationRenderer from '../utils/AnnotationRenderer';  
import DefaultConfig from '../utils/ChartConfig';

import "../styles/ADASModelScreen.css"

function ADASSlider(props){
    return (
        <div className="sliderContainer">
            <div style={{display: "flex"}}>
                <p style={{color: props.data.color, fontWeight: 600}}>{props.data.valueString}</p>
                <p>&nbsp;= {props.data.getValue().toFixed(NUM_DECIMALS)}</p>
            </div>
            <div className="slider">
                <div className="sliderLabel left">
                    {props.data.labels[0]}
                </div>
                <Slider style={{margin: "0 1.5rem"}}
                        value={props.data.getValue()} 
                        min={props.data.bounds[0]}
                        max={props.data.bounds[1]}
                        step={0.0001}
                        onChange={props.data.onChange} 
                />
                <div className="sliderLabel right">
                    {props.data.labels[1]}
                </div>
            </div>
        </div>
    )
}

const NUM_DATA_POINTS = 2;
const NUM_DECIMALS = 4;
const STEP = 5;
const EPSILON = 0.001;

const NO_ERROR = 0;
const Y_OUT_OF_BOUNDS = 1;
const Y_NEGATIVE = 2;
const INFLATION_OUT_OF_BOUNDS = 3;
const INFLATION_TARGET_OUT_OF_BOUNDS = 4;
const AT_EQUILIBRIUM = 5;
const NO_POLICY_SELECTED = 6;

const displayMessages = [
    {
        message: "",
        color: "#fa4848"
    },
    {
        message: "Y* is out of range for the graph",
        color: "#fa4848"
    },
    {
        message: "Y* is negative",
        color: "#fa4848"
    },
    {
        message: "\u03C0* is out of range for the graph",
        color: "#fa4848"
    },
    {
        message: "\u03C0\u1D40 is out of range for the graph",
        color: "#fa4848"
    },
    {
        message: "The economy is at its long-run equilibrium",
        color: "#23db29"
    },
    {
        message: "Select a policy to continue",
        color: "#ffd630"
    }
]

const POLICY_NONE = 0;
const POLICY_INFLATION = 1;
const POLICY_OUTPUT = 2;
const DEFAULT_POLICY_TARGET = 2;
var demoOptionButtons = [
    {
        text: "No policy",
        policyCode: POLICY_NONE
    },
    {
        text: "Stabilize inflation",
        policyCode: POLICY_INFLATION
    },
    {
        text: "Stabilize output",
        policyCode: POLICY_OUTPUT 
    }
]  

let adasConfig = JSON.parse(JSON.stringify(DefaultConfig));
adasConfig.title.text = "AD / AS Model";
adasConfig.scales.xAxes[0].scaleLabel.labelString = "Aggregate output, Y ($ trillions)";
adasConfig.scales.xAxes[0].ticks.min = 0;
adasConfig.scales.yAxes[0].scaleLabel.labelString = "Inflation rate, \u03C0 (%)";
adasConfig.scales.yAxes[0].ticks.min = -10;
adasConfig.legend.display = true;
adasConfig.layout.padding.left = 65;

const VERTICAL_ANNOTATION_OFFSET = 25;
const HORIZONTAL_ANNOTATION_OFFSET = 45;

export default class ADASModelScreen extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            gamma: 1.5, // sensitivity of inflation to changes in unemployment gap
            expected_inflation: 2, 
            Y_P: 2.5, // potential output
            rho: 0, // price shock
            ad_1: 7,
            ad_2: 2,
            adOffset: 0,
            srasOffset: 0,
            lrasOffset: 0,
            data: {
                labels: [],
                datasets: []
            },
            chartLegend: "",
            displayMessage: AT_EQUILIBRIUM,
            policyChoice: -1,
            atEquilibrium: true,
            prevEquilibrium: null,
            policyTarget: DEFAULT_POLICY_TARGET,
            animationRunning: false,
        }

        // populate dataset
        var colors = ["rgb(20, 245, 50)", "rgb(35, 187, 247)", "rgb(237, 67, 55)"];
        var data = this.state.data;
        data.labels = new Array(NUM_DATA_POINTS);
        for(var i = 0; i < NUM_DATA_POINTS; i++)
            data.labels[i] = i * STEP;

        data.datasets = [
            {
                label: 'AD curve',
                function: this.calculateADCurve,
                info: ""
            },
            {
                label: 'SRAS curve',
                function: this.calculateSRASCurve,
                info: ""
            },
            {
                label: 'LRAS curve',
                function: null,
                info: ""
            },
        ]

        data.datasets.forEach((set, i)=>{
            set.data = new Array(NUM_DATA_POINTS);
            set.borderColor = colors[i];
            set.borderWidth = 2; 
            set.fill = false;
            set.pointRadius = 0;
            set.pointHoverRadius = 0;
            set.lineTension = 0;
        })

        this.chartReference = React.createRef();
        // initialize slider data
        this.sliderData = [
            {
                getValue: this.getADOffset,
                valueString: "Aggregate demand curve shift",
                bounds: [-10, 10],
                labels: ["Negative demand shock", "Positive demand shock"],
                color: colors[0],
                onChange: this.handleADChange,
            },
            {
                getValue: this.getSRASOffset,
                valueString: "Short run aggregate supply curve shift",
                bounds: [-8, 8],
                labels: ["Negative supply shock", "Positive supply shock"],
                color: colors[1],
                onChange: this.handleSRASChange,
            },
            {
                getValue: this.getLRASOffset,
                valueString: "Long run aggregate supply curve shift",
                labels: ["Negative supply shock", "Positive supply shock"],
                bounds: [-5, 5],
                color: colors[2],
                onChange: this.handleLRASChange,
            },
        ];

        this.adasPlugin = {
            id: "adasPlugin",
            afterDatasetsDraw: chart => {
                const lineChartUtils = new LineChartUtils(chart);
                const options = lineChartUtils.options;
                const ctx = chart.ctx;
                
                const optionsHandler = new AnnotationRenderer(ctx, options);
                optionsHandler.shadow();

                const equilibriumColor = "#e01bda";
                const prevEquilibriumColor = "#de9000";
                let yPotentialPoint = lineChartUtils.calculatePointPixels(this.state.Y_P + this.state.lrasOffset, 0);
                let yEquilibrium = this.calculateSREquilibrium();
                let equilibriumInflation = this.calculateADCurve(yEquilibrium);
                let equilibriumPoint = lineChartUtils.calculatePointPixels(yEquilibrium, equilibriumInflation);

                let [top, bottom, left, right] = lineChartUtils.getChartBoundaries();

                // draw LRAS curve
                optionsHandler.drawVerticalLine(
                    yPotentialPoint[0],
                    bottom,
                    top,
                    this.state.data.datasets[2].borderColor
                );
                optionsHandler.writeAnnotation(
                    "Y\u1D3E = " + this.getYPotential().toFixed(2),
                    yPotentialPoint[0],
                    bottom + 40,
                    this.state.data.datasets[2].borderColor 
                )

                // Y* vertical line
                if(this.state.displayMessage === Y_OUT_OF_BOUNDS || this.state.displayMessage === Y_NEGATIVE) return;
                optionsHandler.drawLineHeightAnnotation(
                    equilibriumPoint[0],
                    bottom,
                    equilibriumPoint[1]
                );
                optionsHandler.writeAnnotation(
                    "Y* = " + yEquilibrium.toFixed(2),
                    equilibriumPoint[0],
                    bottom + VERTICAL_ANNOTATION_OFFSET,
                    equilibriumColor
                )

                // inflation* horizontal line
                if(this.state.displayMessage === INFLATION_OUT_OF_BOUNDS) return;
                optionsHandler.drawLineOffsetAnnotation(
                    equilibriumPoint[1],
                    left,
                    equilibriumPoint[0]
                );
                optionsHandler.writeAnnotation(
                    "\u03C0* = " + equilibriumInflation.toFixed(2),
                    left - HORIZONTAL_ANNOTATION_OFFSET,
                    equilibriumPoint[1],
                    equilibriumColor
                )

                // draw annotations for policy target
                if(this.state.policyChoice === POLICY_INFLATION && equilibriumInflation !== this.state.policyTarget){
                    let policyTarget = lineChartUtils.calculatePointPixels(0, this.state.policyTarget);

                    // target inflation 
                    optionsHandler.drawLineOffsetAnnotation(
                        policyTarget[1],
                        left,
                        right
                    );
                    optionsHandler.writeAnnotation(
                        "\u03C0\u1D40 = " + this.state.policyTarget.toFixed(2),
                        left - HORIZONTAL_ANNOTATION_OFFSET,
                        policyTarget[1],
                        this.state.data.datasets[2].borderColor
                    )
                }

                // draw annotations for previous equilibrium (when playing animation)
                if(this.state.prevEquilibrium){
                    let prevEquilibriumPoint = lineChartUtils.calculatePointPixels(this.state.prevEquilibrium[0], this.state.prevEquilibrium[1]);
                    // previous Y* 
                    optionsHandler.drawLineHeightAnnotation(
                        prevEquilibriumPoint[0],
                        bottom,
                        prevEquilibriumPoint[1]
                    );
                    optionsHandler.writeAnnotation(
                        "Y*\u208B\u2081 = " + this.state.prevEquilibrium[0].toFixed(2),
                        prevEquilibriumPoint[0],
                        bottom + 25,
                        prevEquilibriumColor
                    )

                    // previous inflation* 
                    optionsHandler.drawLineOffsetAnnotation(
                        prevEquilibriumPoint[1],
                        left,
                        prevEquilibriumPoint[0]
                    );
                    optionsHandler.writeAnnotation(
                        "\u03C0*\u208B\u2081 = " + this.state.prevEquilibrium[1].toFixed(2),
                        left - HORIZONTAL_ANNOTATION_OFFSET - 5,
                        prevEquilibriumPoint[1],
                        prevEquilibriumColor
                    )
                }
            }
        }
    }

    getADOffset = ()=>(this.state.adOffset);
    getSRASOffset = () => (this.state.srasOffset);
    getLRASOffset = () => (this.state.lrasOffset);
    getYPotential = () => (this.state.lrasOffset + this.state.Y_P)

    calculateADCurve = (Y) => (this.state.ad_1 - this.state.ad_2 * Y + this.state.adOffset);
    calculateSRASCurve = (Y) => (this.state.expected_inflation + this.state.gamma * (Y - this.state.Y_P) + this.state.rho + this.state.srasOffset);
    calculateSREquilibrium = () => ((this.state.ad_1 + this.state.adOffset + this.state.gamma * this.state.Y_P - this.state.rho - this.state.srasOffset - this.state.expected_inflation) / (this.state.ad_2 + this.state.gamma))
    calculateTargetOutput = () => ((this.state.policyTarget + this.state.gamma * this.state.Y_P - this.state.rho - this.state.srasOffset - this.state.expected_inflation) / this.state.gamma)
    
    updateData(){
        this.setState(prevState =>{
            var data = prevState.data;
            for (var i = 0; i < data.datasets.length - 1; i++) {
                for (var j = 0; j < data.labels.length; j++) {
                    var fct = data.datasets[i].function,
                        x = data.labels[j],
                        y = fct(x);
                    data.datasets[i].data[j] = y;
                }
            }
            return {data};
        })
    }
    
    checkError(yEquilibrium, equilibriumInflation){
        // check if graph is correct
        const lineChartUtils = new LineChartUtils(this.chartReference.current.chartInstance);
        let [xTickMin, xTickMax, yTickMin, yTickMax] = lineChartUtils.getTickBounds();
        if(yEquilibrium > xTickMax)
            this.setState({displayMessage: Y_OUT_OF_BOUNDS})
        else if(yEquilibrium < xTickMin)
            this.setState({displayMessage: Y_NEGATIVE})
        else if(equilibriumInflation > yTickMax || equilibriumInflation < yTickMin)
            this.setState({displayMessage: INFLATION_OUT_OF_BOUNDS})
        else if(this.state.policyChoice === POLICY_INFLATION){
            var targetOutput = this.calculateTargetOutput();
            if(this.state.policyTarget < this.state.data.datasets[1].data[0] 
                || this.state.policyTarget > this.state.data.datasets[1].data[1] 
                || targetOutput < xTickMin 
                || targetOutput > xTickMax)
                this.setState({displayMessage: INFLATION_TARGET_OUT_OF_BOUNDS})
            else
                this.setState({displayMessage: NO_ERROR})
        }
        else
            this.setState({displayMessage: NO_ERROR})
    }

    handleChange = () =>{
        new Promise(resolve=>{
            this.updateData();
            resolve();
        }).then(() => {
            let yEquilibrium = this.calculateSREquilibrium();
            let equilibriumInflation = this.calculateADCurve(yEquilibrium);     
            // check for graph errors
            new Promise(resolve => {
                this.checkError(yEquilibrium, equilibriumInflation);
                resolve();
            }).then(() => {
                this.chartReference.current.chartInstance.update();

                if(this.state.displayMessage === NO_ERROR){
                    this.setState(prevState => {
                            let atEquilibrium = false;
                            let displayMessage = -1;

                            // check if at equilibrium
                            if(Math.abs(yEquilibrium - this.getYPotential()) <= EPSILON){
                                atEquilibrium = true;
                                displayMessage = AT_EQUILIBRIUM;
                            }
                            else{
                                atEquilibrium = false;
                                displayMessage = prevState.policyChoice === -1 ? NO_POLICY_SELECTED : NO_ERROR;
                            }

                            return {atEquilibrium, displayMessage}
                        }
                    )
                }
            });
        })
    }

    handleADChange = (event, newValue) => {
        if(this.state.animationRunning) return;
        this.setState({adOffset: newValue, prevEquilibrium: null}, 
                        ()=>{
                            this.handleChange();
                        });
    }

    handleSRASChange = (event, newValue) => {
        if(this.state.animationRunning) return;
        this.setState({srasOffset: newValue, prevEquilibrium: null}, 
                        ()=>{
                            this.handleChange();
                        });
    }

    handleLRASChange = (event, newValue) => {
        if(this.state.animationRunning) return;
        this.setState({lrasOffset: newValue, prevEquilibrium: null}, 
                        ()=>{
                            this.handleChange();
                        });
        
    }

    handlePolicyTargetChange = (event, newValue) => {
        if(this.state.animationRunning) return;
        this.setState({policyTarget: newValue, prevEquilibrium: null},
            () => {
                this.handleChange();
            })
    }

    reset = () => {
        this.setState({adOffset: 0, srasOffset: 0, lrasOffset: 0, prevEquilibrium: null, policyChoice: -1}, 
                        () => {
                            this.handleChange();
                        })
    }

    canPlay = () =>{
        return !(this.state.atEquilibrium 
                || this.state.policyChoice === -1 
                || this.state.displayMessage !== NO_ERROR)
    }

    playDemo = async() => {
        // check if can play
        if(!this.canPlay()) return;

        let yEquilibrium = this.calculateSREquilibrium();
        let equilibriumInflation = this.calculateADCurve(yEquilibrium);
        this.setState({animationRunning: true, prevEquilibrium: [yEquilibrium, equilibriumInflation]});
        let yPotential = this.getYPotential();

        let tracker = yEquilibrium;
        let target = yPotential;
        if(this.state.policyChoice === POLICY_INFLATION){
            tracker = equilibriumInflation;
            target = this.state.policyTarget;
        }

        // no policy
        let sign = tracker > target ? 1 : -1;
        if(this.state.policyChoice === POLICY_OUTPUT || this.state.policyChoice === POLICY_INFLATION)
            sign *= -1;            
        let dist =  Math.abs(tracker - target)
        let step = Math.max(0.0005, dist / 10);

        // play animation
        await new Promise(resolve => {
            const interval = setInterval(() => {
                // check if animation done
                if(Math.abs(tracker - target) <= EPSILON) {
                    resolve();
                    clearInterval(interval);
                }

                this.setState(prevState => {
                    if(this.state.policyChoice === POLICY_NONE)
                        return {srasOffset: prevState.srasOffset + sign * step}
                    else if(this.state.policyChoice === POLICY_INFLATION)
                        return {adOffset: prevState.adOffset + sign * step}
                    else if(this.state.policyChoice === POLICY_OUTPUT)
                        return {adOffset: prevState.adOffset + sign * step}
                });

                // update graph
                this.handleChange();

                // update values
                tracker = this.calculateSREquilibrium();
                if(this.state.policyChoice === POLICY_INFLATION)
                    tracker = this.calculateADCurve(tracker);
                dist =  Math.abs(tracker - target)
                step = Math.max(0.0005, dist / 10);
            }, 20);  
        }).then(() => {
            this.setState({animationRunning: false, atEquilibrium: true, policyChoice: -1}, 
                    // update graph one more time to remove target inflation annotation
                    () => {
                        this.handleChange();
                    });   
        });
    }

    componentDidMount(){
        this.updateData();
    }

    render() {
        return (
        <div id="adasScreen" className="screen">
            <div className="graphPanel">
                <div className="graphContainer">
                    <Line
                        ref={this.chartReference}
                        data={this.state.data}
                        plugins={[this.adasPlugin]}
                        options={adasConfig}
                    />
                </div>
            </div>
            <div className="userInterface">
                <div className="sliderSection">
                    {this.sliderData.map((data, i) =>
                        <ADASSlider key={"slider" + i} data={data}/>
                    )}
                    <div style={{width: "100%", display: "flex", justifyContent: "center", alignItems: "center"}}>
                        <div className="resetButton" onClick={this.reset}>Reset</div>
                    </div>
                </div>
                <div className="demoSection">
                    <div style={{display: "flex", alignItems: "center", position: "relative"}}>
                        <p style={{fontWeight: 500, fontSize: "1.3rem"}}>Policy Response Demo</p>
                        <HelpOutlineIcon id="demoHelpIcon" style={{marginLeft:"0.5rem"}}/>
                        <div id="helpTooltip">Select a policy response to a supply or demand shock and play the animation to see its effect on the economy</div>
                    </div>
                    <div id="displayMessage" 
                         style={{
                            backgroundColor: displayMessages[this.state.displayMessage].color, 
                            opacity: ((this.state.policyChoice >= 0 && !this.state.atEquilibrium && this.canPlay()) || this.state.displayMessage === NO_ERROR) ? 0 : 1
                         }}>
                        <ErrorOutlineIcon style={{marginRight: "0.5rem"}}/>{displayMessages[this.state.displayMessage].message}
                    </div>
                    <div className="demoOptionsSection">
                        {demoOptionButtons.map((option, i) => {
                            return <div className="demoOptionButton" 
                                        onClick={()=>{
                                            if(this.state.animationRunning) return;
                                            this.setState(prevState => ({policyChoice: prevState.policyChoice === option.policyCode ? -1 : option.policyCode, policyTarget: DEFAULT_POLICY_TARGET, prevEquilibrium: null}),
                                                        ()=>{
                                                            this.handleChange();
                                                        });
                                        }} 
                                        key={"optionBtn" + option.policyCode}
                                        style={{backgroundColor: this.state.policyChoice === i ? "#69cdff" : "#b3b3b3"}}
                                    >
                                        {option.text}
                                    </div>
                        })}
                    </div>
                    <div id="policyTargetInput" style={{opacity: this.state.policyChoice === POLICY_INFLATION ? 1 : 0}}>
                        <p>&#960;<sup>T</sup> = {this.state.policyTarget.toFixed(NUM_DECIMALS)}</p>
                        <div id="policyTargetSlider">
                            <Slider value={this.state.policyTarget} 
                                    min={0}
                                    max={5}
                                    step={0.0001}
                                    onChange={this.handlePolicyTargetChange} 
                            />
                        </div>
                    </div>
                    <div className="playButton" 
                        onClick={this.playDemo}
                        style={{backgroundColor: !this.canPlay() ? "#757575" : "#00bf2d"}}>
                        <PlayCircleOutlineIcon style={{fontSize: "2rem", color: "white"}}/>
                    </div>
                </div>
            </div>
        </div>
        );
    }
}
