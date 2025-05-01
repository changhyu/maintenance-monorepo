declare module 'shpjs' {
  export function parseShp(buffer: ArrayBuffer): Promise<any>;
  export function parseDbf(buffer: ArrayBuffer): Promise<any>;
  export function combine(arrays: any[]): any;
}