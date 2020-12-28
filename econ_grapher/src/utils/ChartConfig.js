const DefaultConfig = {
                    maintainAspectRatio: false,
                    title:{
                        display:true,
                        fontSize:20
                    },
                    legend:{
                        display: true,
                        position:'right',
                    },
                    scales: {
                        xAxes: [{
                            id: "x-axis-0",
                            scaleLabel:{
                                display: true,
                            },        
                            gridLines:{
                                drawOnChartArea: false,
                                drawTicks: false,
                            },                            
                            ticks: {
                                display: false,
                                beginAtZero: true,
                            }
                        }],
                        yAxes: [{
                            id: "y-axis-0",
                            scaleLabel:{
                                display: true,
                            }, 
                            gridLines:{
                                drawOnChartArea: false,
                                drawTicks: false,
                            },
                            ticks: {
                                display: false,
                                beginAtZero: true,
                            }
                        }]
                    },
                    layout: {
                        padding: {
                            left: 50,
                            right: 50,
                            bottom: 50
                        }
                    },
                    animation: {
                        duration: 0 
                    },
                    hover: {
                        animationDuration: 0 
                    },
                    responsiveAnimationDuration: 0,
                };
export default DefaultConfig;