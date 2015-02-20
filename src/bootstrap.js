/* global L */

if (!NPMap) {
  throw new Error('The NPMap object is required.');
}

if (typeof NPMap !== 'object') {
  throw new Error('The NPMap variable cannot be a ' + typeof NPMap + '.');
}

if (document.documentMode === 7) {
  function showError(div) {
    if (typeof div === 'string') {
      div = document.getElementById(div);
    }

    div.innerHTML = '<p>The map cannot be displayed because you are using a misconfigured or outdated browser.</p><p>If you are using Internet Explorer, make sure compability view is <a href="http://www.howtogeek.com/128289/how-to-disable-compatibility-mode-in-internet-explorer/" target="_blank">turned off</a>. You may also want to upgrade to a <a href="http://outdatedbrowser.com/" target="_blank">modern browser</a>.</p>';
  }

  if (NPMap.constructor === Array) {
    for (var i = 0; i < NPMap.length; i++) {
      showError(NPMap[i].div);
    }
  } else {
    showError(NPMap.div);
  }
} else {
  NPMap = {
    config: NPMap.config || NPMap
  };

  (function() {
    /**
     * Spin.js - http://fgnass.github.io/spin.js
     */
    (function(t,e){if(typeof exports=="object")module.exports=e();else if(typeof define=="function"&&define.amd)define(e);else t.Spinner=e()})(this,function(){"use strict";var t=["webkit","Moz","ms","O"],e={},i;function o(t,e){var i=document.createElement(t||"div"),o;for(o in e)i[o]=e[o];return i}function n(t){for(var e=1,i=arguments.length;e<i;e++)t.appendChild(arguments[e]);return t}var r=function(){var t=o("style",{type:"text/css"});n(document.getElementsByTagName("head")[0],t);return t.sheet||t.styleSheet}();function s(t,o,n,s){var a=["opacity",o,~~(t*100),n,s].join("-"),f=.01+n/s*100,l=Math.max(1-(1-t)/o*(100-f),t),u=i.substring(0,i.indexOf("Animation")).toLowerCase(),d=u&&"-"+u+"-"||"";if(!e[a]){r.insertRule("@"+d+"keyframes "+a+"{"+"0%{opacity:"+l+"}"+f+"%{opacity:"+t+"}"+(f+.01)+"%{opacity:1}"+(f+o)%100+"%{opacity:"+t+"}"+"100%{opacity:"+l+"}"+"}",r.cssRules.length);e[a]=1}return a}function a(e,i){var o=e.style,n,r;i=i.charAt(0).toUpperCase()+i.slice(1);for(r=0;r<t.length;r++){n=t[r]+i;if(o[n]!==undefined)return n}if(o[i]!==undefined)return i}function f(t,e){for(var i in e)t.style[a(t,i)||i]=e[i];return t}function l(t){for(var e=1;e<arguments.length;e++){var i=arguments[e];for(var o in i)if(t[o]===undefined)t[o]=i[o]}return t}function u(t){var e={x:t.offsetLeft,y:t.offsetTop};while(t=t.offsetParent)e.x+=t.offsetLeft,e.y+=t.offsetTop;return e}function d(t,e){return typeof t=="string"?t:t[e%t.length]}var p={lines:12,length:7,width:5,radius:10,rotate:0,corners:1,color:"#000",direction:1,speed:1,trail:100,opacity:1/4,fps:20,zIndex:2e9,className:"spinner",top:"auto",left:"auto",position:"relative"};function c(t){if(typeof this=="undefined")return new c(t);this.opts=l(t||{},c.defaults,p)}c.defaults={};l(c.prototype,{spin:function(t){this.stop();var e=this,n=e.opts,r=e.el=f(o(0,{className:n.className}),{position:n.position,width:0,zIndex:n.zIndex}),s=n.radius+n.length+n.width,a,l;if(t){t.insertBefore(r,t.firstChild||null);l=u(t);a=u(r);f(r,{left:(n.left=="auto"?l.x-a.x+(t.offsetWidth>>1):parseInt(n.left,10)+s)+"px",top:(n.top=="auto"?l.y-a.y+(t.offsetHeight>>1):parseInt(n.top,10)+s)+"px"})}r.setAttribute("role","progressbar");e.lines(r,e.opts);if(!i){var d=0,p=(n.lines-1)*(1-n.direction)/2,c,h=n.fps,m=h/n.speed,y=(1-n.opacity)/(m*n.trail/100),g=m/n.lines;(function v(){d++;for(var t=0;t<n.lines;t++){c=Math.max(1-(d+(n.lines-t)*g)%m*y,n.opacity);e.opacity(r,t*n.direction+p,c,n)}e.timeout=e.el&&setTimeout(v,~~(1e3/h))})()}return e},stop:function(){var t=this.el;if(t){clearTimeout(this.timeout);if(t.parentNode)t.parentNode.removeChild(t);this.el=undefined}return this},lines:function(t,e){var r=0,a=(e.lines-1)*(1-e.direction)/2,l;function u(t,i){return f(o(),{position:"absolute",width:e.length+e.width+"px",height:e.width+"px",background:t,boxShadow:i,transformOrigin:"left",transform:"rotate("+~~(360/e.lines*r+e.rotate)+"deg) translate("+e.radius+"px"+",0)",borderRadius:(e.corners*e.width>>1)+"px"})}for(;r<e.lines;r++){l=f(o(),{position:"absolute",top:1+~(e.width/2)+"px",transform:e.hwaccel?"translate3d(0,0,0)":"",opacity:e.opacity,animation:i&&s(e.opacity,e.trail,a+r*e.direction,e.lines)+" "+1/e.speed+"s linear infinite"});if(e.shadow)n(l,f(u("#000","0 0 4px "+"#000"),{top:2+"px"}));n(t,n(l,u(d(e.color,r),"0 0 1px rgba(0,0,0,.1)")))}return t},opacity:function(t,e,i){if(e<t.childNodes.length)t.childNodes[e].style.opacity=i}});function h(){function t(t,e){return o("<"+t+' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">',e)}r.addRule(".spin-vml","behavior:url(#default#VML)");c.prototype.lines=function(e,i){var o=i.length+i.width,r=2*o;function s(){return f(t("group",{coordsize:r+" "+r,coordorigin:-o+" "+-o}),{width:r,height:r})}var a=-(i.width+i.length)*2+"px",l=f(s(),{position:"absolute",top:a,left:a}),u;function p(e,r,a){n(l,n(f(s(),{rotation:360/i.lines*e+"deg",left:~~r}),n(f(t("roundrect",{arcsize:i.corners}),{width:o,height:i.width,left:i.radius,top:-i.width>>1,filter:a}),t("fill",{color:d(i.color,e),opacity:i.opacity}),t("stroke",{opacity:0}))))}if(i.shadow)for(u=1;u<=i.lines;u++)p(u,-2,"progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)");for(u=1;u<=i.lines;u++)p(u);return n(e,l)};c.prototype.opacity=function(t,e,i,o){var n=t.firstChild;o=o.shadow&&o.lines||0;if(n&&e+o<n.childNodes.length){n=n.childNodes[e+o];n=n&&n.firstChild;n=n&&n.firstChild;if(n)n.opacity=i}}}var m=f(o("group"),{behavior:"url(#default#VML)"});if(!a(m,"transform")&&m.adj)h();else i=a(m,"animation");return c});

    var dev = false,
      script = document.createElement('script'),
      scripts = document.getElementsByTagName('script'),
      path;

    function build(config) {
      function step() {
        var divLoading;

        function destroyLoader() {
          divLoading.parentNode.removeChild(divLoading);
          config.spinner.stop();
          delete config.spinner;
        }

        if (typeof config.div === 'string') {
          config.div = document.getElementById(config.div);
        }

        divLoading = L.npmap.util._.getChildElementsByClassName(config.div, 'npmap-loading')[0];
        config.L = L.npmap.map(config);

        if (config.hooks && config.hooks.init) {
          config.hooks.init(destroyLoader);
        } else {
          destroyLoader();
        }
      };

      if (config.hooks && config.hooks.preinit) {
        config.hooks.preinit(step);
      } else {
        step();
      }
    }
    function callback() {
      L.npmap.util._.appendCssFile(path + 'npmap' + (dev ? '' : '.min') + '.css', function() {
        if (NPMap.config.constructor === Array) {
          for (var i = 0; i < NPMap.config.length; i++) {
            build(NPMap.config[i]);
          }
        } else {
          build(NPMap.config);
        }
        if (typeof npmapReady === "function") {
          npmapReady();
        }
      });
    }
    function showLoader(div) {
      var mask = document.createElement('div');

      mask.className = 'npmap-loading';
      mask.style.cssText = 'background-color:#f9f7f1;height:100%;left:0;position:absolute;top:0;width:100%;z-index:99999;';

      if (typeof div === 'string') {
        div = document.getElementById(div);
      }

      div.appendChild(mask);

      return new Spinner({
        className: 'npmap-loading-spinner',
        color: '#454545',
        corners: 1,
        direction: 1,
        hwaccel: true,
        left: 'auto',
        length: 15,
        lines: 13,
        radius: 15,
        rotate: 0,
        shadow: false,
        speed: 1,
        top: 'auto',
        trail: 60,
        width: 5,
        zIndex: 2e9
      }).spin(mask);
    }

    if (NPMap.config instanceof Array) {
      for (var i = 0; i < NPMap.config.length; i++) {
        NPMap.config[i].spinner = showLoader(NPMap.config[i].div);
      }
    } else {
      NPMap.config.spinner = showLoader(NPMap.config.div);
    }

    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;

      if (typeof src === 'string') {
        if (src.indexOf('npmap-bootstrap.js') !== -1) {
          dev = true;
          path = src.replace('npmap-bootstrap.js', '');
          script.src = path + 'npmap.js';
          break;
        } else if (src.indexOf('npmap-bootstrap.min.js') !== -1) {
          path = src.replace('npmap-bootstrap.min.js', '');
          script.src = path + 'npmap.min.js';
          break;
        }
      }
    }

    if (window.attachEvent && document.all) {
      script.onreadystatechange = function() {
        if (this.readyState === 'complete' || this.readyState === 'loaded') {
          callback();
        }
      };
    } else {
      script.onload = callback;
    }

    document.body.appendChild(script);
  })();
}
