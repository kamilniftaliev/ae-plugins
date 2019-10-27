const path = require('path')
const WebpackShellPlugin = require('webpack-shell-plugin')
const WrapperPlugin = require('wrapper-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: 'development',

  devtool: 'eval',

  entry: {
    Tutorial: path.resolve(__dirname, './src/index'),
    // Cutter: path.resolve(__dirname, './src/cutter'),
    // Camera: path.resolve(__dirname, './src/camera'),
    // Files: path.resolve(__dirname, './src/files'),
    PluginsRunner: path.resolve(__dirname, './src/pluginsRunner'),
    
  },

  output: {
    path: path.resolve(__dirname, './dist'),
    publicPath: '/',
    filename: '[name].jsx',
  },

  plugins: [
    new CopyWebpackPlugin([
      {
        from: 'src/icons',
        to: 'icons',
      },
      {
        from: 'src/presets',
        to: 'presets',
      },
    ]),

    new WrapperPlugin({
      test: /\.jsx$/, // only wrap output of bundle files with '.js' extension 
      header: 'var that = this;\n\n',
    }),

    new WebpackShellPlugin({
      onBuildExit: [
        // 'osascript loader.scpt', // Mac OS
        'node loader.js', // Windows
      ],
    }),
  ],

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        include: /src/,
        use: 'babel-loader',
      },
    ],
  }
}