// One visit, one invitation. The caller supplies only visible, unpaused viewing time.
export function createWorldGuide(reduced,callbacks) {
  let elapsed=0,finished=false,lastBucket=-1;
  return {
    cancel() { if(finished) return;finished=true;callbacks.cancel(); },
    tick(dt) {
      if(finished||dt<=0) return;
      elapsed+=dt;
      if(elapsed<7) return;
      if(reduced) { finished=true;callbacks.prompt();return; }
      if(elapsed>=12) { finished=true;callbacks.switch();return; }
      const bucket=Math.floor((elapsed-7)*4);
      if(bucket!==lastBucket) { lastBucket=bucket;callbacks.countdown(Math.ceil(12-elapsed),Math.min(1,(elapsed-7)/5)); }
    }
  };
}
