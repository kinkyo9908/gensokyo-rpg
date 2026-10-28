/* Integrated-background school interaction. No storage/network or interior loading. */
window.VillageSchoolEntryData={id:'keine-school-entry',point:[394,275],radius:18,approach:[[376,266],[410,254],[427,278],[389,295]],frontLine:[[315,284],[443,246]],target:{mapId:'keine-school',spawn:null,status:'interior-connection-pending'},porchPolicy:'Interact at the front steps; veranda and building footprint are not walkable.'};
(function(){'use strict';let lastRequest=null;
 function inside(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
 function canInteract(foot,terrain,r){const d=VillageSchoolEntryData,[a,b]=d.frontLine,t=(foot.x-a[0])/(b[0]-a[0]),line=a[1]+(b[1]-a[1])*t;if(!terrain.valid(foot.x,foot.y,r)||foot.y<line+r||!inside(foot.x,foot.y,d.approach)||Math.hypot(foot.x-d.point[0],foot.y-d.point[1])>d.radius)return false;for(let i=0;i<=10;i++){const t=i/10;if(!terrain.valid(foot.x+(d.point[0]-foot.x)*t,foot.y+(d.point[1]-foot.y)*t,.5))return false;}return true;}
 function request(foot,terrain,r){if(!canInteract(foot,terrain,r))return false;lastRequest={id:VillageSchoolEntryData.id,from:[foot.x,foot.y],...structuredClone(VillageSchoolEntryData.target)};dispatchEvent(new CustomEvent('village:school-enter-request',{detail:structuredClone(lastRequest)}));return true;}
 window.VillageSchoolEntry={canInteract,request,get lastRequest(){return structuredClone(lastRequest)}};
})();
