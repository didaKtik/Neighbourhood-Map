// Packages required
var gulp = require('gulp'),
	cache = require('gulp-cached'); // to only process files that have changed


// Folder structure
var imgOr = 'src/img-original',
	imgSrc = 'src/img/',
	webpSrc = imgSrc + '/webp/',
	imgDist = 'dist/img/',
	cssSrc = 'src/css/',
	cssDist = 'dist/css/',
	jsSrc = 'src/js/';

// Clear the whole cache
cache.caches = {};
console.log('hello');


// ===========
// SRC CHORES
// ===========

// .webp generation and compression
gulp.task('webp', function () {
	var webp = require('imagemin-webp');
	return gulp.src(imgOr + '*.{jpg,jpeg,png}')
		.pipe(cache('webp-cache'))
		.pipe(webp()())
		.pipe(gulp.dest(webpSrc));
});

// Image compression
gulp.task('imagemin', function () {
	var imagemin = require('gulp-imagemin'),
		options = {
			optimizationLevel: 5, // .png
			progressive: true // .jpg
		};
	return gulp.src(imgOr + '*.{jpg,jpeg,png}')
		.pipe(cache('imagemin-cache'))
		.pipe(imagemin(options))
		.pipe(gulp.dest(imgSrc));
});

gulp.task('cssmin', function () {
	var cssmin = require('gulp-cssmin'),
		autoprefixer = require('gulp-autoprefixer'),
		rename = require('gulp-rename'),
		autoprefixerOptions = {
            browsers: ['> 5%'],
            cascade: false
        };
    gulp.src([cssSrc + '*.css', '!' + cssSrc + '*min.css'])
    	.cache('cssmin-cache')
    	.pipe(autoprefixer(options))
        .pipe(cssmin())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(cssSrc));
});

// Replaces script references with Google CDN ones (when using bower)
gulp.task('googlecdn', function () {
	var googlecdn = require('gulp-google-cdn');
    return gulp.src('index.html')
        .pipe(googlecdn(require('./bower.json')))
        .pipe(gulp.dest('src'));
});

// Watcher
gulp.task('watch', function () {
	gulp.watch(imgOr, ['webp', 'imagemin']);
	gulp.watch(cssSrc, 'cssmin');
});


// ==================
// SRC TO DIST CHORES
// ==================

gulp.task('cleanDist', function () {
	var del = require('del');
	return del([imgDist]);
});

// populateDist wait that cleanDist finishes
gulp.task('populateDist', ['cleanDist'], function () {
	var cp = require('glob-cp'),
		options = {recursive: true};
	cp(imgSrc, imgDist, options);
	cp(cssSrc, cssDist, options);
});

gulp.task('htmlmin', function () {
	var htmlmin = require('gulp-htmlmin'),
		options = {
			removeComments: true,
			removeCommentsFromCDATA: true,
			collapseWhitespace: true,
			conservativeCollapse: true,
			preserveLineBreaks: true,
			minifyJS: true,
			minifyCSS: true
		};
	return gulp.src('src/*.html')
		.pipe(htmlmin(options))
		.pipe(gulp.dest('dist/'))
});

gulp.task('uglify', function () {
	var uglify = require('gulp-uglify');
	return gulp.src(jsSrc + '**/*.js')
		.pipe(uglify())
		.pipe(gulp.dest('dist/js/'));
});


// ===============
// COMPOSITE TASKS
// ===============
gulp.task('default', function () {
	console.log('This is the only thing I do :)');
});

gulp.task('athome', ['webp', 'imagemin', 'cssmin', 'googlecdn', 'watch']);

// Careful! Order has no importance, tasks run asynchronously by default
gulp.task('readytolaunch', ['cleanDist', 'populateDist', 'htmlmin', 'uglify']);


