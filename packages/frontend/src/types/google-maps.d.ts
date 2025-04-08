declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element, opts?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      getBounds(): LatLngBounds;
      panTo(latLng: LatLng | LatLngLiteral): void;
      fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latLng: LatLng | LatLngLiteral): void;
      setVisible(visible: boolean): void;
      addListener(eventName: string, handler: Function): MapsEventListener;
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map: Map, anchor?: Marker): void;
      close(): void;
      setContent(content: string | Element): void;
    }

    class LatLng {
      constructor(lat: number, lng: number, noWrap?: boolean);
      lat(): number;
      lng(): number;
      toString(): string;
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      contains(latLng: LatLng | LatLngLiteral): boolean;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
    }

    class DirectionsService {
      constructor();
      route(request: DirectionsRequest, callback: (result: DirectionsResult, status: DirectionsStatus) => void): void;
    }

    class DirectionsRenderer {
      constructor(opts?: DirectionsRendererOptions);
      setMap(map: Map | null): void;
      setDirections(directions: DirectionsResult): void;
      setRouteIndex(routeIndex: number): void;
    }

    class Geocoder {
      constructor();
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
    }

    class Circle {
      constructor(opts?: CircleOptions);
      setMap(map: Map | null): void;
      setCenter(center: LatLng | LatLngLiteral): void;
      setRadius(radius: number): void;
      getRadius(): number;
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      minZoom?: number;
      maxZoom?: number;
      mapTypeId?: string;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      mapTypeControl?: boolean;
      scaleControl?: boolean;
      streetViewControl?: boolean;
      rotateControl?: boolean;
      fullscreenControl?: boolean;
      styles?: any[];
    }

    interface MarkerOptions {
      position: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: string | Icon;
      label?: string | MarkerLabel;
      draggable?: boolean;
      visible?: boolean;
      animation?: Animation;
    }

    interface InfoWindowOptions {
      content?: string | Element;
      disableAutoPan?: boolean;
      maxWidth?: number;
      pixelOffset?: Size;
      position?: LatLng | LatLngLiteral;
      zIndex?: number;
    }

    interface DirectionsRequest {
      origin: string | LatLng | LatLngLiteral | Place;
      destination: string | LatLng | LatLngLiteral | Place;
      travelMode: TravelMode;
      transitOptions?: TransitOptions;
      drivingOptions?: DrivingOptions;
      unitSystem?: UnitSystem;
      waypoints?: DirectionsWaypoint[];
      optimizeWaypoints?: boolean;
      provideRouteAlternatives?: boolean;
      avoidFerries?: boolean;
      avoidHighways?: boolean;
      avoidTolls?: boolean;
      region?: string;
    }

    interface DirectionsWaypoint {
      location: string | LatLng | LatLngLiteral | Place;
      stopover?: boolean;
    }

    interface DirectionsResult {
      routes: DirectionsRoute[];
    }

    interface DirectionsRoute {
      legs: DirectionsLeg[];
      overview_path: LatLng[];
      overview_polyline: string;
      bounds: LatLngBounds;
      copyrights: string;
      fare: TransitFare;
      warnings: string[];
      waypoint_order: number[];
    }

    interface DirectionsLeg {
      start_location: LatLng;
      end_location: LatLng;
      start_address: string;
      end_address: string;
      distance: Distance;
      duration: Duration;
      steps: DirectionsStep[];
    }

    interface DirectionsStep {
      distance: Distance;
      duration: Duration;
      end_location: LatLng;
      instructions: string;
      path: LatLng[];
      start_location: LatLng;
      travel_mode: TravelMode;
      transit: TransitDetails;
    }

    interface GeocoderRequest {
      address?: string;
      location?: LatLng | LatLngLiteral;
      bounds?: LatLngBounds | LatLngBoundsLiteral;
      componentRestrictions?: GeocoderComponentRestrictions;
      region?: string;
    }

    interface GeocoderComponentRestrictions {
      country: string | string[];
    }

    interface GeocoderResult {
      address_components: GeocoderAddressComponent[];
      formatted_address: string;
      geometry: GeocoderGeometry;
      partial_match: boolean;
      place_id: string;
      types: string[];
    }

    interface GeocoderAddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    interface GeocoderGeometry {
      location: LatLng;
      location_type: GeocoderLocationType;
      viewport: LatLngBounds;
      bounds?: LatLngBounds;
    }

    interface CircleOptions {
      center?: LatLng | LatLngLiteral;
      radius?: number;
      map?: Map;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
      visible?: boolean;
      zIndex?: number;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface LatLngBoundsLiteral {
      east: number;
      north: number;
      south: number;
      west: number;
    }

    interface Size {
      width: number;
      height: number;
    }

    interface Icon {
      url: string;
      scaledSize?: Size;
      size?: Size;
      origin?: Point;
      anchor?: Point;
    }

    interface MarkerLabel {
      text: string;
      color?: string;
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
    }

    interface Point {
      x: number;
      y: number;
    }

    interface DirectionsRendererOptions {
      map?: Map;
      directions?: DirectionsResult;
      panel?: Element;
      routeIndex?: number;
      suppressMarkers?: boolean;
      suppressPolylines?: boolean;
      polylineOptions?: PolylineOptions;
    }

    interface PolylineOptions {
      path?: LatLng[] | LatLngLiteral[];
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    interface Distance {
      text: string;
      value: number;
    }

    interface Duration {
      text: string;
      value: number;
    }

    interface TransitDetails {
      arrival_stop: TransitStop;
      arrival_time: Time;
      departure_stop: TransitStop;
      departure_time: Time;
      headsign: string;
      headway: number;
      line: TransitLine;
      num_stops: number;
    }

    interface TransitStop {
      location: LatLng;
      name: string;
    }

    interface TransitLine {
      agencies: TransitAgency[];
      color: string;
      icon: string;
      name: string;
      short_name: string;
      text_color: string;
      vehicle: TransitVehicle;
    }

    interface TransitAgency {
      name: string;
      phone: string;
      url: string;
    }

    interface TransitVehicle {
      icon: string;
      local_icon: string;
      name: string;
      type: VehicleType;
    }

    interface Time {
      text: string;
      time_zone: string;
      value: Date;
    }

    interface TransitFare {
      currency: string;
      value: number;
    }

    interface TransitOptions {
      arrivalTime?: Date;
      departureTime?: Date;
      modes?: TransitMode[];
      routingPreference?: TransitRoutePreference;
    }

    interface DrivingOptions {
      departureTime: Date;
      trafficModel?: TrafficModel;
    }

    interface MapsEventListener {
      remove(): void;
    }

    interface Place {}

    enum Animation {
      BOUNCE,
      DROP
    }

    enum DirectionsStatus {
      OK,
      NOT_FOUND,
      ZERO_RESULTS,
      MAX_WAYPOINTS_EXCEEDED,
      INVALID_REQUEST,
      OVER_QUERY_LIMIT,
      REQUEST_DENIED,
      UNKNOWN_ERROR
    }

    enum GeocoderStatus {
      OK,
      UNKNOWN_ERROR,
      OVER_QUERY_LIMIT,
      REQUEST_DENIED,
      INVALID_REQUEST,
      ZERO_RESULTS,
      ERROR
    }

    enum GeocoderLocationType {
      APPROXIMATE,
      GEOMETRIC_CENTER,
      RANGE_INTERPOLATED,
      ROOFTOP
    }

    enum TravelMode {
      BICYCLING,
      DRIVING,
      TRANSIT,
      WALKING
    }

    enum UnitSystem {
      IMPERIAL,
      METRIC
    }

    enum TransitMode {
      BUS,
      RAIL,
      SUBWAY,
      TRAIN,
      TRAM
    }

    enum TransitRoutePreference {
      FEWER_TRANSFERS,
      LESS_WALKING
    }

    enum TrafficModel {
      BEST_GUESS,
      OPTIMISTIC,
      PESSIMISTIC
    }

    enum VehicleType {
      BUS,
      CABLE_CAR,
      COMMUTER_TRAIN,
      FERRY,
      FUNICULAR,
      GONDOLA_LIFT,
      HEAVY_RAIL,
      HIGH_SPEED_TRAIN,
      INTERCITY_BUS,
      METRO_RAIL,
      MONORAIL,
      OTHER,
      RAIL,
      SHARE_TAXI,
      SUBWAY,
      TRAM,
      TROLLEYBUS
    }
  }
}

