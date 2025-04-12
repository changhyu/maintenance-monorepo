/* eslint-disable @typescript-eslint/ban-types */
/**
 * 구글 맵스 API 타입 정의
 * 
 * 참고: 이 파일은 Google Maps JavaScript API v3의 일부 기능에 대한 타입 정의를 포함합니다.
 * 실제 프로젝트에서는 @types/google.maps 패키지를 설치하여 사용하는 것이 좋습니다.
 */

declare namespace google {
  namespace maps {
    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeId?: string | MapTypeId;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      styles?: any[];
      gestureHandling?: string;
    }

    // Function 타입을 대체하는 적절한 함수 시그니처 타입
    type MapEventListener = () => void;
    type MapsEventListener = Record<string, any> | void;

    class Map {
      constructor(mapDiv: Element | null, opts?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      setOptions(options: MapOptions): void;
      getBounds(): LatLngBounds;
      getCenter(): LatLng;
      getZoom(): number;
      panTo(latLng: LatLng | LatLngLiteral): void;
      panBy(x: number, y: number): void;
      fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
      controls: MVCArray<Node>[];
      data: Data;
    }

    enum MapTypeId {
      ROADMAP = 'roadmap',
      SATELLITE = 'satellite',
      HYBRID = 'hybrid',
      TERRAIN = 'terrain'
    }

    class LatLng {
      constructor(lat: number, lng: number, noWrap?: boolean);
      lat(): number;
      lng(): number;
      toJSON(): LatLngLiteral;
      toString(): string;
      equals(other: LatLng): boolean;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      contains(latLng: LatLng): boolean;
      equals(other: LatLngBounds | LatLngBoundsLiteral): boolean;
      extend(point: LatLng): LatLngBounds;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
      isEmpty(): boolean;
      toJSON(): LatLngBoundsLiteral;
      toString(): string;
      union(other: LatLngBounds | LatLngBoundsLiteral): LatLngBounds;
    }

    interface LatLngBoundsLiteral {
      east: number;
      north: number;
      south: number;
      west: number;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setPosition(latLng: LatLng | LatLngLiteral): void;
      getPosition(): LatLng;
      setTitle(title: string): void;
      getTitle(): string;
      setIcon(icon: string | Icon | Symbol): void;
      getIcon(): string | Icon | Symbol;
      setLabel(label: string | MarkerLabel): void;
      getLabel(): MarkerLabel;
      setDraggable(draggable: boolean): void;
      getDraggable(): boolean;
      setClickable(clickable: boolean): void;
      getClickable(): boolean;
      setVisible(visible: boolean): void;
      getVisible(): boolean;
      addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
    }

    interface MarkerOptions {
      position: LatLng | LatLngLiteral;
      map?: Map | null;
      title?: string;
      icon?: string | Icon | Symbol;
      label?: string | MarkerLabel;
      draggable?: boolean;
      clickable?: boolean;
      visible?: boolean;
      zIndex?: number;
      animation?: any;
    }

    interface MarkerLabel {
      text: string;
      color?: string;
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map: Map, anchor?: MVCObject): void;
      close(): void;
      getContent(): string | Element;
      getPosition(): LatLng;
      setContent(content: string | Node): void;
      setPosition(position: LatLng | LatLngLiteral): void;
      setZIndex(zIndex: number): void;
    }

    interface InfoWindowOptions {
      content?: string | Node;
      disableAutoPan?: boolean;
      maxWidth?: number;
      position?: LatLng | LatLngLiteral;
      zIndex?: number;
    }

    class OverlayView {
      setMap(map: Map | null): void;
      getMap(): Map | null;
      getPanes(): MapPanes;
      getProjection(): MapCanvasProjection;
      onAdd(): void;
      onRemove(): void;
      draw(): void;
    }

    interface MapPanes {
      floatPane: Element;
      mapPane: Element;
      markerLayer: Element;
      overlayLayer: Element;
      overlayMouseTarget: Element;
    }

    class Circle {
      constructor(opts?: CircleOptions);
      getBounds(): LatLngBounds;
      getCenter(): LatLng;
      getDraggable(): boolean;
      getEditable(): boolean;
      getMap(): Map;
      getRadius(): number;
      getVisible(): boolean;
      setCenter(center: LatLng | LatLngLiteral): void;
      setDraggable(draggable: boolean): void;
      setEditable(editable: boolean): void;
      setMap(map: Map | null): void;
      setOptions(options: CircleOptions): void;
      setRadius(radius: number): void;
      setVisible(visible: boolean): void;
    }

