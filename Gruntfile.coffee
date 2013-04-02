module.exports = (grunt) ->
  grunt.config.init
    coffee:
      compile:
        files: [
          {
            expand: true
            cwd: 'src/main/coffee'
            src: [ '**/*.coffee' ]
            dest: 'lib' 
            ext: '.js'
          }
        ]

  grunt.loadNpmTasks 'grunt-contrib-coffee'

  grunt.registerTask 'default', [ 'coffee:compile' ]