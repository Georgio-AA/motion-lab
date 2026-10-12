// A four-course absolute timeline. Nothing depends on previous animation state.
export const courseLength = 1;
export const totalLength = 4;
export const clamp = (v, min=0, max=1) => Math.max(min,Math.min(max,v));
export const ease = v => { const x=clamp(v); return 1-Math.pow(1-x,3); };
export function coursePose(time, course, plate, pose = {}) {
  // Serve before changing the label; clear only after the next course is served.
  // Each active course is fully opaque and settled for its entire [n, n+1) range.
  pose.enter = ease((time-course+.29-plate*.045)/.17);
  pose.leave = course===3 ? 0 : ease((time-course-1)/.22);
  pose.alpha = pose.enter*(1-pose.leave);
  return pose;
}
export function activeCourse(time) { return Math.min(3,Math.floor(clamp(time,0,3.999))); }
// Normalized, overlapping flat-lay. Plate rims stay inside at every aspect ratio.
export const tablePlates = [
  {x:.35,y:.31,size:.79,angle:-.16,dx:-1,dy:-.2},
  {x:.69,y:.48,size:.73,angle:.2,dx:1,dy:0},
  {x:.40,y:.69,size:.79,angle:-.12,dx:-.2,dy:1}
];
export function tableUnit(width,height){return Math.min(width,height*.95);}
