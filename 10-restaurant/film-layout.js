// Timeline units are viewport lengths. Rest poses leave room to read every course.
export const chapterNames = ['Arrival','The doors','The dining room','The fire','The tasting table','Little moments','The evening'];
export const courseNames = ['Starters','Mains','Desserts','Drinks'];
export function filmLayout(mobile = false) {
  const lengths = mobile ? [.8,1,.9,.7,3,.8,.7] : [1.6,2.2,1.9,1.6,6,1.6,1.3];
  const starts = [];
  let total = 0;
  for (const length of lengths) { starts.push(total); total += length; }
  const courseLength = lengths[4]/4;
  const courseRests = courseNames.map((_,index)=>starts[4]+(index+.66)*courseLength);
  const rests = starts.map((start,index)=>start+lengths[index]*.66);
  rests[4] = courseRests[0];
  return {lengths,starts,total,rests,courseLength,courseRests,snapPoints:[0,...rests,...courseRests.slice(1),total].sort((a,b)=>a-b).map(time=>time/total)};
}
