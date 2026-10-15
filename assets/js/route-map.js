/*
 * Route map (trial page /map-sample). Reads the route from <script type="application/json" id="route-data">:
 * stops (id, name, lat, lng, type "stop" | "waypoint") and legs (from, to, path of stop ids, time, distance)
 * and an optional "states" list to tint. India itself is drawn from the site's own boundary files
 * (assets/data, DataMeet, CC BY 4.0), so no map-tile service is needed.
 * Opens on the whole of India, then moves in to the route. Needs Leaflet (assets/vendor/leaflet).
 */
(function () {
    'use strict';
    var el = document.getElementById('route-map');
    var dataEl = document.getElementById('route-data');
    if (!el || !dataEl || !window.L) return;

    var route = JSON.parse(dataEl.textContent);
    var base = el.getAttribute('data-geo') || '/assets/data/';
    var byId = {};
    route.stops.forEach(function (s) { byId[s.id] = s; });
    var tinted = route.states || [];
    var india = L.latLngBounds([6.5, 68.0], [37.2, 97.5]);
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var credit = 'India boundaries: <a href="https://github.com/datameet/maps">DataMeet</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)';

    var map = L.map(el, { scrollWheelZoom: false, zoomSnap: 0.25, minZoom: 3.5, maxZoom: 10, maxBounds: india.pad(0.35), attributionControl: true });
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution(credit);
    map.fitBounds(india);

    // Names only once the map is close enough for them not to pile up.
    function labels() { el.classList.toggle('route-map__map--far', map.getZoom() < 5.5); }
    map.on('zoomend', labels);
    labels();

    // Stacking: states under the outline, route lines and markers above.
    map.createPane('india').style.zIndex = 300;
    map.createPane('outline').style.zIndex = 350;

    function json(name) {
        return fetch(base + name).then(function (r) { if (!r.ok) throw new Error(name); return r.json(); });
    }

    var insetEl = document.getElementById('route-inset');
    var inset = null;
    if (insetEl) {
        inset = L.map(insetEl, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, zoomSnap: 0.1 });
        inset.fitBounds(india, { padding: [6, 18] });
    }

    Promise.all([json('india-states.geojson'), json('india-outline.geojson')]).then(function (geo) {
        var states = geo[0], outline = geo[1];
        L.geoJSON(states, {
            pane: 'india', interactive: false,
            style: function (f) {
                var on = tinted.indexOf(f.properties.name) !== -1;
                return { color: '#B9AE98', weight: 0.8, fillColor: on ? '#EFE5D2' : '#FAF8F5', fillOpacity: 1 };
            }
        }).addTo(map);
        L.geoJSON(outline, { pane: 'outline', interactive: false, style: { color: '#86683A', weight: 1.4, fill: false } }).addTo(map);

        // State names for the states the route crosses, placed at a fixed point inside each.
        (route.stateLabels || []).forEach(function (s) {
            L.marker([s.lat, s.lng], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'route-state', html: s.name, iconSize: [140, 16], iconAnchor: [70, 8] }) }).addTo(map);
        });

        if (inset) {
            L.geoJSON(outline, { interactive: false, style: { color: '#86683A', weight: 0.8, fillColor: '#FAF8F5', fillOpacity: 1 } }).addTo(inset);
            L.rectangle(routeBounds.pad(0.3), { color: '#1B3B2B', weight: 1.5, fillColor: '#C5A059', fillOpacity: 0.55, interactive: false }).addTo(inset);
        }
    }).catch(function () { el.classList.add('route-map__map--no-geo'); });

    // One line per leg, in travel order: a cream casing under a dashed green line.
    var all = [];
    route.legs.forEach(function (leg) {
        var pts = leg.path.map(function (id) { return [byId[id].lat, byId[id].lng]; });
        all = all.concat(pts);
        L.polyline(pts, { color: '#FAF8F5', weight: 7, opacity: 0.95, interactive: false }).addTo(map);
        L.polyline(pts, { color: '#1B3B2B', weight: 3.5, dashArray: '8 7', lineCap: 'round' })
            .bindTooltip(leg.from + ' to ' + leg.to + ': ' + leg.time + (leg.distance ? ' (' + leg.distance + ')' : ''), { sticky: true })
            .addTo(map);
    });
    var routeBounds = L.latLngBounds(all);

    // Stops numbered in travel order; the first stop (start and finish) is 1, in gold. Waypoints are small dots.
    var n = 1;
    route.stops.forEach(function (s, i) {
        var marker;
        if (s.type === 'waypoint') {
            marker = L.marker([s.lat, s.lng], {
                icon: L.divIcon({ className: '', html: '<span class="route-dot"></span>', iconSize: [12, 12], iconAnchor: [6, 6] }),
                title: s.name, alt: s.name
            });
            marker.bindTooltip(s.name, { permanent: true, direction: 'bottom', offset: [0, 6], className: 'route-map__label route-map__label--way' });
            if (s.note) marker.bindPopup('<strong>' + s.name + '</strong><br>' + s.note);
        } else {
            var home = i === 0;
            var num = home ? '1' : String(++n);
            marker = L.marker([s.lat, s.lng], {
                icon: L.divIcon({ className: '', html: '<span class="route-pin' + (home ? ' route-pin--home' : '') + '">' + num + '</span>', iconSize: [32, 32], iconAnchor: [16, 16] }),
                title: s.name, alt: s.name
            });
            var side = s.labelSide || 'right';
            var offsets = { right: [18, 0], left: [-18, 0], bottom: [0, 18], top: [0, -18] };
            marker.bindTooltip(s.name + (home ? ' (start and finish)' : ''), { permanent: true, direction: side, offset: offsets[side] || offsets.right, className: 'route-map__label' });
            marker.bindPopup('<strong>' + s.name + '</strong>' + (s.label ? '<br>' + s.label : ''));
        }
        marker.addTo(map);
    });

    // Open on the whole of India, then move in to the route; the button switches between the two.
    var toggle = document.querySelector('[data-map-toggle]');
    var onRoute = false;
    function go(bounds, opts) {
        if (reduce) map.fitBounds(bounds, opts);
        else map.flyToBounds(bounds, Object.assign({ duration: 2 }, opts));
    }
    // Leave room on the right for the India locator so no stop sits beneath it.
    function showRoute() {
        onRoute = true;
        if (toggle) toggle.textContent = 'Show all of India';
        var right = insetEl ? insetEl.offsetWidth + 40 : 70;
        go(routeBounds, { paddingTopLeft: [60, 60], paddingBottomRight: [right, 70] });
    }
    function showIndia() { onRoute = false; if (toggle) toggle.textContent = 'Back to the route'; go(india, {}); }
    if (toggle) toggle.addEventListener('click', function () { onRoute ? showIndia() : showRoute(); });
    setTimeout(showRoute, 1400);
})();
