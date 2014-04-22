#!/usr/bin/env node

(function(global) {

var _USAGE = _multiline(function() {/*
    Usage:
        node Minify.js [@label ...]
                       [--brew]
                       [--help]
                       [--verbose]
                       [--nowrap]
                       [--nocompile]
                       [--header file]
                       [--footer file]
                       [--keep]
                       [--simple]
                       [--strict]
                       [--pretty]
                       [--save json-file]
                       [--option "compile option"]
                       [--extern extern-file]
                       [--output output-file]
                       [--module]
                       [input-files [input-files...]]

    See:
        https://github.com/uupaa/Minify.js/wiki/Minify
*/});

var _CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        GREEN:  "\u001b[32m",
        CLEAR:  "\u001b[0m"
    };

var fs      = require("fs");
var Minify  = require("../lib/Minify");
var argv    = process.argv.slice(2);
var io      = _loadCurrentDirectoryPackageJSON();
var options = _parseCommandLineOptions({
        brew:       false,      // Boolean: use brew installed closure-compiler
        help:       false,      // Boolean: true is show help.
        keep:       false,      // Boolean: keep tmp file.
        save:       "",         // PathString: save to path.
        nowrap:     false,      // Boolean: false is wrap WebModule idiom.
        header:     "",         // PathString: header file
        footer:     "",         // PathString: footer file
        strict:     false,      // Boolean: true is add 'use strict'
        pretty:     false,      // Boolean: true is pretty print
        inputs:     io.inputs,  // PathStringArray: ["input-file-name", ...]
        output:     io.output,  // PathString: "output-file-name"
        option:     [],         // OptionStringArray: ["language_in ECMASCRIPT5_STRICT", ...];
        compile:    true,       // Boolean: true is compile
        externs:    [],         // ExternFilePathArray: ["externs-file-name", ...]
        modules:    [],         // ModuleNameStringArray: [moduel, ...]
        verbose:    false,      // Boolean: true is verbose mode.
        workDir:    "",         // PathString: work dir.
        advanced:   true,       // Boolean: true is ADVANCED_OPTIMIZATIONS MODE
        preprocess: ["assert"]  // LabelStringArray: ["assert", "debug", ...]
    });

if (options.help) {
    console.log(_CONSOLE_COLOR.YELLOW + _USAGE + _CONSOLE_COLOR.CLEAR);
    return;
}
if (!options.inputs.length) {
    console.log(_CONSOLE_COLOR.RED + "Input files are empty." + _CONSOLE_COLOR.CLEAR);
    return;
}
if (!options.output.length) {
    console.log(_CONSOLE_COLOR.RED + "Output file is empty." + _CONSOLE_COLOR.CLEAR);
    return;
}
if (!options.workDir.length) {
    console.log(_CONSOLE_COLOR.RED + "WorkDir is empty." + _CONSOLE_COLOR.CLEAR);
    return;
}

if (options.verbose || options.save) {
    var packageJSON = JSON.parse( fs.readFileSync("./package.json") );
    var object = {
        name:    packageJSON.name,
        modules: options.modules,
        inputs:  options.inputs
    };
    if (options.verbose) {
        console.log(_CONSOLE_COLOR.GREEN + JSON.stringify(object, null, 2) + _CONSOLE_COLOR.CLEAR);
    }
    if (options.save) {
        fs.writeFileSync(options.save, JSON.stringify(object, null, 2));
    }
}

Minify(options.inputs, {
    "brew":         options.brew,
    "keep":         options.keep,
    "nowrap":       options.nowrap,
    "header":       options.header,
    "footer":       options.footer,
    "strict":       options.strict,
    "pretty":       options.pretty,
    "option":       options.option,
    "compile":      options.compile,
    "externs":      options.externs,
    "verbose":      options.verbose,
    "workDir":      options.workDir,
    "advanced":     options.advanced,
    "preprocess":   options.preprocess
}, function(err,  // @arg Error:
            js) { // @arg String: minified JavaScript Expression string.
    fs.writeFileSync(options.output, js);
});

function _loadCurrentDirectoryPackageJSON() {
    var path   = "./package.json";
    var json   = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : {};
    var build  = json["x-build"] || json["build"] || {};
    var inputs = build.inputs || [];
    var output = build.output || "";

    return { inputs: inputs, output: output };
}

function _parseCommandLineOptions(options) {
    for (var i = 0, iz = argv.length; i < iz; ++i) {
        switch (argv[i]) {
        case "--module":    options.inputs = []; // clear
                            _loadModule(options, "./", "package.json");
        }
    }

    for (var i = 0, iz = argv.length; i < iz; ++i) {
        switch (argv[i]) {
        case "-h":
        case "--help":      options.help = true; break;
        case "-v":
        case "--brew":      options.brew = true; break;
        case "--verbose":   options.verbose = true; break;
        case "--save":      options.save = argv[++i]; break;
        case "--nowrap":    options.nowrap = true; break;
        case "--nocompile": options.compile = false; break;
        case "--header":    options.header = fs.readFileSync(argv[++i], "utf8"); break;
        case "--footer":    options.footer = fs.readFileSync(argv[++i], "utf8"); break;
        case "--strict":    options.strict = true; break;
        case "--pretty":    options.pretty = true; break;
        case "--keep":      options.keep = true; break;
        case "--simple":    options.advanced = false; break;
        case "--output":    options.output = argv[++i]; break;
        case "--extern":    options.externs.push( argv[++i] ); break;
        case "--option":    options.option.push( argv[++i] ); break;
        case "--module":    break;
        default:
            if (argv[i][0] === "@") {
                options.preprocess.push(argv[i].slice(1));
            } else {
                if (options.inputs.indexOf("./" + argv[i]) < 0 &&
                    options.inputs.indexOf(       argv[i]) < 0) { // avoid duplicate
                    options.inputs.push(argv[i]);
                }
            }
        }
    }
    // work dir
    if (options.output) {
        if (options.output.indexOf("/") <= 0) {
            options.workDir = "./";
        } else {
            // "release/Zzz.min.js" -> "release/";
            options.workDir = (options.output.split("/").slice(0, -1)).join("/") + "/";
        }
    }
    return options;
}

function _loadModule(options, // @arg Object: { inputs, modules }
                     dir,     // @arg String: "./"
                     file) {  // @arg String: "package.json"
    var json = JSON.parse( fs.readFileSync(dir + file) );

    if (json.dependencies) {
        Object.keys(json.dependencies).forEach(function(moduleName) {

            if (options.modules.indexOf(moduleName) < 0) { // avoid duplicate
                var path = dir + "node_modules/" + moduleName + "/" + file;

                if (fs.existsSync(path)) {
                    options.modules.push(moduleName);
                    _loadModule(options, dir + "node_modules/" + moduleName + "/", file);
                }
            }
        });
    }
    var build = json["x-build"] || json["build"];

    if (build) {
        if (Array.isArray(build.inputs)) {
            build.inputs.forEach(function(file) {
                if (options.inputs.indexOf(file) < 0) { // avoid duplicate
                    options.inputs.push(dir + file);
                }
            });
        }
    }
}

function _multiline(fn) { // @arg Function:
                          // @ret String:
    return (fn + "").split("\n").slice(1, -1).join("\n");
}

})((this || 0).self || global);

