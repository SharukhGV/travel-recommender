

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import FavoritesPage from './FavoritesPage';
import './App.css';

const App = () => {
  // State Management
  const [parks, setParks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [selectedParks, setSelectedParks] = useState([]);
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedParkForDirections, setSelectedParkForDirections] = useState(null);
  const [zoom, setZoom] = useState(4);

  const center = { lat: 39.8283, lng: -98.5795 }; // Center of USA

  // Fetch all parks on component mount
  useEffect(() => {
    fetchParks();
  }, []);

  const fetchParks = async () => {
    try {
      const response = await fetch(
        `https://developer.nps.gov/api/v1/parks?limit=500&api_key=${import.meta.env.VITE_NPS_API_KEY}`
      );
      const data = await response.json();
      setParks(data.data);
    } catch (err) {
      setError('Failed to fetch parks. Please try again later.');
    }
  };

  // Geocode address using LocationIQ API
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://us1.locationiq.com/v1/search.php?key=${import.meta.env.VITE_LOCATIONIQ_API_KEY}&q=${encodeURIComponent(address)}&format=json`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      if (data.length === 0) throw new Error('No results found');

      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    } catch (error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  };

  const searchParks = async () => {
    setLoading(true);
    setError(null);

    try {
      const searchTerms = searchQuery.toLowerCase().split(' ');

      const matchedParks = parks.filter(park => {
        const parkDescription = park.description.toLowerCase();
        const parkName = park.fullName.toLowerCase();

        return searchTerms.some(term =>
          parkDescription.includes(term) ||
          parkName.includes(term)
        );
      });

      if (matchedParks.length === 0) {
        setError('No parks found matching your criteria. Try different search terms.');
        setParks(parks);
      } else {
        setParks(matchedParks);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(`Search failed: ${err.message}`);
      setParks(parks);
    } finally {
      setLoading(false);
    }
  };

  const toggleParkSelection = async (park) => {
    let newSelectedParks;
    if (selectedParks.find(p => p.id === park.id)) {
      newSelectedParks = selectedParks.filter(p => p.id !== park.id);
      if (selectedParkForDirections?.id === park.id) {
        setSelectedParkForDirections(null);
        setDirections([]);
      }
    } else {
      newSelectedParks = [...selectedParks, park];
    }
    setSelectedParks(newSelectedParks);

    setSelectedParkForDirections(park);

    if (homeAddress && newSelectedParks.includes(park)) {
      try {
        await getDirectionsForPark(park);
      } catch (err) {
        setError('Failed to update directions. Please check your address.');
      }
    }
  };

  const getDirectionsForPark = async (park) => {
    if (!homeAddress) return;

    try {
      const origin = await geocodeAddress(homeAddress);
      const directionsService = new window.google.maps.DirectionsService();

      const directionsResult = await new Promise((resolve, reject) => {
        directionsService.route({
          origin: origin,
          destination: {
            lat: parseFloat(park.latitude),
            lng: parseFloat(park.longitude)
          },
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: 'bestguess'
          },
          provideRouteAlternatives: true
        }, (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            resolve(result);
          } else if (status === 'ZERO_RESULTS') {
            console.warn(`No driving route to ${park.fullName}`);
            resolve(null);
          } else {
            reject(new Error(`Directions failed for ${park.fullName}`));
          }
        });
      });

      setDirections([{ parkId: park.id, directions: directionsResult }]);
      setError(null);

    } catch (err) {
      setError('Failed to get directions. Please check your address and try again.');
      console.error('Directions error:', err);
    }
  };

  const getRouteColor = (parkId) => {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFA500', '#800080'];
    const index = selectedParks.findIndex(park => park.id === parkId);
    return colors[index % colors.length];
  };

  // Add a park to favorites
  const addToFavorites = (park) => {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    if (!favorites.find(fav => fav.id === park.id)) {
      favorites.push(park);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      alert(`${park.fullName} added to favorites!`);
    } else {
      alert(`${park.fullName} is already in favorites!`);
    }
  };

  // const searchBeaches = async () => {
  //   try {
  //     const response = await fetch(
  //       `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${center.lat},${center.lng}&radius=50000&type=natural_feature&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
  //     );
  //     const data = await response.json();
  //     setBeaches(data.results);
  //   } catch (err) {
  //     setError('Failed to fetch beaches. Please try again later.');
  //   }
  // };

  // Function to remove a park and its directions
  const removePark = (parkId) => {
    // Remove the park from selectedParks
    const updatedSelectedParks = selectedParks.filter(park => park.id !== parkId);
    setSelectedParks(updatedSelectedParks);

    // Remove the directions for the park
    const updatedDirections = directions.filter(direction => direction.parkId !== parkId);
    setDirections(updatedDirections);

    // If the removed park was the one being shown for directions, clear it
    if (selectedParkForDirections?.id === parkId) {
      setSelectedParkForDirections(null);
    }

        setZoom(4);

  };

  return (
    <Router>
      <div className="app-container">
        <nav>
          <Link to="/">Home</Link>
          <Link to="/favorites">Favorites</Link>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <div className="card">
                <header className="card-header">
                  <h1>Nature Walk Explorer</h1>
                  <p>Discover your perfect national park adventure</p>
                </header>

                <div className="card-content">
                  <div className="search-container">
                    <div className="input-group">
                      <input
                        type="text"
                        value={homeAddress}
                        onChange={(e) => setHomeAddress(e.target.value)}
                        placeholder="🏠 Your starting address"
                        className="input"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="🔍 Describe your ideal parks (e.g., starry skies, hiking)"
                        className="input"
                      />
                    </div>
                    <button
                      onClick={searchParks}
                      disabled={loading}
                      className={`search-button ${loading ? 'loading' : ''}`}
                    >
                      {loading ? (
                        <span className="loading-text">
                          <span className="spinner"></span>
                          Finding your perfect parks...
                        </span>
                      ) : 'Search Parks'}
                    </button>
                  </div>

                  {error && (
                    <div className="error-message">
                      {error}
                    </div>
                  )}

                  <div className="map-container">
                    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} libraries={['places']}>
                      <GoogleMap
                        mapContainerClassName="map"
                        center={center}
                        zoom={zoom}
                      >
                        {parks.map(park => (
                          <Marker
                            key={park.id}
                            position={{
                              lat: parseFloat(park.latitude),
                              lng: parseFloat(park.longitude)
                            }}
                            onClick={() => toggleParkSelection(park)}
                            icon={{
                              path: window.google.maps.SymbolPath.CIRCLE,
                              scale: 8,
                              fillColor: selectedParks.find(p => p.id === park.id) ? '#FF0000' : '#000000',
                              fillOpacity: 0.8,
                              strokeWeight: 2,
                              strokeColor: '#FFFFFF'
                            }}
                          />
                        ))}
                        {directions.map(({ parkId, directions }) => (
                          directions && (
                            <DirectionsRenderer
                              key={parkId}
                              directions={directions}
                              options={{
                                polylineOptions: {
                                  strokeColor: getRouteColor(parkId),
                                  strokeWeight: 4,
                                  strokeOpacity: 0.8
                                },
                                suppressMarkers: true
                              }}
                            />
                          )
                        ))}
                        
                      </GoogleMap>
                    </LoadScript>
                  </div>

                  {selectedParkForDirections && (
                    <div className="selected-park-directions">
                      <h2>Directions to {selectedParkForDirections.fullName}</h2>
                      {directions.find(d => d.parkId === selectedParkForDirections.id)?.directions?.routes[0] && (
                        <div className="trip-details">
                          <h4>Trip Details:</h4>
                          <p>
                            Distance: {directions.find(d => d.parkId === selectedParkForDirections.id).directions.routes[0].legs[0].distance.text}<br />
                            Duration: {directions.find(d => d.parkId === selectedParkForDirections.id).directions.routes[0].legs[0].duration.text}
                          </p>
                        </div>
                      )}
                      <button style={{maxWidth:"200px"}} className='search-button' onClick={() => addToFavorites(selectedParkForDirections)}>
                        Add to Favorites
                      </button>
                    </div>
                  )}

                       {selectedParks.length > 0 && (
                    <div className="selected-parks">
                      <h2 style={{ color: "green" }}>Selected Parks</h2>
                      {selectedParks.map(park => (
                        <div key={park.id} className="park-details">
                          <div className="park-header">
                            <h3>{park.fullName}</h3>
                            <div
                              className="route-color-indicator"
                              style={{ backgroundColor: getRouteColor(park.id) }}
                              onClick={() => removePark(park.id)} // Add onClick handler
                            ></div>
                          </div>
                          <p>{park.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            }
          />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;