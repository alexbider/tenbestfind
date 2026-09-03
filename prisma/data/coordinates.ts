// City centre coordinates, keyed by country code, region code and city slug.
//
// They are kept apart from the rest of the seed so a database that already has
// its cities can be filled in by the backfill script without touching anything
// else. Coordinates are what the service-area radius measures against: without
// them a business can only ever be shown as covering the city it sits in.
export const CITY_COORDINATES: Record<string, [number, number]> = {
  "us:ga:atlanta": [33.749, -84.388],
  "us:tx:austin": [30.2672, -97.7431],
  "us:ma:boston": [42.3601, -71.0589],
  "us:ny:buffalo": [42.8864, -78.8784],
  "us:nc:charlotte": [35.2271, -80.8431],
  "us:il:chicago": [41.8781, -87.6298],
  "us:oh:columbus": [39.9612, -82.9988],
  "us:tx:dallas": [32.7767, -96.797],
  "us:co:denver": [39.7392, -104.9903],
  "us:mi:detroit": [42.3314, -83.0458],
  "us:tx:houston": [29.7604, -95.3698],
  "us:ca:los-angeles": [34.0522, -118.2437],
  "us:fl:miami": [25.7617, -80.1918],
  "us:mn:minneapolis": [44.9778, -93.265],
  "us:ny:new-york": [40.7128, -74.006],
  "us:nj:newark": [40.7357, -74.1724],
  "us:fl:orlando": [28.5383, -81.3792],
  "us:pa:philadelphia": [39.9526, -75.1652],
  "us:az:phoenix": [33.4484, -112.074],
  "us:tx:san-antonio": [29.4241, -98.4936],
  "us:ca:san-diego": [32.7157, -117.1611],
  "us:wa:seattle": [47.6062, -122.3321],
  "us:fl:tampa": [27.9506, -82.4572],

  "ca:ab:calgary": [51.0447, -114.0719],
  "ca:pe:charlottetown": [46.2382, -63.1311],
  "ca:ab:edmonton": [53.5461, -113.4938],
  "ca:ns:halifax": [44.6488, -63.5752],
  "ca:on:hamilton": [43.2557, -79.8711],
  "ca:nu:iqaluit": [63.7467, -68.517],
  "ca:on:mississauga": [43.589, -79.6441],
  "ca:nb:moncton": [46.0878, -64.7782],
  "ca:qc:montreal": [45.5019, -73.5674],
  "ca:on:ottawa": [45.4215, -75.6972],
  "ca:sk:saskatoon": [52.1332, -106.67],
  "ca:nl:st-johns": [47.5615, -52.7126],
  "ca:on:toronto": [43.6532, -79.3832],
  "ca:bc:vancouver": [49.2827, -123.1207],
  "ca:bc:victoria": [48.4284, -123.3656],
  "ca:yt:whitehorse": [60.7212, -135.0568],
  "ca:mb:winnipeg": [49.8951, -97.1384],
  "ca:nt:yellowknife": [62.454, -114.3718],
};

export function coordinateKey(countryCode: string, regionCode: string, citySlug: string): string {
  return `${countryCode.toLowerCase()}:${regionCode.toLowerCase()}:${citySlug.toLowerCase()}`;
}
