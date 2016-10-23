var path = require('path');

var gulp = require('gulp');
var through2 = require('through2');

var getFileDeps = require('./utils/getFileDeps');

var paths = {
    files: ['src/views/**/*.*', 'src/css/**/*.*'],
};

gulp.task('default', function () {
    gulp.src(paths.files)
        .pipe(deps());
});

function deps() {
    var map;

    function bufferContents(file, unused, done) {
        if (file.isNull()) {
            done();
            return;
        }

        if (file.isStream()) {
            done();
            return;
        }

        var deps = getFileDeps(file);

        if (!map) {
            map = {};
        }

        if (deps && deps.length) {
            map[file.path] = deps;
        }

        done();
    }

    function endStream(done) {
        if (!map) {
            done();
            return;
        }

        console.log(map); // eslint-disable-line no-console
        done();
    }

    return through2.obj(bufferContents, endStream)
}
