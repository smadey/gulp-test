require('es6-promise').polyfill();

var fs = require('fs');

var _ = require('lodash');
var through2 = require('through2');
var vfs = require('vinyl-fs');

var getFileDeps = require('./utils/getFileDeps');

function getFile(filePath) {
    return new Promise(function (resolve, reject) {
        vfs.src(filePath).pipe(through2.obj(function (file) {
            resolve(file);
        }));
    });
}

function getFiles(filePaths) {
    return new Promise(function (resolve, reject) {
        Promise.all(filePaths.map(getFile)).then(function (files) {
            resolve(files);
        });
    });
}

function getAllDepFiles(file) {
    return new Promise(function (resolve, reject) {
        var deps = getFileDeps(file);

        getFiles(deps).then(function (files) {
            Promise.all(files.map(getAllDepFiles)).then(function (result) {
                console.log(result); /* eslint no-console: 0 */
                resolve(_.flattenDeep(result));
            });
        });
    });
}

module.exports = function () {
    var files = {};

    function transform(file, encoding, callback) {
        var fileKey = file.path;
        files[fileKey] = file;
        callback();
    }

    function flush(callback) {
        console.log(Object.keys(files)); /* eslint no-console: 0 */
        callback();
    }

    return function (stream, done, sourceFile, targetPath) {
        return through2.obj(transform, flush);
    };
};
