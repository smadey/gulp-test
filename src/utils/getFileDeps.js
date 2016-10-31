var path = require('path');

var REG_SCSS_IMPORT = /\@import\s*([.\s\S]+?);?$/g;
var REG_SCSS_IMPORT_DEP = /["'](.+?)["']/g;
var REG_SCSS_COMMENTS = /\/\*.+?\*\/|\/\/.*(?=[\n\r])/g;

var allGetContentsDeps = {
    scss: function (contents) {
        contents = contents.replace(REG_SCSS_COMMENTS, ''); // 移除注释

        var importMatch;
        var depMatch;

        var deps = [];

        while ((importMatch = REG_SCSS_IMPORT.exec(contents)) !== null) {
            while ((depMatch = REG_SCSS_IMPORT_DEP.exec(importMatch[1])) !== null) {
                deps.push(depMatch[1]);
            }
        }

        return deps;
    },
};

module.exports = function (file, options) {
    if (!options) {
        options = {};
    }

    var dirname = path.dirname(file.path)
    var extname = path.extname(file.path);

    var ext = extname.slice(1).toLowerCase();

    var getContentsDeps = options.getContentsDeps || allGetContentsDeps[ext];

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
};
