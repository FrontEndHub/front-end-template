const path = require('path')

const $ = require('gulp-load-plugins')()
const gulp = require('gulp')
const nodeSassMagicImporter = require('node-sass-magic-importer')
const sassGraphGlob = require('sass-graph-glob')
const upath = require('upath')

const config = require(path.resolve('config'))
const images = require('./images')

const isDev = config.env === 'development'

$.sass.compiler = require('sass')

function styles () {
  const graph = sassGraphGlob.parseDir(upath.join(config.srcDir, config.dir.assets, config.dir.styles))
  const dependentPaths = []

  return gulp
    .src(config.srcPaths.styles, {
      base: config.srcDir
    })
    .pipe($.if(isDev, $.plumber({
      errorHandler: $.notify.onError()
    })))
    .pipe($.if(isDev, $.cached('sass')))
    .pipe($.if(isDev, $.flatmap((stream, file) => {
      dependentPaths.push(file.path)
      graph.visitAncestors(file.path, path => {
        if (dependentPaths.indexOf(path) < 0) {
          dependentPaths.push(path)
        }
      })
      return gulp.src(dependentPaths, {
        base: config.srcDir
      })
    })))
    .pipe($.stylelint({
      reporters: [
        {
          failOnError: true,
          formatter: 'string',
          console: true
        }
      ]
    }))
    .pipe($.if(isDev, $.sourcemaps.init()))
    .pipe($.sass({
      importer: nodeSassMagicImporter(),
      includePaths: upath.join(config.srcDir, config.dir.assets, config.dir.styles),
      outputStyle: 'expanded'
    }))
    .pipe($.postcss())
    .pipe($.rename(path => {
      path.extname = '.css'
    }))
    .pipe($.if(isDev, $.sourcemaps.write({
      sourceRoot: `/${config.srcDir}`
    })))
    .pipe($.if(!isDev, $.cleanCss({
      rebase: false
    })))
    .pipe($.if(!isDev, $.csso()))
    .pipe(gulp.dest(upath.join(config.distDir, config.baseDir)))
    .pipe($.if(config.gzip && !isDev, $.gzip()))
    .pipe($.if(config.gzip && !isDev, gulp.dest(upath.join(config.distDir, config.baseDir))))
    .pipe(config.server.stream())
}

module.exports = gulp.series(images, styles)
