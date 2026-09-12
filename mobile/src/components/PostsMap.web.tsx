import React, { useEffect, useMemo } from "react";
import type { FeedPost } from "@/lib/types";
import { stripTagLines } from "@/lib/field-meta";

interface Props {
  posts: FeedPost[];
  onOpenPost: (id: string) => void;
}

// Web fallback: Leaflet (OpenStreetMap) inside an iframe.
// Marker popups send postMessage back to open a post.
export function PostsMap({ posts, onOpenPost }: Props) {
  const geoPosts = useMemo(
    () =>
      posts
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({
          id: p.id,
          lat: p.latitude as number,
          lng: p.longitude as number,
          name: p.author.name,
          text: stripTagLines(p.text).length > 140 ? `${stripTagLines(p.text).slice(0, 140)}…` : stripTagLines(p.text),
          location: p.locationName ?? "",
        })),
    [posts]
  );

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; id?: string } | undefined;
      if (data?.type === "open-post" && data.id) {
        onOpenPost(data.id);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onOpenPost]);

  const srcDoc = useMemo(() => {
    const json = JSON.stringify(geoPosts).replace(/</g, "\\u003c");
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; background: #F4EFE3; }
  .agro-pin {
    width: 30px; height: 30px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: #2E4A34;
    border: 2.5px solid #FDFAF2;
    box-shadow: 0 2px 6px rgba(51,41,30,0.35);
  }
  .agro-pin::after {
    content: '';
    position: absolute; inset: 0; margin: auto;
    width: 10px; height: 10px; border-radius: 50%;
    background: #8FAE6B;
  }
  .leaflet-popup-content-wrapper { border-radius: 14px; background: #FDFAF2; }
  .popup-name { font-weight: 600; color: #33291E; margin-bottom: 2px; font-family: sans-serif; }
  .popup-text { color: #33291E; font-size: 12px; line-height: 1.4; font-family: sans-serif; }
  .popup-link { display: inline-block; margin-top: 6px; color: #2E4A34; font-weight: 600; font-size: 12px; font-family: sans-serif; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var posts = ${json};
  var map = L.map('map').setView([50.5, 40], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
  }).addTo(map);
  var icon = L.divIcon({ className: '', html: '<div class="agro-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
  var bounds = [];
  posts.forEach(function (p) {
    var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
    var div = document.createElement('div');
    var name = document.createElement('div'); name.className = 'popup-name'; name.textContent = p.name;
    var text = document.createElement('div'); text.className = 'popup-text'; text.textContent = p.text;
    var link = document.createElement('a'); link.className = 'popup-link'; link.href = '#'; link.textContent = 'Открыть наблюдение →';
    link.onclick = function (e) { e.preventDefault(); window.parent.postMessage({ type: 'open-post', id: p.id }, '*'); };
    div.appendChild(name); div.appendChild(text); div.appendChild(link);
    m.bindPopup(div);
    bounds.push([p.lat, p.lng]);
  });
  if (bounds.length > 0) { map.fitBounds(bounds, { padding: [70, 70], maxZoom: 10 }); }
</script>
</body>
</html>`;
  }, [geoPosts]);

  return (
    <iframe
      key={geoPosts.length}
      title="Карта постов"
      srcDoc={srcDoc}
      style={{ flex: 1, width: "100%", height: "100%", border: "none" }}
      data-testid="posts-map-web"
    />
  );
}
