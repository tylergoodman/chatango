var gulp = require('gulp');
var ts = require('gulp-typescript');
var mocha = require('gulp-mocha');

var del = require('del');
var runSequence = require('run-sequence');
var merge = require('merge2');

gulp.task('clean', function (done) {
  del([
    './dist/*',
  ], done);
});

gulp.task('build', ['clean'], function () {
  var tsProject = ts.createProject('tsconfig.json', {
    'typescript': require('typescript'),
  });

  var pipe = gulp.src('./src/*.ts')
    .pipe(ts(tsProject));

  return merge([
    pipe.dts.pipe(gulp.dest('./dist')),
    pipe.js.pipe(gulp.dest('./dist')),
  ]);
});

gulp.task('test', function (done) {
  gulp.src('./test/*.js', { read: false })
    .pipe(mocha({
      colors: true,
      bail: true,
      timeout: 10000,
    }))
    .once('end', done);
});

gulp.task('default', function (done) {
  runSequence('build', done);
});
