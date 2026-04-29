export type PointFeature = {
  type: 'Point'
  coordinates: [number, number]
}

export type LineFeature = {
  type: 'LineString'
  coordinates: [number, number][]
}

export type Feature = PointFeature | LineFeature
