const clg = require('crossword-layout-generator');

const words = [
  { answer: "DOG", clue: "Barking animal" },
  { answer: "CAT", clue: "Meowing animal" },
  { answer: "BIRD", clue: "Flying animal" }
];

const layout = clg.generateLayout(words);
console.log(JSON.stringify(layout, null, 2));
