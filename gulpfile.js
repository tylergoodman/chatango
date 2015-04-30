var gulp = require('gulp');
var ts = require('gulp-typescript');
var runSequence = require('run-sequence');
var merge = require('merge2');

gulp.task('build', function () {
  var pipe = gulp.src('./src/*.ts')
    .pipe(ts({
      'module': 'commonjs',
      'removeComments': true,
      'declarationFiles': true,
    }));
    return merge([
      pipe.dts.pipe(gulp.dest('./dist')),
      pipe.js.pipe(gulp.dest('./dist')),
    ]);
});

gulp.task('test', function () {
  
});

gulp.task('default', function (done) {
  runSequence('build', done);
});