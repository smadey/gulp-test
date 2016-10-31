var _ = require('lodash');
var through2 = require('through2');

var getFileDeps = require('./utils/getFileDeps');

module.exports = function () {
    var map;

    var files = [];

    function transform(file, encoding, callback) {
        if (file.isNull()) {
            return callback();
        }

        if (file.isStream()) {
            return callback();
        }

        if (!map) {
            map = {};
        }

        var deps = getFileDeps(file);

        console.log(deps); /* eslint no-console: 0 */

        if (deps && deps.length) {
            map[file.path] = deps;
        }

        files.push(file);
        callback();
    }

    function flush(callback) {
        if (!map) {
            return callback();
        }

        var hasDepsFiles = Object.keys(map);

        hasDepsFiles.forEach(function (file) {
            var deps = map[file];

            deps.forEach(function (depFile) {
                if (map[depFile]) {
                    deps.push(map[depFile]);
                }
            });
        });

        hasDepsFiles.forEach(function (file) {
            map[file] = _.uniq(_.flattenDeep(map[file]));
        });

        var self = this;
        files.reverse().forEach(function (file) {
            self.push(file);
        });

        callback();
    }

    return through2.obj(transform, flush);
}
