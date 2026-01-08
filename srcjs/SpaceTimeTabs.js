import React, { useState } from 'react';
import './SpaceTimeViewer.css';
import SpaceTimeViewer from './SpaceTimeViewer';

export default function SpaceTimeTabs({ viewConfigs, titles }) {
    const [activeTab, setActiveTab] = useState(0);
    const [loadingTab, setLoadingTab] = useState(null);
    const [tabsDataLoaded, setTabsDataLoaded] = useState(new Set());

    // shared state for loaded data across all tabs
    // key format: `tab_${tabIndex}_${columnName}` or `tab_${tabIndex}___all__` for dataUrl
    const [sharedLoadedData, setSharedLoadedData] = useState({});

    console.log('SpaceTimeTabs props:', { viewConfigs, titles });

    const handleTabChange = (newTab) => {
        // Only show loading indicator if this tab hasn't loaded data yet
        if (!tabsDataLoaded.has(newTab)) {
            setLoadingTab(newTab);
        }
        setActiveTab(newTab);
    };

    const handleDataLoaded = (tabIndex) => {
        setLoadingTab(null);
        // Mark this tab's data as loaded
        setTabsDataLoaded(prev => new Set([...prev, tabIndex]));
    };

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
                        {/* Always render tab 0 to preload its data, render other tabs only when active */}
                        {(activeTab === index || index === 0) && (
                            <SpaceTimeViewer
                                {...config}
                                headerTitle={config.headerTitle || (titles && titles[index])}
                                tabTitles={titles}
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                loadingTab={loadingTab}
                                onDataLoaded={() => handleDataLoaded(index)}
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