    interface CircleOptions {
      center?: LatLng | LatLngLiteral;
      clickable?: boolean;
      draggable?: boolean;
      editable?: boolean;
      fillColor?: string;
      fillOpacity?: number;
      map?: Map;
      radius?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokePosition?: string;
      strokeWeight?: number;
      visible?: boolean;
      zIndex?: number;
    }

    class DrawingManager {
      constructor(options?: DrawingManagerOptions);
      getDrawingMode(): string;
      getMap(): Map;
      setDrawingMode(drawingMode: string | null): void;
      setMap(map: Map | null): void;
      setOptions(options: DrawingManagerOptions): void;
    }

    interface DrawingManagerOptions {
      drawingControl?: boolean;
      drawingControlOptions?: DrawingControlOptions;
      drawingMode?: string | null;
      map?: Map;
      circleOptions?: CircleOptions;
      markerOptions?: MarkerOptions;
      polygonOptions?: PolygonOptions;
      polylineOptions?: PolylineOptions;
      rectangleOptions?: RectangleOptions;
    }

    interface DrawingControlOptions {
      drawingModes?: string[];
      position?: number;
    }
    
    class Polygon {
      constructor(opts?: PolygonOptions);
      getDraggable(): boolean;
      getEditable(): boolean;
      getMap(): Map;
      getPath(): MVCArray<LatLng>;
      getPaths(): MVCArray<MVCArray<LatLng>>;
      getVisible(): boolean;
      setDraggable(draggable: boolean): void;
      setEditable(editable: boolean): void;
      setMap(map: Map | null): void;
      setOptions(options: PolygonOptions): void;
      setPath(path: LatLng[] | LatLngLiteral[]): void;
      setPaths(paths: Array<LatLng[] | LatLngLiteral[]> | MVCArray<MVCArray<LatLng>>): void;
      setVisible(visible: boolean): void;
    }

    interface PolygonOptions {
      clickable?: boolean;
      draggable?: boolean;
      editable?: boolean;
      fillColor?: string;
      fillOpacity?: number;
      geodesic?: boolean;
      map?: Map;
      paths?: Array<LatLng | LatLngLiteral> | MVCArray<LatLng> | Array<Array<LatLng | LatLngLiteral>> | MVCArray<MVCArray<LatLng>>;
      strokeColor?: string;
      strokeOpacity?: number;
      strokePosition?: string;
      strokeWeight?: number;
      visible?: boolean;
      zIndex?: number;
    }

    class Polyline {
      constructor(opts?: PolylineOptions);
      getDraggable(): boolean;
      getEditable(): boolean;
      getMap(): Map;
      getPath(): MVCArray<LatLng>;
      getVisible(): boolean;
      setDraggable(draggable: boolean): void;
      setEditable(editable: boolean): void;
      setMap(map: Map | null): void;
      setOptions(options: PolylineOptions): void;
      setPath(path: LatLng[] | LatLngLiteral[]): void;
      setVisible(visible: boolean): void;
    }

    interface PolylineOptions {
      clickable?: boolean;
      draggable?: boolean;
      editable?: boolean;
      geodesic?: boolean;
      icons?: Array<IconSequence>;
      map?: Map;
      path?: Array<LatLng | LatLngLiteral> | MVCArray<LatLng>;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      visible?: boolean;
      zIndex?: number;
    }

    interface IconSequence {
      fixedRotation?: boolean;
      icon?: Symbol;
      offset?: string;
      repeat?: string;
    }

    class Rectangle {
      constructor(opts?: RectangleOptions);
      getBounds(): LatLngBounds;
      getDraggable(): boolean;
      getEditable(): boolean;
      getMap(): Map;
      getVisible(): boolean;
      setBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
      setDraggable(draggable: boolean): void;
      setEditable(editable: boolean): void;
      setMap(map: Map | null): void;
      setOptions(options: RectangleOptions): void;
      setVisible(visible: boolean): void;
    }

    interface RectangleOptions {
      bounds?: LatLngBounds | LatLngBoundsLiteral;
      clickable?: boolean;
      draggable?: boolean;
      editable?: boolean;
      fillColor?: string;
      fillOpacity?: number;
      map?: Map;
      strokeColor?: string;
      strokeOpacity?: number;
      strokePosition?: string;
      strokeWeight?: number;
      visible?: boolean;
      zIndex?: number;
    }

    class MVCArray<T> {
      constructor(array?: T[]);
      clear(): void;
      forEach(callback: (elem: T, i: number) => void): void;
      getArray(): T[];
      getAt(i: number): T;
      getLength(): number;
      insertAt(i: number, elem: T): void;
      pop(): T;
      push(elem: T): number;
      removeAt(i: number): T;
      setAt(i: number, elem: T): void;
    }

