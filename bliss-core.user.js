// ==UserScript==
// @name         Bliss Core
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Scoped DOMLib and helper functions
// @author       You
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?domain=stevebeeblebrox.github.io
// @grant        none
// ==/UserScript==
(async function() {
    if('$bliss' in window) return console.error('$bliss is already defined.');

    window['$bliss'] = new Proxy({}, {
        get(target, property) {
            if(/\$\d+/.test(property)) return target.selectionHistory.at(-(Number(property.substring(1)) + 1))
            return target[property]
        }
    })

    $bliss.selectionHistory = []

    document.addEventListener('click', function(event) {
        if(event.ctrlKey && event.shiftKey && event.metaKey) {
            $bliss.selectionHistory.push(event.target);
            event.preventDefault();
            event.stopImmediatePropagation();
            clickFeedback = true;
            setTimeout(() => clickFeedback = false, 100);
            document.documentElement.style.cursor = getCursor(event.ctrlKey, event.shiftKey, event.metaKey);
        }
    }, {capture:true});

    let defaultCursor = '', clickFeedback = false;
    window.addEventListener('load', function(event) {
        defaultCursor = document.documentElement.style.cursor;
    });
    document.addEventListener('keydown', function(event) {
        document.documentElement.style.cursor = getCursor(event.ctrlKey, event.shiftKey, event.metaKey);
    }, {capture: true});
    document.addEventListener('keyup', function(event) {
        document.documentElement.style.cursor = getCursor(event.ctrlKey, event.shiftKey, event.metaKey);
    }, {capture: true});

    function getCursor(ctrl, shift, meta) {
        return clickFeedback ? 'grab' : (ctrl && shift && meta ? 'pointer' : defaultCursor);
    }
    function ElementArrayProxy(elements) {
        return new Proxy(elements, {
            set: function(target, property, value) {
                return target.forEach(o => o[property] = value), false;
            },
            get: function(target, property, reciever) {
                if(typeof property === 'symbol') return [...elements][property];
                if(property === '$toArray') return function() {return [...elements]}
                else if(property.startsWith('$') && property !== '$')
                    if(typeof [...elements][property.substr(1)] === 'function') return function() {return [...elements][property.substr(1)](...arguments)}
                else return [...elements][property.substring(1)]

                return [...elements].some(o => typeof o[property] === 'function') ? function() {return [...elements].map(o => typeof o[property] === 'function' ? o[property](...arguments) : o[property])} : new ElementArrayProxy([...elements].map(o => o[property]));
            }
        });
    }

    function ChildNodeArrayProxy(element) {
        const getChildren = target => [...target.childNodes].filter(n => !(n instanceof Text) || n.wholeText.trim() !== '' || n.parentElement instanceof HTMLPreElement || n.parentElement.closest('pre'));
        const setChildren = (target, children) => target.replaceChildren(...children);
        const mutators = ['push','pop','shift','unshift','splice','reverse','sort'];
        return new Proxy(element, {
            get(target, property) {
                if(mutators.includes(property))
                    return function() {
                        const array = getChildren(target);
                        try {
                            return array[property](...arguments);
                        } finally {
                            setChildren(target, array);
                        }
                    }
                else if(property in Array.prototype || !isNaN(property))
                    return [...target.childNodes][property];
                else return target[property];
            },
            set(target, property, value) {
                if(Number(property) > -1) {
                    const array = getChildren(target);
                    try {
                        return array[property] = value;
                    } finally {
                        setChildren(target, array);
                    }
                }
                else return target[property] = value;
            }
        })
    }

    for(const type of [ShadowRoot, SVGElement, HTMLElement]) {
      type.prototype.$bliss = {};
      Object.defineProperty(type.prototype.$bliss, '$children', {
        get() {
          return new ChildNodeArrayProxy(this);
        },
        set(value) {
          return this.replaceChildren(...value);
        }
      })
    }

    function interpolate(strings, values) {
        let result = strings[0]
        for(let i = 0; i < values.length; i++) {
            result += values[i]
            result += strings[i+1]
        }
        return result;
    }

    $bliss.$ = function(selector, startNode = document) {
        if(Array.isArray(selector)) {
            selector = interpolate(selector, [...arguments].slice(1))
            startNode = document
        }
        return $bliss.$it = startNode.querySelector(selector);
    }

    ShadowRoot.prototype.$bliss = SVGElement.prototype.$bliss = HTMLElement.prototype.$bliss = {}

    ShadowRoot.prototype.$bliss.$self = SVGElement.prototype.$bliss.$self = HTMLElement.prototype.$bliss.$self = function(selector) {
      if(Array.isArray(selector)) {
        selector = interpolate(selector, [...arguments].slice(1))
      }
      return $(selector, this);
    }

    $bliss.$$ = function(selector, startNode = document) {
        if(Array.isArray(selector)) {
            selector = interpolate(selector, [...arguments].slice(1))
            startNode = document
        }
        return __bliss.__$$it = new ElementArrayProxy(startNode.querySelectorAll(selector));
    }

    ShadowRoot.prototype.$bliss.$$self = SVGElement.prototype.$bliss.$$self = HTMLElement.prototype.$bliss.$$self = function(selector) {
      if(Array.isArray(selector)) {
        selector = interpolate(selector, [...arguments].slice(1))
      }
      return $$(selector, this);
    }

    $bliss.HTMLNode = $bliss.HtmlNode = function(type, data = {}) {
        const element = document.createElement(type)

        if(typeof data === 'string')
            element.textContent = data
        else {
            for(const key in data)
                if(key in element)
                    element[key] = data[key]
            else
                element.setAttribute(key, data[key])

            if('children' in data && Array.isArray(data.children))
                for(const child of data.children)
                    element.appendChild(child)

            if('style' in data && typeof(data.style) === 'object')
                for(const property in data.style)
                    element.style[property] = data.style[property]
        }
        return element
    }

    $bliss.SVGNode = $bliss.SvgNode = function(type, data = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', type)

        if(type === 'svg') element.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

        for(const key in data)
            if((key === 'children' && Array.isArray(data[key])) || (key === 'style' && typeof(data[key]) === 'object'))
                continue
            else if(key in element && typeof data[key] === 'function')
                element[key] = data[key]
        else
            element.setAttribute(key, data[key])

        if('children' in data && Array.isArray(data.children))
            for(const child of data.children)
                element.appendChild(child)

        if('style' in data && typeof(data.style) === 'object')
            for(const property in data.style)
                element.style[property] = data.style[property]

        return element
    }

    $bliss.TextNode = function(content) {
        return document.createTextNode(content)
    }

    $bliss.CommentNode = function(content) {
        return document.createComment(content)
    }

    $bliss.include = async function(src) {
        return Object.assign(document.createElement('a'), {href: src}).host === 'raw.githubusercontent.com' ?
            void (document.head.appendChild(Object.assign(document.createElement('script'), {innerHTML: await(await fetch(src)).text(), onerror() {throw 'Unable to load script'}}))) :
            await new Promise((resolve, reject) => document.head.appendChild(Object.assign(document.createElement('script'), {src, onload() {resolve()}, onerror() {reject('Unable to load script')}})));
}
})();