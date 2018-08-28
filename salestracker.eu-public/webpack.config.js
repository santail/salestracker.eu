const path = require("path");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const webpack = require('webpack');

module.exports = {
  entry: "./src/client/index.tsx",
  output: {
    path: path.resolve(__dirname, "./public/js"),
    filename: "bundle.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
  },
  watch:true,
  module: {
    rules: [
        { 
            test: /\.tsx?$/, 
            loader: "awesome-typescript-loader" 
          },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: "url-loader?limit=100000"
      }
    ]
  },
  devServer: {
    port: 9000,
    open: true,
    proxy: {
      "/api": "http://localhost:9090"
    }
  },
  plugins: [
    new CleanWebpackPlugin([path.resolve(__dirname, "./public/js")]),
    new webpack.HotModuleReplacementPlugin()
  ]
};