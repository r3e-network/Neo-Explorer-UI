const webpack = require("webpack");
const CompressionWebpackPlugin = require("compression-webpack-plugin");
const productionGzipExtensions = ["js", "css"];

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  devServer: {
    proxy: {
      "/api": {
        changeOrigin: true,
        // 本地 neo3fura
        target: "http://127.0.0.1:1926",
        // 远程备选:
        // target: "https://neofura.ngd.network",
        // target: "https://testmagnet.ngd.network",
      },
      "/bpi": {
        changeOrigin: true,
        // 本地 neo3fura
        target: "http://127.0.0.1:1926",
        // 远程备选:
        // target: "https://neofura.ngd.network:1927",
      },
      "/ws": {
        changeOrigin: true,
        ws: true,
        // 本地 neo3fura WebSocket
        target: "ws://127.0.0.1:2026",
      },
    },
  },
  configureWebpack: {
    // Set up all the aliases we use in our app.
    resolve: {
      alias: {
        'vue-i18n': 'vue-i18n/dist/vue-i18n.cjs.js',
      },
    },
    externals: isProduction ? {
      // CDN externals for production (optional)
      // vue: "Vue",
      // axios: "axios",
    } : {},
    plugins: [
      new CompressionWebpackPlugin({
        algorithm: "gzip",
        test: new RegExp("\\.(" + productionGzipExtensions.join("|") + ")$"),
        threshold: 10240,
        minRatio: 0.8,
      }),
      // Remove LimitChunkCountPlugin to allow better code splitting
    ],
    optimization: {
      splitChunks: {
        chunks: "all",
        minSize: 20000,
        maxSize: 250000,
        cacheGroups: {
          // Vendor chunks
          elementPlus: {
            name: "chunk-element-plus",
            test: /[\\/]node_modules[\\/]element-plus/,
            priority: 30,
          },
          echarts: {
            name: "chunk-echarts",
            test: /[\\/]node_modules[\\/](echarts|zrender)/,
            priority: 25,
          },
          neonJs: {
            name: "chunk-neon-js",
            test: /[\\/]node_modules[\\/]@cityofzion/,
            priority: 20,
          },
          vendors: {
            name: "chunk-vendors",
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: "initial",
          },
          common: {
            name: "chunk-common",
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
    },
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
