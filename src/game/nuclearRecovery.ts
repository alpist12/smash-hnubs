export function startRecoveryCountdown(onTick:(seconds:number)=>void,onRestore:()=>void){
 const deadline=Date.now()+10000;
 onTick(10);
 const timer=setInterval(()=>{
  const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));onTick(seconds);
  if(seconds===0){clearInterval(timer);onRestore();}
 },250);
 return ()=>clearInterval(timer);
}
