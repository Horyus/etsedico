var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: './',
    target: 'node',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'app.bundle.js'
    },
    module: {
        rules: [
            {
                use: 'babel-loader',
                test: /\.js$/,
                exclude: /node_modules/
            }
        ]
    },
    stats: {
        colors: true
    },
    devtool: 'source-map',
    resolve: {
        alias: {
            dgram: "dgram-browserify"
        }
    }
};

