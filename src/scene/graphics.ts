export type Quality = 'low' | 'high';
export const GRAPHICS = {
  high: { dpr: [1.5, 2] as [number, number], shadow: 2048, roundedSegments: 3, cylinderSegments: 24 },
  low: { dpr: [1, 1] as [number, number], shadow: 512, roundedSegments: 1, cylinderSegments: 12 },
};
