import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom satellite icon using emoji
const satelliteIcon = L.divIcon({
  html: '🛰️',
  className: 'satellite-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Global antennas with increased ranges
const globalAntennas = [
  // Existing Indian stations with increased ranges
  {
    name: 'Delhi Ground Station',
    position: [28.6139, 77.2090],
    range: 750000,
    frequency: 'S-Band',
    antennaType: 'E24',
    color: '#FF9800',
    country: 'India'
  },
  {
    name: 'Bengaluru Space Center',
    position: [12.9716, 77.5946],
    range: 850000,
    frequency: 'X-Band',
    antennaType: 'F16',
    color: '#2196F3',
    country: 'India'
  },
  {
    name: 'Mumbai Coastal Station',
    position: [19.0760, 72.8777],
    range: 700000,
    frequency: 'C-Band',
    antennaType: 'E28',
    color: '#4CAF50',
    country: 'India'
  },
  {
    name: 'Chennai Station',
    position: [13.0827, 80.2707],
    range: 800000,
    frequency: 'L-Band',
    antennaType: 'F22',
    color: '#9C27B0',
    country: 'India'
  },
  {
    name: 'Sriharikota Launch Station',
    position: [13.7200, 80.2300],
    range: 900000,
    frequency: 'UHF',
    antennaType: 'E24',
    color: '#f44336',
    country: 'India'
  },
  // New global stations
  {
    name: 'NASA Houston',
    position: [29.7604, -95.3698],
    range: 900000,
    frequency: 'S/X-Band',
    antennaType: 'F32',
    color: '#E91E63',
    country: 'USA'
  },
  {
    name: 'ESA Darmstadt',
    position: [49.8728, 8.6512],
    range: 850000,
    frequency: 'Ka-Band',
    antennaType: 'E36',
    color: '#009688',
    country: 'Germany'
  },
  {
    name: 'JAXA Tsukuba',
    position: [36.0526, 140.1259],
    range: 800000,
    frequency: 'X-Band',
    antennaType: 'F28',
    color: '#795548',
    country: 'Japan'
  },
  {
    name: 'Kourou Space Center',
    position: [5.1604, -52.6435],
    range: 850000,
    frequency: 'C/X-Band',
    antennaType: 'E30',
    color: '#607D8B',
    country: 'French Guiana'
  },
  {
    name: 'Beijing Aerospace',
    position: [40.0799, 116.6031],
    range: 800000,
    frequency: 'S/X-Band',
    antennaType: 'F26',
    color: '#FFC107',
    country: 'China'
  },
  {
    name: 'Canberra Deep Space',
    position: [-35.4034, 148.9819],
    range: 900000,
    frequency: 'X/Ka-Band',
    antennaType: 'E40',
    color: '#00BCD4',
    country: 'Australia'
  },
  {
    name: 'Madrid Deep Space',
    position: [40.4297, -4.2490],
    range: 850000,
    frequency: 'X/Ka-Band',
    antennaType: 'F38',
    color: '#8BC34A',
    country: 'Spain'
  }
];

// Calculate orbital speed in km/s
function calculateOrbitalSpeed(semiMajorAxis) {
  const G = 6.67430e-11; // gravitational constant
  const M = 5.972e24;    // Earth's mass in kg
  return Math.sqrt(G * M / (semiMajorAxis * 1000)) / 1000;
}

// Update the isInAntennaRange function to be more precise
function isInAntennaRange(satPosition, antenna) {
  const R = 6371; // Earth's radius in km
  const lat1 = satPosition[0] * Math.PI / 180;
  const lat2 = antenna.position[0] * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLon = (antenna.position[1] - satPosition[1]) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) ** 2;
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Use exact range without multiplier for strict connection check
  return distance <= (antenna.range / 1000);
}

// Enhanced satellite orbits with more details
const satelliteOrbits = [
  {
    id: '1A2331',
    name: 'ISS-like LEO',
    type: 'LEO',
    semiMajorAxis: 6780, // km
    eccentricity: 0.0011,
    inclination: 51.6,
    raan: 0, // Right Ascension of Ascending Node
    argPerigee: 0,
    meanAnomaly: 0,
    period: 92.68, // minutes
    color: '#2196F3',
    orbitType: 'Low Earth Orbit',
    altitude: '409 km'
  },
  {
    id: '1B2931',
    name: 'Sun-sync LEO',
    type: 'LEO',
    semiMajorAxis: 7000,
    eccentricity: 0.0002,
    inclination: 97.5,
    raan: 45,
    argPerigee: 90,
    meanAnomaly: 0,
    period: 98.8,
    color: '#f44336'
  },
  {
    id: '1k2001',
    name: 'Molniya-like',
    type: 'HEO',
    semiMajorAxis: 26562,
    eccentricity: 0.72,
    inclination: 63.4,
    raan: 270,
    argPerigee: 270,
    meanAnomaly: 0,
    period: 718,
    color: '#4CAF50'
  }
];

// Calculate satellite position using simplified orbital mechanics.
// Note: Although the math is inherently periodic (using modulo in the calculation),
// by updating time continuously in our interval (and not reinitializing the interval),
// the marker appears to move smoothly.
function calculateOrbitPosition(orbit, time) {
  const { semiMajorAxis, eccentricity, inclination, raan, argPerigee, meanAnomaly, period } = orbit;
  
  // Calculate mean motion (radians per minute)
  const meanMotion = (2 * Math.PI) / period;
  
  // Compute the current mean anomaly.
  // (The modulo here keeps the anomaly within 0-2π but note that smooth progression is maintained 
  // because the time in the state is continuous and the update callback isn’t resetting the interval.)
  const currentMeanAnomaly = (meanAnomaly + meanMotion * time) % (2 * Math.PI);
  
  // Solve Kepler's equation (using a simple iterative approach)
  let E = currentMeanAnomaly;
  for (let i = 0; i < 10; i++) {
    E = currentMeanAnomaly + eccentricity * Math.sin(E);
  }
  
  // Calculate true anomaly
  const trueAnomaly = 2 * Math.atan(
    Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.tan(E / 2)
  );
  
  // Calculate radius
  const radius = (semiMajorAxis * (1 - eccentricity * eccentricity)) /
                 (1 + eccentricity * Math.cos(trueAnomaly));
  
  // Position in the orbital plane
  const xOrbit = radius * Math.cos(trueAnomaly);
  const yOrbit = radius * Math.sin(trueAnomaly);
  
  // Convert to Earth-centered coordinates (applying rotation for inclination, RAAN, and argument of perigee)
  const incRad = (inclination * Math.PI) / 180;
  const raanRad = ((raan + time * 0.25) * Math.PI) / 180; // Earth's rotation added
  const argRad = (argPerigee * Math.PI) / 180;
  
  const x = xOrbit * (Math.cos(raanRad) * Math.cos(argRad) -
            Math.sin(raanRad) * Math.sin(argRad) * Math.cos(incRad)) -
            yOrbit * (Math.cos(raanRad) * Math.sin(argRad) +
            Math.sin(raanRad) * Math.cos(argRad) * Math.cos(incRad));
            
  const y = xOrbit * (Math.sin(raanRad) * Math.cos(argRad) +
            Math.cos(raanRad) * Math.sin(argRad) * Math.cos(incRad)) +
            yOrbit * (Math.cos(raanRad) * Math.cos(argRad) * Math.cos(incRad) -
            Math.sin(raanRad) * Math.sin(argRad));
            
  const z = xOrbit * Math.sin(argRad) * Math.sin(incRad) +
            yOrbit * Math.cos(argRad) * Math.sin(incRad);
  
  // Convert to latitude/longitude
  const norm = Math.sqrt(x * x + y * y + z * z);
  const lat = Math.asin(z / norm) * (180 / Math.PI);
  const lng = Math.atan2(y, x) * (180 / Math.PI);
  
  return [lat, lng];
}

// Generate an orbit path as a series of lat/lng points.
// The optional timeOffset allows the path to be calculated relative to the current time.
function generateOrbitPath(orbit, timeOffset = 0) {
  const points = [];
  const steps = 200;
  const timeStep = orbit.period / steps;
  
  for (let i = 0; i < steps; i++) {
    points.push(calculateOrbitPosition(orbit, timeOffset + i * timeStep));
  }
  
  return points;
}

// Split a path into segments if consecutive points have a large jump in longitude (e.g., dateline crossing)
function splitPathOnDateline(path) {
  if (!path || path.length === 0) return [];
  const segments = [];
  let currentSegment = [path[0]];

  for (let i = 1; i < path.length; i++) {
    const prevLng = path[i - 1][1];
    const currLng = path[i][1];
    // If the jump in longitude is more than 180°, start a new segment.
    if (Math.abs(currLng - prevLng) > 180) {
      segments.push(currentSegment);
      currentSegment = [path[i]];
    } else {
      currentSegment.push(path[i]);
    }
  }
  if (currentSegment.length) segments.push(currentSegment);
  return segments;
}

const SatelliteMapView = ({ onRangeUpdate }) => {
  const [satellitePositions, setSatellitePositions] = useState([]);
  const [orbitPaths, setOrbitPaths] = useState([]);
  const [time, setTime] = useState(0);
  const [connectedAntennas, setConnectedAntennas] = useState({});

  // Add new state for hover tracking
  const [hoveredAntenna, setHoveredAntenna] = useState(null);

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [customSpeed, setCustomSpeed] = useState('1');

  // Add custom speed handler
  const handleCustomSpeed = (e) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(value) && value >= 0 && value <= 100)) {
      setCustomSpeed(value);
      if (value !== '') {
        setPlaybackSpeed(Number(value));
      }
    }
  };

  // Modify the useEffect for animation to use playback controls
  useEffect(() => {
    let lastTime = Date.now();
    const interval = setInterval(() => {
      if (!isPlaying) return;
      
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      setTime(prevTime => {
        const newTime = prevTime + (deltaTime * playbackSpeed * direction);

        // Update satellite positions with strict range checking
        const newPositions = satelliteOrbits.map(orbit => {
          const position = calculateOrbitPosition(orbit, newTime);
          const speed = calculateOrbitalSpeed(orbit.semiMajorAxis);
          
          // Only connect when strictly within range
          const connectedTo = globalAntennas.filter(antenna => {
            const inRange = isInAntennaRange(position, antenna);
            return inRange;
          });

          return {
            id: orbit.id,
            name: orbit.name,
            position,
            color: orbit.color,
            speed,
            orbitType: orbit.type,
            altitude: orbit.altitude,
            period: orbit.period,
            progress: (((newTime % orbit.period) / orbit.period) * 100).toFixed(1),
            connectedAntennas: connectedTo
          };
        });

        setSatellitePositions(newPositions);
        
        // Update orbit paths and connections
        const updatedOrbitPaths = satelliteOrbits.map(orbit => ({
          id: orbit.id,
          name: orbit.name,
          path: generateOrbitPath(orbit, newTime),
          color: orbit.color,
          period: orbit.period
        }));
        setOrbitPaths(updatedOrbitPaths);

        // Update connected antenna details with hover awareness
        const connections = {};
        newPositions.forEach(sat => {
          connections[sat.id] = sat.connectedAntennas;
        });
        setConnectedAntennas(connections);

        // Send range updates to parent
        if (onRangeUpdate) {
          const rangeUpdates = {};
          newPositions.forEach(sat => {
            rangeUpdates[sat.id] = {
              isInRange: sat.connectedAntennas.length > 0,
              position: sat.position,
              connectedAntennas: sat.connectedAntennas,
              time: newTime
            };
          });
          onRangeUpdate(rangeUpdates);
        }

        return newTime;
      });
    }, 100); // Faster updates for smoother animation

    return () => clearInterval(interval);
  }, [hoveredAntenna, onRangeUpdate, playbackSpeed, isPlaying, direction]); // Add hoveredAntenna to dependencies

  // Add playback control handlers
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleDirection = () => setDirection(d => d * -1);
  const handleSpeed = (speed) => setPlaybackSpeed(speed);

  return (
    <>
      <MapContainer
        center={[20.5937, 78.9629]} // Center on India
        zoom={3} // Decreased zoom to show more of the world
        style={{ height: '100%', width: '100%', background: '#f8f9fa' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Update antenna markers with hover events */}
        {globalAntennas.map((antenna, index) => (
          <React.Fragment key={index}>
            <Marker
              position={antenna.position}
              icon={L.divIcon({
                html: '📡',
                className: 'antenna-icon',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })}
              eventHandlers={{
                mouseover: () => setHoveredAntenna(antenna),
                mouseout: () => setHoveredAntenna(null)
              }}
            >
              <Popup>
                <div>
                  <h3>{antenna.name}</h3>
                  <p><strong>Country:</strong> {antenna.country}</p>
                  <p><strong>Type:</strong> {antenna.antennaType}</p>
                  <p><strong>Frequency:</strong> {antenna.frequency}</p>
                  <p><strong>Range:</strong> {(antenna.range / 1000).toFixed(0)} km</p>
                </div>
              </Popup>
            </Marker>
            
            <Circle
              center={antenna.position}
              radius={antenna.range}
              pathOptions={{
                color: antenna.color,
                fillColor: antenna.color,
                fillOpacity: hoveredAntenna === antenna ? 0.2 : 0.1,
                weight: hoveredAntenna === antenna ? 2 : 1
              }}
            />
            
            <Circle
              center={antenna.position}
              radius={antenna.range * 0.5}
              pathOptions={{
                color: antenna.color,
                fillOpacity: 0,
                dashArray: '5, 10',
                weight: 1
              }}
            />
          </React.Fragment>
        ))}

        {/* Render the updated orbit paths */}
        {orbitPaths.map((sat) =>
          splitPathOnDateline(sat.path).map((segment, segIndex) => (
            <Polyline
              key={`${sat.id}-${segIndex}`}
              positions={segment}
              pathOptions={{
                color: sat.color,
                weight: 3,
                opacity: 0.8,
                className: 'satellite-path-glow'
              }}
            />
          ))
        )}

        {/* Update satellite markers with enhanced tooltips */}
        {satellitePositions.map((sat, index) => (
          <Marker
            key={index}
            position={sat.position}
            icon={satelliteIcon}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <div className="satellite-tooltip">
                <strong>{sat.id}</strong> ({sat.progress}%)
                {sat.connectedAntennas.length > 0 && (
                  <span>
                    {' '}- Connected to{' '}
                    {sat.connectedAntennas.map(ant => ant.name).join(', ')}
                  </span>
                )}
              </div>
            </Tooltip>
            <Popup>
              <div className="satellite-popup">
                <h3>{sat.name}</h3>
                <p><strong>Orbit Type:</strong> {sat.orbitType}</p>
                <p><strong>Altitude:</strong> {sat.altitude}</p>
                <p><strong>Speed:</strong> {sat.speed.toFixed(2)} km/s</p>
                <p><strong>Orbit Progress:</strong> {sat.progress}%</p>
                <p><strong>Period:</strong> {sat.period.toFixed(1)} minutes</p>
                <p><strong>Connected Antennas:</strong></p>
                {sat.connectedAntennas.length > 0 ? (
                  <ul>
                    {sat.connectedAntennas.map((antenna, i) => (
                      <li key={i}>
                        {antenna.name} ({antenna.country})
                        <br/>
                        <small>
                          {antenna.frequency} - {antenna.antennaType}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No antenna connection</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
          
          {/* Add playback controls */}
          <div className="playback-controls">
            <button onClick={handlePlayPause}>
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button onClick={handleDirection}>
              {direction > 0 ? '⏩' : '⏪'}
            </button>
            <select 
              value={playbackSpeed} 
              onChange={(e) => handleSpeed(Number(e.target.value))}
            >
              <option value={0.1}>0.1x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
            <div className="speed-input">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={customSpeed}
                onChange={handleCustomSpeed}
                placeholder="Custom speed"
              />
              <span>x</span>
            </div>
          </div>
    </>
  );
};

export default SatelliteMapView;