declare module '@react-google-maps/api' {
  import * as React from 'react';

  export interface LoadScriptProps {
    id: string;
    googleMapsApiKey: string;
    language?: string;
    region?: string;
    version?: string;
    libraries?: string[];
    loadingElement?: React.ReactNode;
    onLoad?: () => void;
    onError?: (error: Error) => void;
    onUnmount?: () => void;
    preventGoogleFontsLoading?: boolean;
  }

  export interface GoogleMapProps {
    id?: string;
    mapContainerStyle?: React.CSSProperties;
    mapContainerClassName?: string;
    options?: google.maps.MapOptions;
    center?: google.maps.LatLng | google.maps.LatLngLiteral;
    zoom?: number;
    onClick?: (e: google.maps.MapMouseEvent) => void;
    onDblClick?: (e: google.maps.MapMouseEvent) => void;
    onDrag?: (e: google.maps.MapMouseEvent) => void;
    onDragEnd?: (e: google.maps.MapMouseEvent) => void;
    onDragStart?: (e: google.maps.MapMouseEvent) => void;
    onBoundsChanged?: () => void;
    onCenterChanged?: () => void;
    onLoad?: (map: google.maps.Map) => void;
    onUnmount?: (map: google.maps.Map) => void;
  }

  export interface MarkerProps {
    position: google.maps.LatLng | google.maps.LatLngLiteral;
    options?: google.maps.MarkerOptions;
    onClick?: (e: google.maps.MapMouseEvent) => void;
    onDblClick?: (e: google.maps.MapMouseEvent) => void;
    onDrag?: (e: google.maps.MapMouseEvent) => void;
    onDragEnd?: (e: google.maps.MapMouseEvent) => void;
    onDragStart?: (e: google.maps.MapMouseEvent) => void;
    onLoad?: (marker: google.maps.Marker) => void;
    onUnmount?: (marker: google.maps.Marker) => void;
    icon?: string | google.maps.Icon;
    label?: string | google.maps.MarkerLabel;
    draggable?: boolean;
    visible?: boolean;
  }

