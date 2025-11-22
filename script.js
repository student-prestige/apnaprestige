const API_ENDPOINT = 'https://whatsific.shrimayanand.com/api/method/whatsific.api.cafes';

    const findCafesBtn = document.getElementById('find-cafes-btn');
    const locationDisplay = document.getElementById('location-display');
    const loadingDiv = document.getElementById('loading');
    const cafeListDiv = document.getElementById('cafe-list');
    const savedCafesDiv = document.getElementById('saved-cafes');

    const radiusValueEl = document.getElementById('radius-value');
    const radiusIncBtn = document.getElementById('radius-inc');
    const radiusDecBtn = document.getElementById('radius-dec');

    let userLocation = null;
    let radiusKm = 2; // default 2 km

    // Saved cache in localStorage
    let placesCache = [];
    try { placesCache = JSON.parse(localStorage.getItem('savedCafes')) || []; } catch(e) { placesCache = []; }

    function saveCache() {
      localStorage.setItem('savedCafes', JSON.stringify(placesCache));
    }

    function showLoading() {
      loadingDiv.style.display = 'block';
      findCafesBtn.disabled = true;
    }

    function hideLoading() {
      loadingDiv.style.display = 'none';
      findCafesBtn.disabled = false;
    }

    function getStarRating(rating) {
      if (!rating) return 'No reviews';
      const fullStars = Math.floor(rating);
      const halfStar = rating % 1 >= 0.5;
      let stars = '';
      for (let i = 0; i < fullStars; i++) stars += '★';
      if (halfStar) stars += '½';
      return `${stars} (${rating})`;
    }

    function getDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return (R * c) / 1000; // km
    }

    function displayCafes(places) {
      cafeListDiv.innerHTML = '';
      if (!places || places.length === 0) {
        cafeListDiv.innerHTML = '<p>No cafes found within this radius.</p>';
        return;
      }

      places.forEach(place => {
        const isHearted = placesCache.some(p => p.place_id === place.place_id);
        const distance = userLocation ? getDistance(
          userLocation.lat,
          userLocation.lng,
          place.geometry.location.lat,
          place.geometry.location.lng
        ).toFixed(2) : '—';

        const photoReference = place.photos && place.photos[0] ? place.photos[0].photo_reference : null;
        const photoUrl = 
          'https://cdn0.iconfinder.com/data/icons/food-delivery-196/64/coffee_shop_coffee_location_restaurant_placeholder-512.png';

        const cafeItem = document.createElement('div');
        cafeItem.className = 'cafe-item';
        cafeItem.innerHTML = `
          <img src="${photoUrl}" alt="Photo of ${place.name}">
          <div class="cafe-item-content">
            <h3>${place.name}</h3>
            <p class="distance">${distance} km away</p>
            <p>${place.vicinity || ''}</p>
            <p class="star-rating">${getStarRating(place.rating)}</p>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}" target="_blank" class="google-maps-link">View on Google Maps</a>
            <button
              class="heart-btn ${isHearted ? 'hearted' : ''}"
              data-place-id="${place.place_id}"
              data-name="${encodeURIComponent(place.name)}"
              data-vicinity="${encodeURIComponent(place.vicinity || '')}"
              data-lat="${place.geometry.location.lat}"
              data-lng="${place.geometry.location.lng}"
            >${isHearted ? '❤️' : '♡'}</button>
          </div>
        `;
        cafeListDiv.appendChild(cafeItem);
      });
    }

    function renderSaved() {
      savedCafesDiv.innerHTML = '';
      if (!placesCache.length) {
        savedCafesDiv.innerHTML = '<p>You have no saved cafes yet. Tap ♡ to save.</p>';
        return;
      }
      placesCache.forEach(p => {
        const card = document.createElement('div');
        card.className = 'saved-card';
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.place_id}`;
        card.innerHTML = `
          <h4>${p.name}</h4>
          <div class="saved-meta">${p.vicinity || ''}</div>
          <div class="saved-actions">
            <a class="btn-link" href="${mapsUrl}" target="_blank">Open in Maps</a>
 <button class="btn-ghost" data-remove-id="${p.place_id}">Remove</button>
          </div>
        `;
        savedCafesDiv.appendChild(card);
      });
    }

    async function fetchCafes(lat, lng) {
      showLoading();
      const radiusMeters = Math.max(1, radiusKm) * 1000; // ensure >= 1km
      const apiUrl = `${API_ENDPOINT}?lat=${lat}&lng=${lng}&radius=${radiusMeters}`;
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.message && data.message.status === 'OK') {
          displayCafes(data.message.results);
        } else if (data.message) {
          cafeListDiv.innerHTML = `<p>API Status: ${data.message.status}. No results found.</p>`;
        } else {
          cafeListDiv.innerHTML = `<p>An error occurred. Check the console for details.</p>`;
        }
      } catch (error) {
        console.error('Error fetching cafes:', error);
        cafeListDiv.innerHTML = `<p>An error occurred. Check the console for details.</p>`;
      } finally {
        hideLoading();
      }
    }

    function toggleHeart(event) {
      const btn = event.target.closest('.heart-btn');
      if (!btn) return;
      const placeId = btn.getAttribute('data-place-id');
      const name = decodeURIComponent(btn.getAttribute('data-name') || '');
      const vicinity = decodeURIComponent(btn.getAttribute('data-vicinity') || '');
      const lat = parseFloat(btn.getAttribute('data-lat'));
      const lng = parseFloat(btn.getAttribute('data-lng'));

      const index = placesCache.findIndex(p => p.place_id === placeId);
      if (index > -1) {
        placesCache.splice(index, 1);
        btn.textContent = '♡';
        btn.classList.remove('hearted');
      } else {
        placesCache.push({ place_id: placeId, name, vicinity, lat, lng });
        btn.textContent = '❤️';
        btn.classList.add('hearted');
      }
      saveCache();
      renderSaved();
    }

    function removeSaved(event) {
      const target = event.target.closest('[data-remove-id]');
      if (!target) return;
      const id = target.getAttribute('data-remove-id');
      const idx = placesCache.findIndex(p => p.place_id === id);
      if (idx > -1) {
        placesCache.splice(idx, 1);
        saveCache();
        renderSaved();
        // Also unheart on visible list if present
        const heartBtn = document.querySelector(`.heart-btn[data-place-id="${id}"]`);
        if (heartBtn) { heartBtn.textContent = '♡'; heartBtn.classList.remove('hearted'); }
      }
    }

    function getGeolocation() {
      if (navigator.geolocation) {
        showLoading();
        locationDisplay.textContent = 'Getting your location…';
        navigator.geolocation.getCurrentPosition(
          (position) => {
            userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            locationDisplay.textContent = `Your coordinates: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)} · Radius: ${radiusKm} km`;
            fetchCafes(userLocation.lat, userLocation.lng);
          },
          (error) => {
            hideLoading();
            locationDisplay.textContent = 'Geolocation failed. Please enable location services.';
            console.error('Error getting location:', error);
          }
        );
      } else {
        locationDisplay.textContent = 'Geolocation is not supported by this browser.';
        hideLoading();
      }
    }

    function updateRadiusDisplay() {
      radiusValueEl.textContent = radiusKm;
      if (userLocation) {
        // Refetch with new radius
        fetchCafes(userLocation.lat, userLocation.lng);
        locationDisplay.textContent = `Your coordinates: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)} · Radius: ${radiusKm} km`;
      }
    }

    // Event listeners
    findCafesBtn.addEventListener('click', getGeolocation);
    cafeListDiv.addEventListener('click', toggleHeart);
    savedCafesDiv.addEventListener('click', removeSaved);

    radiusIncBtn.addEventListener('click', () => { radiusKm = Math.min(25, radiusKm + 1); updateRadiusDisplay(); });
    radiusDecBtn.addEventListener('click', () => { radiusKm = Math.max(1, radiusKm - 1); updateRadiusDisplay(); });

    // Init
    document.addEventListener('DOMContentLoaded', () => {
      renderSaved();
      radiusValueEl.textContent = radiusKm;
      console.log('Saved cafes loaded from cache:', placesCache);
    });
