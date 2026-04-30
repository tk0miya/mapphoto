export type PointFeature = {
  type: "Point";
  coordinates: [number, number];
};

export type LineFeature = {
  type: "LineString";
  coordinates: [number, number][];
};

export type Feature = PointFeature | LineFeature;

export type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type DateFormat = "date" | "datetime" | "hidden";

export interface Metadata {
  title: string;
  subtitle: string;
  date: string;
  dateFormat: DateFormat;
  textPosition: Position;
  showMap: boolean;
  mapPosition: Position;
}

export const defaultMetadata: Metadata = {
  title: "",
  subtitle: "",
  date: "",
  dateFormat: "datetime",
  textPosition: "top-left",
  showMap: true,
  mapPosition: "bottom-right",
};
