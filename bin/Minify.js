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
                       [--save build.json]
                       [--option "compile option"]
                       [--extern extern-file]
                       [--output output-file]
                       [--module]
                       [--release]
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
var package = _loadCurrentDirectoryPackageJSON();
var options = {
        name:       package.name,   // Object: { git:String, npm:String }. github repository name, npm package name.
        brew:       false,          // Boolean: use brew installed closure-compiler.
        help:       false,          // Boolean: true is show help.
        keep:       false,          // Boolean: keep tmp file.
        save:       "build.json",   // PathString: save to path.
        nowrap:     false,          // Boolean: false is wrap WebModule idiom.
        header:     "",             // PathString: header file.
        footer:     "",             // PathString: footer file.
        strict:     false,          // Boolean: true is add 'use strict'.
        pretty:     false,          // Boolean: true is pretty print.
        files:      package.files,  // PathStringArray: package.json x-build.files. ["input-file-name", ...]
        target:     package.target, // StringArray: build target. ["Browser", "Worker", "Node"]
        moduleTargets: {},          // Object: { moduleName: ["Browser", "Worker", "Node"], ... }
        dependenciesFiles: [],      // PathStringArray: dependencies files. ["input-file-name", ...]
        dependenciesModules: [],    // ModuleNameStringArray: [module, ...]
        devDependenciesFiles: [],   // PathStringArray: devDependencies files. ["input-file-name", ...]
        devDependenciesModules: [], // ModuleNameStringArray: [module, ...]
        output:     package.output, // PathString: "output-file-name"
        option:     [],             // OptionStringArray: ["language_in ECMASCRIPT5_STRICT", ...];
        compile:    true,           // Boolean: true is compile.
        release:    false,          // Boolean: true is release build, use dependenciesFiles.
        externs:    [],             // ExternFilePathArray: ["externs-file-name", ...]
        verbose:    false,          // Boolean: true is verbose mode.
        workDir:    "",             // PathString: work dir.
        advanced:   true,           // Boolean: true is ADVANCED_OPTIMIZATIONS MODE.
        preprocess: ["assert"]      // LabelStringArray: ["assert", "debug", ...]
    };

options.moduleTargets[package.name.npm] = package.target;
_loadDependenciesModule(options, "", "package.json");
_loadDevDependenciesModule(options, "", "package.json");

options = _parseCommandLineOptions(options);

if (options.help) {
    console.log(_CONSOLE_COLOR.YELLOW + _USAGE + _CONSOLE_COLOR.CLEAR);
    return;
}
if (!options.files.length) {
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

var files = options.files;

if (options.release) {
    files = [].concat(options.dependenciesFiles, options.files);
}

Minify(files, {
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

    if (options.save) {
        _saveBuildSettings(options);
    }
});

function _loadCurrentDirectoryPackageJSON() {
    var path   = "./package.json";
    var json   = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : {};
    var npm    = json["name"] || "";
    var git    =(json["url"] || "").split("/").pop();
    var build  = json["x-build"] || json["build"] || {};
    var files  = build.files  || build.inputs || [];        // build.files is deprecated.
    var output = build.output || "";
    var target = build.target || ["Browser", "Worker", "Node"];

    return {
        name:   { git: git, npm: npm },
        files:  files,
        output: output,
        target: target
    };
}

function _saveBuildSettings(options) {
    var saveSettingsObject = {
            name: options.name,
            build: {
                files:  options.files,
                output: options.output,
                target: options.target
            },
            moduleTargets: options.moduleTargets,
            dependenciesFiles: options.dependenciesFiles,
            dependenciesModules: options.dependenciesModules,
            devDependenciesFiles: options.devDependenciesFiles,
            devDependenciesModules: options.devDependenciesModules
        };

    if (options.verbose) {
        console.log(_CONSOLE_COLOR.GREEN +
                    "\nSave Build settings:  \n" + options.save + ": " +
                    JSON.stringify(saveSettingsObject, null, 2) + _CONSOLE_COLOR.CLEAR);
    }
    fs.writeFileSync(options.save, JSON.stringify(saveSettingsObject, null, 2) + "\n");
}

function _parseCommandLineOptions(options) {
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
        case "--module":
        case "--relase":    options.release = true; break;
        default:
            if (argv[i][0] === "@") {
                options.preprocess.push(argv[i].slice(1));
            } else {
                if (options.files.indexOf(argv[i]) < 0) { // avoid duplicate
                    options.files.push(argv[i]);
                }
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

function _loadDependenciesModule(options,  // @arg Object: { dependenciesFiles, dependenciesModules }
                                 dir,      // @arg String: ""
                                 file) {   // @arg String: "package.json"
    var json = JSON.parse( fs.readFileSync(dir + file) );

    if (json.dependencies) {
        Object.keys(json.dependencies).forEach(function(moduleName) {

            if (options.dependenciesModules.indexOf(moduleName) < 0) { // avoid duplicate
                var path = dir + "node_modules/" + moduleName + "/" + file;

                if (fs.existsSync(path)) {
                    options.dependenciesModules.push(moduleName);
                    _loadDependenciesModule(options, dir + "node_modules/" + moduleName + "/", file);
                }
            }
        });
    }
    if (dir) {
        var build = json["x-build"] || json["build"];

        if (build) {
            var files = build.files || build.inputs || null; // build.inputs is deprecated.

            if (Array.isArray(files)) {
                files.forEach(function(file) {
                    if (options.dependenciesFiles.indexOf(file) < 0) { // avoid duplicate
                        options.dependenciesFiles.push(dir + file);
                    }
                });
            }
            if (!build.target) {
                if (options.verbose) {
                    console.log(_CONSOLE_COLOR.YELLOW + "build.target undefined in " + json.name + _CONSOLE_COLOR.CLEAR);
                }
            }
            options.moduleTargets[json.name] = build.target;
        }
    }
}

function _loadDevDependenciesModule(options,  // @arg Object: { devDependenciesFiles, devDependenciesModules }
                                    dir,      // @arg String: ""
                                    file) {   // @arg String: "package.json"
    var json = JSON.parse( fs.readFileSync(dir + file) );

    if (json.devDependencies) {
        Object.keys(json.devDependencies).forEach(function(moduleName) {

            if (options.devDependenciesModules.indexOf(moduleName) < 0) { // avoid duplicate
                var path = dir + "node_modules/" + moduleName + "/" + file;

                if (fs.existsSync(path)) {
                    options.devDependenciesModules.push(moduleName);
                    _loadDevDependenciesModule(options, dir + "node_modules/" + moduleName + "/", file);
                }
            }
        });
    }
    if (dir) {
        var build = json["x-build"] || json["build"];

        if (build) {
            var files = build.files || build.inputs || null; // build.inputs is deprecated.

            if (Array.isArray(files)) {
                files.forEach(function(file) {
                    if (options.devDependenciesFiles.indexOf(file) < 0) { // avoid duplicate
                        options.devDependenciesFiles.push(dir + file);
                    }
                });
            }
            if (!build.target) {
                if (options.verbose) {
                    console.log(_CONSOLE_COLOR.YELLOW + "build.target undefined in " + json.name + _CONSOLE_COLOR.CLEAR);
                }
            }
            options.moduleTargets[json.name] = build.target;
        }
    }
}

function _multiline(fn) { // @arg Function:
                          // @ret String:
    return (fn + "").split("\n").slice(1, -1).join("\n");
}

})((this || 0).self || global);

