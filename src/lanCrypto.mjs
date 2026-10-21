const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const base64=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);};
export const randomBase64=n=>base64(crypto.getRandomValues(new Uint8Array(n)));
export function pairingCode(){return Array.from(crypto.getRandomValues(new Uint32Array(3)),n=>String(n%10000).padStart(4,'0')).join('');}
export async function deriveKey(code,salt){
 if(!/^\d{12}$/.test(code))throw Error('Introduce los doce dígitos del código.');
 const source=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(salt),iterations:210000,hash:'SHA-256'},source,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function seal(key,value){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value)));return {iv:base64(iv),data:base64(new Uint8Array(data))};}
export async function unseal(key,packet){try{return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(packet.iv)},key,bytes(packet.data))));}catch{throw Error('Código incorrecto o transferencia dañada.');}}
export function compatible(local,remote){if(remote.protocol!==1||remote.version!==local.version||remote.edition!==local.edition)throw Error('Ambos dispositivos deben tener la misma versión y edición de Elara.');}
