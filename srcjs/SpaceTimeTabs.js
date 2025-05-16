import React, { useState } from 'react';
import './SpaceTimeViewer.css';
import SpaceTimeViewer from './SpaceTimeViewer';

export default function SpaceTimeTabs({ viewConfigs, titles }) {
    const [activeTab, setActiveTab] = useState(0);

    console.log('SpaceTimeTabs props:', { viewConfigs, titles });

    if (!viewConfigs || viewConfigs.length === 0) {
        return (
            <div className="space-time-tabs-container">
                <div className="space-time-tabs-header">
                    <h2>No views provided</h2>
                </div>
                <div className="space-time-tabs-content">
                    <p>Please provide at least one SpaceTimeView to display.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-time-tabs-container">
            <div className="space-time-tabs-header">
                <div className="space-time-tabs-nav">
                    {titles.map((title, index) => (
                        <div 
                            key={index} 
                            className={`space-time-tab ${activeTab === index ? 'active' : ''}`}
                            onClick={() => setActiveTab(index)}
                        >
                            {title}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="space-time-tabs-content">
                {viewConfigs.map((config, index) => (
                    <div 
                        key={index} 
                        className={`space-time-tab-pane ${activeTab === index ? 'active' : ''}`}
                    >
                        {activeTab === index && (
                            <SpaceTimeViewer {...config} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}