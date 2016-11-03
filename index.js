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

        var deps = [];
        var matched;

        while ((matched = REG_SCSS_IMPORT.exec(contents)) !== null) {
            deps.push(matched[1]);
        }

        return deps;
    },

    // nunjucks文件处理
    nunjucks: function (contents) {
        contents = contents.replace(REG_NUNJUCKS_COMMENTS, ''); // 移除注释

        var deps = [];
        var matched;

        while ((matched = REG_NUNJUCKS_EXTENDS.exec(contents)) !== null) {
            deps.push(matched[1]);
        }

        return deps;
    },
};

/**
 * 获取文件与其依赖文件最后修改时间最大值
 * @param {Object} fileObj 文件对象
 * @param {File} fileObj.File 文件实例
 * @param {Object<path: fileObj>} fileObj.deps 依赖文件
 * @return {Date} 最后修改时间
 */
function getLastModified(fileObj) {
    var lastModified = fileObj.File.stat ? fileObj.File.stat.mtime : 0;

    Object.keys(fileObj.deps).forEach(function (depFilePath) {
        var depLastModified = getLastModified(fileObj.deps[depFilePath]);

        if (lastModified < depLastModified) {
            lastModified = depLastModified;
        }
    });

    return lastModified;
}

/**
 * 筛选出将要更新文件
 * @param {String|Function} dest 匹配路径
 * @param {Object} options 配置项
 * @param {String} options.cwd 工作目录
 * @param {Boolean} options.underscore 是否包含(不过滤)以"_"开头的文件
 * @param {String} options.extension 对比文件的后缀名
 * @param {String} options.base 依赖文件定位目录
 * @param {Function} options.getContentsDeps 根据内容获取依赖文件方法
 * @param {String} options.syntax 文件语法
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

    var fileObjs = {};

    /**
     * 获取文件的依赖文件
     * @param {File} file 文件对象
     * @return {Array<String>} 依赖文件数组(由文件的绝对地址组成)
     */
    function getFileDeps(file) {
        var dirname = path.dirname(file.path)
        var extname = path.extname(file.path);

        var ext = extname.slice(1).toLowerCase();

        var getContentsDeps = options.getContentsDeps || allGetContentsDeps[options] || allGetContentsDeps[ext];

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

    // 文件对象组装
    function transform(file, encoding, callback) {
        var fileObj = fileObjs[file.path] || (fileObjs[file.path] = {});

        fileObj.File = file;
        fileObj.deps = {};

        getFileDeps(file).forEach(function (depFilePath) {
            fileObj.deps[depFilePath] = fileObjs[depFilePath] || (fileObjs[depFilePath] = {});
        });

        var targetPath = path.resolve(options.cwd, dest(file), file.relative);

        if (options.extension) {
            targetPath = gutil.replaceExtension(targetPath, options.extension);
        }

        fs.stat(targetPath, function (err, targetStat) {
            if (err) {
                fileObj.isNew = true;
            } else {
                fileObj.targetLastModified = targetStat.mtime;
            }

            callback();
        });
    }

    // 提取需要更新文件
    function flush(callback) {
        var stream = this;

        Object.keys(fileObjs).forEach(function (filePath) {
            var fileObj = fileObjs[filePath];

            if (fileObj.isNew) {
                if (options.underscore || path.basename(filePath).indexOf('_') !== 0) {
                    stream.push(fileObj.File);
                    gutil.log('文件 "' + filePath + '" 将被更改');
                }
            } else if (getLastModified(fileObj) > fileObj.targetLastModified) {
                stream.push(fileObj.File);
                gutil.log('文件 "' + filePath + '" 将被更改');
            }
        });

        fileObjs = null;
        callback();
    }

    return through2.obj(transform, flush);
};

module.exports.allGetContentsDeps = allGetContentsDeps;
