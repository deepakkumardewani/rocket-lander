declare module "vue-3d-loader" {
  import { DefineComponent } from "vue";

  export const vue3dLoader: DefineComponent<
    {
      filePath: {
        type: [String, Array];
        required: true;
      };
      backgroundColor: {
        type: Number;
        default: 0x000000;
      };
      backgroundAlpha: {
        type: Number;
        default: 1;
      };
      rotation: {
        type: Object;
        default: () => { x: 0; y: 0; z: 0 };
      };
      position: {
        type: Object;
        default: () => { x: 0; y: 0; z: 0 };
      };
      scale: {
        type: Object;
        default: () => { x: 1; y: 1; z: 1 };
      };
      zoom: {
        type: Number;
        default: 1;
      };
      autoRotate: {
        type: Boolean;
        default: false;
      };
      autoRotateSpeed: {
        type: Number;
        default: 1;
      };
      controlsOptions: {
        type: Object;
        default: () => {};
      };
    },
    any,
    any,
    any
  >;
}
