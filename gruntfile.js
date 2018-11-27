module.exports = function (grunt) {
    grunt.initConfig({
        exec: {
            mjq_dev: {
                command: "tfx extension create --manifests vss-extension.json --overrides-file static/configs/mjq_dev.json --output-path dist" ,
                stdout: true,
                stderr: true
            },
            package_dev: {
                command: "tfx extension create --rev-version --manifests vss-extension.json --overrides-file static/configs/dev.json --output-path dist" ,
                stdout: true,
                stderr: true
            },
            package_release: {
                command: "tfx extension create  --manifests vss-extension.json --overrides-file static/configs/release.json --output-path dist",
                stdout: true,
                stderr: true
            },
            publish_dev: {
                command: "tfx extension publish --service-url https://marketplace.visualstudio.com --manifests vss-extension.json --overrides-file static/configs/dev.json --output-path dist",
                stdout: true,
                stderr: true
            },
            publish_release: {
                command: "tfx extension publish --service-url https://marketplace.visualstudio.com --manifests vss-extension.json --overrides-file static/configs/release.json --output-path dist",
                stdout: true,
                stderr: true
            }
        },

        copy: {
            scripts: {
                files: [{
                    expand: true, 
                    flatten: true, 
                    src: ["node_modules/vss-web-extension-sdk/lib/VSS.SDK.min.js", 
                          "node_modules/bluebird/js/browser/bluebird.min.js"], 
                    dest: "lib",
                    filter: "isFile" 
                }]
            }
        },

        ts: {
            default : {
                src: ["src/**/*.ts"],
                dest: "scripts",
                tsconfig: true
            }
        },

        clean: ["dist/*.vsix"]

        
    });
    
    grunt.loadNpmTasks("grunt-exec");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks("grunt-ts");

    grunt.registerTask("mjq-dev", ["copy", "ts", "exec:package_dev", "exec:mjq_dev"]);
    grunt.registerTask("package-dev", ["copy", "ts", "exec:package_dev"]);
    grunt.registerTask("package-release", ["copy", "exec:package_release"]);
    grunt.registerTask("publish-dev", ["package-dev", "exec:publish_dev"]);        
    grunt.registerTask("publish-release", ["package-release", "exec:publish_release"]);        
    
    grunt.registerTask("default", ["package-dev"]);
};