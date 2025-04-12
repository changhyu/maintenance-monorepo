import React from 'react';

declare module '@react-google-maps/api' {
  export interface MapProps {
    center: google.maps.LatLngLiteral;
    zoom: number;
    onLoad?: (map: google.maps.Map) => void;
    onUnmount?: (map: google.maps.Map) => void;
    onBoundsChanged?: () => void;
    options?: google.maps.MapOptions;
    mapContainerStyle?: React.CSSProperties;
    mapContainerClassName?: string;
    children?: React.ReactNode;
  }

  export const GoogleMap: React.FC<MapProps>;

  export interface MarkerProps {
    position: google.maps.LatLngLiteral;
    icon?: string | google.maps.Icon;
    title?: string;
    onClick?: () => void;
    onLoad?: (marker: google.maps.Marker) => void;
    onUnmount?: (marker: google.maps.Marker) => void;
    zIndex?: number;
    label?: string | google.maps.MarkerLabel;
    opacity?: number;
    visible?: boolean;
    key?: string;
    children?: React.ReactNode;
  }

  export const Marker: React.FC<MarkerProps>;

  export interface InfoWindowProps {
    position?: google.maps.LatLngLiteral;
    onCloseClick?: () => void;
    onLoad?: (infoWindow: google.maps.InfoWindow) => void;
    onUnmount?: (infoWindow: google.maps.InfoWindow) => void;
    children?: React.ReactNode;
    options?: google.maps.InfoWindowOptions;
    anchor?: google.maps.MVCObject;
  }

  export const InfoWindow: React.FC<InfoWindowProps>;

  export interface DirectionsRendererProps {
    directions: google.maps.DirectionsResult;
    options?: google.maps.DirectionsRendererOptions;
    onLoad?: (directionsRenderer: google.maps.DirectionsRenderer) => void;
    onUnmount?: (directionsRenderer: google.maps.DirectionsRenderer) => void;
  }

  export const DirectionsRenderer: React.FC<DirectionsRendererProps>;

  export interface CircleProps {
    center: google.maps.LatLngLiteral;
    radius: number;
    options?: google.maps.CircleOptions;
    onLoad?: (circle: google.maps.Circle) => void;
    onUnmount?: (circle: google.maps.Circle) => void;
    onClick?: (e: google.maps.MapMouseEvent) => void;
  }

  export const Circle: React.FC<CircleProps>;

  export interface LoadScriptProps {
    googleMapsApiKey: string;
    libraries?: ("places" | "geometry" | "drawing" | "visualization")[];
    id?: string;
    version?: string;
    language?: string;
    region?: string;
    loadingElement?: React.ReactNode;
    children?: React.ReactNode;
  }

  export const LoadScript: React.FC<LoadScriptProps>;

  export interface LoadJsApiLoaderOptions {
    googleMapsApiKey: string;
    libraries?: ("places" | "geometry" | "drawing" | "visualization")[];
    id?: string;
    version?: string;
    language?: string;
    region?: string;
  }

  export interface LoadJsApiLoaderReturn {
    isLoaded: boolean;
    loadError: Error | undefined;
  }

  export function useJsApiLoader(options: LoadJsApiLoaderOptions): LoadJsApiLoaderReturn;
} 