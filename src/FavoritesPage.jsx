import React, { useState, useEffect } from 'react';
import "./App.css"

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
    setFavorites(storedFavorites);
  }, []);

  // Remove a park from favorites
  const removeFromFavorites = (parkId) => {
    const updatedFavorites = favorites.filter(park => park.id !== parkId);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
  };

  return (
    <div className="favorites-page">
      <h1>Favorites</h1>
      {favorites.length === 0 ? (
        <p>No favorites added yet.</p>
      ) : (
        <div className="favorites-list">
          {favorites.map(park => (
            <div key={park.id} className="favorite-park">
              <h2>{park.fullName}</h2>
              <p>{park.description}</p>
              <button onClick={() => removeFromFavorites(park.id)}>
                Remove Listing
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;