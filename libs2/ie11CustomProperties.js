/*! ie11CustomProperties.js v3.0.2 | MIT License | https://git.io/fjXMN */
!function () {
	'use strict';

	// check for support
	var testEl = document.createElement('i');
	testEl.style.setProperty('--x', 'y');
	if (testEl.style.getPropertyValue('--x') === 'y' || !testEl.msMatchesSelector) return;

	if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.msMatchesSelector;

    var listeners = [],
        root = document,
        Observer;

	function qsa(el, selector){
		try {
			return el.querySelectorAll(selector);
		} catch(e) {
			// console.warn('the Selector '+selector+' can not be parsed');
			return [];
		}
	}
    function onElement (selector, callback) {
        var listener = {
            selector: selector,
            callback: callback,
            elements: new WeakMap(),
        };
		var els = qsa(root, listener.selector), i=0, el;
		while (el = els[i++]) {
            listener.elements.set(el, true);
            listener.callback.call(el, el);
        }
        listeners.push(listener);
        if (!Observer) {
            Observer = new MutationObserver(checkMutations);
            Observer.observe(root, {
                childList: true,
                subtree: true
            });
        }
        checkListener(listener);
    };
    function checkListener(listener, target) {
        var i = 0, el, els = [];
		try {
			target && target.matches(listener.selector) && els.push(target);
		} catch(e) {}
        if (loaded) { // ok? check inside node on innerHTML - only when loaded
            Array.prototype.push.apply(els, qsa(target || root, listener.selector));
        }
        while (el = els[i++]) {
            if (listener.elements.has(el)) continue;
            listener.elements.set(el,true);
            listener.callback.call(el, el);
        }
    }
    function checkListeners(inside) {
        var i = 0, listener;
        while (listener = listeners[i++]) checkListener(listener, inside);
    }
    function checkMutations(mutations) {
		var j = 0, i, mutation, nodes, target;
        while (mutation = mutations[j++]) {
            nodes = mutation.addedNodes, i = 0;
            while (target = nodes[i++]) target.nodeType === 1 && checkListeners(target);
        }
    }

    var loaded = false;
    document.addEventListener('DOMContentLoaded', function () {
        loaded = true;
    });

	// svg polyfills
	function copyProperty(prop, from, to){
		var desc = Object.getOwnPropertyDescriptor(from, prop);
		Object.defineProperty(to, prop, desc);
	}
	if (!('classList' in Element.prototype)) {
		copyProperty('classList', HTMLElement.prototype, Element.prototype);
	}
	if (!('innerHTML' in Element.prototype)) {
		copyProperty('innerHTML', HTMLElement.prototype, Element.prototype);
	}
	if (!('sheet' in SVGStyleElement.prototype)) {
		Object.defineProperty(SVGStyleElement.prototype, 'sheet', {
			get:function(){
				var all = document.styleSheets, i=0, sheet;
				while (sheet=all[i++]) {
					if (sheet.ownerNode === this) return sheet;
				}

			}
		});
	}


	// main logic

	// cached regexps, better performance
	var regFindSetters = /([\s{;])(--([A-Za-z0-9-_]+\s*:[^;!}{]+)(!important)?)(?=\s*([;}]|$))/g;
	var regFindGetters = /([{;]\s*)([A-Za-z0-9-_]+\s*:[^;}{]*var\([^!;}{]+)(!important)?(?=\s*([;}$]|$))/g;
	var regRuleIEGetters = /-ieVar-([^:]+):/g
	var regRuleIESetters = /-ie-([^};]+)/g
	var regHasVar = /var\(/;
	var regPseudos = /:(hover|active|focus|target|:before|:after)/;

	onElement('link[rel="stylesheet"]', function (el) {
		fetchCss(el.href, function (css) {
			var newCss = rewriteCss(css);
			if (css === newCss) return;
			newCss = relToAbs(el.href, newCss);
			el.disabled = true;
			var style = document.createElement('style');
			el.parentNode.insertBefore(style, el);
			activateStyleElement(style, newCss);
		});
	});
	onElement('style', function (el) {
		//if (el.hasAttribute('ie-polyfilled')) return;
		if (el.ieCP_polyfilled) return;

		if (el.ieCP_elementSheet) return;
		var css = el.innerHTML;
		var newCss = rewriteCss(css);
		if (css === newCss) return;
		activateStyleElement(el, newCss);
	});
	onElement('[ie-style]', function (el) {
		var newCss = rewriteCss('{'+el.getAttribute('ie-style')).substr(1);
		el.style.cssText += ';'+ newCss;
		var found = parseRewrittenStyle(el.style);
		if (found.getters) addGetterElement(el, found.getters, '%styleAttr');
		if (found.setters) addSetterElement(el, found.setters);
	});

	function relToAbs(base, css) {
		return css.replace(/url\(([^)]+)\)/g, function($0, $1){
			$1 = $1.trim().replace(/(^['"]|['"]$)/g,'');
			if ($1.match(/^([a-z]+:|\/)/)) return $0;
			base = base.replace(/\?.*/,'');
			return 'url('+ base + './../' + $1 +')';
		});
	}

	// ie has a bug, where unknown properties at pseudo-selectors are computed at the element
	// #el::after { -content:'x'; } => getComputedStyle(el)['-content'] == 'x'
	// should we add something like -ieVar-pseudo_after-content:'x'?
	function rewriteCss(css) {

		/* uncomment if spec finished and needed by someone
		css = css.replace(/@property ([^{]+){([^}]+)}/, function($0, prop, body){
			prop = prop.trim();
			var declaration = {name:prop};
			body.split(';').forEach(function(pair){
				var x = pair.split(':');
				if (x[1]) declaration[ x[0].trim() ] = x[1];
			});
			declaration['inherits'] = declaration['inherits'].trim()==='true' ? true : false;
			declaration['initialValue'] = declaration['initial-value'];
			CSS.registerProperty(declaration)
			return '/*\n @property ... removed \n*'+'/';
		});
		*/

		return css.replace(regFindSetters, function($0, $1, $2, $3, important){
			return $1+'-ie-'+(important?'???':'')+$3;
		}).replace(regFindGetters, function($0, $1, $2, important){
			return $1+'-ieVar-'+(important?'???':'')+$2+'; '+$2; // keep the original, so chaining works "--x:var(--y)"
		});
	}

	// beta
	var styles_of_getter_properties = {};

	function parseRewrittenStyle(style) { // less memory then parameter cssText?

		// beta
		style['z-index']; // ie11 can access unknown properties in stylesheets only if accessed a dashed known property

		var cssText = style.cssText;
		var matchesGetters = cssText.match(regRuleIEGetters), j, match;
		if (matchesGetters) {
			var getters = []; // eg. [border,color]
			for (j = 0; match = matchesGetters[j++];) {
				var propName = match.slice(7, -1);
				if (propName[0] === '???') propName = propName.substr(1);
				getters.push(propName);

				// beta
				if (!styles_of_getter_properties[propName]) styles_of_getter_properties[propName] = [];
				styles_of_getter_properties[propName].push(style);
			}
		}
		var matchesSetters = cssText.match(regRuleIESetters);
		if (matchesSetters) {
			var setters = {}; // eg. [--color:#fff, --padding:10px];
			for (j = 0; match = matchesSetters[j++];) {
				var x = match.substr(4).split(':');
				var propName = x[0];
				var propValue = x[1];
				if (propName[0] === '???') propName = propName.substr(1);
				setters[propName] = propValue;
			}
		}
		return {getters:getters, setters:setters};
	}
	function activateStyleElement(style, css) {
		style.innerHTML = css;
		//style.setAttribute('ie-polyfilled', true);
		style.ieCP_polyfilled = true;
		var rules = style.sheet.rules, i=0, rule; // cssRules = CSSRuleList, rules = MSCSSRuleList
		while (rule = rules[i++]) {
			var found = parseRewrittenStyle(rule.style);
			if (found.getters) addGettersSelector(rule.selectorText, found.getters);
			if (found.setters) addSettersSelector(rule.selectorText, found.setters);

			// mediaQueries: redraw the hole document
			// better add events for each element?
			var media = rule.parentRule && rule.parentRule.media && rule.parentRule.media.mediaText;
			if (media && (found.getters || found.setters)) {
				matchMedia(media).addListener(function(){
					drawTree(document.documentElement)
				})
			}
		}

		// beta
		redrawStyleSheets()
	}

	function addGettersSelector(selector, properties) {
		selectorAddPseudoListeners(selector);
		onElement(unPseudo(selector), function (el) {
			addGetterElement(el, properties, selector);
			drawElement(el);
		});
	}
	function addGetterElement(el, properties, selector) {
		var i=0, prop, j;
		var selectors = selector.split(','); // split grouped selectors
		el.setAttribute('iecp-needed', true);
		if (!el.ieCPSelectors) el.ieCPSelectors = {};
		while (prop = properties[i++]) {
			for (j = 0; selector = selectors[j++];) {
				var parts = selector.trim().split('::');
				if (!el.ieCPSelectors[prop]) el.ieCPSelectors[prop] = [];
				el.ieCPSelectors[prop].push({
					selector: parts[0],
					pseudo: parts[1] ? '::' + parts[1] : ''
				});
			}
		}
	}
	function addSettersSelector(selector, propVals) {
		selectorAddPseudoListeners(selector);
		onElement(unPseudo(selector), function (el) {
			addSetterElement(el, propVals);
		});
	}
	function addSetterElement(el, propVals) {
		if (!el.ieCP_setters) el.ieCP_setters = {};
		for (var prop in propVals) { // eg. {foo:#fff, bar:baz}
			el.ieCP_setters['--' + prop] = 1;
		}
		drawTree(el);
	}

	//beta
	function redrawStyleSheets() {
		for (var prop in styles_of_getter_properties) {
			var styles = styles_of_getter_properties[prop];
			for (var i=0, style; style=styles[i++];) {
				if (style.owningElement) continue;
				var value = style['-ieVar-'+prop];
				if (!value) continue;
				value = styleComputeValueWidthVars(getComputedStyle(document.documentElement), value);
				if (value === '') continue;
				style[prop] = value;
			}
		}
	}


	var pseudos = {
		hover:{
			on:'mouseenter',
			off:'mouseleave'
		},
		focus:{
			on:'focusin',
			off:'focusout'
		},
		active:{
			on:'CSSActivate',
			off:'CSSDeactivate'
		},
	};
	function selectorAddPseudoListeners(selector){
		// ie11 has the strange behavoir, that groups of selectors are individual rules, but starting with the full selector:
		// td, th, button { color:red } results in this rules:
		// "td, th, button" | "th, th" | "th"
		selector = selector.split(',')[0];
		for (var pseudo in pseudos) {
			var parts = selector.split(':'+pseudo);
			if (parts.length > 1) {
				var ending = parts[1].match(/^[^\s]*/); // ending elementpart of selector (used for not(:active))
				var sel = unPseudo(parts[0]+ending);
				var listeners = pseudos[pseudo];
				onElement(sel, function (el) {
					el.addEventListener(listeners.on, drawTreeEvent);
					el.addEventListener(listeners.off, drawTreeEvent);
				});
			}
		}
	}
	var CSSActive = null;
	document.addEventListener('mousedown',function(e){
		setTimeout(function(){
			if (e.target === document.activeElement) {
				var evt = document.createEvent('Event');
				evt.initEvent('CSSActivate', true, true);
				CSSActive = e.target;
				CSSActive.dispatchEvent(evt);
			}
		})
	});
	document.addEventListener('mouseup',function(){
		if (CSSActive) {
			var evt = document.createEvent('Event');
			evt.initEvent('CSSDeactivate', true, true);
			CSSActive.dispatchEvent(evt);
			CSSActive = null;
		}
	});

	function unPseudo(selector){
		return selector.replace(regPseudos,'').replace(':not()','');
	}

	var uniqueCounter = 0;

	function _drawElement(el) {
		if (!el.ieCP_unique) { // use el.uniqueNumber? but needs class for the css-selector => test performance
			el.ieCP_unique = ++uniqueCounter;
			el.classList.add('iecp-u' + el.ieCP_unique);
		}
		var style = getComputedStyle(el);
		//if (el.ieCP_sheet) while (el.ieCP_sheet.rules[0]) el.ieCP_sheet.devareRule(0);
		for (var prop in el.ieCPSelectors) {
			var important = style['-ieVar-???' + prop];
			var valueWithVar = important || style['-ieVar-' + prop];
			if (!valueWithVar) continue; // todo, what if '0'

			var details = {};
			var value = styleComputeValueWidthVars(style, valueWithVar, details);

			if (important) value += ' !important';
			for (var i=0, item; item=el.ieCPSelectors[prop][i++];) { // todo: split and use requestAnimationFrame?
				if (item.selector === '%styleAttr') {
					el.style[prop] = value;
				} else {

					// beta
					if (!important && details.allByRoot !== false) continue; // dont have to draw root-properties

					//var selector = item.selector.replace(/>? \.[^ ]+/, ' ', item.selector); // todo: try to equalize specificity
					var selector = item.selector;
					elementStyleSheet(el).insertRule(selector + '.iecp-u' + el.ieCP_unique + item.pseudo + ' {' + prop + ':' + value + '}', 0); // faster then innerHTML
				}
			}
		}
	}
	function elementStyleSheet(el){
		if (!el.ieCP_sheet) {
			var tag = document.createElement('style');
			tag.ieCP_elementSheet = 1;
			//el.appendChild(tag); // yes! self-closing tags can have style as children, but - if i set innerHTML, the stylesheet is lost
			document.head.appendChild(tag);
			el.ieCP_sheet = tag.sheet;
		}
		return el.ieCP_sheet;
	}
	function drawTree(target) {
		if (!target) return;
		var els = target.querySelectorAll('[iecp-needed]');
		if (target.hasAttribute && target.hasAttribute('iecp-needed')) drawElement(target); // self
		for (var i = 0, el; el = els[i++];) drawElement(el); // tree
	}
	// draw queue
	var drawQueue = new Set();
	var collecting = false;
	var drawing = false;
	function drawElement(el){
		drawQueue.add(el);
		if (collecting) return;
		collecting = true;
		requestAnimationFrame(function(){
			collecting = false;
			drawing = true;
			drawQueue.forEach(_drawElement);
			drawQueue.clear();
			setTimeout(function(){ // mutationObserver will trigger delayed, requestAnimationFrame will miss some changes
				drawing = false;
			})
		})
	}


	function drawTreeEvent(e) {
		drawTree(e.target)
	}

	function findVars(str, cb){ // css value parser
		var level=0, lastPoint=0, newStr = '', i=0, char;
		while (char=str[i++]) {
			if (char === '(') ++level;
			if (level===1) {
				if (char === '(') {
					if (str[i-4]+str[i-3]+str[i-2] === 'var') {
						newStr += str.substring(lastPoint, i-4);
						lastPoint = i;
					}
				}
				if (char === ')') {
					var variable = str.substring(lastPoint, i-1).trim(), fallback;
					var x = variable.indexOf(',');
					if (x!==-1) {
						fallback = variable.slice(x+1);
						variable = variable.slice(0,x);
					}
					newStr += cb(variable, fallback);
					lastPoint = i;
				}
			}
			if (char === ')') --level;
		}
		newStr += str.substring(lastPoint);
		return newStr;
	}
	//var regValueGetters = /var\(([^),]+)(\,([^),]+))?\)/g;
	function styleComputeValueWidthVars(style, valueWithVars, details){
		return findVars(valueWithVars, function(variable, fallback){
			var value = style.getPropertyValue(variable);
			if (details && style.lastPropertyServedBy !== document.documentElement) details.allByRoot = false;
			if (value==='' && fallback) value = styleComputeValueWidthVars(style, fallback, details);
			return value;
		});
		return valueWithVars.replace(regValueGetters, function (full, variable, x, fallback) { // old
			variable = variable.trim();
			var pValue = style.getPropertyValue(variable);
			if (details && style.lastPropertyServedBy !== document.documentElement) details.allByRoot = false;
			if (pValue === '' && fallback !== undefined) pValue = fallback.trim(); // fallback
			return pValue;
		});
	}

	// mutation listener
	var observer = new MutationObserver(function(mutations) {
		if (drawing) return;
		for (var i=0, mutation; mutation=mutations[i++];) {
			//if (mutation.attributeName === 'ie-polyfilled') continue;
			if (mutation.attributeName === 'iecp-needed') continue; // why?
			// recheck all selectors if it targets new elements?
			drawTree(mutation.target);
		}
	});
	setTimeout(function(){
		observer.observe(document,{attributes: true, subtree: true });
	})

	// :target listener
	var oldHash = location.hash
	addEventListener('hashchange',function(e){
		var newEl = document.getElementById(location.hash.substr(1));
		if (newEl) {
			var oldEl = document.getElementById(oldHash.substr(1));
			drawTree(newEl);
			drawTree(oldEl);
		} else {
			drawTree(document);
		}
		oldHash = location.hash;
	});

	// add owningElement to Element.style
	var descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'style');
	var styleGetter = descriptor.get;
	descriptor.get = function () {
		var style = styleGetter.call(this);
		style.owningElement = this;
		return style;
	}
	Object.defineProperty(HTMLElement.prototype, 'style', descriptor);

	// add computedFor to computed style-objects
	var originalGetComputed = getComputedStyle;
	window.getComputedStyle = function (el) {
		var style = originalGetComputed.apply(this, arguments);
		style.computedFor = el;
		//style.pseudoElt = pseudoElt; //not needed at the moment
		return style;
	}

	// getPropertyValue / setProperty hooks
	var StyleProto = CSSStyleDeclaration.prototype;

	var oldGetP = StyleProto.getPropertyValue;
	StyleProto.getPropertyValue = function (property) {
		this.lastPropertyServedBy = false;
		if (property[0] !== '-' || property[1] !== '-') return oldGetP.apply(this, arguments);
		var undashed = property.substr(2);
		var ieProperty = '-ie-'+undashed;
		var iePropertyImportant = '-ie-???'+undashed;
		var value = this[iePropertyImportant] || this[ieProperty];
		if (this.computedFor) { // computedStyle
			if (value !== undefined) {
				if (regHasVar.test(value)) {
					value = styleComputeValueWidthVars(this, value);
				}
				this.lastPropertyServedBy = this.computedFor;
			} else {
				if (!register[property] || register[property].inherits) {
					// inherited
					//var el = this.pseudoElt ? this.computedFor : this.computedFor.parentNode;
					var el = this.computedFor.parentNode;
					while (el.nodeType === 1) {
						// how slower would it be to getComputedStyle for every element, not just with defined ieCP_setters
						if (el.ieCP_setters && el.ieCP_setters[property]) {
							// i could make
							// value = el.nodeType ? getComputedStyle(this.computedFor.parentNode).getPropertyValue(property)
							// but i fear performance, stupid?
							var style = getComputedStyle(el);
							var tmpVal = style[iePropertyImportant] || style[ieProperty];
							if (tmpVal !== undefined) {
								value = tmpVal;
								if (regHasVar.test(value)) {
									// calculated style from current element not from the element the value was inherited from! (style, value)
									value = styleComputeValueWidthVars(this, value);
								}
								this.lastPropertyServedBy = el;
								break;
							}
						}
						el = el.parentNode;
					}
				}
			}
		}
		if (value === undefined && register[property]) value = register[property].initialValue;
		if (value === undefined) value = '';
		return value;
	};

	var oldSetP = StyleProto.setProperty;
	StyleProto.setProperty = function (property, value, prio) {
		if (property[0] !== '-' || property[1] !== '-') return oldSetP.apply(this, arguments);
		if (this.owningElement) {
			var el = this.owningElement;
			if (!el.ieCP_setters) el.ieCP_setters = {};
			el.ieCP_setters[property] = 1;
			drawTree(el);
			if (el === document.documentElement) redrawStyleSheets(); // make this inside drawTree?
		}
		property = '-ie-'+(prio==='important'?'???':'') + property.substr(2);
		this.cssText += '; ' + property + ':' + value + ';';
		//this[property] = value;
	};


	if (!window.CSS) window.CSS = {};
	var register = {}
	CSS.registerProperty = function(options){
		register[options.name] = options;
	}


	// utils
	function fetchCss(url, callback) {
		var request = new XMLHttpRequest();
		request.open('GET', url);
		request.overrideMimeType('text/css');
		request.onload = function () {
			if (request.status >= 200 && request.status < 400) {
				callback(request.responseText);
			}
		};
		request.send();
	}

}();