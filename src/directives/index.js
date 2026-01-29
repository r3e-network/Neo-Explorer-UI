import lazyImage from "./lazy-image";
import clickOutside from "./click-ouside";

export default {
  install(app) {
    app.directive("lazy-image", lazyImage);
    app.directive("click-outside", clickOutside);
  },
};

export { lazyImage, clickOutside };
