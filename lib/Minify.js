// @name: Minify.js
// @require: none
// @cutoff: @assert @node
//
// Closure Compiler Service
//  http://closure-compiler.appspot.com/home

(function(global) {

// --- variable --------------------------------------------
var fs = require("fs");
var childProcess = require("child_process");

// --- define ----------------------------------------------
var _OUTPUT_FILE   = "./.Minify.output.js";
var _TMP_FILE      = "./.Minify.tmp.js";
var _CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        GREEN:  "\u001b[32m",
        CLEAR:  "\u001b[0m"
    };

// --- interface -------------------------------------------
function Minify(inputs,  // @arg StringArray: JavaScript SourceCode file path. [path, ...]
                options, // @arg Object: { brew, keep, nowrap, header, footer, strict, pretty, option, compile, externs, verbose, workDir, advanced, preprocess }
                         //         options.brew    - Boolean(= false): force global installed closure-compiler.
                         //         options.keep    - Boolean(= false): keep temporary file.
                         //         options.nowrap  - Boolean(= false): false is wrap WebModule idiom.
                         //         options.header  - String(= ""): Header part extras JavaScript expression string.
                         //         options.footer  - String(= ""): Footer part extras JavaScript expression string.
                         //         options.strict  - Boolean(= false): true is add 'use strict'.
                         //         options.pretty  - Boolean(= false): true is pretty strict.
                         //         options.option  - StringArray(= []): ClosureCompiler additional options string.
                         //         options.compile - Boolean(= false): true is compile. false is concat files.
                         //         options.externs - StringArray(= []): Clouser Compiler externs definition file path
                         //         options.verbose - boolean(= false): true is verbose mode.
                         //         options.workDir - String(= ""): work dir.
                         //         options.advanced - Boolean(= false): true is advanced build mode
                         //         options.preprocess - LabelStringArray(= null): [label, ...]
                fn) {    // @arg Function(= null): callback function. fn(err:Error, result:String)
                         // @help: Minify
//{@assert
    _if(!Valid_type(inputs, "Array"), "Minify(inputs)");
    _if(!Valid_type(options, "Object", "brew,keep,nowrap,header,footer,strict,pretty," +
                                       "option,compile,externs," +
                                       "verbose,workDir,advanced,preprocess"), "Minify(,options)");
    _if(!Valid_type(fn, "Function/omit"), "Minify(,,fn)");
//}@assert

    var optionsString = _makeClouserCompilerOptions(options);

    if (options.compile) {
        childProcess.exec("which -s closure-compiler", function(err) {
            var brew = options.brew || false;

            if (err) {
                brew = false;
            }

            if (brew) {
                // $ brew install closure-compiler
                _offlineMinificationBrew(inputs, options, optionsString, fn);
            } else {
                // $ node install closure-compiler
                _offlineMinificationNode(inputs, options, optionsString, fn);
            }
        });
    } else {
        // debug build, concat and preprocess only.
        _noMinification(inputs, options, fn);
    }
}

Minify["repository"] = "https://github.com/uupaa/Minify.js";
Minify["preprocess"] = Minify_preprocess; // Minify.preprocess(js:JavaScriptExpressionString, labels):String

// --- implement -------------------------------------------
function _makeClouserCompilerOptions(options) { // @arg Object: { keep, nowrap, ... }. see Minify()
                                                // @ret String: "--option value ..."
    var result = [];

  //result["transform_amd_modules"] = "";
  //result["create_source_map"] = "source.map";

    if (options.advanced) {
        result.push("--compilation_level ADVANCED_OPTIMIZATIONS");
        if (options.externs && options.externs.length) {
            result.push("--externs " + options.externs.join(" --externs "));
        }
    } else {
        result.push("--compilation_level SIMPLE_OPTIMIZATIONS");
    }
    if (!options.nowrap) { // wrap WebModule idiom
        result.push("--output_wrapper '(function(global){\n%output%\n})((this||0).self||global);'");
    }
    if (options.strict) {
        result.push("--language_in ECMASCRIPT5_STRICT");
    }
    if (options.pretty) {
        result.push("--formatting pretty_print");
    }
    if (options.option.length) {
        result.push("--" + optionsObject.option.join(" --"));
    }
    return result.join(" ");
}

function _offlineMinificationBrew(inputs,        // @arg StringArray: JavaScript SourceCode file path. [path, ...]
                                  options,       // @arg Object: { keep, nowrap, ... }. see Minify()
                                  optionsString, // @arg String:
                                  callback) {    // @arg Function(= null): callback(err:Error, result:String)

    var js = (options.header || "") + _concatFiles(inputs) + (options.footer || "");

    if (options.preprocess && options.preprocess.length) {
        js = Minify_preprocess(js, options.preprocess);
    }
    fs.writeFileSync(options.workDir + _TMP_FILE, js);

    var command = "closure-compiler "  + optionsString +
                  " --js_output_file " + options.workDir + _OUTPUT_FILE +
                  " --js "             + options.workDir + _TMP_FILE;

    if (options.verbose) {
        console.log(_CONSOLE_COLOR.GREEN + command + _CONSOLE_COLOR.CLEAR);
    }

    childProcess.exec(command, function(err, stdout, stderr) {
        if (err || stderr) {
            console.log(stderr);
            if (callback) {
                callback(new Error(stderr), "");
            }
        } else {
            var minifiedCode = fs.readFileSync(options.workDir + _OUTPUT_FILE, "utf8");

            fs.unlinkSync(options.workDir + _OUTPUT_FILE);
            if (!options.keep) {
                fs.unlinkSync(options.workDir + _TMP_FILE);
            }
            if (callback) {
                callback(null, minifiedCode);
            }
        }
    });
}

function _offlineMinificationNode(inputs,        // @arg StringArray: JavaScript SourceCode file path. [path, ...]
                                  options,       // @arg Object: { keep, nowrap, ... }. see Minify()
                                  optionsString, // @arg String:
                                  callback) {    // @arg Function(= null): callback(err:Error, result:String)

    var js = (options.header || "") + _concatFiles(inputs) + (options.footer || "");

    if (options.preprocess && options.preprocess.length) {
        js = Minify_preprocess(js, options.preprocess);
    }
    fs.writeFileSync(options.workDir + _TMP_FILE, js);

    if (options.verbose) {
        console.log(_CONSOLE_COLOR.GREEN + "\nCompile options: \n  " + optionsString.replace(/\n/g) + _CONSOLE_COLOR.CLEAR);
    }
    var compile = require("uupaa.compile.js");

    compile.exec(options.workDir + _TMP_FILE,
                 options.workDir + _OUTPUT_FILE,
                 optionsString,
                 function(err, stdout, stderr) {
        if (err || stderr) {
            console.log(stderr);
            if (callback) {
                callback(new Error(stderr), "");
            }
        } else {
            var minifiedCode = fs.readFileSync(options.workDir + _OUTPUT_FILE, "utf8");

            fs.unlinkSync(options.workDir + _OUTPUT_FILE);
            if (!options.keep) {
                fs.unlinkSync(options.workDir + _TMP_FILE);
            }
            if (callback) {
                callback(null, minifiedCode);
            }
        }
    });
}

function Minify_preprocess(js,       // @arg String: JavaScript expression string.
                           labels) { // @arg StringArray: strip labels. ["label", ...]
//{@assert
    _if(!Valid_type(js, "String"),    "Minify.preprocess(js)");
    _if(!Valid_type(labels, "Array"), "Minify.preprocess(,labels)");
//}@assert

    // normalize line feed.
    js = js.replace(/(\r\n|\r|\n)/mg, "\n");

    // trim code block.
    js = _trimCodeBlock(js, labels);

    return js;
}

function _noMinification(inputs,  // @arg StringArray: JavaScript SourceCode file path. [path, ...]
                         options, // @arg Object: { keep, nowrap, ... } see Minify()
                         fn) {    // @arg Function(= null): callback function. fn(err:Error, result:String)
    var js = (options.header || "") + _concatFiles(inputs) + (options.footer || "");

    if (options.preprocess && options.preprocess.length) {
        js = Minify_preprocess( js, options.preprocess );
    }
    if (fn) {
        fn(null, js);
    }
}

function _trimCodeBlock(js,       // @arg String: JavaScript expression string.
                        labels) { // @arg StringArray: [label, ...]
                                  // @ret String:
    return labels.reduce(function(js, label) {
        // trim:
        //
        // {@label ... }@label
        //
        var line  = RegExp("\\{@" + label + "\\b(?:[^\\n]*)\\}@" +
                                    label + "\\b", "g");

        // trim:
        //
        // {@label
        //   ...
        // }@label
        //
        var lines = RegExp("\\{@" + label + "\\b(?:[^\\n]*)\n(?:[\\S\\s]*?)?\\}@" +
                                    label + "\\b", "g");

        return js.replace(line, " ").replace(lines, " ");
    }, js);
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
function Valid_type(value,      // @arg Any:
                    types,      // @arg TypeString: eg: "Type1", "Type1/Type2/omit", "JSON"
                    validate) { // @arg String/SchemeJSON(= null):
                                // @ret Boolean:
                                // @help: Valid.type
    return types.split(/[\|\/]/).some(_judge);

    function _judge(type) {
        switch (type.toLowerCase()) {
        case "omit":    return value === undefined || value === null;
        case "null":    return value === null;
        case "undefined":return value === undefined;
        case "array":   return Array.isArray(value);
        case "integer": return typeof value === "number" && Math.ceil(value) === value;
//      case "json":    return Valid_json(value, validate);
        case "object":  // typeof null -> object
            return (value || 0).constructor !== ({}).constructor ? false
                 : typeof validate === "string" ? Valid_keys(value, validate)
                                                : true;
        }
        if (value !== undefined && value !== null) {
            if (Object.prototype.toString.call(value) === "[object " + type + "]") {
                return true;
            } else if (value.constructor.name === type) {
                return true;
            }
        }
        return false;
    }
}
//}@assert

//{@assert
function Valid_keys(value,  // @arg Object: { key1, key2 }
                    keys) { // @arg String: valid choices. "key1,key2,key3"
                            // @ret Boolean: false is invalid value.
                            // @help: Valid.keys
    var items = keys.split(",");

    return Object.keys(value).every(function(key) {
        return items.indexOf(key) >= 0;
    });
}
//}@assert

//{@assert
function _if(value, msg) {
    if (value) {
        throw new Error(msg);
    }
}
//}@assert

// --- export ----------------------------------------------
//{@node
if (global["process"]) { // node.js
    module["exports"] = Minify;
}
//}@node
if (global["Minify"]) {
    global["Minify_"] = Minify; // already exsists
} else {
    global["Minify"]  = Minify;
}

})((this || 0).self || global);

