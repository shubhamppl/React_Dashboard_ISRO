import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Satellite } from 'lucide-react';
import SatelliteMapView from './components/SatelliteMapView';  // Add this import
import './styles/buttons.css';  // Add this import

const Simulation = () => {
  // Add new state for selected satellite
  const [selectedSatellite, setSelectedSatellite] = useState('1A2331');

  // Add satellite options array
  const satelliteOptions = [
    { id: '1A2331', label: 'ISS-like LEO (1A2331)' },
    { id: '1B2931', label: 'Sun-sync LEO (1B2931)' },
    { id: '1k2001', label: 'Molniya-like (1k2001)' }
  ];

  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mapView, setMapView] = useState('2D');
  const [filters, setFilters] = useState({
    equipment: 'All',
    groundStation: 'All',
    range: 'All'
  });
  const [currentTime] = useState(14.5); // Add this for 14:30

  // Add new state for tracking data
  const [satelliteTracking, setSatelliteTracking] = useState({
    '1A2331': { progress: 0, currentData: null, visibleData: [], isInRange: false },
    '1B2931': { progress: 0, currentData: null, visibleData: [], isInRange: false },
    '1k2001': { progress: 0, currentData: null, visibleData: [], isInRange: false }
  });

  // Add state for last completed pass data
  const [lastPassData, setLastPassData] = useState({
    '1A2331': { data: [], antenna: null, timestamp: null },
    '1B2931': { data: [], antenna: null, timestamp: null },
    '1k2001': { data: [], antenna: null, timestamp: null }
  });

  // Add new state for active connections
  const [activeConnections, setActiveConnections] = useState({});
  const [currentTableTime, setCurrentTableTime] = useState(new Date());

  // Add new state for time indicator position
  const [timeIndicatorPosition, setTimeIndicatorPosition] = useState(0);
  const tableRef = React.useRef(null);

  // Add this function near the top with other useEffect hooks
  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTableTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Add resize observer effect
  useEffect(() => {
    if (!tableRef.current) return;

    const updateTimeIndicator = () => {
      const tableWidth = tableRef.current?.offsetWidth || 0;
      const fixedColumnsWidth = 460;
      const timeColumnsWidth = tableWidth - fixedColumnsWidth;
      const currentHour = currentTableTime.getHours();
      const currentMinute = currentTableTime.getMinutes();
      const timeProgress = (currentHour + currentMinute / 60) / 24;
      setTimeIndicatorPosition(fixedColumnsWidth + (timeProgress * timeColumnsWidth));
    };

    const resizeObserver = new ResizeObserver(updateTimeIndicator);
    resizeObserver.observe(tableRef.current);

    // Update position every minute
    const timer = setInterval(updateTimeIndicator, 60000);

    // Initial update
    updateTimeIndicator();

    return () => {
      resizeObserver.disconnect();
      clearInterval(timer);
    };
  }, [currentTableTime]);

  // Update useEffect for time indicator
  useEffect(() => {
    const updatePosition = () => {
      if (!tableRef.current) return;

      const table = tableRef.current;
      const tableRect = table.getBoundingClientRect();
      const fixedColsWidth = 460;
      const timeColsWidth = tableRect.width - fixedColsWidth;
      const hour = currentTableTime.getHours();
      const minute = currentTableTime.getMinutes();
      const dayProgress = (hour + minute / 60) / 24;
      const position = fixedColsWidth + (timeColsWidth * dayProgress);

      setTimeIndicatorPosition(position);
    };

    const observer = new ResizeObserver(updatePosition);
    if (tableRef.current) {
      observer.observe(tableRef.current);
    }

    const timer = setInterval(updatePosition, 1000);
    updatePosition();

    return () => {
      observer.disconnect();
      clearInterval(timer);
    };
  }, [currentTableTime]);

  // Satellite data
  const satelliteData = [
    {
      id: '1A2331',
      antenna: 'E24',
      error: 'No Issue',
      signalStrength: '85%',
      lastConnection: '17:05 - 17:27',
      location: { lat: '12.9716° N', long: '77.5946° E' }
    },
    {
      id: '1B2931',
      antenna: 'F16',
      error: 'No Issue',
      signalStrength: '75%',
      lastConnection: '17:25 - 17:27',
      location: { lat: '27.9716° N', long: '77.5946° E' }
    },
    {
      id: '1k2001',
      antenna: 'F22',
      error: '1',
      signalStrength: 'N/A',
      lastConnection: '16:30 - 17:45',
      location: { lat: '37.8153° N', long: '-122.4064° W' }
    },
    {
      id: '1R9331',
      antenna: 'E24',
      error: 'No Issue',
      signalStrength: 'N/A',
      lastConnection: '16:05 - 16:20',
      location: { lat: '37.8153° N', long: '-2.4064° W' }
    },
    {
      id: '1T5521',
      antenna: 'E28',
      error: 'No Issues',
      signalStrength: '45%',
      lastConnection: '17:30 - 17:45',
      location: { lat: '51.5074° N', long: '0.1278° W' }
    }
  ];

  // Simulate satellite movement
  useEffect(() => {
    const movementTimer = setInterval(() => {
      // Satellite movement simulation logic here
      console.log('Updating satellite positions...');
    }, 5000);
    return () => clearInterval(movementTimer);
  }, []);

  // Add new utility functions for geometric calculations
  const calculateAntennaMetrics = (satPosition, antennaPosition) => {
    const [satLat, satLon] = satPosition.map(x => x * Math.PI / 180);
    const [antLat, antLon] = antennaPosition.map(x => x * Math.PI / 180);
    
    const R = 6371; // Earth radius in km
    const satAltitude = 400; // Satellite altitude in km
    
    // Calculate great circle distance
    const dLon = antLon - satLon;
    const distance = Math.acos(
      Math.sin(satLat) * Math.sin(antLat) +
      Math.cos(satLat) * Math.cos(antLat) * Math.cos(dLon)
    ) * R;
    
    // Improved elevation calculation for realistic angles
    const elevation = 90 * Math.exp(-distance / (satAltitude * 2));
    const constrainedElevation = Math.max(0, Math.min(90, elevation));
    
    // Range calculation considering Earth's curvature
    const range = Math.sqrt(
      Math.pow(R + satAltitude, 2) + 
      Math.pow(R, 2) - 
      2 * R * (R + satAltitude) * Math.cos(distance / R)
    );

    // Signal strength based on elevation angle
    const signalStrength = Math.pow(Math.sin(constrainedElevation * Math.PI / 180), 0.5);

    return {
      elevation: constrainedElevation,
      range,
      signalStrength
    };
  };

  // Modified generate pass data function
  const generatePassData = (satId, antenna, timePoint) => {
    const data = [];
    const points = 100;
    const passDuration = 10; // minutes
    
    for (let i = 0; i < points; i++) {
      const progress = i / points;
      const time = timePoint + progress * passDuration;
      
      // Create bell-shaped curve for elevation
      const normalizedProgress = 2 * (progress - 0.5); // -1 to 1
      const elevationFactor = Math.exp(-Math.pow(normalizedProgress * 2, 2));
      const elevation = 90 * elevationFactor;
      
      // Calculate range inversely proportional to elevation
      const minRange = 1000;
      const maxRange = 3000;
      const range = maxRange - (maxRange - minRange) * elevationFactor;

      data.push({
        time: Number(time.toFixed(1)),
        elevation: Number(elevation.toFixed(1)),
        range: Number(range.toFixed(1)),
        signalStrength: Number(elevationFactor.toFixed(2))
      });
    }
    return data;
  };

  // Calculate chart positions
  const calculatePosition = (progress, value, minDomain, maxDomain) => {
    const margin = { top: 20, right: 50, left: 20, bottom: 25 };
    const chartWidth = 500 - margin.left - margin.right;
    const chartHeight = 400 - margin.top - margin.bottom;
    
    const x = margin.left + (progress / 100) * chartWidth;
    const yScale = chartHeight / (maxDomain - minDomain);
    const y = margin.top + (maxDomain - value - minDomain) * yScale;
    
    return { x, y };
  };

  // Modified handle satellite range updates with null checks
  const handleSatelliteRangeUpdate = (updates) => {
    if (!updates) return;

    setSatelliteTracking(prev => {
      const updated = { ...prev };
      
      Object.entries(updates).forEach(([satId, data]) => {
        if (!data) return;
        
        const { isInRange, position, connectedAntennas = [], time = 0 } = data;
        const currentTracking = prev[satId] || { progress: 0, visibleData: [], connectionStartTime: null };
        
        if (isInRange && connectedAntennas.length > 0 && position) {
          const nearestAntenna = connectedAntennas.reduce((nearest, current) => {
            if (!current || !current.position) return nearest;
            const metrics = calculateAntennaMetrics(position, current.position);
            if (!nearest.metrics) return { antenna: current, metrics };
            return metrics.range < nearest.metrics.range ? 
              { antenna: current, metrics } : nearest;
          }, { antenna: null, metrics: null });

          if (!nearestAntenna.antenna || !nearestAntenna.metrics) return;

          const metrics = calculateAntennaMetrics(position, nearestAntenna.antenna.position);
          if (!metrics) return;

          // Calculate elapsed time since connection started
          if (!currentTracking.connectionStartTime) {
            currentTracking.connectionStartTime = Date.now();
          }
          
          const elapsedSeconds = (Date.now() - currentTracking.connectionStartTime) / 1000;
          const minutes = Math.floor(elapsedSeconds / 60);
          const seconds = Math.floor(elapsedSeconds % 60);
          const formattedTime = minutes + (seconds / 100); // This will show as MM.SS

          const newData = {
            time: formattedTime,
            elevation: Number(metrics.elevation.toFixed(1)),
            range: Number(metrics.range.toFixed(1)),
            azimuth: metrics.azimuth ? Number(metrics.azimuth.toFixed(1)) : 0,
            signalStrength: Number(metrics.signalStrength.toFixed(2))
          };

          updated[satId] = {
            ...currentTracking,
            currentData: newData,
            visibleData: [...(currentTracking.visibleData || []).slice(-99), newData],
            isInRange,
            position,
            connectedAntenna: nearestAntenna.antenna
          };
        } else {
          if (prev[satId]?.isInRange && prev[satId]?.visibleData?.length > 0) {
            setLastPassData(lastPass => ({
              ...lastPass,
              [satId]: {
                data: prev[satId].visibleData,
                antenna: prev[satId].connectedAntenna,
                timestamp: new Date().toISOString()
              }
            }));
          }

          updated[satId] = {
            progress: 0,
            currentData: null,
            visibleData: [],
            isInRange: false,
            connectionStartTime: null
          };
        }
      });
      
      return updated;
    });
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const clearFilters = () => {
    setFilters({
      equipment: 'All',
      groundStation: 'All',
      range: 'All'
    });
  };

  const generateData = () => {
    const data = [];
    for (let i = 0; i < 100; i++) {
      const time = (i / 10);
      const degrees = (time * 18);
      const elevation = 50 * Math.sin(Math.PI * time / 10);
      const range = 2000 - 800 * Math.sin(Math.PI * time / 10);
      const azimuth = (360 * i) / 100;
      
      data.push({
        time: Number(time.toFixed(1)),
        degrees: Number(degrees.toFixed(1)),
        elevation: Number(elevation.toFixed(1)),
        range: Number(range.toFixed(1)),
        azimuth: Number(azimuth.toFixed(1))
      });
    }
    return data;
  };

  // Add safety check in renderTopGraphs
  const renderTopGraphs = () => {
    return (
      <div className="graphs-section">
        {/* Add dropdown filter */}
        <div style={{ 
          marginBottom: '20px',
          padding: '10px',
          background: '#f8f9fa',
          borderRadius: '5px'
        }}>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>
            Select Satellite:
          </label>
          <select 
            value={selectedSatellite}
            onChange={(e) => setSelectedSatellite(e.target.value)}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            {satelliteOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Single graph view */}
        {(() => {
          const tracking = satelliteTracking[selectedSatellite] || {};
          const lastPass = lastPassData[selectedSatellite] || {};
          const { currentData, visibleData = [], isInRange, connectedAntenna } = tracking;

          const displayData = isInRange && visibleData ? visibleData : (lastPass.data || []);
          const displayAntenna = isInRange ? connectedAntenna : lastPass.antenna;

          // Safe position calculation
          const elevationPos = currentData && calculatePosition(
            tracking.progress || 0,
            currentData.elevation || 0,
            0,
            90
          );

          return (
            <div className="satellite-card stacked" style={{ padding: '15px', width: '600px' }}>
              <h3 className="font-bold mb-2">
                {selectedSatellite}
                {isInRange ? (
                  <span className="text-green-500 ml-2">
                    (Tracking via {displayAntenna?.name})
                  </span>
                ) : displayAntenna && (
                  <span className="text-gray-500 ml-2">
                    (Last pass via {displayAntenna?.name})
                  </span>
                )}
              </h3>
              
              <div className="current-values" style={{ marginBottom: '10px', fontSize: '12px' }}>
                {(currentData || lastPass.data.length > 0) && (
                  <>
                    {isInRange ? (
                      // Show real-time values
                      <>
                        <span className="mr-4">Elevation: {currentData.elevation.toFixed(1)}°</span>
                        <span className="mr-4">Range: {currentData.range.toFixed(1)} km</span>
                        <span className="mr-4">Azimuth: {currentData.azimuth.toFixed(1)}°</span>
                        <span>Signal: {(currentData.signalStrength * 100).toFixed(0)}%</span>
                      </>
                    ) : (
                      // Show last recorded values
                      <>
                        <span className="text-gray-600">Last Pass Data:</span>
                        <span className="ml-2">{new Date(lastPass.timestamp).toLocaleTimeString()}</span>
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="satellite-graph">
                <LineChart 
                  width={550} 
                  height={280} 
                  data={displayData}
                  margin={{ top: 20, right: 50, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    domain={[0, 'auto']}
                    tickFormatter={(value) => {
                      const minutes = Math.floor(value);
                      const seconds = Math.floor((value % 1) * 100);
                      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }}
                    label={{ 
                      value: 'Time (MM:SS)', 
                      position: 'bottom',
                      offset: 0
                    }}
                  />
                  <YAxis 
                    yAxisId="left"
                    domain={[0, 90]} // Updated to 0-90 degrees
                    label={{ value: 'Elevation (°)', angle: -90, position: 'insideLeft' }}
                    stroke="#8B0000" // Changed to dark red
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[1000, 3000]}
                    label={{ value: 'Range (km)', angle: 90, position: 'insideRight' }}
                    stroke="#A52A2A" // Changed to another shade of dark red
                  />
                  <Tooltip />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="elevation" 
                    stroke="#8B0000" // Changed to dark red
                    dot={false}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="range" 
                    stroke="#A52A2A" // Changed to another shade of dark red
                    dot={false}
                  />
                  {currentData && elevationPos && (
                    <svg>
                      <circle cx={elevationPos.x} cy={elevationPos.y} r="3" fill="#8B0000"/> // Changed to dark red
                      <text 
                        x={elevationPos.x} 
                        y={elevationPos.y - 10} 
                        textAnchor="middle"
                        className="satellite-icon"
                      >
                        🛰️
                      </text>
                    </svg>
                  )}
                </LineChart>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const renderMap = () => {
    return (
      <div className="map-section">
        <div className="map-container">
          <SatelliteMapView onRangeUpdate={handleSatelliteRangeUpdate} />
        </div>
      </div>
    );
  };

  return (
    <div className="simulation-container">
      <div className="header-container" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 20px',
        background: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        justifyContent: 'space-between'
      }}>
        {/* Left Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* ISRO Logo */}
          <img 
            src="/images/isro.png"  // Updated path
            alt="ISRO Logo" 
            style={{ height: '40px' }}
          />

          {/* Navigation Links */}
          <nav className="button-group">
            {[
              'Real-time Configuration',
              'Tracking',
              'Simulation',
              'Report',
              'Logs',
              'Schedule'
            ].map(tab => (
              <button
                key={tab}
                className={`button ${activeTab === tab.toLowerCase() ? 'active' : ''}`}
                onClick={() => handleTabClick(tab.toLowerCase())}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Center Section */}
        <div style={{ 
          position: 'absolute', 
          left: '50%', 
          transform: 'translateX(-50%)',
          fontWeight: 'bold',
          fontSize: '18px'
        }}>
          Satellite Schedule

        </div>

        {/* Right Section */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px'
        }}>
          <div className="button-group">
            <button className="common-edit-button">
              Equipment/ Satellite Management
            </button>
            <button className="common-edit-button">
              Manage Session
            </button>
          </div>

          <div style={{ 
            borderLeft: '1px solid #ddd', 
            paddingLeft: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <span>05:59 pm IST</span>
            <img 
              src="/images/user.png" // Updated path
              alt="User" 
              style={{
                height: '32px',
                width: '32px',
                borderRadius: '50%',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </div>

      <div className="main-layout">
        <div className="left-panel">
          {renderTopGraphs()}
        </div>
        <div className="right-panel">
          {renderMap()}
        </div>
      </div>
      
    </div>
  );
};

export default Simulation;
