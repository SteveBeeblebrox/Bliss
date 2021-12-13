# Bliss
A collection of userscripts for Chrome
## `bliss-console`
Press F10 to opens up a simple JavaScript console. Type code and press Ctrl+Enter to run it. Use Ctrl+Up/Down Arrows to navigate execution history. When possible, calls to `console.log` pretty-print arguments.
## `bliss-source-viewer`
Press F9 to show the current HTML of the entire document.
## `bliss-core`
Adds the `$bliss` global variable with DOM helper functions. Ctrl+Shift+Meta+Left Click on an element reference it in the console using `$bliss.$0`. Pass a string to the `include` function to load an additional script file.
