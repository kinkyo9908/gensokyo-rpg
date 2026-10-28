/* All coordinates are original 1448x1086 village image pixels. Fixed route only. */
(function(root){'use strict';
 const data={id:'village-tabby-01',version:'1.0',coordinateSystem:'original-image-pixels',
  speed:14,framePixelToWorld:.4*(5120/1448),anchor:[48,86],validationRadius:20,sampleSpacing:.5,
  points:{A:[650,590],B:[650,535],C:[913,595],D:[800,680]},
  legs:[
   {id:'AB',from:'A',to:'B',path:[[650,590],[650,535]],rest:{animation:'sit',seconds:4}},
   {id:'BC',from:'B',to:'C',path:[[650,535],[705,530],[770,530],[840,535],[900,558],[913,595]],rest:{animation:'sleep',seconds:8}},
   {id:'CD',from:'C',to:'D',path:[[913,595],[905,638],[875,672],[800,680]],rest:{animation:'tail',seconds:3}},
   {id:'DA',from:'D',to:'A',path:[[800,680],[740,675],[700,651],[667,621],[650,590]],rest:null}
  ]};
 root.VillageCatData=data;if(typeof module!=='undefined')module.exports=data;
})(typeof window==='undefined'?globalThis:window);
