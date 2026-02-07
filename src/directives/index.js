import lazyImage from "./lazy-image";

export default {
  install(app) {
    app.directive("lazy-image", lazyImage);
  },
};

export { lazyImage };
