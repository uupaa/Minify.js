// Closure Compiler Service
//  http://closure-compiler.appspot.com/home

(function(global) {
"use strict";

// --- dependency module -----------------------------------
var fs = require("fs");
var childProcess = require("child_process");

// --- local variable --------------------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

// --- define ----------------------------------------------
var OUTPUT_FILE   = "./.Minify.output.js";
var TMP_FILE      = "./.Minify.tmp.js";
var CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        GREEN:  "\u001b[32m",
        CLEAR:  "\u001b[0m"
    };

// --- interface -------------------------------------------
function Minify(inputs,  // @arg StringArray - JavaScript SourceCode file path. [path, ...]
                options, // @arg Object = null - { brew, keep, nowrap, header, footer, strict, pretty, option, compile, externs, verbose, workDir, advanced, preprocess }
                         // @options.brew       Boolean = false  - force global installed closure-compiler.
                         // @options.keep       Boolean = false  - keep temporary file.
                         // @options.nowrap     Boolean = false  - false is wrap WebModule idiom.
                         // @options.header     String = ""      - Header part extras JavaScript expression string.
                         // @options.footer     String = ""      - Footer part extras JavaScript expression string.
                         // @options.strict     Boolean = false  - true is add 'use strict'.
                         // @options.pretty     Boolean = false  - true is pretty strict.
                         // @options.option     StringArray = [] - ClosureCompiler additional options string.
                         // @options.compile    Boolean = false  - true is compile. false is concat files.
                         // @options.externs    StringArray = [] - Clouser Compiler externs definition file path
                         // @options.verbose    boolean = false  - true is verbose mode.
                         // @options.workDir    String = ""      - work dir.
                         // @options.advanced   Boolean = false  - true is advanced build mode
                         // @options.preprocess LabelStringArray = null - [label, ...]
                fn) {    // @arg Function = null - callback function. fn(err:Error, result:String)
//{@dev
    _if(!Array.isArray(inputs), Minify, "inputs");
    if (options) {
        _if(options.constructor !== ({}).constructor, Minify, "options");
        _if(!_keys(options, "brew,keep,nowrap,header,footer,strict,pretty,option,compile,externs,verbose,workDir,advanced,preprocess"), Minify, "inputs");
    }
    if (fn) {
        _if(typeof fn !== "function", Minify, "fn");
    }
//}@dev

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
function _makeClouserCompilerOptions(options) { // @arg Object - { keep, nowrap, ... }. see Minify()
                                                // @ret String - "--option value ..."
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

function _offlineMinificationBrew(inputs,        // @arg StringArray - JavaScript SourceCode file path. [path, ...]
                                  options,       // @arg Object - { keep, nowrap, ... }. see Minify()
                                  optionsString, // @arg String
                                  callback) {    // @arg Function = null - callback(err:Error, result:String)

    var js = (options.header || "") + _concatFiles(inputs) + (options.footer || "");

    if (options.preprocess && options.preprocess.length) {
        js = Minify_preprocess(js, options.preprocess);
    }
    fs.writeFileSync(options.workDir + TMP_FILE, js);

    var command = "closure-compiler "  + optionsString +
                  " --js_output_file " + options.workDir + OUTPUT_FILE +
                  " --js "             + options.workDir + TMP_FILE;

    if (options.verbose) {
        console.log(CONSOLE_COLOR.GREEN + command + CONSOLE_COLOR.CLEAR);
    }

    childProcess.exec(command, function(err, stdout, stderr) {
        if (err || stderr) {
            console.log(stderr);
            if (callback) {
                callback(new Error(stderr), "");
            }
        } else {
            var minifiedCode = fs.readFileSync(options.workDir + OUTPUT_FILE, "utf8");

            fs.unlinkSync(options.workDir + OUTPUT_FILE);
            if (!options.keep) {
                fs.unlinkSync(options.workDir + TMP_FILE);
            }
            if (callback) {
                callback(null, minifiedCode);
            }
        }
    });
}

function _offlineMinificationNode(inputs,        // @arg StringArray - JavaScript SourceCode file path. [path, ...]
                                  options,       // @arg Object - { keep, nowrap, ... }. see Minify()
                                  optionsString, // @arg String
                                  callback) {    // @arg Function = null - callback(err:Error, result:String)

    var js = (options.header || "") + _concatFiles(inputs) + (options.footer || "");

    if (options.preprocess && options.preprocess.length) {
        js = Minify_preprocess(js, options.preprocess);
    }
    fs.writeFileSync(options.workDir + TMP_FILE, js);

    if (options.verbose) {
        console.log(CONSOLE_COLOR.GREEN + "\nCompile options: \n  " + optionsString.replace(/\n/g) + CONSOLE_COLOR.CLEAR);
    }

    // `npm install -g uupaa.compile.js`
    var compile = require("uupaa.compile.js");

    compile.exec(options.workDir + TMP_FILE,
                 options.workDir + OUTPUT_FILE,
                 optionsString,
                 function(err, stdout, stderr) {
        if (err || stderr) {
            console.log(stderr);
            if (callback) {
                callback(new Error(stderr), "");
            }
        } else {
            var minifiedCode = fs.readFileSync(options.workDir + OUTPUT_FILE, "utf8");

            fs.unlinkSync(options.workDir + OUTPUT_FILE);
            if (!options.keep) {
                fs.unlinkSync(options.workDir + TMP_FILE);
            }
            if (callback) {
                callback(null, minifiedCode);
            }
        }
    });
}

function Minify_preprocess(js,       // @arg String - JavaScript expression string.
                           labels) { // @arg StringArray - strip labels. ["label", ...]
//{@dev
    _if(typeof js !== "string", Minify_preprocess, "js");
    _if(!Array.isArray(labels), Minify_preprocess, "labels");
//}@dev

    // normalize line feed.
    js = js.replace(/(\r\n|\r|\n)/mg, "\n");

    // trim code block.
    js = _trimCodeBlock(js, labels);

    return js;
}

function _noMinification(inputs,  // @arg StringArray - JavaScript SourceCode file path. [path, ...]
                         options, // @arg Object - { keep, nowrap, ... } see Minify()
                         fn) {    // @arg Function = null - callback function. fn(err:Error, result:String)

    var js = (options.header || "") + _concatFiles(inputs) + (options.footer || "");

    if (options.preprocess && options.preprocess.length) {
        js = Minify_preprocess( js, options.preprocess );
    }
    if (fn) {
        fn(null, js);
    }
}

function _trimCodeBlock(js,       // @arg String - JavaScript expression string.
                        labels) { // @arg StringArray - [label, ...]
                                  // @ret String
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

function _concatFiles(inputs) { // @arg FilePathArray
                                // @ret String
    return inputs.map(function(path) {
        if (fs.existsSync(path)) {
            return fs.readFileSync(path, "utf8");
        }
        console.log(path + " is not exists");
        return "";
    }).join("");
}

//{@dev
function _keys(value, keys) {
    var items = keys.split(",");

    return Object.keys(value).every(function(key) {
        return items.indexOf(key) >= 0;
    });
}

function _if(value, fn, hint) {
    if (value) {
        throw new Error(fn.name + " " + hint);
    }
}
//}@def

// --- export ----------------------------------------------
if ("process" in global) {
    module["exports"] = Minify;
}
global["Minify" in global ? "Minify_" : "Minify"] = Minify; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

