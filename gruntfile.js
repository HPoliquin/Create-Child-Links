/* eslint-disable max-len */
module.exports = function(grunt) {
  grunt.initConfig({
    exec: {
      package_dev: {
        command:
          'tfx extension create --rev-version --manifests vss-extension.json --overrides-file configs/dev.json --output-path dist',
        stdout: true,
        stderr: true,
      },
      mjq_dev: {
        command:
          'tfx extension create --manifests vss-extension.json --overrides-file configs/mjq_dev.json --output-path dist',
        stdout: true,
        stderr: true,
      },
      package_release: {
        command:
          'tfx extension create --rev-version  --manifests vss-extension.json --overrides-file configs/release.json --output-path dist',
        stdout: true,
        stderr: true,
      },
      mjq_release: {
        command:
          'tfx extension create --manifests vss-extension.json --overrides-file configs/mjq_release.json --output-path dist',
        stdout: true,
        stderr: true,
      },
      publish_dev: {
        command:
          'tfx extension publish --service-url https://marketplace.visualstudio.com --manifests vss-extension.json --overrides-file configs/dev.json --output-path dist',
        stdout: true,
        stderr: true,
      },
      publish_release: {
        command:
          'tfx extension publish --service-url https://marketplace.visualstudio.com --manifests vss-extension.json --overrides-file configs/release.json --output-path dist',
        stdout: true,
        stderr: true,
      },
    },

    copy: {
      scripts: {
        files: [
          {
            expand: true,
            flatten: true,
            src: [
              'node_modules/vss-web-extension-sdk/lib/VSS.SDK.min.js',
              'node_modules/bluebird/js/browser/bluebird.min.js',
              'node_modules/jquery/dist/jquery.min.js',
              'node_modules/materialize-css/dist/js/materialize.min.js',
            ],
            dest: 'lib',
            filter: 'isFile',
          },
        ],
      },
      css: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['node_modules/materialize-css/dist/css/materialize.min.css'],
            dest: 'css',
            filter: 'isFile',
          },
        ],
      },
    },

    ts: {
      default: {
        src: ['src/**/*.ts', '!node_modules/**'],
        dest: 'scripts',

        tsconfig: true,
      },
    },

    clean: ['dist/*.vsix'],

    uglify: {
      my_target: {
        files: {
          'dest/output.min.js': ['src/input1.js', 'src/input2.js'],
        },
      },
    },
  });

  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('mjq-dev', [
    'copy',
    'ts',
    'exec:package_dev',
    'exec:mjq_dev',
  ]);
  grunt.registerTask('package-dev', ['copy', 'ts', 'exec:package_dev']);
  grunt.registerTask('package-release', ['copy', 'exec:package_release']);
  grunt.registerTask('mjq-release', [
    'copy',
    'ts',
    'exec:package_release',
    'exec:mjq_release',
  ]);
  grunt.registerTask('publish-dev', ['package-dev', 'exec:publish_dev']);
  grunt.registerTask('publish-release', [
    'package-release',
    'exec:publish_release',
  ]);

  grunt.registerTask('default', ['package-dev']);
};
