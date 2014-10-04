#!/usr/bin/env node

(function(global) {

var USAGE = _multiline(function() {/*
    Usage:
        node Minify.js [@label ...]
                       [--brew]
                       [--help]
                       [--verbose]
                       [--nowrap]
                       [--nocompile]
                       [--header file]
                       [--footer file]
                       [--es5in]
                       [--es6in]
                       [--es5out]
                       [--es6out]
                       [--keep]
                       [--simple]
                       [--strict]
                       [--pretty]
                       [--option "compile option"]
                       [--extern file]
                       [--output file]
                       [--source file]
                       [--label @label]
                       [--release]

    See:
        https://github.com/uupaa/Minify.js/wiki/Minify
*/});

var CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        GREEN:  "\u001b[32m",
        CLEAR:  "\u001b[0m"
    };

var fs      = require("fs");
var Minify  = require("../lib/Minify");
var argv    = process.argv.slice(2);
var NodeModule = require("uupaa.nodemodule.js");
var pkg     = _loadCurrentDirectoryPackageJSON();
var options = _parseCommandLineOptions({
        name:       pkg.name,       // Object       - { git:String, npm:String }. github repository name, npm package name.
        brew:       false,          // Boolean      - use brew installed closure-compiler.
        help:       false,          // Boolean      - true is show help.
        keep:       false,          // Boolean      - keep tmp file.
        label:      ["dev", "debug", "assert"], // LabelStringArray
        nowrap:     false,          // Boolean      - false -> wrap WebModule idiom.
        header:     "",             // PathString   - header file.
        footer:     "",             // PathString   - footer file.
        es5in:      false,          // Boolean      - input ES5 code.
        es6in:      false,          // Boolean      - input ES6 code.
        es5out:     false,          // Boolean      - output ES5 code.
        es6out:     false,          // Boolean      - output ES6 code.
        strict:     false,          // Boolean      - true -> add 'use strict'.
        pretty:     false,          // Boolean      - true -> pretty print.
        source:     pkg.source,     // PathStringArray - package.json x-build.source. ["source-file", ...]
        target:     pkg.target,     // StringArray  - build target. ["Browser", "Worker", "Node"]
        output:     pkg.output,     // PathString   - "output-file-name"
        option:     [],             // OptionStringArray - ["language_in ECMASCRIPT5_STRICT", ...]
        compile:    true,           // Boolean      - true -> compile.
        release:    false,          // Boolean      - true -> release build, use NodeModule.files().
        externs:    [],             // FilePathArray- ["externs-file-name", ...]
        verbose:    false,          // Boolean      - true -> verbose mode.
        workDir:    "",             // PathString   - work dir.
        advanced:   true            // Boolean      - true -> ADVANCED_OPTIMIZATIONS MODE.
    });

if (options.help) {
    console.log(CONSOLE_COLOR.YELLOW + USAGE + CONSOLE_COLOR.CLEAR);
    return;
}
if (!options.source.length) {
    console.log(CONSOLE_COLOR.RED + "Input source are empty." + CONSOLE_COLOR.CLEAR);
    return;
}
if (!options.output.length) {
    console.log(CONSOLE_COLOR.RED + "Output file is empty." + CONSOLE_COLOR.CLEAR);
    return;
}
if (!options.workDir.length) {
    console.log(CONSOLE_COLOR.RED + "WorkDir is empty." + CONSOLE_COLOR.CLEAR);
    return;
}

var sources = options.source;

if (options.release) {
    var source = NodeModule.files().all;

    sources = NodeModule.uniqueArray([].concat(source, sources)).unique;

    if (options.verbose) {
        console.log("Release build source: " + JSON.stringify(sources, null, 2));
    }
}

if (!_isFileExists(options.externs)) {
    console.log(CONSOLE_COLOR.YELLOW + USAGE + CONSOLE_COLOR.CLEAR);
    return;
}
if (!_isFileExists(sources)) {
    console.log(CONSOLE_COLOR.YELLOW + USAGE + CONSOLE_COLOR.CLEAR);
    return;
}

Minify(sources, {
    "brew":         options.brew,
    "keep":         options.keep,
    "label":        options.label,
    "nowrap":       options.nowrap,
    "header":       options.header,
    "footer":       options.footer,
    "es5in":        options.es5in,
    "es6in":        options.es6in,
    "es5out":       options.es5out,
    "es6out":       options.es6out,
    "strict":       options.strict,
    "pretty":       options.pretty,
    "option":       options.option,
    "compile":      options.compile,
    "externs":      options.externs,
    "verbose":      options.verbose,
    "workDir":      options.workDir,
    "advanced":     options.advanced
}, function(err,  // @arg Error
            js) { // @arg String - minified JavaScript Expression string.
    fs.writeFileSync(options.output, js);
});

function _loadCurrentDirectoryPackageJSON() {
    var path   = "./package.json";
    var json   = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : {};
    var npm    = json["name"] || "";
    var git    =(json["url"] || "").split("/").pop();
    var build  = json["x-build"] || json["build"] || {};
    var source = build.source  || build.files || [];
    var output = build.output  || "";
    var target = build.target  || ["all"];

    return {
        name:   { git: git, npm: npm },
        source: source,
        output: output,
        target: target
    };
}

function _isFileExists(fileList) { // @arg Array
                                   // @ret Boolean
    return fileList.every(function(file) {
        if (!fs.existsSync(file)) {
            console.log(CONSOLE_COLOR.RED + "File not found: " + file + CONSOLE_COLOR.CLEAR);
            return false;
        }
        return true;
    });
}

function _parseCommandLineOptions(options) {
    for (var i = 0, iz = argv.length; i < iz; ++i) {
        switch (argv[i]) {
        case "-h":
        case "--help":      options.help = true; break;
        case "-v":
        case "--brew":      options.brew = true; break;
        case "--verbose":   options.verbose = true; break;
        case "--nowrap":    options.nowrap = true; break;
        case "--nocompile": options.compile = false; break;
        case "--header":    options.header = fs.readFileSync(argv[++i], "utf8"); break;
        case "--footer":    options.footer = fs.readFileSync(argv[++i], "utf8"); break;
        case "--es5in":     options.es5in = true; break;
        case "--es6in":     options.es6in = true; break;
        case "--es5out":    options.es5out = true; break;
        case "--es6out":    options.es6out = true; break;
        case "--strict":    options.strict = true; break;
        case "--pretty":    options.pretty = true; break;
        case "--keep":      options.keep = true; break;
        case "--simple":    options.advanced = false; break;
        case "--output":    options.output = argv[++i]; break;
        case "--extern":
        case "--externs":   _pushif(options.externs, argv[++i]); break;
        case "--option":    _pushif(options.option, argv[++i]); break;
        case "--module":
        case "--release":   options.release = true; break;
        case "--label":     _pushif(options.label, argv[++i].replace(/^@/, "")); break;
        case "--source":    _pushif(options.source, argv[++i]); break;
        default:
            if ( /^@/.test(argv[i]) ) { // @label
                _pushif(options.label, argv[i].replace(/^@/, ""));
            } else {
                throw new Error("Unknown option: " + argv[i]);
            }
        }
    }
    // work dir
    if (options.output) {
        if (options.output.indexOf("/") <= 0) {
            options.workDir = "";
        } else {
            // "release/Zzz.min.js" -> "release/";
            options.workDir = (options.output.split("/").slice(0, -1)).join("/") + "/";
        }
    }
    return options;
}

function _pushif(source, value) {
    if (source.indexOf(value) < 0) { // avoid duplicate
        source.push(value);
    }
}

function _multiline(fn) { // @arg Function
                          // @ret String
    return (fn + "").split("\n").slice(1, -1).join("\n");
}

})((this || 0).self || global);

