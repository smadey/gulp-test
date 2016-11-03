require('es6-promise').polyfill();

var fs = require('fs');
var path = require('path');

var gutil = require('gulp-util');
var through2 = require('through2');

var path = require('path');

var REG_SCSS_IMPORT = /\@import\s*["']([^"']+)["'];?/g;
var REG_SCSS_COMMENTS = /\/\[\s\S]*\*\/|\/\/.*(?=[\n\r])/g;

var REG_NUNJUCKS_EXTENDS = /{%\s*extends\s*["']([^"']+)["'];?\s*%}/g;
var REG_NUNJUCKS_COMMENTS = /{#[\s\S]*#}/g;

var allGetContentsDeps = {
    // scss文件处理
    scss: function (contents) {
        contents = contents.replace(REG_SCSS_COMMENTS, ''); // 移除注释

        var matched;

        var deps = [];

        while ((matched = REG_SCSS_IMPORT.exec(contents)) !== null) {
            deps.push(matched[1]);
        }

        return deps;
    },

    // nunjucks文件处理
    nunjucks: function (contents) {
        contents = contents.replace(REG_NUNJUCKS_COMMENTS, ''); // 移除注释

        var matched;

        var deps = [];

        while ((matched = REG_NUNJUCKS_EXTENDS.exec(contents)) !== null) {
            deps.push(matched[1]);
        }

        return deps;
    },
};

/**
 * [exports description]
 * @param {String|Function} dest 匹配路径
 * @param {Object} options 配置项
 * @param {String} options.cwd 工作目录
 * @param {String} options.extension 匹配文件的后缀名
 * @param {Function} options.getContentsDeps 获取文件依赖方法
 * @param {String} options.syntax 文件语法
 * @param {String} options.base 依赖文件定位目录
 * @return {DestroyableTransform} 文件流
 */
module.exports = function (dest, options) {
    if (!dest) {
        throw new gutil.PluginError('gulp-being-changed', '`dest` required');
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

    /**
     * 获取文件的依赖文件
     * @param {File} file 文件对象
     * @return {Array<String>} 依赖文件数组(由文件的绝对地址组成)
     */
    function getFileDeps(file) {
        var dirname = path.dirname(file.path)
        var extname = path.extname(file.path);

        var ext = extname.slice(1).toLowerCase();

        var getContentsDeps = options.getContentsDeps || allGetContentsDeps[options.syntax] || allGetContentsDeps[ext];

        if (!getContentsDeps) {
            return [];
        }

        var contents = file.contents.toString('utf-8');
        var deps = getContentsDeps(contents);

        return deps.map(function (dep) {
            var depFilePath = path.resolve(options.base || dirname, dep);

            if (!path.extname(depFilePath)) {
                depFilePath += extname;
            }

            return depFilePath;
        });
    }

    /**
     * 获取文件的所有依赖文件
     * @param {File} file 文件对象
     * @return {Array<File>} 依赖文件数组(由文件对象组成数组)
     */
    function getAllDepFiles(file) {
        var depFiles = [];

        file._deps.forEach(function (dep) {
            var depFile = files[dep];
            if (depFile && depFiles.indexOf(depFile) < 0) {
                depFiles.push(depFile);

                getAllDepFiles(depFile).forEach(function (d) {
                    if (depFiles.indexOf(d) < 0) {
                        depFiles.push(d);
                    }
                });
            }
        });

        return depFiles;
    }

    /**
     * 判断文件是否更改
     * @param {File} file 文件对象
     * @return {Boolean} 文件是否更改
     */
    function isFileChanged(file) {
        var targetPath = path.resolve(options.cwd, dest(file), file.relative);

        if (options.extension) {
            targetPath = gutil.replaceExtension(targetPath, options.extension);
        }

        try {
            var targetStat = fs.statSync(targetPath);

            if (file.stat && file.stat.mtime > targetStat.mtime) {
                return true;
            }

            return false;
        } catch (ex) {
            return true;
        }
    }

    // 绑定文件的依赖
    function transform(file, encoding, callback) {
        file._deps = getFileDeps(file, options);
        files[file.path] = file;
        callback();
    }

    // 检测出所有要被更新的文件
    function flush(callback) {
        var stream = this;

        function onFileChange(file) {
            file._changed = true;
            stream.push(file);
            gutil.log('文件 "' + file.path + '" 将被更改');
        }

        Object.keys(files).map(function (key) {
            var file = files[key];

            console.log(file.path.split('/').pop(), getAllDepFiles(file).map(d => d.path.split('/').pop())); // eslint-disable-line no-console

            if (file._changed !== undefined) {
                return;
            }

            if (file._changed = isFileChanged(file)) {
                onFileChange(file);
            } else {
                var allDepFiles = getAllDepFiles(file);
                var depFile;

                for (var i = 0, n = allDepFiles.length; i < n; i++) {
                    depFile = allDepFiles[i];

                    if (depFile._changed === false) {
                        continue;
                    } else if (depFile._changed === true) {
                        onFileChange(file);
                        break;
                    } else if (depFile._changed = isFileChanged(depFile)) {
                        onFileChange(depFile);
                        onFileChange(file);
                    }
                }
            }
        });

        callback();
    }

    return through2.obj(transform, flush);
};
