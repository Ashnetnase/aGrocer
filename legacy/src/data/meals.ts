import { Day, Meal, Plan } from '../types';

export const meals: Meal[] = [
{
  id: 'm1',
  name: 'Spaghetti Bolognese',
  minutes: 40,
  serves: 5,
  tags: ['Kids', 'Budget', 'Favourite'],
  image: "/e05025cb-f967-4c95-b606-05311d504b63.jpg",
  description: 'The family staple. Big pot, leftovers for tomorrow’s lunch.',
  ingredients: ['Beef mince 500g', 'Pasta 1 pack', 'Tomatoes 4', 'Onion 1', 'Cheese']
},
{
  id: 'm2',
  name: 'Chicken Teriyaki Bowls',
  minutes: 30,
  serves: 5,
  tags: ['Quick', 'Kids'],
  image: "/fb7def48-bb99-4ce2-b754-6cdfda33f69d.jpg",
  description: 'Rice bowls with sticky teriyaki chicken and steamed greens.',
  ingredients: ['Chicken breast 1kg', 'Rice 2 cups', 'Broccoli 1 head', 'Soy sauce', 'Sesame seeds']
},
{
  id: 'm3',
  name: 'Beef Tacos',
  minutes: 25,
  serves: 5,
  tags: ['Quick', 'Kids', 'Favourite'],
  image: "/8fdb81ef-21e7-42bd-96bc-432063e2fd8e.jpg",
  description: 'Everyone builds their own — the easiest weeknight win.',
  ingredients: ['Beef mince 500g', 'Taco shells', 'Lettuce', 'Tomatoes 3', 'Cheese']
},
{
  id: 'm4',
  name: 'Homemade Pizza',
  minutes: 50,
  serves: 5,
  tags: ['Weekend', 'Kids'],
  image: "/674e7403-d498-4952-b5d8-ed80445b3ac9.jpg",
  description: 'Friday night tradition. Kids top their own bases.',
  ingredients: ['Pizza bases 3', 'Tomato paste', 'Cheese 500g', 'Ham', 'Capsicum 1']
},
{
  id: 'm5',
  name: 'Chicken Wraps',
  minutes: 20,
  serves: 5,
  tags: ['Quick', 'Budget'],
  image: "/7b2adf9a-8163-4302-be22-75b4a6ac8b24.jpg",
  description: 'Uses up leftover roast chicken and salad from the fridge.',
  ingredients: ['Wraps 1 pack', 'Chicken breast 500g', 'Lettuce', 'Tomatoes 2', 'Yoghurt']
},
{
  id: 'm6',
  name: 'Burgers',
  minutes: 35,
  serves: 5,
  tags: ['Weekend', 'Kids', 'Favourite'],
  image: "/b4a46d6f-7543-4a8e-bd90-7228b2c50811.jpg",
  description: 'Homemade patties, toasted buns, oven chips on the side.',
  ingredients: ['Beef mince 700g', 'Burger buns 6', 'Cheese', 'Lettuce', 'Frozen chips']
},
{
  id: 'm7',
  name: 'Roast Chicken',
  minutes: 90,
  serves: 5,
  tags: ['Weekend', 'Favourite'],
  image: "/994782f1-7cd8-43cf-8c57-186751780661.jpg",
  description: 'Sunday roast with potatoes and carrots. Leftovers for wraps.',
  ingredients: ['Whole chicken 1.8kg', 'Potatoes 1kg', 'Carrots 500g', 'Frozen peas 1 bag']
},
{
  id: 'm8',
  name: 'Beef Noodle Stir Fry',
  minutes: 25,
  serves: 5,
  tags: ['Quick', 'Budget'],
  image: "/599f949c-195d-4b55-8464-ebb5975b705e.jpg",
  description: 'Whatever vegetables need using, plus noodles and beef strips.',
  ingredients: ['Beef strips 500g', 'Noodles 2 packs', 'Capsicum 1', 'Frozen peas', 'Soy sauce']
}];


export const days: Day[] = [
{ key: 'mon', label: 'Monday', short: 'Mon', date: '24 Aug' },
{ key: 'tue', label: 'Tuesday', short: 'Tue', date: '25 Aug' },
{ key: 'wed', label: 'Wednesday', short: 'Wed', date: '26 Aug' },
{ key: 'thu', label: 'Thursday', short: 'Thu', date: '27 Aug' },
{ key: 'fri', label: 'Friday', short: 'Fri', date: '28 Aug' },
{ key: 'sat', label: 'Saturday', short: 'Sat', date: '29 Aug' },
{ key: 'sun', label: 'Sunday', short: 'Sun', date: '30 Aug' }];


export const initialPlan: Plan = {
  mon: { dinner: 'm1', lunch: 'm5' },
  tue: { dinner: 'm2' },
  wed: { dinner: 'm3' },
  thu: {},
  fri: { dinner: 'm4' },
  sat: { dinner: 'm6' },
  sun: { dinner: 'm7', lunch: 'm5' }
};

export const todayKey = 'wed';