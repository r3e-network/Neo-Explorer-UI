const CompressionWebpackPlugin = require("compression-webpack-plugin");
const productionGzipExtensions = ["js", "css"];

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  devServer: {
    proxy: {
      "/api": {
        changeOrigin: true,
        // 使用 NGD 官方 neo3fura
        target: "https://neofura.ngd.network",
        // Only proxy actual API calls (POST), not SPA routes like /api-docs
        filter(pathname) {
          return pathname === "/api";
        },
      },
      "/bpi": {
        changeOrigin: true,
        target: "https://neofura.ngd.network",
      },
      // "/ws" proxy removed — was intercepting webpack-dev-server HMR
      // WebSocket and pointing to non-existent local neo3fura instance
    },
  },
  configureWebpack: {
    // Set up all the aliases we use in our app.
    resolve: {
      alias: {
        "vue-i18n": "vue-i18n/dist/vue-i18n.cjs.js",
      },
    },
    externals: isProduction
      ? {
          // CDN externals for production (optional)
          // vue: "Vue",
          // axios: "axios",
        }
      : {},
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
    name: "Neo Explorer",
    themeColor: "#21325b",
    msTileColor: "#21325b",
    appleMobileWebAppCapable: "yes",
    appleMobileWebAppStatusBarStyle: "#21325b",
  },
  css: {
    // Enable CSS source maps.
    sourceMap: process.env.NODE_ENV !== "production",
  },
};
