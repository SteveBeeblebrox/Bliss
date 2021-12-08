// ==UserScript==
// @name         Bliss Source Viewer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Mini Source Viewer
// @author       You
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?domain=stevebeeblebrox.github.io
// @grant        none
// ==/UserScript==
(async function() {
    window.addEventListener('keydown', function(event) {
        if(event.key === 'F9') {
            event.preventDefault();
            const hostWindow = window;
            (async function() {
                const window = hostWindow.open('', `Bliss Source Viewer (${hostWindow.location})`, 'resizable,height=500,width=1000');

                hostWindow.addEventListener('unload', function() {
                    if (window && !window.closed)
                        window.close();
                });

                with(window) {
                    if(document.title === 'Bliss Source Viewer') return;
                    document.title = 'Bliss Source Viewer';

                    await new Promise(resolve => document.body.appendChild(Object.assign(document.createElement('script'),{src:'https://stevebeeblebrox.github.io/assets/libs/js/domlib-latest.js',onload(){resolve()}})));

                    const node = hostWindow.document.doctype;
                    const DOCTYPE = node ? '<!DOCTYPE '
                        + node.name
                        + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '')
                        + (!node.publicId && node.systemId ? ' SYSTEM' : '')
                        + (node.systemId ? ' "' + node.systemId + '"' : '')
                        + '>' : '';

                    /*document.head.appendChild(new HtmlNode('link', {
                        rel: 'shortcut icon',
                        type: 'image/png',
                        href: 'https://www.google.com/s2/favicons?domain=stevebeeblebrox.github.io'
                    }))*/

                    document.body.$children = [
                        HtmlNode('style', {innerHTML: String.raw`
                            body {
                                color: #444;
                                padding: 0.25rem
                            }
                        `}),
                        HtmlNode('pre', {textContent: `${DOCTYPE}\n${hostWindow.document.documentElement.outerHTML}`})
                    ]
                }
            })();
        }
    }, {capture:true});
})();