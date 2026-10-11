// Editable sample menu and local-time rules, shared by menu and ordering preview.
export const dishes = [
  {id:'hummus',category:'Starters',name:'House hummus',price:12,art:'hummus',description:'Silky chickpeas, tahini, good olive oil, warm pita.',tags:['vegetarian']},
  {id:'labneh',category:'Starters',name:'Whipped labneh',price:11,art:'labneh',description:'Cultured yogurt, za’atar, cucumber, a little lemon.',tags:['vegetarian','gluten-free']},
  {id:'carrots',category:'Starters',name:'Ember carrots',price:13,art:'carrots',description:'Slow-roasted carrots, harissa, honey, tahini.',tags:['vegetarian','spicy','gluten-free']},
  {id:'bread',category:'Starters',name:'Za’atar flatbread',price:10,art:'bread',description:'Blistered bread, wild thyme, sesame, olive oil.',tags:['vegetarian']},
  {id:'aubergine',category:'Mains',name:'Charred aubergine',price:24,art:'aubergine',description:'Tahini, pomegranate, fresh herbs, toasted almonds.',tags:['vegetarian','gluten-free']},
  {id:'chicken',category:'Mains',name:'Sumac chicken',price:28,art:'chicken',description:'Fire-grilled chicken, saffron rice, preserved lemon.',tags:['gluten-free']},
  {id:'rice',category:'Mains',name:'Harissa cauliflower',price:23,art:'cauliflower',description:'Roasted cauliflower, spicy pepper sauce, golden rice.',tags:['vegetarian','spicy','gluten-free']},
  {id:'salad',category:'Mains',name:'Garden fattoush',price:19,art:'salad',description:'Crunchy greens, tomatoes, sumac, crisp pita.',tags:['vegetarian']},
  {id:'cake',category:'Desserts',name:'Pistachio cake',price:10,art:'cake',description:'Olive oil cake, pistachio crumb, orange-blossom honey.',tags:['vegetarian']},
  {id:'baklava',category:'Desserts',name:'Walnut baklava',price:9,art:'baklava',description:'Golden pastry, walnuts, cinnamon, fragrant syrup.',tags:['vegetarian']},
  {id:'icecream',category:'Desserts',name:'Rose & pistachio',price:8,art:'icecream',description:'Two scoops, rose petals, crushed pistachios.',tags:['vegetarian','gluten-free']},
  {id:'citrus',category:'Drinks',name:'Blood orange spritz',price:9,art:'drink',description:'Blood orange, rosemary, sparkling water. Zero proof.',tags:['vegetarian','gluten-free']},
  {id:'tea',category:'Drinks',name:'Fresh mint tea',price:5,art:'tea',description:'Fresh mint leaves, a warm pot, honey on the side.',tags:['vegetarian','gluten-free']},
  {id:'coffee',category:'Drinks',name:'Cardamom coffee',price:5,art:'coffee',description:'Dark-roasted coffee with freshly ground cardamom.',tags:['vegetarian','gluten-free']},
  {id:'lemonade',category:'Drinks',name:'Rose lemonade',price:7,art:'drink',description:'Fresh lemon, a whisper of rose, plenty of ice.',tags:['vegetarian','gluten-free']}
];
export const tagLabels = {vegetarian:'Vegetarian',spicy:'Spicy','gluten-free':'Gluten-free'};
export function filterMenu(category, filters = []) {
  return dishes.filter(dish => dish.category === category && filters.every(tag => dish.tags.includes(tag)));
}
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year,month,day] = value.split('-').map(Number);
  const date = new Date(year,month-1,day);
  return localDateKey(date) === value ? date : null;
}
export function kitchenHours(day) {
  return {opens:day>=1 && day<=4 ? 17 : 12,closes:day===0 ? 21 : day>=5 ? 23 : 22};
}
export function isOpen(date = new Date()) {
  const hours = kitchenHours(date.getDay());
  const minute = date.getHours()*60 + date.getMinutes();
  return minute >= hours.opens*60 && minute < hours.closes*60;
}
export function timeLabel(hour, minute = 0) {
  return `${hour%12 || 12}:${String(minute).padStart(2,'0')}${hour>=12?'pm':'am'}`;
}
export function availableSlots(value, party, now = new Date()) {
  const date = parseLocalDate(value);
  if (!date) return [];
  const {opens,closes} = kitchenHours(date.getDay());
  const slots = [];
  const daySeed = date.getDate()+date.getMonth();
  for(let hour=opens;hour<closes-1;hour++) {
    const full = (hour+daySeed)%4===0 || (party>5 && (hour+daySeed)%3===0);
    const past = value<localDateKey(now) || (value===localDateKey(now) && hour*60<=now.getHours()*60+now.getMinutes());
    slots.push({value:`${String(hour).padStart(2,'0')}:00`,label:timeLabel(hour),full,past,disabled:full||past});
  }
  return slots;
}
