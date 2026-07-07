// charts.js — Egna SVG-diagramkomponenter (ingen extern lib, ingen byggkedja).
// Laddas via <script> FÖRE huvudscriptet i index.html. Exponerar globalt:
// SvgLineChart, SvgBarChart, SvgScatter, SvgDonut.
(function () {
  const h = React.createElement;
  const { useState } = React;
function SvgLineChart({ data, lines, height, markers }) {
  var hoverSt = useState(null); var hoverI = hoverSt[0], setHoverI = hoverSt[1];
  height = height || 260;
  if (!data || data.length < 2) return h('p', {className:'text-gray-400 text-sm text-center py-8'}, 'Lägg till fler mätningar för att se grafen');
  var PL=50,PR=20,PT=20,PB=36,W=800,H=height;
  var chartW=W-PL-PR, chartH=H-PT-PB;
  var allVals=[];
  lines.forEach(function(l){ data.forEach(function(d){ if(d[l.key]!=null) allVals.push(d[l.key]); }); });
  var minV=Math.min.apply(null,allVals)-0.5, maxV=Math.max.apply(null,allVals)+0.5;
  var rng=maxV-minV||1;
  var timed = data[0] && data[0].t != null;
  var tmin, tmax;
  if (timed) { var _ts = data.map(function(d){ return d.t; }); tmin = Math.min.apply(null,_ts); tmax = Math.max.apply(null,_ts); }
  var fx=function(i){ return timed ? (data[i].t - tmin)/((tmax-tmin)||1) : (i/(data.length-1)); };
  var tx=function(i){ return PL+fx(i)*chartW; };
  var ty=function(v){ return PT+chartH-((v-minV)/rng)*chartH; };
  var gridEls=[];
  for(var gi=0;gi<=4;gi++){
    var gv=minV+(rng/4)*gi, gy=ty(gv);
    gridEls.push(h('line',{key:'g'+gi,x1:PL,y1:gy,x2:PL+chartW,y2:gy,stroke:'#f0f0f0',strokeWidth:1}));
    gridEls.push(h('text',{key:'gt'+gi,x:PL-4,y:gy+4,textAnchor:'end',fontSize:10,fill:'#9ca3af'},gv.toFixed(1)));
  }
  var nth=Math.max(1,Math.ceil(data.length/8));
  var xLabels=data.map(function(d,i){
    if(i%nth!==0&&i!==data.length-1) return null;
    return h('text',{key:'xl'+i,x:tx(i),y:PT+chartH+18,textAnchor:'middle',fontSize:9,fill:'#9ca3af'},d.datum);
  });
  var lineEls=lines.map(function(l){
    var pts=data.filter(function(d){return d[l.key]!=null;}).map(function(d,_,arr){
      var i=data.indexOf(d); return tx(i)+','+ty(d[l.key]);
    }).join(' ');
    return h('polyline',{key:l.key,points:pts,fill:'none',stroke:l.color,strokeWidth:l.width||1.5,strokeDasharray:l.dashed?'5,5':undefined});
  });
  var markerEls=[];
  if(markers){ markers.forEach(function(m,mi){ if(m.i==null||m.i<0||m.i>=data.length) return; var mx=tx(m.i); markerEls.push(h('line',{key:'mk'+mi,x1:mx,y1:PT,x2:mx,y2:PT+chartH,stroke:'#db2777',strokeWidth:1,strokeDasharray:'3,3',opacity:0.6})); if(m.label) markerEls.push(h('text',{key:'mkl'+mi,x:mx,y:PT-4,textAnchor:'middle',fontSize:9,fill:'#db2777'},m.label)); }); }
  var legendEls=lines.map(function(l,i){
    var lx=PL+i*140;
    return h('g',{key:'leg'+i},
      h('line',{x1:lx,y1:H-8,x2:lx+20,y2:H-8,stroke:l.color,strokeWidth:l.width||1.5,strokeDasharray:l.dashed?'5,5':undefined}),
      h('text',{x:lx+24,y:H-4,fontSize:10,fill:'#6b7280'},l.name)
    );
  });
  var onMove = function(e){
    var r = e.currentTarget.getBoundingClientRect();
    var cx = (e.clientX - r.left) / r.width * W;
    var best = 0, bd = Infinity;
    for (var mi = 0; mi < data.length; mi++) { var dd2 = Math.abs(tx(mi) - cx); if (dd2 < bd) { bd = dd2; best = mi; } }
    setHoverI(best);
  };
  var tipEls = null;
  if (hoverI != null && data[hoverI]) {
    var dd = data[hoverI], hx = tx(hoverI);
    var rows = lines.filter(function(l){ return dd[l.key] != null; });
    if (rows.length) {
      var boxW = 160, boxH = 22 + rows.length*14;
      var bx = (hx + 12 + boxW > W - PR) ? hx - 12 - boxW : hx + 12;
      tipEls = h('g', { style: { pointerEvents: 'none' } },
        h('line', { x1: hx, y1: PT, x2: hx, y2: PT + chartH, stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '2,2' }),
        ...rows.map(function(l){ return h('circle', { key: 'hc'+l.key, cx: hx, cy: ty(dd[l.key]), r: 4, fill: l.color, stroke: 'white', strokeWidth: 1.5 }); }),
        h('rect', { x: bx, y: PT + 4, width: boxW, height: boxH, rx: 6, fill: 'rgba(17,24,39,0.92)' }),
        h('text', { x: bx + 9, y: PT + 20, fontSize: 11, fontWeight: 'bold', fill: 'white' }, dd.datum),
        ...rows.map(function(l, ri){ return h('text', { key: 'ht'+l.key, x: bx + 9, y: PT + 34 + ri*14, fontSize: 10, fill: l.color }, l.name + ': ' + dd[l.key]); })
      );
    }
  }
  return h('svg',{viewBox:'0 0 '+W+' '+H,style:{width:'100%',height:height+'px'},xmlns:'http://www.w3.org/2000/svg',
    onMouseMove:onMove, onMouseLeave:function(){setHoverI(null);}},
    h('line',{x1:PL,y1:PT,x2:PL,y2:PT+chartH,stroke:'#e5e7eb',strokeWidth:1}),
    h('line',{x1:PL,y1:PT+chartH,x2:PL+chartW,y2:PT+chartH,stroke:'#e5e7eb',strokeWidth:1}),
    ...gridEls, ...markerEls, ...xLabels, ...lineEls, ...legendEls, tipEls
  );
}
function SvgBarChart({ data, dataKey, color, height }) {
  var hoverSt = useState(null); var hoverI = hoverSt[0], setHoverI = hoverSt[1];
  height = height || 200;
  if (!data || data.length === 0) return null;
  var PL=50,PR=20,PT=20,PB=36,W=800,H=height;
  var chartW=W-PL-PR, chartH=H-PT-PB;
  var vals=data.map(function(d){return d[dataKey]||0;}), maxV=Math.max.apply(null,vals)||1;
  var bW=(chartW/data.length)*0.75;
  var bars=data.map(function(d,i){
    var v=d[dataKey]||0, bH=(v/maxV)*chartH;
    var bx=PL+(i/data.length)*chartW+(chartW/data.length)*0.125;
    return h('rect',{key:i,x:bx,y:PT+chartH-bH,width:bW,height:bH,fill:color,rx:2});
  });
  var nth=Math.max(1,Math.ceil(data.length/8));
  var xLabels=data.map(function(d,i){
    if(i%nth!==0&&i!==data.length-1) return null;
    var bx=PL+(i/data.length)*chartW+(chartW/data.length)*0.125+bW/2;
    return h('text',{key:'xl'+i,x:bx,y:PT+chartH+18,textAnchor:'middle',fontSize:9,fill:'#9ca3af'},d.datum);
  });
  var yLabels=[];
  for(var yi=0;yi<=4;yi++){
    var yv=Math.round((maxV/4)*yi), yyy=PT+chartH-(yi/4)*chartH;
    yLabels.push(h('text',{key:'y'+yi,x:PL-4,y:yyy+4,textAnchor:'end',fontSize:10,fill:'#9ca3af'},yv>=1000?Math.round(yv/1000)+'k':yv));
  }
  var onMove = function(e){
    var r = e.currentTarget.getBoundingClientRect();
    var cx = (e.clientX - r.left) / r.width * W;
    var i = Math.floor((cx - PL) / chartW * data.length);
    setHoverI(Math.max(0, Math.min(data.length - 1, i)));
  };
  var tipEls = null;
  if (hoverI != null && data[hoverI] && data[hoverI][dataKey] != null) {
    var dd = data[hoverI];
    var hx = PL + (hoverI/data.length)*chartW + (chartW/data.length)*0.5;
    var boxW = 130;
    var bx = (hx + 12 + boxW > W - PR) ? hx - 12 - boxW : hx + 12;
    tipEls = h('g', { style: { pointerEvents: 'none' } },
      h('rect', { x: PL + (hoverI/data.length)*chartW + (chartW/data.length)*0.125, y: PT, width: bW, height: chartH, fill: 'rgba(148,163,184,0.12)' }),
      h('rect', { x: bx, y: PT + 4, width: boxW, height: 38, rx: 6, fill: 'rgba(17,24,39,0.92)' }),
      h('text', { x: bx + 9, y: PT + 20, fontSize: 11, fontWeight: 'bold', fill: 'white' }, dd.datum),
      h('text', { x: bx + 9, y: PT + 34, fontSize: 10, fill: '#a5b4fc' }, (dd[dataKey] != null ? dd[dataKey].toLocaleString('sv-SE') : '–'))
    );
  }
  return h('svg',{viewBox:'0 0 '+W+' '+H,style:{width:'100%',height:height+'px'},xmlns:'http://www.w3.org/2000/svg',
    onMouseMove:onMove, onMouseLeave:function(){setHoverI(null);}},
    h('line',{x1:PL,y1:PT+chartH,x2:PL+chartW,y2:PT+chartH,stroke:'#e5e7eb',strokeWidth:1}),
    ...[0,1,2,3,4].map(function(i){var gy=PT+chartH-(i/4)*chartH;return h('line',{key:'g'+i,x1:PL,y1:gy,x2:PL+chartW,y2:gy,stroke:'#f0f0f0',strokeWidth:1});}),
    ...yLabels, ...xLabels, ...bars, tipEls
  );
}
function SvgScatter({ points, xName, yName, color, height }) {
  var hoverSt = useState(null); var hoverP = hoverSt[0], setHoverP = hoverSt[1];
  height=height||240;
  if(!points||points.length<3) return h('p',{className:'text-gray-400 text-sm text-center py-8'},'För lite gemensam data ännu');
  var PL=52,PR=20,PT=18,PB=42,W=800,H=height, chartW=W-PL-PR, chartH=H-PT-PB;
  var xs=points.map(function(p){return p.x;}), ys=points.map(function(p){return p.y;});
  var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs),minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
  var rx=(maxX-minX)||1, ry=(maxY-minY)||1;
  var tx=function(x){return PL+((x-minX)/rx)*chartW;}, ty=function(y){return PT+chartH-((y-minY)/ry)*chartH;};
  var n=points.length,sx=0,sy=0,sxy=0,sxx=0;
  points.forEach(function(p){sx+=p.x;sy+=p.y;sxy+=p.x*p.y;sxx+=p.x*p.x;});
  var slope=(n*sxy-sx*sy)/((n*sxx-sx*sx)||1), intercept=(sy-slope*sx)/n;
  var trend=h('line',{x1:tx(minX),y1:ty(slope*minX+intercept),x2:tx(maxX),y2:ty(slope*maxX+intercept),stroke:color,strokeWidth:2,strokeDasharray:'6,4'});
  var zero=(minY<0&&maxY>0)?h('line',{x1:PL,y1:ty(0),x2:PL+chartW,y2:ty(0),stroke:'#d1d5db',strokeWidth:1}):null;
  var dots=points.map(function(p,i){return h('circle',{key:i,cx:tx(p.x),cy:ty(p.y),r:3.5,fill:color,fillOpacity:0.45});});
  var onMove = function(e){
    var r = e.currentTarget.getBoundingClientRect();
    var mx = (e.clientX - r.left) / r.width * W, my = (e.clientY - r.top) / r.height * H;
    var best = null, bd = 400;
    points.forEach(function(p){ var d = Math.pow(tx(p.x)-mx,2) + Math.pow(ty(p.y)-my,2); if (d < bd) { bd = d; best = p; } });
    setHoverP(best);
  };
  var tipEls = null;
  if (hoverP) {
    var px = tx(hoverP.x), py = ty(hoverP.y);
    var boxW = 140;
    var bx = (px + 12 + boxW > W - PR) ? px - 12 - boxW : px + 12;
    var by = Math.max(PT, Math.min(py - 20, PT + chartH - 40));
    tipEls = h('g', { style: { pointerEvents: 'none' } },
      h('circle', { cx: px, cy: py, r: 6, fill: 'none', stroke: color, strokeWidth: 2 }),
      h('rect', { x: bx, y: by, width: boxW, height: 36, rx: 6, fill: 'rgba(17,24,39,0.92)' }),
      h('text', { x: bx + 9, y: by + 15, fontSize: 10, fill: 'white' }, xName + ': ' + (Math.round(hoverP.x*100)/100).toLocaleString('sv-SE')),
      h('text', { x: bx + 9, y: by + 29, fontSize: 10, fill: 'white' }, yName + ': ' + (Math.round(hoverP.y*100)/100).toLocaleString('sv-SE'))
    );
  }
  return h('svg',{viewBox:'0 0 '+W+' '+H,style:{width:'100%',height:height+'px'},xmlns:'http://www.w3.org/2000/svg',
    onMouseMove:onMove, onMouseLeave:function(){setHoverP(null);}},
    h('line',{x1:PL,y1:PT,x2:PL,y2:PT+chartH,stroke:'#e5e7eb',strokeWidth:1}),
    h('line',{x1:PL,y1:PT+chartH,x2:PL+chartW,y2:PT+chartH,stroke:'#e5e7eb',strokeWidth:1}),
    zero, trend, ...dots, tipEls,
    h('text',{x:PL+chartW/2,y:H-6,textAnchor:'middle',fontSize:11,fill:'#6b7280'},xName),
    h('text',{x:16,y:PT+chartH/2,textAnchor:'middle',fontSize:11,fill:'#6b7280',transform:'rotate(-90 16 '+(PT+chartH/2)+')'},yName)
  );
}
function SvgDonut({ segments, size }) {
  size = size || 170;
  var total = segments.reduce(function(s,x){return s+x.value;},0);
  if(!total) return h('p',{className:'text-gray-400 text-sm text-center py-8'},'Ingen data ännu');
  var cx=size/2, cy=size/2, r=size*0.38, C=2*Math.PI*r, acc=0;
  var arcs = segments.map(function(seg,i){
    var frac=seg.value/total, dash=C*frac, off=C*acc; acc+=frac;
    return h('circle',{key:i,cx:cx,cy:cy,r:r,fill:'none',stroke:seg.color,strokeWidth:size*0.17,strokeDasharray:dash+' '+(C-dash),strokeDashoffset:-off,transform:'rotate(-90 '+cx+' '+cy+')'});
  });
  return h('svg',{viewBox:'0 0 '+size+' '+size,style:{width:size+'px',height:size+'px'},xmlns:'http://www.w3.org/2000/svg'},
    arcs,
    h('text',{x:cx,y:cy-2,textAnchor:'middle',fontSize:size*0.14,fontWeight:'bold',fill:'#374151'}, Math.round(total/60)+'h'),
    h('text',{x:cx,y:cy+size*0.12,textAnchor:'middle',fontSize:size*0.07,fill:'#9ca3af'},'totalt')
  );
}
  window.SvgLineChart = SvgLineChart;
  window.SvgBarChart = SvgBarChart;
  window.SvgScatter = SvgScatter;
  window.SvgDonut = SvgDonut;
})();
