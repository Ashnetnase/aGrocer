import type { Meal, Plan } from '@/domain/schemas/meal';

/**
 * Ported verbatim from the Magic Patterns demo data, with the UUID image
 * filenames replaced by semantic paths under `public/meals`.
 */
export const mealsSeed: Meal[] = [
  {
    id: 'm1',
    name: 'Spaghetti Bolognese',
    minutes: 40,
    serves: 5,
    tags: ['Kids', 'Budget', 'Favourite'],
    image: '/meals/spaghetti-bolognese.jpg',
    description: 'The family staple. Big pot, leftovers for tomorrow’s lunch.',
    ingredients: ['Beef mince 500g', 'Pasta 1 pack', 'Tomatoes 4', 'Onion 1', 'Cheese'],
  },
  {
    id: 'm2',
    name: 'Chicken Teriyaki Bowls',
    minutes: 30,
    serves: 5,
    tags: ['Quick', 'Kids'],
    image: '/meals/chicken-teriyaki-bowls.jpg',
    description: 'Rice bowls with sticky teriyaki chicken and steamed greens.',
    ingredients: ['Chicken breast 1kg', 'Rice 2 cups', 'Broccoli 1 head', 'Soy sauce', 'Sesame seeds'],
  },
  {
    id: 'm3',
    name: 'Beef Tacos',
    minutes: 25,
    serves: 5,
    tags: ['Quick', 'Kids', 'Favourite'],
    image: '/meals/beef-tacos.jpg',
    description: 'Everyone builds their own — the easiest weeknight win.',
    ingredients: ['Beef mince 500g', 'Taco shells', 'Lettuce', 'Tomatoes 3', 'Cheese'],
  },
  {
    id: 'm4',
    name: 'Homemade Pizza',
    minutes: 50,
    serves: 5,
    tags: ['Weekend', 'Kids'],
    image: '/meals/homemade-pizza.jpg',
    description: 'Friday night tradition. Kids top their own bases.',
    ingredients: ['Pizza bases 3', 'Tomato paste', 'Cheese 500g', 'Ham', 'Capsicum 1'],
  },
  {
    id: 'm5',
    name: 'Chicken Wraps',
    minutes: 20,
    serves: 5,
    tags: ['Quick', 'Budget'],
    image: '/meals/chicken-wraps.jpg',
    description: 'Uses up leftover roast chicken and salad from the fridge.',
    ingredients: ['Wraps 1 pack', 'Chicken breast 500g', 'Lettuce', 'Tomatoes 2', 'Yoghurt'],
  },
  {
    id: 'm6',
    name: 'Burgers',
    minutes: 35,
    serves: 5,
    tags: ['Weekend', 'Kids', 'Favourite'],
    image: '/meals/burgers.jpg',
    description: 'Homemade patties, toasted buns, oven chips on the side.',
    ingredients: ['Beef mince 700g', 'Burger buns 6', 'Cheese', 'Lettuce', 'Frozen chips'],
  },
  {
    id: 'm7',
    name: 'Roast Chicken',
    minutes: 90,
    serves: 5,
    tags: ['Weekend', 'Favourite'],
    image: '/meals/roast-chicken.jpg',
    description: 'Sunday roast with potatoes and carrots. Leftovers for wraps.',
    ingredients: ['Whole chicken 1.8kg', 'Potatoes 1kg', 'Carrots 500g', 'Frozen peas 1 bag'],
  },
  {
    id: 'm8',
    name: 'Beef Noodle Stir Fry',
    minutes: 25,
    serves: 5,
    tags: ['Quick', 'Budget'],
    image: '/meals/beef-noodle-stir-fry.jpg',
    description: 'Whatever vegetables need using, plus noodles and beef strips.',
    ingredients: ['Beef strips 500g', 'Noodles 2 packs', 'Capsicum 1', 'Frozen peas', 'Soy sauce'],
  },
];

/**
 * The plan is keyed by weekday, so the seeded week lines up with whichever real
 * week the family opens the app in (ADR-005).
 */
export const planSeed: Plan = {
  mon: { dinner: 'm1', lunch: 'm5' },
  tue: { dinner: 'm2' },
  wed: { dinner: 'm3' },
  thu: {},
  fri: { dinner: 'm4' },
  sat: { dinner: 'm6' },
  sun: { dinner: 'm7', lunch: 'm5' },
};
