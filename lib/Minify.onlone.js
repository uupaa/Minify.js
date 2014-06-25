// @name: Minify.online.js
//
// Closure Compiler Service API Reference:
//  https://developers.google.com/closure/compiler/docs/gettingstarted_api?hl=ja
//  https://developers.google.com/closure/compiler/docs/api-ref

(function(global) {

// --- dependency module -----------------------------------
var fs = require("fs");
var http = require("http");

// --- local variable --------------------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function MinifyOnline(inputs, // @arg StringArray: JavaScript SourceCode file path. [path, ...]
                      param,  // @arg Object: { header, footer, keep, compile, externs, options, advanced, preprocess }
                              //         param.header  - String(= ""): Header part extras JavaScript expression string.
                              //         param.footer  - String(= ""): Footer part extras JavaScript expression string.
                              //         param.keep    - Boolean(= false): keep temporary file.
                              //         param.compile - Boolean(= false): true is compile. false is concat files.
                              //         param.externs - StringArray(= []): Clouser Compiler externs definition file path
                              //         param.options - StringArray(= []): Compile options string.
                              //         param.advanced - Boolean(= false): true is advanced build mode
                              //         param.preprocess - LabelStringArray(= null): [label, ...]
                      fn) {   // @arg Function(= null): callback function. fn(err:Error, result:String)
                              // @help: MinifyOnline
//{@assert
    _if(!_type(inputs, "Array"), "Minify(inputs)");
    _if(!_type(param, "Object", "header,footer,keep,compile,advanced,externs,options,preprocess"), "Minify(,param)");
    _if(!_type(fn, "Function/omit"), "Minify(,,fn)");
//}@assert

    _onlineMinification(inputs, param, fn) // online minification
}

MinifyOnline["repository"] = "https://github.com/uupaa/Minify.js";

// --- implement -------------------------------------------
function _onlineMinification(inputs, // @arg StringArray: JavaScript SourceCode file path. [path, ...]
                             param,  // @arg Object: { header, footer, externs, options, advanced, preprocess }
                                     //     param.header  - String(= ""): Header part extras JavaScript expression string.
                                     //     param.footer  - String(= ""): Footer part extras JavaScript expression string.
                                     //     param.externs - StringArray(= []): Clouser Compiler externs definition file path
                                     //     param.options - StringArray(= []): Compile options string.
                                     //     param.advanced - Boolean(= false): true is advanced mode
                                     //     param.preprocess - LabelStringArray(= null): [label, ...]
                             fn) {   // @arg Function(= null): fn(err:Error, result:String)

    var js       = (param.header || "") + _concatFiles(inputs) + (param.footer || "");
    var externs  = param.externs  || [];
    var options  = param.options  || [];
    var advanced = param.advanced || false;

    if (param.preprocess && param.preprocess.length) {
        js = Minify.preprocess(js, param.preprocess);
    }

    var option = {
            hostname: "closure-compiler.appspot.com",
            path:     "/compile",
            port:     80,
            method:   "POST"
        };
    var req = http.request(option, _responseHandler);

    req.setHeader("Content-Type", "application/x-www-form-urlencoded");
    req.on("error", function(event) {
        console.log("problem with request: " + event.message);
        if (fn) {
            fn(new TypeError(event.message), "");
        }
    });

    var command = [
            "output_format=json",
            "output_info=compiled_code",
            "output_info=warnings",
            "output_info=errors",
            "output_info=statistics",
            "warning_level=default"
        ];

    if (!advanced) {
        command.push("compilation_level=SIMPLE_OPTIMIZATIONS");
    } else {
        command.push("compilation_level=ADVANCED_OPTIMIZATIONS");
        if (externs.length) {
            command.push( "js_externs=" + externs.join(" ") );
        }
    }
    command.push("js_code=" + encodeURIComponent( js ));

    req.end(command.join("&"), "utf8");

    function _responseHandler(res) {
      //console.log("STATUS: " + res.statusCode);
      //console.log("HEADERS: " + JSON.stringify(res.headers));
        if (res.statusCode !== 200) {
            if (fn) {
                fn(new TypeError(res.statusCode), "");
            }
            return;
        }
        var data = "";

        res.on("data", function(chunk) {
            data += chunk;
        });
        res.on("end", function() {
            var json = eval("(" + data + ")");
            var minifiedCode = json.compiledCode;

            if (json.errors) {
                console.log("ERR: "  + JSON.stringify(json.errors,   "", 2));
            }
            if (json.warnings) {
                console.log("WARN: " + JSON.stringify(json.warnings, "", 2));
            }
            if (fn) {
                fn(null, minifiedCode);
            }
        });
    }
}

function _concatFiles(inputs) { // @arg FilePathArray:
                                // @ret String:
    return inputs.map(function(path) {
        if (fs.existsSync(path)) {
            return fs.readFileSync(path, "utf8");
        }
        console.log(path + " is not exists");
        return "";
    }).join("");
}

//{@assert
function _type(value, types, keys) {
    return types.split(/[\|\/]/).some(judge);

    function judge(type) {
        switch (type.toLowerCase()) {
        case "omit":    return value === undefined || value === null;
        case "array":   return Array.isArray(value);
        case "integer": return typeof value === "number" && Math.ceil(value) === value;
        case "object":  return (keys && value && !hasKeys(value, keys)) ? false
                             : (value || 0).constructor === ({}).constructor;
        default:        return Object.prototype.toString.call(value) === "[object " + type + "]";
        }
    }
    function hasKeys(value, keys) {
        var ary = keys ? keys.split(",") : null;

        return Object.keys(value).every(function(key) {
            return ary.indexOf(key) >= 0;
        });
    }
}
function _if(value, msg) {
    if (value) {
        throw new Error(msg);
    }
}
//}@assert

// --- export ----------------------------------------------
//{@node
if (global["process"]) { // node.js
    module["exports"] = MinifyOnline;
}
//}@node
if (global["MinifyOnline"]) {
    global["MinifyOnline_"] = MinifyOnline; // already exsists
} else {
    global["MinifyOnline"]  = MinifyOnline;
}

})(this.self || global);