    class MVCObject {
      addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
      bindTo(key: string, target: MVCObject, targetKey?: string, noNotify?: boolean): void;
      get(key: string): any;
      notify(key: string): void;
      set(key: string, value: any): void;
      setValues(values: any): void;
      unbind(key: string): void;
      unbindAll(): void;
    }

    class event {
      static addListener(instance: object, eventName: string, handler: (...args: any[]) => void): MapsEventListener;
      static addDomListener(instance: Element, eventName: string, handler: (...args: any[]) => void, capture?: boolean): MapsEventListener;
      static clearInstanceListeners(instance: object): void;
      static clearListeners(instance: object, eventName: string): void;
      static removeListener(listener: MapsEventListener): void;
      static trigger(instance: any, eventName: string, ...args: any[]): void;
    }

    class Icon {
      anchor: Point;
      labelOrigin: Point;
      origin: Point;
      scaledSize: Size;
      size: Size;
      url: string;
    }

    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
      equals(other: Point): boolean;
      toString(): string;
    }

    class Size {
      constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
      height: number;
      width: number;
      equals(other: Size): boolean;
      toString(): string;
    }

    class Data {
      constructor(options?: Data.DataOptions);
      add(feature: Data.Feature | Data.FeatureOptions): Data.Feature;
      addGeoJson(geoJson: object, options?: Data.GeoJsonOptions): Data.Feature[];
      contains(feature: Data.Feature): boolean;
      forEach(callback: (feature: Data.Feature) => void): void;
      getControlPosition(): number;
      getControls(): string[];
      getDrawingMode(): string;
      getFeatureById(id: number | string): Data.Feature;
      getMap(): Map;
      getStyle(): Data.StylingFunction | Data.StyleOptions;
      loadGeoJson(url: string, options?: Data.GeoJsonOptions, callback?: (features: Data.Feature[]) => void): void;
      overrideStyle(feature: Data.Feature, style: Data.StyleOptions): void;
      remove(feature: Data.Feature): void;
      revertStyle(feature?: Data.Feature): void;
      setControlPosition(controlPosition: number): void;
      setControls(controls: string[]): void;
      setDrawingMode(drawingMode: string | null): void;
      setMap(map: Map | null): void;
      setStyle(style: Data.StylingFunction | Data.StyleOptions): void;
      toGeoJson(callback: (feature: object) => void): void;
    }

    namespace Data {
      interface DataOptions {
        controlPosition?: number;
        controls?: string[];
        drawingMode?: string;
        featureFactory?: (geometry: Geometry) => Feature;
        map?: Map;
        style?: StylingFunction | StyleOptions;
      }

      interface GeoJsonOptions {
        idPropertyName?: string;
      }

      interface StyleOptions {
        clickable?: boolean;
        cursor?: string;
        draggable?: boolean;
        editable?: boolean;
        fillColor?: string;
        fillOpacity?: number;
        icon?: string | Icon | Symbol;
        shape?: MarkerShape;
        strokeColor?: string;
        strokeOpacity?: number;
        strokeWeight?: number;
        title?: string;
        visible?: boolean;
        zIndex?: number;
      }

      type StylingFunction = (feature: Feature) => StyleOptions;

      class Feature {
        constructor(options?: FeatureOptions);
        forEachProperty(callback: (value: any, name: string) => void): void;
        getGeometry(): Geometry;
        getId(): number | string;
        getProperty(name: string): any;
        removeProperty(name: string): void;
        setGeometry(newGeometry: Geometry | LatLng | LatLngLiteral): void;
        setProperty(name: string, newValue: any): void;
        toGeoJson(callback: (feature: object) => void): void;
      }

      interface FeatureOptions {
        geometry?: Geometry | LatLng | LatLngLiteral;
        id?: number | string;
        properties?: object;
      }

      class Geometry {
        getType(): string;
        forEachLatLng(callback: (latLng: LatLng) => void): void;
      }

      class Point extends Geometry {
        constructor(latLng: LatLng | LatLngLiteral);
        get(): LatLng;
      }

      class MultiPoint extends Geometry {
        constructor(elements: Array<LatLng | LatLngLiteral>);
        getArray(): LatLng[];
        getAt(n: number): LatLng;
        getLength(): number;
      }

      class LineString extends Geometry {
        constructor(elements: Array<LatLng | LatLngLiteral>);
        getArray(): LatLng[];
        getAt(n: number): LatLng;
        getLength(): number;
      }

      class MultiLineString extends Geometry {
        constructor(elements: Array<LineString | Array<LatLng | LatLngLiteral>>);
        getArray(): LineString[];
        getAt(n: number): LineString;
        getLength(): number;
      }

      class LinearRing extends Geometry {
        constructor(elements: Array<LatLng | LatLngLiteral>);
        getArray(): LatLng[];
        getAt(n: number): LatLng;
        getLength(): number;
      }

      class Polygon extends Geometry {
        constructor(elements: Array<LinearRing | Array<LatLng | LatLngLiteral>>);
        getArray(): LinearRing[];
        getAt(n: number): LinearRing;
        getLength(): number;
      }

      class MultiPolygon extends Geometry {
        constructor(elements: Array<Polygon | Array<LinearRing | Array<LatLng | LatLngLiteral>>>);
        getArray(): Polygon[];
        getAt(n: number): Polygon;
        getLength(): number;
      }

      class GeometryCollection extends Geometry {
        constructor(elements: Array<Geometry>);
        getArray(): Geometry[];
        getAt(n: number): Geometry;
        getLength(): number;
      }
    }

    interface Symbol {
      anchor?: Point;
      fillColor?: string;
      fillOpacity?: number;
      labelOrigin?: Point;
      path?: string;
      rotation?: number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    interface MarkerShape {
      coords?: number[];
      type?: string;
    }

    class Geocoder {
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
    }

    interface GeocoderRequest {
      address?: string;
      bounds?: LatLngBounds | LatLngBoundsLiteral;
      componentRestrictions?: GeocoderComponentRestrictions;
      location?: LatLng | LatLngLiteral;
      placeId?: string;
      region?: string;
    }

    interface GeocoderComponentRestrictions {
      administrativeArea?: string;
      country?: string | string[];
      locality?: string;
      postalCode?: string;
      route?: string;
    }

    interface GeocoderResult {
      address_components: GeocoderAddressComponent[];
      formatted_address: string;
      geometry: GeocoderGeometry;
      partial_match: boolean;
      place_id: string;
      postcode_localities: string[];
      types: string[];
    }

    interface GeocoderAddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    interface GeocoderGeometry {
      bounds: LatLngBounds;
      location: LatLng;
      location_type: string;
      viewport: LatLngBounds;
    }

    enum GeocoderStatus {
      ERROR,
      INVALID_REQUEST,
      OK,
      OVER_QUERY_LIMIT,
      REQUEST_DENIED,
      UNKNOWN_ERROR,
      ZERO_RESULTS
    }

    class DirectionsService {
      route(request: DirectionsRequest, callback: (result: DirectionsResult, status: DirectionsStatus) => void): void;
    }

    interface DirectionsRequest {
      avoidFerries?: boolean;
      avoidHighways?: boolean;
      avoidTolls?: boolean;
      destination: string | LatLng | LatLngLiteral | Place;
      drivingOptions?: DrivingOptions;
      optimizeWaypoints?: boolean;
      origin: string | LatLng | LatLngLiteral | Place;
      provideRouteAlternatives?: boolean;
      region?: string;
      transitOptions?: TransitOptions;
      travelMode: TravelMode;
      unitSystem?: UnitSystem;
      waypoints?: DirectionsWaypoint[];
    }

    interface Place {
      location: LatLng | LatLngLiteral;
      placeId: string;
      query: string;
    }

    interface DrivingOptions {
      departureTime: Date;
      trafficModel?: TrafficModel;
    }

    enum TrafficModel {
      BEST_GUESS,
      OPTIMISTIC,
      PESSIMISTIC
    }

    interface TransitOptions {
      arrivalTime?: Date;
      departureTime?: Date;
      modes?: TransitMode[];
      routingPreference?: TransitRoutePreference;
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

    interface DirectionsWaypoint {
      location: LatLng | LatLngLiteral | string;
      stopover: boolean;
    }

    interface DirectionsResult {
      routes: DirectionsRoute[];
    }

    interface DirectionsRoute {
      bounds: LatLngBounds;
      copyrights: string;
      fare: TransitFare;
      legs: DirectionsLeg[];
      overview_path: LatLng[];
      overview_polyline: string;
      warnings: string[];
      waypoint_order: number[];
    }

    interface TransitFare {
      currency: string;
      value: number;
    }

    interface DirectionsLeg {
      arrival_time: Time;
      departure_time: Time;
      distance: Distance;
      duration: Duration;
      duration_in_traffic: Duration;
      end_address: string;
      end_location: LatLng;
      start_address: string;
      start_location: LatLng;
      steps: DirectionsStep[];
      via_waypoints: LatLng[];
    }

    interface Time {
      text: string;
      time_zone: string;
      value: Date;
    }

    interface Distance {
      text: string;
      value: number;
    }

    interface Duration {
      text: string;
      value: number;
    }

    interface DirectionsStep {
      distance: Distance;
      duration: Duration;
      end_location: LatLng;
      instructions: string;
      path: LatLng[];
      start_location: LatLng;
      steps: DirectionsStep[];
      transit: TransitDetails;
      travel_mode: TravelMode;
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
      url: string;
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

    enum DirectionsStatus {
      INVALID_REQUEST,
      MAX_WAYPOINTS_EXCEEDED,
      NOT_FOUND,
      OK,
      OVER_QUERY_LIMIT,
      REQUEST_DENIED,
      UNKNOWN_ERROR,
      ZERO_RESULTS
    }

    class DirectionsRenderer {
      constructor(opts?: DirectionsRendererOptions);
      getDirections(): DirectionsResult;
      getMap(): Map;
      getPanel(): Element;
      getRouteIndex(): number;
      setDirections(directions: DirectionsResult): void;
      setMap(map: Map | null): void;
      setOptions(options: DirectionsRendererOptions): void;
      setPanel(panel: Element | null): void;
      setRouteIndex(routeIndex: number): void;
    }

    interface DirectionsRendererOptions {
      directions?: DirectionsResult;
      draggable?: boolean;
      hideRouteList?: boolean;
      infoWindow?: InfoWindow;
      map?: Map;
      markerOptions?: MarkerOptions;
      panel?: Element;
      polylineOptions?: PolylineOptions;
      preserveViewport?: boolean;
      routeIndex?: number;
      suppressBicyclingLayer?: boolean;
      suppressInfoWindows?: boolean;
      suppressMarkers?: boolean;
      suppressPolylines?: boolean;
    }
  }
}

declare module '@react-google-maps/api' {
  import * as React from 'react';

  export interface LoadScriptProps {
    id?: string;
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
    channel?: string;
  }

  export interface UseLoadScriptOptions {
    googleMapsApiKey: string;
    id?: string;
    version?: string;
    libraries?: string[];
    language?: string;
    region?: string;
    preventGoogleFontsLoading?: boolean;
    channel?: string;
  }

  export interface LoadScriptResult {
    isLoaded: boolean;
    loadError: Error | undefined;
  }

  export function useJsApiLoader(options: UseLoadScriptOptions): LoadScriptResult;

  export interface MapProps {
    id?: string;
    mapContainerStyle?: React.CSSProperties;
    mapContainerClassName?: string;
    options?: google.maps.MapOptions;
    center?: google.maps.LatLngLiteral;
    zoom?: number;
    onClick?: (e: google.maps.MapMouseEvent) => void;
    onLoad?: (map: google.maps.Map) => void;
    onUnmount?: (map: google.maps.Map) => void;
    onBoundsChanged?: () => void;
    onCenterChanged?: () => void;
    onDragEnd?: () => void;
    onDragStart?: () => void;
    onZoomChanged?: () => void;
    onIdle?: () => void;
    children?: React.ReactNode;
  }

  export interface MarkerProps {
    position: google.maps.LatLngLiteral;
    onClick?: (e: google.maps.MapMouseEvent) => void;
    onLoad?: (marker: google.maps.Marker) => void;
    onUnmount?: (marker: google.maps.Marker) => void;
    icon?: string | google.maps.Icon | google.maps.Symbol;
    label?: string | google.maps.MarkerLabel;
    draggable?: boolean;
    title?: string;
    options?: google.maps.MarkerOptions;
    zIndex?: number;
  }

  export interface InfoWindowProps {
    position?: google.maps.LatLngLiteral;
    options?: google.maps.InfoWindowOptions;
    onLoad?: (infoWindow: google.maps.InfoWindow) => void;
    onUnmount?: (infoWindow: google.maps.InfoWindow) => void;
    onCloseClick?: () => void;
    onDomReady?: () => void;
    children?: React.ReactNode;
  }

  export interface CircleProps {
    center: google.maps.LatLngLiteral;
    radius: number;
    options?: google.maps.CircleOptions;
    onLoad?: (circle: google.maps.Circle) => void;
    onUnmount?: (circle: google.maps.Circle) => void;
    onClick?: (e: google.maps.MapMouseEvent) => void;
  }

  export interface DirectionsRendererProps {
    directions: google.maps.DirectionsResult;
    options?: google.maps.DirectionsRendererOptions;
    onLoad?: (directionsRenderer: google.maps.DirectionsRenderer) => void;
    onUnmount?: (directionsRenderer: google.maps.DirectionsRenderer) => void;
  }

  export const GoogleMap: React.FC<MapProps>;
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
