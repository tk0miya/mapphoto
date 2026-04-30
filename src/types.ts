export type PointFeature = {
  type: "Point";
  coordinates: [number, number];
};

export type LineFeature = {
  type: "LineString";
  coordinates: [number, number][];
};

export type Feature = PointFeature | LineFeature;

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type Theme = "dark" | "light";
