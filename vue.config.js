const webpack = require("webpack");
const CompressionWebpackPlugin = require("compression-webpack-plugin");
const productionGzipExtensions = ["js", "css"];

module.exports = {
  devServer: {
    proxy: {
      "/api": {
        changeOrigin: true,
        // target: "http://127.0.0.1:1926",
        // target: "https://testneofura.ngd.network:444",
        // 主网
        target:
          process.env.VUE_APP_DEV_ENV === "TestT5"
            ? "https://testmagnet.ngd.network"
            : "https://neofura.ngd.network",
        // t5
        // target:"https://testmagnet.ngd.network",
        // target: "http://106.14.204.151:1926",
        // target: "http://192.168.1.89:1926"
      },
      "/bpi": {
        changeOrigin: true,
        // target: "http://127.0.0.1:1926",
        // target: "https://testneofura.ngd.network:444",
        target: "https://neofura.ngd.network:1927",
        // target: "http://106.14.204.151:1926",
        // target: "http://192.168.1.89:1926"
      },
      "/hahaha": {
        changeOrigin: true,
        target: "http://127.0.0.1:1926",
        // target: "https://testneofura.ngd.network:444",
        // target: "http://127.0.0.1:1926/upload",
        // target: "http://106.14.204.151:1926",
        // target: "http://192.168.1.89:1926"
      },
    },
    // proxy
  },
  configureWebpack: {
    // Set up all the aliases we use in our app.
    resolve: {
      alias: {
        'vue-i18n': 'vue-i18n/dist/vue-i18n.cjs.js',
      },
    },
    externals: {
      // vue: "Vue",
      // axios: "axios",
      // "element-plus": "ElementPlus",
    },
    plugins: [
      new CompressionWebpackPlugin({
        algorithm: "gzip",
        test: new RegExp("\\.(" + productionGzipExtensions.join("|") + ")$"),
        threshold: 10240,
        minRatio: 0.8,
      }),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 5,
      }),
    ],
  },
  pwa: {
    name: "Vue Argon Design",
    themeColor: "#172b4d",
    msTileColor: "#172b4d",
    appleMobileWebAppCapable: "yes",
    appleMobileWebAppStatusBarStyle: "#172b4d",
  },
  css: {
    // Enable CSS source maps.
    sourceMap: process.env.NODE_ENV !== "production",
  },
};
