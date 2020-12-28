import React from 'react';
import {Link} from 'react-router-dom';

import '../styles/NavPanel.css';

export default class NavPanel extends React.Component{
    constructor(){
        super();
        this.state={
            sidebarOpen: false,
        }
    }

    openSidebar(){
        this.setState({sidebarOpen: true})
        document.querySelector(".menu-btn").classList.add("open");
        document.querySelector(".sidebar").classList.add("open");
        document.querySelector(".overlay").style.display = 'block';
        document.querySelector(".overlay").style.pointerEvents = 'all';
    }

    closeSidebar(){
        this.setState({sidebarOpen: false})
        document.querySelector(".menu-btn").classList.remove("open");
        document.querySelector(".sidebar").classList.remove("open");
        document.querySelector(".overlay").style.display = 'none';
        document.querySelector(".overlay").style.pointerEvents = 'none';
    }

    toggleSidebar(){
        if(this.state.sidebarOpen)
            this.closeSidebar()
        else
            this.openSidebar()
    }

    render(){
        return (
            <div>
                <div className="overlay" onClick={()=>this.closeSidebar()}/>
                <button className="menu-btn" onClick={()=>this.toggleSidebar()}>
                    <div className="menu-btn-burger"></div>
                </button>
                <nav className="sidebar">
                    <div className="sidebarHead">
                        <h1 style={{padding:"1rem 1rem 0rem 1rem"}}>
                            Navigation
                            <hr/>
                        </h1>
                    </div>
                    <ul>
                        <li>
                            <Link to="/solow-model" className="navLink" onClick={()=>this.closeSidebar()}>
                                Solow Model
                            </Link>                        
                        </li>
                        <li>
                            <Link to="/ad-as-model" className="navLink" onClick={()=>this.closeSidebar()}>
                                AD / AS Model
                            </Link>                        
                        </li>
                        <li>
                            <Link to="/saving-investment-model" className="navLink" onClick={()=>this.closeSidebar()}>
                                Saving / Investment Model
                            </Link>                        
                        </li>
                        <li>
                            <Link to="/cumulative-graphs" className="navLink" onClick={()=>this.closeSidebar()}>
                                Cumulative Graphs
                            </Link>                        
                        </li>
                    </ul>
                </nav>
            </div>
        )
    }
}