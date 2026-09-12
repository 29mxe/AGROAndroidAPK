import React, { useMemo } from "react";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { FeedPost } from "@/lib/types";
import { stripTagLines } from "@/lib/field-meta";

interface Props {
  posts: FeedPost[];
  onOpenPost: (id: string) => void;
}

// Android uses OpenStreetMap in a WebView so the map works without a
// Google Maps API key embedded in the native application manifest.
export function PostsMap({ posts, onOpenPost }: Props) {
  const geoPosts = useMemo(
    () =>
      posts
        .filter((post) => post.latitude != null && post.longitude != null)
        .map((post) => {
          const text = stripTagLines(post.text);
          return {
            id: post.id,
            lat: post.latitude as number,
            lng: post.longitude as number,
            name: post.author.name,
            text: text.length > 140 ? `${text.slice(0, 140)}…` : text,
          };
        }),
    [posts]
  );

  const html = useMemo(() => {
    const json = JSON.stringify(geoPosts).replace(/</g, "\\u003c");

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
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
  .popup-link { display: inline-block; margin-top: 8px; color: #2E4A34; font-weight: 600; font-size: 12px; font-family: sans-serif; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var posts = ${json};
  var map = L.map('map', { zoomControl: false }).setView([50.5, 40], 5);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
  }).addTo(map);
  var icon = L.divIcon({ className: '', html: '<div class="agro-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
  var bounds = [];
  posts.forEach(function (post) {
    var marker = L.marker([post.lat, post.lng], { icon: icon }).addTo(map);
    var popup = document.createElement('div');
    var name = document.createElement('div'); name.className = 'popup-name'; name.textContent = post.name;
    var text = document.createElement('div'); text.className = 'popup-text'; text.textContent = post.text;
    var link = document.createElement('a'); link.className = 'popup-link'; link.href = '#'; link.textContent = 'Открыть наблюдение →';
    link.onclick = function (event) {
      event.preventDefault();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'open-post', id: post.id }));
    };
    popup.appendChild(name); popup.appendChild(text); popup.appendChild(link);
    marker.bindPopup(popup);
    bounds.push([post.lat, post.lng]);
  });
  if (bounds.length > 0) { map.fitBounds(bounds, { padding: [70, 70], maxZoom: 10 }); }
</script>
</body>
</html>`;
  }, [geoPosts]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
      if (data.type === "open-post" && data.id) {
        onOpenPost(data.id);
      }
    } catch {
      // Ignore messages that do not follow the map event contract.
    }
  };

  return (
    <WebView
      testID="posts-map"
      source={{ html }}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleMessage}
      style={{ flex: 1, backgroundColor: "#F4EFE3" }}
    />
  );
}
