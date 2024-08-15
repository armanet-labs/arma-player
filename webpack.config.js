const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const semver = require('semver');
const cheerio = require('cheerio');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

// Loading the current package.json - will be used to determine version etc.
const packageJSON = require(path.resolve(__dirname, 'package.json'));

// Validate package version is valid semver
if (!semver.valid(packageJSON.version)) {
    throw 'Invalid package version - ' + packageJSON.version;
}

// Distribution options configure how build paths are going to be configured.
const getDistOptions = (mode) => {
    const fullVersion = packageJSON.version;
    const majorVersion = semver.major(packageJSON.version);
    const cdnRoot = packageJSON.com_fluidplayer.cdn;

    switch (mode) {
        case 'development':
            return {
                path: path.resolve(__dirname, 'dist'),
                publicPath: '/'
            };
        case 'current':
            return {
                path: path.resolve(__dirname, 'dist-cdn/v' + majorVersion + '/current/'),
                publicPath: cdnRoot + '/v' + majorVersion + '/current/'
            };
        case 'versioned':
            return {
                path: path.resolve(__dirname, 'dist-cdn/' + fullVersion + '/'),
                publicPath: cdnRoot + '/' + fullVersion + '/'
            };
        default:
            throw 'Unknown distribution type provided in --dist!';
    }
}

// Webpack configuration
module.exports = (env, argv) => {
    const wpMode = typeof argv.mode !== 'undefined' ? argv.mode : 'development';
    const wpDebug = wpMode === 'development' && typeof env.debug !== 'undefined' && !!env.debug;
    const wpDist = typeof env.dist !== 'undefined' ? env.dist : 'development';
    const wpDistOptions = getDistOptions(wpDist);

    if ('development' !== wpDist && (wpMode !== 'production' || wpDebug)) {
        throw 'Building a production distribution in development mode or with debug enabled is not allowed!'
    }

    const plugins = [
        // Define common variables for use in Fluid Player
        new webpack.DefinePlugin({
            FP_BUILD_VERSION: JSON.stringify(packageJSON.version),
            FP_HOMEPAGE: JSON.stringify(packageJSON.homepage),
            FP_ENV: JSON.stringify(wpMode),
            FP_DEBUG: JSON.stringify(wpDebug),
            FP_WITH_CSS: false
        })
    ];

    // Development mode builds and development server specifics
    if ('development' === wpMode) {
        // Locate all E2E cases
        const caseFiles = [];
        fs.readdirSync(path.resolve(__dirname, 'test/html/')).forEach(file => {
            if (file === 'special-cases') {
                return;
            }

            const absPath = path.resolve(__dirname, 'test/html/', file);
            const caseHtml = cheerio.load(fs.readFileSync(absPath));
            const publicName = file.replace('.tpl', '');

            plugins.push(new HtmlWebpackPlugin({
                template: path.resolve(__dirname, 'test/html/', file),
                inject: false,
                filename: publicName,
                scriptLoading: "blocking",
            }));

            caseFiles.push({
                file: publicName,
                name: caseHtml('title').text()
            });
        });

        fs.readdirSync(path.resolve(__dirname, 'test/html/special-cases')).forEach(file => {
            const publicName = file.replace('.tpl', '');

            plugins.push(new HtmlWebpackPlugin({
                template: path.resolve(__dirname, 'test/html/special-cases', file),
                inject: false,
                filename: publicName,
                scriptLoading: "blocking",
            }));
        });

        // Emit all cases as separate HTML pages
        plugins.push(new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'test/index.html'),
            filename: 'index.html',
            inject: false,
            templateParameters: {
                cases: caseFiles
            }
        }));

        // Copy static assets for E2E
        plugins.push(new CopyPlugin(
            {
                patterns: [
                    { from: path.resolve(__dirname, 'test/static/'), to: path.resolve(wpDistOptions.path, 'static') }
                ]
            }
        ));
    }

    return {
        devServer: {
            static: wpDistOptions.path,
            // index: 'index.html',
            // allowedHosts: "all", // To use with remote hosting (ie: ngrok)
        },
        devtool: wpMode === 'development' ? 'source-map' : false,
        plugins,
        entry: {
            fluidplayer: './src/browser.js'
        },
        optimization: {
            minimize: wpMode !== 'development',
            minimizer: [
              new TerserPlugin({
                extractComments: {
                    condition: 'all',
                    banner: false,
                },
              }),
            ],
        },
        output: {
            filename: '[name].min.js',
            chunkFilename: '[name].[chunkhash].min.js',
            path: wpDistOptions.path,
            publicPath: wpDistOptions.publicPath
        },
        module: {
            rules: [
                {
                    test: /\.m?js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                },
                {
                    test: /\.css$/i,
                    use: ['style-loader', 'css-loader'],
                },
                {
                    test: /\.svg/,
                    type: 'asset'
                },
            ],
        }
    };
}