  export interface InfoWindowProps {
    position: google.maps.LatLng | google.maps.LatLngLiteral;
    options?: google.maps.InfoWindowOptions;
    onCloseClick?: () => void;
    onLoad?: (infoWindow: google.maps.InfoWindow) => void;
    onUnmount?: (infoWindow: google.maps.InfoWindow) => void;
    zIndex?: number;
  }

  export interface CircleProps {
    center: google.maps.LatLng | google.maps.LatLngLiteral;
    radius: number;
    options?: google.maps.CircleOptions;
    onLoad?: (circle: google.maps.Circle) => void;
    onUnmount?: (circle: google.maps.Circle) => void;
    onClick?: (e: google.maps.MapMouseEvent) => void;
    onDblClick?: (e: google.maps.MapMouseEvent) => void;
    onDrag?: (e: google.maps.MapMouseEvent) => void;
    onDragEnd?: (e: google.maps.MapMouseEvent) => void;
    onDragStart?: (e: google.maps.MapMouseEvent) => void;
    onMouseDown?: (e: google.maps.MapMouseEvent) => void;
    onMouseMove?: (e: google.maps.MapMouseEvent) => void;
    onMouseOut?: (e: google.maps.MapMouseEvent) => void;
    onMouseOver?: (e: google.maps.MapMouseEvent) => void;
    onMouseUp?: (e: google.maps.MapMouseEvent) => void;
    onRightClick?: (e: google.maps.MapMouseEvent) => void;
  }

  export interface DirectionsRendererProps {
    options?: google.maps.DirectionsRendererOptions;
    directions?: google.maps.DirectionsResult;
    onLoad?: (directionsRenderer: google.maps.DirectionsRenderer) => void;
    onUnmount?: (directionsRenderer: google.maps.DirectionsRenderer) => void;
  }

  export interface MapMouseEvent {
    latLng: google.maps.LatLng;
  }

  export const LoadScript: React.FC<LoadScriptProps>;
  export const GoogleMap: React.FC<GoogleMapProps>;
  export const Marker: React.FC<MarkerProps>;
  export const InfoWindow: React.FC<InfoWindowProps>;
  export const Circle: React.FC<CircleProps>;
  export const DirectionsRenderer: React.FC<DirectionsRendererProps>;
}

interface DistanceMatrixResponse {
  originAddresses: string[];
  destinationAddresses: string[];
  rows: {
    elements: {
      distance: {
        text: string;
        value: number;
      };
      duration: {
        text: string;
        value: number;
      };
      status: string;
    }[];
  }[];
  status: string;
}

type DistanceUnit = 'km' | 'mi'; 