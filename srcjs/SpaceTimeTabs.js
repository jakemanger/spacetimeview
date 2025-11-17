import React, { useState } from 'react';
import './SpaceTimeViewer.css';
import SpaceTimeViewer from './SpaceTimeViewer';

export default function SpaceTimeTabs({ viewConfigs, titles }) {
    const [activeTab, setActiveTab] = useState(0);

    // Shared state for loaded data across all tabs
    // Key format: `tab_${tabIndex}_${columnName}` or `tab_${tabIndex}___all__` for dataUrl
    const [sharedLoadedData, setSharedLoadedData] = useState({});

    console.log('SpaceTimeTabs props:', { viewConfigs, titles });

    if (!viewConfigs || viewConfigs.length === 0) {
        return (
            <div className="space-time-tabs-container">
                <div className="space-time-tabs-content">
                    <p>Please provide at least one SpaceTimeView to display.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-time-tabs-container">
            <div className="space-time-tabs-content">
                {viewConfigs.map((config, index) => (
                    <div
                        key={index}
                        className={`space-time-tab-pane ${activeTab === index ? 'active' : ''}`}
                    >
                        {activeTab === index && (
                            <SpaceTimeViewer
                                {...config}
                                headerTitle={config.headerTitle || (titles && titles[index])}
                                tabTitles={titles}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                                tabIndex={index}
                                sharedLoadedData={sharedLoadedData}
                                setSharedLoadedData={setSharedLoadedData}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}