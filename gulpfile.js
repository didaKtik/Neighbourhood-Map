// General purpose
var gulp = require('gulp');
var cache = require('gulp-cached'); // to only process files that have changed
var sourcemaps   = require('gulp-sourcemaps'); // to have nice debugging in developper tools even after minification
var rename = require('gulp-rename');
var del = require('del');
var cp = require('glob-cp');
var concat = require('gulp-concat');

// Images
var webp = require('imagemin-webp');
var imagemin = require('gulp-imagemin');
var responsive = require('gulp-responsive-images');

// CSS
var postcss      = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');

// HTML
var googlecdn = require('gulp-google-cdn');
var htmlmin = require('gulp-htmlmin');

// JS
var uglify = require('gulp-uglify');


// Folder structure
var imgOr = 'src/img-original/',
	imgSrc = 'src/img/',
	webpSrc = imgSrc + '/webp/',
	imgDist = 'dist/img/',
	cssSrc = 'src/css/',
	cssDist = 'dist/css/',
	jsSrc = 'src/js/',
	jsDist = 'dist/js';

// Clear the whole cache
cache.caches = {};

// ===========
// SRC CHORES
// ===========

var responsiveOptions = {
	'gorilla.png': [{
		width: 35,
		suffix: '-pin'
	}],
	'sugar-cane.png': [{
		width: 35,
		suffix: '-pin'
	}],
	'*': [{
		width: 120
	}]
};

// .webp generation and compression
gulp.task('webp', function () {
	return gulp.src(imgOr + '*.{jpg,jpeg,png}')
		.pipe(responsive(responsiveOptions))
		.pipe(cache('webp-cache'))
		.pipe(webp()())
		.pipe(gulp.dest(webpSrc));
});

// Image compression
gulp.task('imagemin', function () {
	var options = {
			optimizationLevel: 5, // .png
			progressive: true // .jpg
		};
	return gulp.src(imgOr + '*.{jpg,jpeg,png}')
		.pipe(cache('imagemin-cache'))
		.pipe(imagemin(options))
		.pipe(responsive(responsiveOptions))
		.pipe(gulp.dest(imgSrc));
});

gulp.task('css', function () {
	var autoprefixerOptions = {
			browsers: ['> 1%'],
			cascade: false
		};
    return gulp.src([cssSrc + '*.css', '!' + cssSrc + '*min.css'])
    	.pipe(cache('css-cache'))
        .pipe(sourcemaps.init())
        	.pipe(postcss([ autoprefixer(autoprefixerOptions), cssnano() ]))
        	.pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(cssSrc));
});
// Merge css files for dist? See gulp-concat

gulp.task('js', function() {
  return gulp.src([jsSrc + '**/*.js', '!' + jsSrc + 'app.js', '!' + jsSrc + 'uglified.js'])
  	.pipe(sourcemaps.init())
    	.pipe(concat('uglified.js'))
    	// .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(jsSrc));
});

// Replaces script references with Google CDN ones (when using bower)
// gulp.task('googlecdn', function () {
//     return gulp.src('./src/index.html')
//         .pipe(googlecdn(require('./src/bower.json')))
//         .pipe(rename({suffix: '.test'}))
//         .pipe(gulp.dest('src'));
// });

// Watcher
gulp.task('watch', function () {
	gulp.watch(imgOr + '*.{jpg,jpeg,png}', ['webp', 'imagemin']);
	gulp.watch([cssSrc + '*.css', '!' + cssSrc + '*min.css'], ['css']);
	gulp.watch([jsSrc + '**/*.js', '!' + jsSrc + 'uglified.js'], ['js']);
});


// ==================
// SRC TO DIST CHORES
// ==================
gulp.task('cleanDist', function () {
	del([imgDist]);
	del([cssDist]);
	return del([jsDist]);
});

// populateDist wait that cleanDist finishes
gulp.task('populateDist', ['cleanDist'], function () {
	var options = { recursive: true };
	cp(imgSrc, imgDist, options);
	cp(cssSrc, cssDist, options);
	cp('src/bower_components', 'dist/bower_components', options);
	gulp.src([jsSrc + 'uglified.js', jsSrc + 'app.js'])
		.pipe(gulp.dest(jsDist));
});

gulp.task('htmlmin', function () {
	var options = {
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


// ===============
// COMPOSITE TASKS
// ===============
gulp.task('default', function () {
	console.log('This is the only thing I do :)');
});

gulp.task('athome', ['webp', 'imagemin', 'css', 'js', 'watch']);

// Careful! Order has no importance, tasks run asynchronously by default
gulp.task('dist', ['cleanDist', 'populateDist', 'htmlmin']);


