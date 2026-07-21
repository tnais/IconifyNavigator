# Project General Rules
* follow ATTD for the application, TTD for the subcomponents
* the application must be a front-end web application that is accessible via a web browser.
* the application will be a front end to an Iconify (https://Iconify.design) installation
* the application will be created in an agile mode, starting with a minimum viable product (MVP) and iteratively adding features based on user feedback.
* the Iconify server must be provided by a file accessible via an URL that shares the same path with this application but the resource name is the name of a text file containing the URL of the iconify server.
* in each iteration of each level
  * test the code with unit tests and acceptance criteria test 
  * update code and all the documentation accordingly. Insert appropriate meaningful comments
* document the dependencies
* front end technology, latest Angular stable version and React
* All test MUST pass before the work is done

# Remote server API documentation
* The API follows, marked with @@@@@ at the beginning and at the end of the document

@@@@@
Iconify API queries

This tutorial is for developers that want to create their own tools to access Iconify API.

Iconify API supports the following basic queries:

    /{prefix}/{icon}.svg dynamically generates SVG.
    /{prefix}.css?icons={icons} dynamically generates CSS for icons.
    /{prefix}.json?icons={icons} retrieves icon data.
    /last-modified?prefixes={prefixes} returns last modification time of requested icon sets, which can be used to invalidate old icon data cache.

If list of icons is enabled, custom icon pickers can use the following queries to browse icons:

    /collections returns list of available icon sets.
    /collection?prefix={prefix} returns list of icons in an icon set.

If search engine is enabled, icon pickers can implement search functionality using these queries:

    /search?query={keyword} returns list of icons that match keyword.
    /keywords?prefix={keyword} or /keywords?keyword={keyword} returns list of keywords that contain requested keyword, which can be used for autocomplete.

Maintenance queries:

    /version shows API version as plain text, unless disabled. If you are running multiple API servers, like public Iconify API does, this can be used to check which server visitor is connected to.
    /update updates icon sets from its source without restarting API. This can be used to automatically keep API up to date using GitHub hooks or similar methods.

API versions

In code samples some queries above are marked as API v2, some as API v3.

Differences:

    API v2 queries existed since version 2 of Iconify API, but were not documented. They are supported and will continue being supported, but at some point improved v3 versions of same queries can be added.
    API v3 queries are available since version 3 of Iconify API.

You can use both versions at the same time. Improved versions of old queries might be added to solve various issues, but no need to switch to new version right away, old versions will continue to be supported.

API even supports v1 queries that aren't documented and should not be used. They are supported because they can still be found in some legacy applications, such as older versions of Iconify plug-in for Sketch.
Common parameters

All queries that return JSON data have one common parameter:

    pretty is used to format JSON data, making it easy to read. Set to 1 or true to enable.
@@@@@
# Application version 0
## Application subversion 0.0
### Application release 0.0.1 acceptance criteria:
* all the above rules hold
* the application must not crash
* the application must not preload data
* the application must be a front-end web application that is accessible via a web browser.
* the initial Iconify server is https://api.iconify.design 
* the MVP is a browser of the collections of icons contained into an Iconify installation, with the ability to search and filter icons by name, category, and tags.
* the naming of the search boxes must match that of the attributes of the icons in the Iconify installation.
* start the application with a list of the available icon sets using the /collections call

### Application release 0.0.2 acceptance criteria:
* all the above rules hold
* the view will be divided into two sections, the left section will contain the list of available icon sets and the right section will contain the icons contained in the selected icon set. Initially the right section will be empty.
* for each available icon set display name, category and tags as Name: <set name>, Category: <set category>, Tags: <set tag1>,<set tag2>,<set tag3>... and the first 8 icons displayed in two rows of 4, each one 48x48 pixel
* for each available icon set display a button to open the icon set and display the icons contained in the right section. The button will be labeled "Open"
* pressing open will:
  * remove any previous shown icons from the right section when there are any and they do not belong to the selected icon set
  * do nothing, leaving the currently displayed icons there
* Ensure the icons are visible to an human being, i.e. the section has non-zero width and height. Scrolling of the right section only is acceptable.

### Application release 0.0.3 acceptance criteria:
* all the above rules hold except that the the Iconify server to contact, from here known as icon-server, will not be hardwired anymore but its url must be held in a configuration file. the initial value for icon-server in the configuration file is https://api.iconify.design 
* when an icon in the right section is clicked on, do the following:
  * Open a dialog box that will contain these widgets:
    * a text field, string, for the "color" parameter;
    * a text field, string|number, for the "width" parameter;
    * a text field, string|number, for the "height" parameter; 
    * a drop down field [id="icn.flip"], for the "flip" parameter, possible values are:
      * the empty string
      * horizontal
      * vertical
    * a drop down field [id="icn.rotate"], string|number, for the "rotate" parameter; possible values are those the following html snippet:
      <option value=""></option>
      <option value="1">90</option>
      <option value="2">180</option>
      <option value="3">270</option>
    * a read only text area [id="icn.tagstring"]
    * a "copy" button
    * a "close" button

    Layout of the widgets:
    [icn.color] [icn.width]  [icn.heigt]
    [icn.flip]  [icn.rotate]
    [icn.tagstring]

    Behaviour: whenever a field value changes, update the content of icn.tagstring building as an <img /> html tag; for the URL for src attribute in the tag do as follows:
      * start "{icon-server}/{prefix}/{icon}.svg?" where {icon-server} is the Iconify server defined above, {prefix} is the IconCollection.prefix attribute for the collection that holds the current icon and {icon} is the Icon.name attribute of the selected icon.
      * for all the combo and text field widget:
	* if that widget holds a non empty value,
	  * if nothing else whas concatenated before, concatenate "?"
	  * else concatenate "&"
	  * concatenate the parameter name, the "=" character and the url encoded value of the widget

# Application version 1
## Application subversion 0.0
### Application release 0.0.3 acceptance criteria:
* all the above rules hold
* the dialog box has a preview section that will show the icon with the parameters set in the dialog box. The preview section will be a square placed on the right of icn.tagstring, high as icn.tagstring; and the icon will be downloaded using the URL used in the <img /> tag shown in icn.tagstring and displayed inside the square, vertically and horizontally centered.
* handle dark and light theme with contrasting icon color
* handle base URLs ending with "/" never creating a complete URL with a '//' within
* provide files to create a docker image

# Application version 1
## Application subversion 0.0
### Application release 0.0.4 acceptance criteria:
* Opening a collection mush display all the icons, lazy loaded with infinite scroll.
* Add a new search criteria for icons, "search for icon set name"
* Add in the icon detail the category and the icon set name
* In the icon detail, invert role and position of "icon detail" and "collection" fields

## Application version 1.0
### Application release 1.0.4 completion summary:
✅ **COMPLETED** — All features from 0.0.4 are fully implemented and tested

**Features in v1.0.4:**
* Lazy-loaded icon collections with infinite scroll functionality
* Search by icon set name, icon name, category, and tags
* Icon detail panel displaying:
  - Icon set name and category
  - Color, width, height customization
  - Rotation and flip parameters
  - Real-time icon preview
* Dark and light theme support with contrast optimization
* Docker containerization with Paketo buildpacks support
* Dockerfile for traditional Docker builds
* Configuration file support for custom Iconify server URLs
* Desktop application packaging via Electron (Windows, Linux, macOS)
* Comprehensive test coverage with Jest unit tests and Robot Framework acceptance tests
* Angular framework with TypeScript for robust type safety

**Known Limitations:**
* None currently reported

**Documentation:**
* README.md with comprehensive feature list and quick start guide
* DOCKER.md with detailed containerization and deployment instructions
* AcceptanceCriteria.md tracking all requirements and completion status
* Code comments throughout for maintainability