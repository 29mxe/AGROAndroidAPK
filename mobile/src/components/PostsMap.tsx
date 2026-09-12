import React, { useEffect, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";
import { Wheat } from "lucide-react-native";
import { colors } from "@/lib/theme";
import type { FeedPost } from "@/lib/types";
import { stripTagLines } from "@/lib/field-meta";

interface Props {
  posts: FeedPost[];
  onOpenPost: (id: string) => void;
}

type GeoPost = FeedPost & { latitude: number; longitude: number };

// Центр Черноземья — стартовый вид, пока нет маркеров
const DEFAULT_REGION = {
  latitude: 50.5,
  longitude: 40.0,
  latitudeDelta: 14,
  longitudeDelta: 14,
};

export function PostsMap({ posts, onOpenPost }: Props) {
  const mapRef = useRef<MapView>(null);
  const fittedRef = useRef(false);

  const geoPosts = useMemo(
    () => posts.filter((p): p is GeoPost => p.latitude != null && p.longitude != null),
    [posts]
  );

  useEffect(() => {
    if (fittedRef.current || geoPosts.length === 0) return;
    fittedRef.current = true;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        geoPosts.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        { edgePadding: { top: 120, right: 60, bottom: 140, left: 60 }, animated: true }
      );
    }, 600);
    return () => clearTimeout(timer);
  }, [geoPosts]);

  return (
    <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={DEFAULT_REGION} testID="posts-map">
      {geoPosts.map((post) => (
        <Marker
          key={post.id}
          coordinate={{ latitude: post.latitude, longitude: post.longitude }}
          tracksViewChanges={false}
        >
          {/* Custom earthy pin */}
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.forest,
                borderWidth: 2.5,
                borderColor: colors.parchment,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: colors.bark,
                shadowOpacity: 0.3,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}
            >
              <Wheat size={18} color={colors.parchment} />
            </View>
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 6,
                borderRightWidth: 6,
                borderTopWidth: 8,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderTopColor: colors.forest,
                marginTop: -1,
              }}
            />
          </View>

          <Callout onPress={() => onOpenPost(post.id)} tooltip={false}>
            <View style={{ width: 220, padding: 4, gap: 4 }}>
              <Text style={{ fontFamily: "GolosText_600SemiBold", fontSize: 13, color: colors.bark }}>
                {post.author.name}
              </Text>
              <Text
                numberOfLines={3}
                style={{ fontFamily: "GolosText_400Regular", fontSize: 12, color: colors.bark }}
              >
                {stripTagLines(post.text)}
              </Text>
              <Text style={{ fontFamily: "GolosText_600SemiBold", fontSize: 12, color: colors.moss }}>
                Открыть пост →
              </Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}
