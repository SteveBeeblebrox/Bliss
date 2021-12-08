// ==UserScript==
// @name         Bliss Console
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Mini REPL Console
// @author       You
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?domain=stevebeeblebrox.github.io
// @grant        none
// ==/UserScript==
(async function() {
    const xeval = eval
    const sprintf = (str, ...argv) => !argv.length ? str :
        sprintf(str = str.replace(sprintf.token||"$", argv.shift()), ...argv);

    function toPrettyString(object) {
        if(typeof object === 'symbol' || typeof object === 'function') return object.toString();

        let type = object?.constructor?.name;
        if(type === 'Object' || typeof object !== 'object') type = '';

        try {
            return `${type ? type + ': ' : ''}${JSON.stringify(object)}`;
        } catch(circularJSON) {
            return `${object}`;
        }
    }

    let logMixin, clearMixin;
    for(const method of ['log', 'warn', 'error', 'debug', 'info']) {
        const native = globalThis.console[method]
        globalThis.console[method] = function() {
            native(...arguments);
            try {
                logMixin?.([...arguments].map(toPrettyString).join(', '), method);
            } catch(ignored) {}
        }
    }

    (function(native) {
        globalThis.console.clear = function() {
            native(...arguments);
            try {
                clearMixin?.(...arguments);
            } catch(ignored) {}
        }
    })(globalThis.console.clear);

    window.addEventListener('keydown', function(event) {
        if(event.key === 'F10') {
            event.preventDefault();
            const hostWindow = window;
            (async function() {
                const window = hostWindow.open('', `Bliss Console (${hostWindow.location})`, 'resizable,height=500,width=500');

                hostWindow.addEventListener('unload', function() {
                    if (window && !window.closed)
                        window.close();
                });

                with(window) {
                    if(document.title === 'Bliss Console') return
                    document.title = 'Bliss Console'

                    await new Promise(resolve => document.body.appendChild(Object.assign(document.createElement('script'),{src:'https://stevebeeblebrox.github.io/assets/libs/js/domlib-latest.js',onload(){resolve()}})))

                    let output;

                    const LogType = Object.freeze({
                        log: 'log',
                        error: 'error',
                        warn: 'warn',
                        debug: 'debug',
                        info: 'info',
                        result: 'result',
                        input: 'input',
                    })

                    logMixin = log;
                    clearMixin = () => requestAnimationFrame(() => output.$children = []);

                    function log(content, type = 'default') {
                        let element = output.appendChild(new HtmlNode('pre', {textContent: `${content}`}))
                        element.dataset.type = type
                    }

                    const history = [];
                    let historyIndex = history.length - 1;
                    let wipValue = '';

                    document.body.$children = [
                        HtmlNode('style', {innerHTML: String.raw`
                            body {
                                color: #444;
                                padding: 0.25rem
                            }
                            .flex {
                                display: flex;
                            }
                            textarea {
                                resize: none;
                                flex-grow: 1;
                                border: none;
                                border-bottom: 0.1rem solid gray;
                                outline: none;
                            }
                            pre {
                                white-space: pre-wrap;
                                user-select: all;
                                overflow-wrap: break-word;
                            }
                            pre[data-type]:before, section:nth-of-type(2):before {
                                font-weight: bold;
                                padding-right: 0.5rem;
                                font-size: 1em;
                                font-family: Arial;
                                content: '<';
                                color: transparent;
                            }
                            pre[data-type=error] {
                                color: black;
                                background-color: #ff9e9e;
                            }
                            pre[data-type=warn] {
                                color: black;
                                background-color: #fffa9e;
                            }
                            pre[data-type=error]:before {
                                content: '${'\u24e7'}'; /* Circled Latin Small Letter X */
                                color: inherit;
                            }
                            pre[data-type=warn]:before {
                                content: '${'\u26A0'}'; /* Warnign Sign */
                                color: inherit;
                            }
                            pre[data-type=input]:before {
                                content: '>';
                                color: inherit;
                            }
                            pre[data-type=result]:before {
                                content: '<';
                                color: inherit;
                            }
                            pre[data-type=result] {
                                color: gray;
                            }
                            section:nth-of-type(2):before {
                                content: '>';
                                color: teal;
                            }
                        `}),
                        output = HtmlNode('section', {

                        }),
                        HtmlNode('section', {
                            class: 'flex',
                            children: [
                                Object.assign(HtmlNode('textarea', {
                                    rows: 1,
                                    autofocus: 1,
                                    oninput() {
                                        this.style.height = '';
                                        this.style.height = this.scrollHeight + 3 + 'px';
                                    },
                                    onkeydown(event) {

                                        const autocompleteCharacters = {
                                            '(': ')',
                                            '[': ']',
                                            '{': '}',
                                            '"': '"',
                                            "'": "'",
                                            '`': '`'
                                        }

                                        let insertString = (string, numberToMoveBack = 0) => {
                                            const start = this.selectionStart, end = this.selectionEnd;

                                            const target = event.target;
                                            const value = target.value;

                                            target.value = value.substring(0, start) + string + value.substring(end);

                                            this.selectionStart = this.selectionEnd = start + string.length - numberToMoveBack;

                                            event.preventDefault();
                                        }

                                        if(event.key === 'Tab') {
                                            const start = this.selectionStart, end = this.selectionEnd;
                                            const target = event.target;
                                            const value = target.value;
                                            if(event.shiftKey) {
                                                if(start === end) {
                                                    let x = 0;
                                                    target.value = value.substring(0, start).replace(/( {1,2})$/, (string, match) => (x = match.length, '')) + value.substring(end);
                                                    this.selectionStart = this.selectionEnd = start - x;
                                                }
                                                else {
                                                    let x = 0;
                                                    target.value = value.substring(0, start) + value.substring(start, end).replace(/^( {1,2})/gm, (string, match) => (x += match.length, '')) + value.substring(end)
                                                    this.setSelectionRange(start, start - x)
                                                }

                                            }
                                            else {
                                                if(start === end) {
                                                    insertString('  ')
                                                } else {
                                                    let x = 0;
                                                    target.value = value.substring(0, start) + value.substring(start, end).replace(/^/gm, (string, match) => (x += 2, '  ')) + value.substring(end)
                                                    this.setSelectionRange(start, end + x);
                                                }
                                            }

                                            event.preventDefault();
                                        }
                                        else if(event.key in autocompleteCharacters)
                                            insertString(event.key + autocompleteCharacters[event.key], 1)


                                        if(!event.ctrlKey) return

                                        if(event.key === 'Enter') {
                                            try {
                                                if(this.getTextValue()) history.push(this.getTextValue())
                                                historyIndex = history.length - 1;
                                                log(this.getTextValue(), LogType.input);
                                                log(toPrettyString(xeval(this.getTextValue())), LogType.result);
                                            } catch(e) {
                                                log(e, LogType.error);
                                            }
                                            this.setTextValue('')
                                            wipValue = this.getTextValue()
                                            window.scrollTo(0,document.body.scrollHeight)
                                        } else if(event.key === 'ArrowUp') {
                                            if(historyIndex + 1 === history.length) wipValue = this.getTextValue()
                                            this.setTextValue(history[historyIndex]);
                                            historyIndex = Math.max(0, historyIndex - 1);
                                        } else if(event.key === 'ArrowDown') {
                                            if(historyIndex + 1 === history.length) this.setTextValue(wipValue);
                                            else {
                                                historyIndex = Math.min(history.length, historyIndex + 1);
                                                this.setTextValue(history[historyIndex] ?? '');
                                            }
                                        }
                                    }
                                }),
                                {
                                    getTextValue() {
                                        return this.value
                                    },
                                    setTextValue(value) {
                                        try {
                                            return this.value = value;
                                        } finally {
                                            this.oninput();
                                        }
                                    }
                                })
                            ]
                        })
                    ]
                }
            })()
        }
    }, {capture:true});
})()