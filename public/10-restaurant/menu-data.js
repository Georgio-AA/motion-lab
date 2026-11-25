// Original dishes and concept prices. Dietary filters combine with AND matching.
export const courses = ['Starters','Mains','Desserts','Drinks'];
export const tagLabels = {vegetarian:'Vegetarian',spicy:'Spicy','gluten-free':'Gluten-free'};
export const dishes = [
  {id:'hummus',category:'Starters',name:'House hummus',price:12,description:'Silky chickpeas, tahini, olive oil, sumac. Warm bread to tear.',tags:['vegetarian']},
  {id:'labneh',category:'Starters',name:'Whipped labneh',price:11,description:'Cultured yogurt, wild thyme, garden herbs, a little lemon.',tags:['vegetarian','gluten-free']},
  {id:'carrots',category:'Starters',name:'Ember carrots',price:13,description:'Slow-roasted carrots, harissa, burnt honey, tahini.',tags:['vegetarian','spicy','gluten-free']},
  {id:'bread',category:'Starters',name:'Za’atar flatbread',price:10,description:'Blistered bread, wild thyme, sesame, good olive oil.',tags:['vegetarian']},
  {id:'aubergine',category:'Mains',name:'Charred aubergine',price:24,description:'Smoky aubergine, tahini, pomegranate, toasted almonds.',tags:['vegetarian','gluten-free']},
  {id:'chicken',category:'Mains',name:'Sumac chicken',price:28,description:'Fire-grilled chicken, saffron rice, preserved lemon.',tags:['gluten-free']},
  {id:'cauliflower',category:'Mains',name:'Harissa cauliflower',price:23,description:'Roasted florets, spicy pepper sauce, golden rice.',tags:['vegetarian','spicy','gluten-free']},
  {id:'salad',category:'Mains',name:'Garden fattoush',price:19,description:'Crunchy greens, ripe tomatoes, sumac, crisp pita.',tags:['vegetarian']},
  {id:'cake',category:'Desserts',name:'Pistachio cake',price:10,description:'Olive oil cake, pistachio crumb, orange-blossom honey.',tags:['vegetarian']},
  {id:'baklava',category:'Desserts',name:'Walnut baklava',price:9,description:'Golden pastry, walnuts, cinnamon, fragrant syrup.',tags:['vegetarian']},
  {id:'icecream',category:'Desserts',name:'Rose & pistachio',price:8,description:'Rose cream, petals, crushed pistachios. Two slow scoops.',tags:['vegetarian','gluten-free']},
  {id:'citrus',category:'Drinks',name:'Blood orange spritz',price:9,description:'Blood orange, rosemary, sparkling water. Zero proof.',tags:['vegetarian','gluten-free']},
  {id:'tea',category:'Drinks',name:'Fresh mint tea',price:5,description:'Fresh mint, a warm pot, honey on the side.',tags:['vegetarian','gluten-free']},
  {id:'coffee',category:'Drinks',name:'Cardamom coffee',price:5,description:'Dark-roasted coffee with freshly ground cardamom.',tags:['vegetarian','gluten-free']},
  {id:'lemonade',category:'Drinks',name:'Rose lemonade',price:7,description:'Fresh lemon, a whisper of rose, plenty of ice.',tags:['vegetarian','gluten-free']}
];
export function filterMenu(category, filters = []) { return dishes.filter(d => d.category === category && filters.every(tag => d.tags.includes(tag))); }
export function nextSevenDays(now = new Date()) {
  // Noon avoids local daylight-saving midnight edge cases.
  return Array.from({length:7}, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate()+i,12));
}
export function bookingSlots(day) { return day === 0 ? ['5:00 pm','5:30 pm','6:00 pm','6:30 pm','7:00 pm','7:30 pm'] : ['5:00 pm','5:30 pm','6:00 pm','6:30 pm','7:00 pm','7:30 pm','8:00 pm','8:30 pm','9:00 pm']; }
