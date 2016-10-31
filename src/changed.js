require('es6-promise').polyfill();

var fs = require('fs');
var path = require('path');

var gutil = require('gulp-util');
var through2 = require('through2');

var getFileDeps = require('./utils/getFileDeps');

module.exports = function (dest, options) {
    if (!dest) {
        throw new gutil.PluginError('gulp-changed', '`dest` required');
    }

    if (typeof dest !== 'function') {
        var originDest = dest;
        dest = function () {
            return originDest;
        };
    }

    options = options || {};
    options.cwd = options.cwd || process.cwd();

    var files = {};

    function getAllDepFiles(file) {
        var depFiles = [];

        file.deps.forEach(function (dep) {
            var depFile = files[dep];
            if (depFile) {
                depFiles.push(depFile);
                depFiles = depFiles.concat(getAllDepFiles(depFile));
            }
        });

        return depFiles;
    }

    function changed(sourceFile) {
        return new Promise(function (resolve, reject) {
            var targetPath = path.resolve(options.cwd, dest(sourceFile), sourceFile.relative);

            if (options.extension) {
                targetPath = gutil.replaceExtension(targetPath, options.extension);
            }

            fs.stat(targetPath, function (err, targetStat) {
                if (err) {
                    resolve();
                } else if (sourceFile.stat && sourceFile.stat.mtime > targetStat.mtime) {
                    resolve();
                } else {
                    reject();
                }
            });
        });
    }

    function transform(file, encoding, callback) {
        file.deps = getFileDeps(file);
        files[file.path] = file;
        callback();
    }

    function flush(callback) {
        var stream = this;

        var promises = Object.keys(files).map(function (key) {
            return new Promise(function (resolve, reject) {
                var file = files[key];

                function onChanged() {
                    // 依赖的多个文件都变更时会重复触发此操作，所以需要避免重复push
                    if (!file._changed) {
                        file._changed = true;
                        stream.push(file);
                    }
                    resolve();
                }

                changed(file).then(onChanged, function () {
                    getAllDepFiles(file).forEach(function (depFile) {
                        changed(depFile).then(onChanged);
                    });
                });
            });
        });

        Promise.all(promises).then(callback);
    }

    return through2.obj(transform, flush);
};
