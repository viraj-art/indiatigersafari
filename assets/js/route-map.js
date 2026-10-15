/*
 * Itinerary map: all of India with the route drawn on it and each stop's nights labelled on the map.
 * Any number per page, at any frame size; nothing is written beside or beneath the map.
 *
 * Markup: <figure data-route-map data-route="ID" data-geo="/assets/data/"> holding a .route-map__map div,
 * where ID names a <script type="application/json" id="ID"> with:
 *   stops     numbered stops (id, n, name, short, nights, lat, lng, callout [dx, dy], highlight)
 *             "callout" is the direction the label sits from its stop, e.g. [-1, -1] up and to the left
 *   waypoints small dots along a drive (id, name, lat, lng)
 *   legs      lines in travel order (path of ids; "return": true draws the way home dashed)
 *   seas      sea names (name, lat, lng)
 *
 * The stops sit close together at country scale, so each label stands a little way off its stop on a thin
 * leader line; the distance grows with the frame. Text sizes follow the frame through container queries.
 * India is drawn from the site's own boundary files (assets/data, DataMeet, CC BY 4.0). Needs Leaflet.
 */
(function () {
    'use strict';
    if (!window.L) return;

    var INDIA = L.latLngBounds([6.4, 68.0], [37.1, 97.5]);   // all of India, Kashmir to the Andamans
    var geoCache = {};

    function geo(base, name) {
        var url = base + name;
        if (!geoCache[url]) {
            geoCache[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(name); return r.json(); });
        }
        return geoCache[url];
    }

    function nightsText(n) { return n + (n === 1 ? ' night' : ' nights'); }

    function draw(frame) {
        var el = frame.querySelector('.route-map__map');
        var dataEl = document.getElementById(frame.getAttribute('data-route') || 'route-data');
        if (!el || !dataEl) return;
        var route = JSON.parse(dataEl.textContent);
        var base = frame.getAttribute('data-geo') || '/assets/data/';

        var at = {};
        route.stops.concat(route.waypoints || []).forEach(function (p) { at[p.id] = L.latLng(p.lat, p.lng); });

        var map = L.map(el, {
            zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
            doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, zoomSnap: 0
        });
        map.createPane('land').style.zIndex = 300;
        map.createPane('leaders').style.zIndex = 420;

        Promise.all([geo(base, 'india-states.geojson'), geo(base, 'india-outline.geojson')]).then(function (g) {
            L.geoJSON(g[0], { pane: 'land', interactive: false, style: { color: '#CFCCC6', weight: 0.8, fillColor: '#F4F4F2', fillOpacity: 1 } }).addTo(map);
            L.geoJSON(g[1], { pane: 'land', interactive: false, style: { color: '#BDB9B2', weight: 1.1, fill: false } }).addTo(map);
        }).catch(function () { el.classList.add('route-map__map--no-geo'); });

        (route.seas || []).forEach(function (s) {
            L.marker([s.lat, s.lng], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'route-sea', html: s.name, iconSize: [140, 18], iconAnchor: [70, 9] }) }).addTo(map);
        });

        // Solid blue on the way out, dashed grey for the way home.
        route.legs.forEach(function (leg) {
            var pts = leg.path.map(function (id) { return at[id]; });
            L.polyline(pts, leg['return']
                ? { color: '#A9A6A0', weight: 1.3, dashArray: '3 3', interactive: false }
                : { color: '#4D6FD1', weight: 2, interactive: false }).addTo(map);
        });
        (route.waypoints || []).forEach(function (w) {
            L.circleMarker(at[w.id], { radius: 1.8, color: '#4D6FD1', weight: 1, fillColor: '#FFFFFF', fillOpacity: 1, interactive: false }).addTo(map);
        });
        route.stops.forEach(function (s) {
            L.circleMarker(at[s.id], { radius: 3.5, color: s.highlight ? '#4D6FD1' : '#1E1E1E', weight: 1.5, fillColor: s.highlight ? '#DCE4FA' : '#FFFFFF', fillOpacity: 1, interactive: false }).addTo(map);
        });

        // Labels: number, place and nights, set off from the stop on a leader line.
        var callouts = route.stops.map(function (s) {
            var d = s.callout || [1, 0];
            var side = Math.abs(d[0]) >= Math.abs(d[1]) ? (d[0] < 0 ? 'left' : 'right') : (d[1] < 0 ? 'top' : 'bottom');
            var html = '<span><b class="route-callout__n">' + s.n + '</b>'
                + '<span class="route-callout__name" data-short="' + (s.short || s.name) + '">' + s.name + '</span>'
                + '<span class="route-callout__nights">' + nightsText(s.nights) + '</span></span>';
            var label = L.marker(at[s.id], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'route-callout route-callout--' + side + (s.highlight ? ' route-callout--park' : ''), html: html, iconSize: [0, 0], iconAnchor: [0, 0] }) }).addTo(map);
            var leader = L.polyline([at[s.id], at[s.id]], { pane: 'leaders', color: s.highlight ? '#4D6FD1' : '#6B6862', weight: 1, interactive: false }).addTo(map);
            return { stop: s, dir: d, label: label, leader: leader };
        });

        function placeCallouts() {
            var w = frame.clientWidth;
            var dist = Math.max(24, Math.min(80, w * 0.075));
            var box = el.getBoundingClientRect();
            var margin = 4;
            callouts.forEach(function (c) {
                var len = Math.sqrt(c.dir[0] * c.dir[0] + c.dir[1] * c.dir[1]) || 1;
                var p = map.latLngToContainerPoint(at[c.stop.id]);
                var x = p.x + c.dir[0] / len * dist, y = p.y + c.dir[1] / len * dist;
                c.label.setLatLng(map.containerPointToLatLng([x, y]));
                // Keep the whole tag inside the frame: slide it (and the end of its leader) back in if it spills over.
                var tag = c.label.getElement() && c.label.getElement().firstChild;
                if (tag) {
                    var r = tag.getBoundingClientRect();
                    var dx = 0, dy = 0;
                    if (r.left < box.left + margin) dx = box.left + margin - r.left;
                    else if (r.right > box.right - margin) dx = box.right - margin - r.right;
                    if (r.top < box.top + margin) dy = box.top + margin - r.top;
                    else if (r.bottom > box.bottom - margin) dy = box.bottom - margin - r.bottom;
                    if (dx || dy) { x += dx; y += dy; c.label.setLatLng(map.containerPointToLatLng([x, y])); }
                }
                c.leader.setLatLngs([at[c.stop.id], map.containerPointToLatLng([x, y])]);
            });
        }

        function fit() {
            map.invalidateSize();
            map.fitBounds(INDIA, { padding: [6, 6] });
            placeCallouts();
        }
        fit();

        // Refit whenever the frame changes size (window resized, column collapsed, tab shown).
        if (window.ResizeObserver) {
            var last = frame.clientWidth;
            new ResizeObserver(function () {
                if (frame.clientWidth !== last) { last = frame.clientWidth; fit(); }
            }).observe(frame);
        } else {
            window.addEventListener('resize', fit);
        }
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-route-map]'), draw);
})();
