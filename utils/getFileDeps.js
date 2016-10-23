var path = require('path');

var REG_SCSS_IMPORT = /^(?:[ \t]*(?:\/\*.*)?)@import\s+["']([^"']+(?:\.scss|\.sass)?)["'];?(?:[ \t]*(?:\/[\/\*].*)?)$/gm;
var REG_HTML_EXTENDS = /^(?:[ \t]*(?:\/\*.*)?){%\s*extends\s*["']([^"']+)["']\s*%}(?:[ \t]*(?:\/[\/\*].*)?)$/gm;

var regs = {
    scss: REG_SCSS_IMPORT,
    html: REG_HTML_EXTENDS,
};

module.exports = function (file) {
    var dirname = path.dirname(file.path)
    var extname = path.extname(file.path);

    var reg = regs[extname.slice(1).toLowerCase()];

    if (!reg) {
        return null;
    }

    var rows = file.contents.toString('utf-8').split('\n');

    var deps = [];

    rows.forEach(function (row) {
        var ret = reg.exec(row);

        if (ret) {
            var dep = path.resolve(dirname, ret[1]);

            if (!path.extname(dep)) {
                dep += extname;
            }

            deps.push(dep);
        }
    });

    return deps;
};
