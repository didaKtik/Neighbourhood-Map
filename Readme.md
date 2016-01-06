# Rwanda Neighborhood Map

## Quick Start

Fork this folder, go to the src or dist folder and serve it. You can use python on the command line for example:

```
python -m SimpleHTTPServer 8000
```

Open localhost:8000 in a web browser and the page should open!

## Usage

This app gives you the possibility to explore places I liked when I visited Rwanda a few years ago.

You can also add your own places, but only if they are located in Rwanda!

## Changes

If you desire to make changes you will make your life better if you use gulp to automatically run tasks. If you don't know gulp at all you can visit [this page] (http://www.sitepoint.com/introduction-gulp-js/) for example. Then in the project root folder do the following:

#### 1. Install the node packages needed:

```sh
$ npm install
```

The needed packages are already listed in package.json

#### 2. Install gulp globally:

```sh
$ npm install --global gulp
```

#### 3. Run the gulp task I defined to make it easier to work on the project:

```sh
$ gulp athome
```

For more details on what it is doing have a look at gulpfile.js

## Context

This project is part of the [Web Developper Front-End Nanodegree] (https://www.udacity.com/course/front-end-web-developer-nanodegree--nd001) at Udacity.