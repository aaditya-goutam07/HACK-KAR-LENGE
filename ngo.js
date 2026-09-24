import { db, collection, onSnapshot, doc, updateDoc, orderBy, query } from "./firebase-config.js";
import { esc, countTo, syncCards, drawMap } from "./ui.js";
const list=document.getElementById('ngo-donation-list');
const emptyEl=document.getElementById('ngo-donation-empty');
const donationsRef=collection(db,'donations');
const q=query(donationsRef,orderBy('createdAt','desc'));
const activeWatchers={};
const STATUS_CLASS={Posted:'badge-posted',Accepted:'badge-accepted',Dispatched:'badge-dispatched',Delivered:'badge-delivered'};

const DEMO_RECIPIENTS=[
  {name:'Nearby Shelter Hub A',lat:26.9124,lng:75.7873,capacity:100},
  {name:'Nearby Shelter Hub B',lat:26.8920,lng:75.8180,capacity:80},
  {name:'Nearby Shelter Hub C',lat:26.9360,lng:75.7700,capacity:120}
];
function distanceKm(a,b,c,d){const R=6371,rad=x=>x*Math.PI/180;const x=rad(c-a),y=rad(d-b);const h=Math.sin(x/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function bestRecipient(d){ if(d.pickupLat==null||d.pickupLng==null)return null; return DEMO_RECIPIENTS.filter(r=>r.capacity>=Number(d.quantity||0)).map(r=>({...r,distance:distanceKm(d.pickupLat,d.pickupLng,r.lat,r.lng)})).sort((a,b)=>a.distance-b.distance)[0] || null; }

const hasMap=d=>d.pickupLat!=null&&d.pickupLng!=null&&d.status!=='Posted';
function actions(d,id){
  if(d.status==='Posted')return `<button class="primary-btn" onclick="acceptDonation('${id}')">Accept &amp; auto-match</button>`;
  if(d.status==='Accepted')return `<div class="location-row"><input type="text" id="driver-input-${id}" placeholder="Driver name"><button class="primary-btn inline-btn" onclick="assignDriver('${id}')">Assign driver</button></div>`;
  if(d.status==='Dispatched')return `<button class="sharing-btn" onclick="toggleSharing('${id}',this)">${activeWatchers[id]?'🟢 Sharing live location — tap to stop':'📍 Start sharing live location'}</button><button class="primary-btn" onclick="markDelivered('${id}')">Mark as delivered</button>`;
  return '';
}
const build=(d,id)=>`<div class="card-top"><div><h3>${esc(d.item)}</h3><p>${Number(d.quantity||0)} meals</p></div><span class="badge ${STATUS_CLASS[d.status]||'badge-posted'}">${esc(d.status)}</span></div><p>📍 ${esc(d.location)}</p><p>⏰ Safe until: ${new Date(d.expiry).toLocaleString()}</p>${d.recipient?`<div class="match-box">🎯 <b>Matched recipient:</b> ${esc(d.recipient)}</div>`:''}${d.driver?`<p>🚚 Driver: ${esc(d.driver)}</p>`:''}${hasMap(d)?`<div class="route-info" id="route-${id}">Live route ready</div><div class="mini-map" id="map-${id}"></div>`:''}${actions(d,id)}`;

onSnapshot(q,snapshot=>{let delivered=0,weight=0;const items=[];
  snapshot.forEach(ds=>{const d=ds.data(),id=ds.id;if(d.status==='Delivered'){delivered+=Number(d.quantity||0);weight+=Number(d.quantity||0)*.4;}
    items.push({id,data:d,sig:[d.item,d.quantity,d.location,d.expiry,d.status,d.driver,d.recipient].join('|'),msig:hasMap(d)?`${d.driverLat}|${d.driverLng}`:null});});
  syncCards(list,emptyEl,items,build,(d,id)=>drawMap(id,d));
  countTo(document.getElementById('ngo-meals-count'),delivered);countTo(document.getElementById('ngo-weight-count'),Math.round(weight));countTo(document.getElementById('ngo-co2-count'),Math.round(weight*2.5));});

window.acceptDonation=async id=>{const ref=doc(db,'donations',id);const snap=await new Promise(resolve=>{const unsub=onSnapshot(ref,s=>{unsub();resolve(s);});});const d=snap.data();const recipient=bestRecipient(d);await updateDoc(ref,{status:'Accepted',recipient:recipient?.name||'Manual recipient selection',recipientLat:recipient?.lat||null,recipientLng:recipient?.lng||null,matchDistanceKm:recipient?Number(recipient.distance.toFixed(2)):null});};
window.assignDriver=async id=>{const input=document.getElementById(`driver-input-${id}`),name=input.value.trim();if(!name)return alert('Please enter a driver name.');await updateDoc(doc(db,'donations',id),{status:'Dispatched',driver:name});};
const sharingLabel=on=>on?'🟢 Sharing live location — tap to stop':'📍 Start sharing live location';
window.toggleSharing=(id,btn)=>{if(activeWatchers[id]){navigator.geolocation.clearWatch(activeWatchers[id]);delete activeWatchers[id];if(btn)btn.textContent=sharingLabel(false);return;}if(!navigator.geolocation)return alert('Geolocation is not supported on this device.');const ref=doc(db,'donations',id);activeWatchers[id]=navigator.geolocation.watchPosition(async pos=>{await updateDoc(ref,{driverLat:pos.coords.latitude,driverLng:pos.coords.longitude});},err=>{alert('Could not get location: '+err.message);navigator.geolocation.clearWatch(activeWatchers[id]);delete activeWatchers[id];},{enableHighAccuracy:true,maximumAge:5000,timeout:10000});if(btn)btn.textContent=sharingLabel(true);};
window.markDelivered=async id=>{if(activeWatchers[id]){navigator.geolocation.clearWatch(activeWatchers[id]);delete activeWatchers[id];}await updateDoc(doc(db,'donations',id),{status:'Delivered'});};
