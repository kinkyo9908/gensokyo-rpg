/* Fixed residential out-and-back route; source pixels, never random. */
(function(root){'use strict';
 const AB=[[915,185],[930,215],[980,247],[1045,242],[1095,240],[1140,253],[1190,265]],BC=[[1190,265],[1235,275],[1270,295],[1270,335]];
 const data={id:'village-yellow-dog-01',version:'1.0',coordinateSystem:'original-image-pixels',houseId:'north-small-house',
  catReferenceSpeed:root.VillageCatData?.speed||14,speedMultiplier:1.6,framePixelToWorld:.4*(5120/1448),anchor:[48,86],validationRadius:20,sampleSpacing:.5,
  points:{A:[915,185],B:[1190,265],C:[1270,335]},
  routes:{AB,BC,CA:[...BC].reverse().concat([...AB].reverse().slice(1))},
  stages:[
   {id:'A-initial',point:'A',animation:'rest',seconds:20},
   {id:'AB',route:'AB',target:'B'},
   {id:'B-tail',point:'B',animation:'tail',seconds:8},
   {id:'BC',route:'BC',target:'C'},
   {id:'C-sit',point:'C',animation:'sit',seconds:12},
   {id:'CA',route:'CA',target:'A'},
   {id:'A-return',point:'A',animation:'rest',seconds:25}
  ]};root.VillageDogData=data;if(typeof module!=='undefined')module.exports=data;
})(typeof window==='undefined'?globalThis:window);
