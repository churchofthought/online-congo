module.exports = function(grunt) {

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-stylus');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.initConfig({
		concat: {
			dist: {
				src: [
					'client/js/*.js'
				],
				dest: 'public/js/main.js'
			},
		},
		stylus: {
			compile: {
				files: {
					'public/css/main.css': ['client/css/main.styl']
				}
			}
		},
		watch: {
			concat: {
				files: '<%= concat.dist.src %>',
				tasks: ['concat']
			},

			stylus: {
				files: ['client/css/imports/*.styl'],
				tasks: ['stylus']
			},
		}
	});

	grunt.registerTask('default', ['concat', 'stylus']);




};