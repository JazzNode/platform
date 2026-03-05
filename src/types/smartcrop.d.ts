declare module 'smartcrop' {
  interface Crop {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  interface CropResult {
    topCrop: Crop;
  }
  interface ImageOperations {
    open(input: unknown): Promise<{ width: number; height: number; [key: string]: unknown }>;
    resample(
      img: { width: number; height: number; [key: string]: unknown },
      width: number,
      height: number,
    ): Promise<{ width: number; height: number; [key: string]: unknown }>;
    getData(
      img: { width: number; height: number; [key: string]: unknown },
    ): Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
  }
  interface CropOptions {
    width: number;
    height: number;
    minScale?: number;
    boost?: { x: number; y: number; width: number; height: number; weight: number }[];
    ruleOfThirds?: boolean;
    debug?: boolean;
    imageOperations?: ImageOperations;
  }
  class ImgData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(width: number, height: number, data?: Buffer | Uint8ClampedArray);
  }
  const smartcrop: {
    crop(image: unknown, options: CropOptions): Promise<CropResult>;
    ImgData: typeof ImgData;
  };
  export default smartcrop;
}
