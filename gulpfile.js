var gulp = require('gulp');

var beingChanged = require('./index');

var paths = {
    css: {
        input: 'demo/input/css/**/*.*',
        output: 'demo/output/css',
    },
    views: {
        input: 'demo/input/views/**/*.*',
        output: 'demo/output/views',
    },
};

gulp.task('css', function () {
    return gulp.src(paths.css.input)
        .pipe(beingChanged(paths.css.output))
        .pipe(gulp.dest(paths.css.output));
});

gulp.task('views', function () {
    return gulp.src(paths.views.input)
        .pipe(beingChanged(paths.views.output))
        .pipe(gulp.dest(paths.views.output));
});

gulp.task('default', ['css', 'views'], function () {
    gulp.watch(paths.css.input, ['css']);
    gulp.watch(paths.views.input, ['views']);
});

// gulp.task('default', ['css'], function () {
//     gulp.watch(paths.css.input, ['css']);
// });