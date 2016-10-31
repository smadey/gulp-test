var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

var hasChanged = require('./src/hasChanged');
var changed = require('./src/changed');

var paths = {
    input: 'demo/input/css/**/*.*',
    output: 'demo/output/css',
};

gulp.task('default', function () {
    gulp.src(paths.input)
        .pipe(changed(paths.output))
        // .pipe(plugins.changed(paths.output, { hasChanged: hasChanged() }))
        .pipe(gulp.dest(paths.output));
});
