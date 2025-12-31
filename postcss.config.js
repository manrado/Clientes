module.exports = {
  plugins: [
    require('cssnano')({
      preset: ['default', {
        discardComments: {
          removeAll: true
        },
        normalizeWhitespace: true,
        minifyFontValues: true,
        minifyGradients: true
      }]
    })
  ]
};
