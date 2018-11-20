var path = require("path");
var webpack = require('webpack');

var config = {
  entry: ["./client/src/index.tsx"],
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
  },
  output: {
    path: path.resolve(__dirname, "./client/public/js"),
    filename: "bundle.js"
  },
  watch:true,
  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      { 
        test: /\.tsx?$/, 
        loader: "awesome-typescript-loader" 
      }
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ],
  node: {
    fs: 'empty'
  }
};

module.exports = config;