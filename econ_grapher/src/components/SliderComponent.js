import React from 'react';
import { Slider } from '@material-ui/core';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';

import '../styles/SliderComponent.css';

function SliderComponent(props){
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
            <p>{props.data.valueString} = {props.data.getValue().toFixed(4)}</p>
            <div style={{display: "flex", alignItems:"center", marginLeft:"0.5rem"}}>
                {props.tooltips && 
                <>
                    <HelpOutlineIcon className="sliderHelpIcon" style={{fontSize:"1.5rem"}}/>
                    <div className="sliderTooltip">{props.data.info}</div>
                </>
                }
            </div>
        </div>
    )
}

export default SliderComponent;